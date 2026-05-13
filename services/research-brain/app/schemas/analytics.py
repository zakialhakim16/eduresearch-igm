from pydantic import BaseModel, Field


class ResearchItem(BaseModel):
    title: str
    year: int | None = None
    topic: str | None = None
    keywords: list[str] = Field(default_factory=list)
    methods: list[str] = Field(default_factory=list)
    authors: list[str] = Field(default_factory=list)


class ResearchMapRequest(BaseModel):
    items: list[ResearchItem] = Field(default_factory=list)


class CountBucket(BaseModel):
    key: str
    count: int


class ResearchMapResponse(BaseModel):
    total_items: int
    top_topics: list[CountBucket]
    top_methods: list[CountBucket]
    top_keywords: list[CountBucket]
    year_distribution: list[CountBucket]
