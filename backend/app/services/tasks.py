from app.repositories.memory import repository
from app.models.enums import MessageTaskStage
from app.schemas.tasks import MessageTaskResponse


STAGE_LABELS: dict[MessageTaskStage, str] = {
    MessageTaskStage.PENDING_GENERATION: "待生成",
    MessageTaskStage.COPY_GENERATED: "文案已生成",
    MessageTaskStage.IMAGES_GENERATED: "图片已生成",
    MessageTaskStage.WAITING_REVIEW: "待确认",
    MessageTaskStage.WAITING_PUBLISH: "待发布",
    MessageTaskStage.PUBLISHING: "发布中",
    MessageTaskStage.PUBLISHED: "已发布",
    MessageTaskStage.FAILED: "失败",
}

NEXT_ACTIONS: dict[MessageTaskStage, str] = {
    MessageTaskStage.PENDING_GENERATION: "generate_content",
    MessageTaskStage.COPY_GENERATED: "generate_images",
    MessageTaskStage.IMAGES_GENERATED: "generate_copy",
    MessageTaskStage.WAITING_REVIEW: "review_content",
    MessageTaskStage.WAITING_PUBLISH: "confirm_publish",
    MessageTaskStage.PUBLISHING: "wait_publish_result",
    MessageTaskStage.PUBLISHED: "check_metrics",
    MessageTaskStage.FAILED: "retry_or_adjust",
}


def list_message_tasks() -> list[MessageTaskResponse]:
    tasks = sorted(repository.message_tasks.values(), key=lambda item: item.updated_at, reverse=True)
    return [
        MessageTaskResponse(
            id=item.id,
            sourceMessage=item.source_message,
            title=(repository.posts[item.post_id].title if item.post_id in repository.posts else item.topic),
            topic=item.topic,
            stage=item.stage,
            stageLabel=STAGE_LABELS[item.stage],
            nextAction=NEXT_ACTIONS[item.stage],
            postId=item.post_id,
            accountId=item.account_id,
            accountName=(repository.accounts[item.account_id].name if item.account_id in repository.accounts else None),
            requestedAt=item.requested_at,
            plannedAt=item.scheduled_at or item.requested_at,
            hasCopy=item.has_copy,
            hasImages=item.has_images,
            requiresHumanReview=item.requires_human_review,
        )
        for item in tasks
    ]
