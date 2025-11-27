import json
import logging
import os
import uuid
from typing import Annotated
import httpx

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from ..deps.supabase import get_supabase_client

from ..deps.db import get_session
from ..models import schemas
from ..models.job_model import Job, JobStatus, SourceType
from ..utils.arxiv_scraper import scrape_arxiv_data
from ..tasks import process_pdf_task
from ..utils.pdf_parser import compress_pdf

logger = logging.getLogger(__name__)


def _env_value(key: str) -> str | None:
    """Return an env var trimmed of surrounding quotes/whitespace."""
    value = os.environ.get(key)
    if not value:
        return None
    return value.strip().strip('"').strip("'") or None


router = APIRouter()
SessionDep = Annotated[Session, Depends(get_session)]
supabase = get_supabase_client()


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    """Return a JSON error with a stable shape matching ErrorResponse.

    We avoid raising HTTPException with a string detail so that the payload
    is always {"code": ..., "message": ...}.
    """
    return JSONResponse(
        status_code=status_code, content={"code": code, "message": message}
    )


@router.get(
    "/v1/jobs",
    tags=["jobs"],
    status_code=200,
    response_model=list[schemas.JobStatusResponse],
)
async def read_jobs(
    session: SessionDep, offset: int = 0, limit: Annotated[int, Query(le=100)] = 100
) -> list[schemas.JobStatusResponse]:
    jobs = session.exec(select(Job).offset(offset).limit(limit)).all()
    return [
        schemas.JobStatusResponse(
            id=job.id,
            source_type=job.source_type,
            status=job.status,
            progress=job.progress,
            error_message=job.error_message,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )
        for job in jobs
    ]


@router.get(
    "/v1/jobs/{job_id}",
    tags=["jobs"],
    status_code=200,
    response_model=schemas.JobResultsResponse,
    responses={
        404: {
            "model": schemas.ErrorResponse,
            "description": "Job not found",
            "content": {
                "application/json": {
                    "example": {"code": "JOB_NOT_FOUND", "message": "Job not found"}
                }
            },
        }
    },
)
async def read_job(job_id: str, session: SessionDep) -> schemas.JobResultsResponse:
    job = session.get(Job, job_id)
    if not job:
        return error_response(404, "JOB_NOT_FOUND", "Job not found")
    if job.status == JobStatus.done:
        return {
            "status": "done",
            "summary": job.summary or "",
            "flashcards": json.loads(job.flashcards) if job.flashcards else [],
            "quiz": json.loads(job.quiz) if job.quiz else [],
        }
    else:
        return schemas.JobResultsNotReady(
            status=job.status.value,
            message=(
                "Results are not ready yet."
                if job.status != JobStatus.error
                else job.error_message or "An error occurred."
            ),
        )


@router.get(
    "/v1/jobs/{job_id}/status",
    tags=["jobs"],
    status_code=200,
    response_model=schemas.JobStatusResponse,
    responses={
        404: {
            "model": schemas.ErrorResponse,
            "description": "Job not found",
            "content": {
                "application/json": {
                    "example": {"code": "JOB_NOT_FOUND", "message": "Job not found"}
                }
            },
        }
    },
)
async def read_job_status(
    job_id: str, session: SessionDep
) -> schemas.JobStatusResponse:
    job = session.get(Job, job_id)
    if not job:
        return error_response(404, "JOB_NOT_FOUND", "Job not found")
    return {
        "id": job.id,
        "status": job.status,
        "progress": job.progress,
        "error_message": job.error_message,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
    }


@router.post(
    "/v1/jobs/upload",
    tags=["jobs"],
    status_code=201,
    response_model=schemas.JobCreateResponse,
)
async def create_job_file(
    session: SessionDep,
    file: UploadFile = File(...),
    owner_user_id: str | None = None,
) -> schemas.JobCreateResponse:

    if not supabase:
        raise HTTPException(
            status_code=500, detail="Supabase client not configured properly."
        )
    file_content = await file.read()
    file_content = compress_pdf(file_content)

    file_ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    file_path = f"uploads/{owner_user_id}/{uuid.uuid4()}.{file_ext}"
    bucket_name = "paper-uploads"

    try:
        # 3. Upload to Supabase Storage
        supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": "application/pdf"},
        )

        public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)

    except Exception as e:
        # Log the specific error in production
        raise HTTPException(
            status_code=500, detail=f"Failed to upload to storage: {str(e)}"
        )
    new_job = Job(
        owner_user_id=owner_user_id or "anonymous",
        source_type=SourceType.pdf,
        source_url=public_url,
        status=JobStatus.queued,
        progress=0,
    )
    session.add(new_job)
    session.commit()
    session.refresh(new_job)

    # Kick off async processing after job record is persisted
    process_pdf_task.delay(str(new_job.id))

    return schemas.JobCreateResponse(
        job_id=new_job.id,
        status="queued",
        created_at=new_job.created_at,
    )


@router.post(
    "/v1/jobs/link",
    tags=["jobs"],
    status_code=201,
    response_model=schemas.JobCreateResponse,
)
async def create_job_link(
    payload: schemas.LinkCreateRequest, session: SessionDep
) -> schemas.JobCreateResponse:
    try:

        data = scrape_arxiv_data(str(payload.url))
        final_source_url = data["pdf_url"]
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    try:
        async with httpx.AsyncClient() as client:
            # follow_redirects is crucial for arXiv links
            response = await client.get(final_source_url, follow_redirects=True)
            response.raise_for_status()
            file_content = response.content
            file_content = compress_pdf(file_content)

    except Exception as e:
        logger.error(f"Failed to download from arXiv: {e}")
        raise HTTPException(
            status_code=502, detail="Failed to download PDF from source"
        )

    # 3. Upload to Supabase (Unified Storage)
    if not supabase:
        raise HTTPException(status_code=503, detail="Storage not configured")

    owner_id = payload.owner_user_id or "anonymous"

    file_name = f"{data['arxiv_id']}_{uuid.uuid4()}.pdf"
    file_path = f"uploads/{owner_id}/{file_name}"
    bucket_name = "paper-uploads"

    supabase.storage.from_(bucket_name).upload(
        path=file_path,
        file=file_content,
        file_options={"content-type": "application/pdf"},
    )

    stored_url = supabase.storage.from_(bucket_name).get_public_url(file_path)

    new_job = Job(
        owner_user_id=payload.owner_user_id or "anonymous",
        source_type=SourceType.url,
        source_url=stored_url,
        status=JobStatus.queued,
        progress=0,
    )

    session.add(new_job)
    session.commit()
    session.refresh(new_job)

    process_pdf_task.delay(str(new_job.id))

    return schemas.JobCreateResponse(
        job_id=new_job.id,
        status="queued",
        created_at=new_job.created_at,
    )
