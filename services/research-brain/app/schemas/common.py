from pydantic import BaseModel, Field


class PaperResult(BaseModel):
    source_id: str | None = None
    doi: str | None = None
    title: str
    year: int | None = None
    journal: str | None = None
    authors: list[str] = Field(default_factory=list)
    abstract: str | None = None
    url: str | None = None
    cited_by_count: int = 0
    open_access: bool = False
    score: float = 0.0
    match_reason: list[str] = Field(default_factory=list)
