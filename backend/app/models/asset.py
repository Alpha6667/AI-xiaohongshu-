from dataclasses import dataclass


@dataclass(slots=True)
class Asset:
    id: str
    name: str
    file_name: str
    content_type: str
    url: str
    created_at: str
    type: str | None = None
    thumbnail_url: str | None = None
    width: int | None = None
    height: int | None = None
    duration_seconds: int | None = None
