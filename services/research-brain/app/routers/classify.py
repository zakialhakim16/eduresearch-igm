from fastapi import APIRouter

from app.schemas.classify import TopicClassifyRequest, TopicClassifyResponse
from app.services.topic_classifier_service import TopicClassifierService


router = APIRouter()


@router.post("/topic", response_model=TopicClassifyResponse)
async def classify_topic(payload: TopicClassifyRequest) -> TopicClassifyResponse:
    return TopicClassifierService().classify(payload)
