from dataclasses import dataclass

from app.models.enums import ReviewAction


@dataclass(slots=True)
class ReviewRecord:
    id: str
    post_id: str
    action: ReviewAction
    comment: str
    operator: str
    created_at: str
