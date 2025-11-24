import json
import logging
import os
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from supabase import Client, create_client

from ..deps.db import get_session
from ..models import schemas
from ..models.job_model import Job, JobStatus, SourceType

logger = logging.getLogger(__name__)

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client | None = None
if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
    except Exception as exc:  # pragma: no cover - startup logging only
        logger.warning("Supabase client disabled: %s", exc)
else:  # pragma: no cover - startup logging only
    logger.warning("SUPABASE_URL/KEY not set; Supabase client disabled.")

router = APIRouter()
SessionDep = Annotated[Session, Depends(get_session)]


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
    payload: schemas.PDFCreateRequest, session: SessionDep
) -> schemas.JobCreateResponse:
    new_job = Job(
        owner_user_id=payload.owner_user_id or "",
        source_type=SourceType.pdf,
        status=JobStatus.queued,
        progress=0,
    )
    session.add(new_job)
    session.commit()
    session.refresh(new_job)

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
    new_job = Job(
        owner_user_id=payload.owner_user_id or "",
        source_type=SourceType.url,
        source_url=str(payload.url),
        status=JobStatus.queued,
        progress=0,
    )

    session.add(new_job)
    session.commit()
    session.refresh(new_job)

    return schemas.JobCreateResponse(
        job_id=new_job.id,
        status="queued",
        created_at=new_job.created_at,
    )
