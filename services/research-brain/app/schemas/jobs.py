from pydantic import BaseModel, Field


class IndexDocumentJobRequest(BaseModel):
    document_id: str
    title: str
    content: str = Field(min_length=10)
    document_type: str | None = None
    keywords: list[str] = Field(default_factory=list)


class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str
    progress: int = 0
