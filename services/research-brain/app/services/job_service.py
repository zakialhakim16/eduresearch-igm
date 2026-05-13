from __future__ import annotations

from dataclasses import dataclass
import time
import uuid

from app.schemas.jobs import IndexDocumentJobRequest, JobResponse


@dataclass
class JobState:
    status: str
    message: str
    progress: int


class JobService:
    _jobs: dict[str, JobState] = {}

    def create_index_job(self, payload: IndexDocumentJobRequest) -> JobResponse:
        job_id = f"idx-{uuid.uuid4().hex[:12]}"
        self._jobs[job_id] = JobState(
            status="queued",
            message=f"Job indexing untuk {payload.document_id} sudah masuk antrian",
            progress=5,
        )
        return self._to_response(job_id)

    def run_index_job(self, job_id: str, payload: IndexDocumentJobRequest) -> None:
        self._jobs[job_id] = JobState(status="running", message="Sedang melakukan chunking dokumen", progress=25)
        time.sleep(0.05)
        self._jobs[job_id] = JobState(status="running", message="Sedang membangun sinyal retrieval", progress=60)
        time.sleep(0.05)
        self._jobs[job_id] = JobState(
            status="completed",
            message=f"Indexing selesai untuk dokumen {payload.document_id}",
            progress=100,
        )

    def get_job(self, job_id: str) -> JobResponse | None:
        if job_id not in self._jobs:
            return None
        return self._to_response(job_id)

    def _to_response(self, job_id: str) -> JobResponse:
        job = self._jobs[job_id]
        return JobResponse(
            job_id=job_id,
            status=job.status,
            message=job.message,
            progress=job.progress,
        )
