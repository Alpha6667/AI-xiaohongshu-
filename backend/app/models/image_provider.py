from dataclasses import dataclass


@dataclass(slots=True)
class ImageProviderConfig:
    provider: str
    api_key: str
    image_model: str
    base_url: str | None = None
    updated_at: str = ""
