from pydantic import BaseModel, Field

from app.schemas.common import PaperResult


class RecommendPapersRequest(BaseModel):
    title: str = Field(min_length=5)
    abstract: str | None = None
    keywords: list[str] = Field(default_factory=list)
    methods: list[str] = Field(default_factory=list)
    document_type: str | None = None
    institution_context: str | None = None
    limit: int = Field(default=10, ge=1, le=20)
    per_query_limit: int = Field(default=12, ge=1, le=20)
    max_candidates: int = Field(default=30, ge=10, le=80)


class RecommendPapersResponse(BaseModel):
    input_summary: str
    tried_queries: list[str]
    total: int
    results: list[PaperResult]
