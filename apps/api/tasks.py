# apps/api/tasks.py
import logging
import time
import os
from sqlmodel import Session, select
from .core.celery_app import celery_app
from .deps.db import engine
from .models.job_model import Job, JobStatus, SourceType
from .models.section_model import Section
from .utils.pdf_parser import extract_sections_from_pdf
from .deps.supabase import get_supabase_client
from .models.summary_model import Summary
from .core.llm import generate_section_summary

logger = logging.getLogger(__name__)
supabase = get_supabase_client()


def update_job_progress(
    job_id: str, progress: int, status: JobStatus = JobStatus.processing
):
    """Helper to update job progress safely."""
    with Session(engine) as session:
        job = session.get(Job, job_id)
        if job:
            job.progress = progress
            job.status = status
            session.add(job)
            session.commit()
            logger.info(f"Job {job_id} updated: {progress}% - {status}")


@celery_app.task(name="summarize_paper")
def summarize_paper_task(job_id: str):
    logger.info(f"🧠 Summarizing Job {job_id}")

    with Session(engine) as session:
        # 1. Récupérer toutes les sections du job
        # (Attention : il faut importer 'select' de sqlmodel)
        sections = session.exec(
            select(Section).where(Section.job_id == job_id).order_by(Section.order)
        ).all()

        if not sections:
            logger.warning(f"No sections found for job {job_id}")
            return

        # 2. Boucler et résumer
        for section in sections:
            try:
                # Appel LLM (peut prendre 2-5s par section)
                analysis = generate_section_summary(section.content)

                # Sauvegarde
                summary = Summary(
                    section_id=section.id,
                    summary_text=analysis.summary,
                    key_claims=analysis.claims,
                    model_used="gemini-1.5-flash",
                )
                session.add(summary)
                session.commit()

            except Exception as e:
                logger.error(f"Failed to summarize section {section.id}: {e}")
                # On continue quand même pour les autres sections
                continue

        # 3. Mettre à jour le statut global du Job si nécessaire
        # (Optionnel : créer un statut 'SUMMARIZED' ou rester sur 'DONE')

    logger.info(f"✅ Summarization complete for Job {job_id}")


@celery_app.task(name="process_pdf")
def process_pdf_task(job_id: str):
    logger.info(f"🚀 Starting Job {job_id}")

    update_job_progress(job_id, 10)

    try:
        # Retrieve Job Data
        with Session(engine) as session:
            job = session.get(Job, job_id)
            if not job:
                return
            source_url = job.source_url
            source_type = job.source_type

        if "paper-uploads" in source_url:
            # Simple hack to get path after bucket name
            file_path = source_url.split("paper-uploads/")[-1]
            logger.info(f"Downloading file from path: {file_path}")

            # Download as bytes
            res = supabase.storage.from_("paper-uploads").download(file_path)
            file_bytes = res

        if not file_bytes:
            raise ValueError("Could not download file content.")

        update_job_progress(job_id, 30)

        logger.info(f"Parsing PDF content for Job {job_id}...")
        sections_data = extract_sections_from_pdf(file_bytes)
        update_job_progress(job_id, 60)

        logger.info(f"Saving {len(sections_data)} sections to DB...")
        with Session(engine) as session:
            # Re-fetch job to ensure session is fresh
            job = session.get(Job, job_id)

            for sec in sections_data:
                new_section = Section(
                    job_id=job.id,
                    title=sec["title"],
                    content=sec["content"],
                    order=sec["order"],
                )
                session.add(new_section)

            session.commit()
        logger.info(f"✅ Job {job_id} parsed. Triggering summarization...")
        summarize_paper_task.delay(job_id)
        update_job_progress(job_id, 90, JobStatus.done)

        update_job_progress(job_id, 100, JobStatus.done)
        logger.info(f"✅ Job {job_id} completed successfully.")

    except Exception as e:
        logger.error(f"❌ Failed Job {job_id}: {e}")
        with Session(engine) as session:
            job = session.get(Job, job_id)
            if job:
                job.status = JobStatus.error
                job.error_message = str(e)
                session.add(job)
                session.commit()
