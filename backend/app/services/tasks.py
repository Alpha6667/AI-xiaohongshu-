from app.repositories.memory import repository
from app.schemas.tasks import MessageTaskResponse


def list_message_tasks() -> list[MessageTaskResponse]:
    tasks = sorted(repository.message_tasks.values(), key=lambda item: item.updated_at, reverse=True)
    return [
        MessageTaskResponse(
            id=item.id,
            sourceMessage=item.source_message,
            topic=item.topic,
            stage=item.stage,
            postId=item.post_id,
            accountId=item.account_id,
            requestedAt=item.requested_at,
            scheduledAt=item.scheduled_at,
            hasCopy=item.has_copy,
            hasImages=item.has_images,
            requiresHumanReview=item.requires_human_review,
        )
        for item in tasks
    ]
