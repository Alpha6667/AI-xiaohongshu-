from datetime import UTC, datetime

from app.models.enums import MessageTaskStage, PostStatus
from app.repositories.memory import repository
from app.schemas.accounts import AccountResponse


def _is_today(iso_text: str) -> bool:
    try:
        return datetime.fromisoformat(iso_text).astimezone(UTC).date() == datetime.now(UTC).date()
    except ValueError:
        return False


def _engagement_for_post(post_id: str) -> int:
    snapshots = repository.metrics_snapshots.get(post_id, [])
    if not snapshots:
        return 0
    latest = snapshots[-1]
    return latest.likes + latest.favorites + latest.comments + latest.follow_conversions


def list_accounts() -> list[AccountResponse]:
    accounts = sorted(repository.accounts.values(), key=lambda item: item.updated_at, reverse=True)
    waiting_stages = {
        MessageTaskStage.PENDING_GENERATION,
        MessageTaskStage.WAITING_REVIEW,
        MessageTaskStage.WAITING_PUBLISH,
    }

    responses: list[AccountResponse] = []
    for item in accounts:
        account_tasks = [task for task in repository.message_tasks.values() if task.account_id == item.id]
        account_posts = [post for post in repository.posts.values() if post.account_id == item.id]

        today_task_count = sum(1 for task in account_tasks if _is_today(task.requested_at))
        waiting_count = sum(1 for task in account_tasks if task.stage in waiting_stages)
        published_count = sum(1 for post in account_posts if post.status == PostStatus.PUBLISHED)

        post_engagements = [(post.topic, _engagement_for_post(post.id)) for post in account_posts]
        total_engagement = sum(data[1] for data in post_engagements)
        best_topic = None
        if post_engagements:
            best_topic = max(post_engagements, key=lambda data: data[1])[0]

        responses.append(
            AccountResponse(
                id=item.id,
                name=item.name,
                handle=item.handle,
                status=item.status,
                summary=item.summary,
                lastActiveAt=item.last_active_at,
                todayTaskCount=today_task_count,
                waitingCount=waiting_count,
                publishedCount=published_count,
                totalEngagement=total_engagement,
                bestTopic=best_topic,
            )
        )

    return responses
