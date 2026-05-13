from pydantic import BaseModel, Field

from app.schemas.common import PaperResult


class SearchRequest(BaseModel):
    query: str = Field(min_length=3)
    per_page: int = Field(default=10, ge=1, le=25)


class SearchResponse(BaseModel):
    query: str
    mode: str
    total: int
    results: list[PaperResult]
