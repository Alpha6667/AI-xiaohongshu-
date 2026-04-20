from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    totalPosts: int
    totalViews: int
    totalLikes: int
    totalFavorites: int
    totalComments: int
    followConversions: int
    pendingReviewCount: int
    publishedCount: int
