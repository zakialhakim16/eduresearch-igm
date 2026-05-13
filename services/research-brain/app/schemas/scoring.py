from pydantic import BaseModel, Field


class ProposalScoreRequest(BaseModel):
    title: str = Field(min_length=5)
    abstract: str | None = None
    problem_statement: str | None = None
    objectives: list[str] = Field(default_factory=list)
    methods: list[str] = Field(default_factory=list)
    references: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    expected_contribution: str | None = None


class RubricScore(BaseModel):
    name: str
    score: int
    max_score: int
    notes: list[str] = Field(default_factory=list)


class ProposalScoreResponse(BaseModel):
    total_score: int
    max_score: int
    verdict: str
    rubric: list[RubricScore]
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
