from fastapi import APIRouter

from app.schemas.search import SearchRequest, SearchResponse
from app.services.openalex_service import OpenAlexService
from app.services.retrieval_service import RetrievalService


router = APIRouter()


@router.post("/semantic", response_model=SearchResponse)
async def semantic_search(payload: SearchRequest) -> SearchResponse:
    works = await OpenAlexService().search_works(payload.query, per_page=payload.per_page)
    ranked = RetrievalService().rank_papers(payload.query, works, mode="semantic")
    return SearchResponse(
        query=payload.query,
        mode="semantic",
        total=len(ranked),
        results=ranked[: payload.per_page],
    )


@router.post("/hybrid", response_model=SearchResponse)
async def hybrid_search(payload: SearchRequest) -> SearchResponse:
    works = await OpenAlexService().search_works(payload.query, per_page=payload.per_page)
    ranked = RetrievalService().rank_papers(payload.query, works, mode="hybrid")
    return SearchResponse(
        query=payload.query,
        mode="hybrid",
        total=len(ranked),
        results=ranked[: payload.per_page],
    )
