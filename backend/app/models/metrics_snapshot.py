from dataclasses import dataclass


@dataclass(slots=True)
class MetricsSnapshot:
    id: str
    post_id: str
    views: int
    likes: int
    favorites: int
    comments: int
    follow_conversions: int
    snapshot_at: str
