from pydantic import BaseModel, Field


class TopicClassifyRequest(BaseModel):
    title: str = Field(min_length=5)
    abstract: str | None = None
    keywords: list[str] = Field(default_factory=list)
    methods: list[str] = Field(default_factory=list)


class TopicClassifyResponse(BaseModel):
    primary_topic: str
    confidence: float
    matched_keywords: list[str] = Field(default_factory=list)
    alternative_topics: list[str] = Field(default_factory=list)
