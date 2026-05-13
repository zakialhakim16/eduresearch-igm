from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.schemas.jobs import IndexDocumentJobRequest, JobResponse
from app.services.job_service import JobService


router = APIRouter()
job_service = JobService()


@router.post("/index-document", response_model=JobResponse, status_code=202)
async def index_document(payload: IndexDocumentJobRequest, background_tasks: BackgroundTasks) -> JobResponse:
    job = job_service.create_index_job(payload)
    background_tasks.add_task(job_service.run_index_job, job.job_id, payload)
    return job


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str) -> JobResponse:
    job = job_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan")
    return job
