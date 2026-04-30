from app.schemas.confirmations import ConfirmationDetailResponse, ConfirmationSummaryResponse, ConfirmationUpdateRequest
from app.services.posts import get_post_detail, list_posts, update_post


def _to_confirmation_summary(post) -> ConfirmationSummaryResponse:
    payload = post.model_dump()
    payload["postId"] = post.id
    return ConfirmationSummaryResponse(**payload)


def _to_confirmation_detail(post) -> ConfirmationDetailResponse:
    payload = post.model_dump()
    payload["postId"] = post.id
    return ConfirmationDetailResponse(**payload)


def list_confirmations() -> list[ConfirmationSummaryResponse]:
    return [_to_confirmation_summary(post) for post in list_posts()]


def get_confirmation(post_id: str) -> ConfirmationDetailResponse:
    return _to_confirmation_detail(get_post_detail(post_id))


def update_confirmation(post_id: str, payload: ConfirmationUpdateRequest) -> ConfirmationDetailResponse:
    update_post(post_id, payload)
    return get_confirmation(post_id)
