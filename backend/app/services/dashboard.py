from app.models.enums import PostStatus
from app.repositories.memory import repository
from app.schemas.dashboard import DashboardSummaryResponse


def get_dashboard_summary() -> DashboardSummaryResponse:
    total_views = 0
    total_likes = 0
    total_favorites = 0
    total_comments = 0
    total_follow_conversions = 0

    for snapshots in repository.metrics_snapshots.values():
        if not snapshots:
            continue
        latest = snapshots[-1]
        total_views += latest.views
        total_likes += latest.likes
        total_favorites += latest.favorites
        total_comments += latest.comments
        total_follow_conversions += latest.follow_conversions

    return DashboardSummaryResponse(
        totalPosts=len(repository.posts),
        totalViews=total_views,
        totalLikes=total_likes,
        totalFavorites=total_favorites,
        totalComments=total_comments,
        followConversions=total_follow_conversions,
        pendingReviewCount=sum(1 for post in repository.posts.values() if post.status == PostStatus.IN_REVIEW),
        publishedCount=sum(1 for post in repository.posts.values() if post.status == PostStatus.PUBLISHED),
    )
