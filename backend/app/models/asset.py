from dataclasses import dataclass


@dataclass(slots=True)
class Asset:
    id: str
    name: str
    file_name: str
    content_type: str
    url: str
    created_at: str
