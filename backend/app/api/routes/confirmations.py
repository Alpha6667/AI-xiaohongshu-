from fastapi import APIRouter

from app.schemas.confirmations import ConfirmationDetailResponse, ConfirmationSummaryResponse, ConfirmationUpdateRequest
from app.services.confirmations import get_confirmation, list_confirmations, update_confirmation


router = APIRouter(prefix="/api/confirmations", tags=["confirmations"])


@router.get("", response_model=list[ConfirmationSummaryResponse])
def list_confirmations_route() -> list[ConfirmationSummaryResponse]:
    return list_confirmations()


@router.get("/{post_id}", response_model=ConfirmationDetailResponse)
def get_confirmation_route(post_id: str) -> ConfirmationDetailResponse:
    return get_confirmation(post_id)


@router.patch("/{post_id}", response_model=ConfirmationDetailResponse)
def update_confirmation_route(post_id: str, payload: ConfirmationUpdateRequest) -> ConfirmationDetailResponse:
    return update_confirmation(post_id, payload)
