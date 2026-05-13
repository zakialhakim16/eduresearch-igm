from app.schemas.jobs import IndexDocumentJobRequest
from app.services.job_service import JobService
from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.tasks.index_document_task")
def index_document_task(document: dict) -> dict:
    payload = IndexDocumentJobRequest(**document)
    service = JobService()
    job = service.create_index_job(payload)
    service.run_index_job(job.job_id, payload)
    return service.get_job(job.job_id).model_dump()
