from fastapi import APIRouter

from app.schemas.scoring import ProposalScoreRequest, ProposalScoreResponse
from app.services.proposal_scoring_service import ProposalScoringService


router = APIRouter()


@router.post("/proposal", response_model=ProposalScoreResponse)
async def score_proposal(payload: ProposalScoreRequest) -> ProposalScoreResponse:
    return ProposalScoringService().score(payload)
