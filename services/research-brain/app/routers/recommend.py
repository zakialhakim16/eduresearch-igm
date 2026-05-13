from fastapi import APIRouter

from app.schemas.recommend import RecommendPapersRequest, RecommendPapersResponse
from app.services.openalex_service import OpenAlexService
from app.services.retrieval_service import RetrievalService


router = APIRouter()


@router.post("/papers", response_model=RecommendPapersResponse)
async def recommend_papers(payload: RecommendPapersRequest) -> RecommendPapersResponse:
    queries = RetrievalService().build_recommendation_queries(payload)
    service = OpenAlexService()
    all_works = []

    for query in queries:
        all_works.extend(await service.search_works(query, per_page=payload.per_query_limit))
        if len(all_works) >= payload.max_candidates:
            break

    ranked = RetrievalService().rank_recommendations(payload, all_works)

    return RecommendPapersResponse(
        input_summary=payload.title,
        tried_queries=queries,
        total=len(ranked),
        results=ranked[: payload.limit],
    )
