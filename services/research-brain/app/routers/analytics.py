from fastapi import APIRouter

from app.schemas.analytics import ResearchMapRequest, ResearchMapResponse
from app.services.analytics_service import AnalyticsService


router = APIRouter()


@router.post("/research-map", response_model=ResearchMapResponse)
async def research_map(payload: ResearchMapRequest) -> ResearchMapResponse:
    return AnalyticsService().build_map(payload)
