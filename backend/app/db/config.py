from dataclasses import dataclass
from functools import lru_cache
import os


@dataclass(frozen=True, slots=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ai_xiaohongshu")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    cors_origins: tuple[str, ...] = tuple(filter(None, os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:3000").split(",")))
    qq_ingest_shared_secret: str = os.getenv("QQ_INGEST_SHARED_SECRET", "dev-qq-shared-secret")
    openclaw_metrics_webhook_url: str = os.getenv("OPENCLAW_METRICS_WEBHOOK_URL", "")
    openclaw_metrics_auth_token: str = os.getenv("OPENCLAW_METRICS_AUTH_TOKEN", "")
    openclaw_metrics_timeout_seconds: int = int(os.getenv("OPENCLAW_METRICS_TIMEOUT_SECONDS", "10"))
    backend_public_base_url: str = os.getenv("BACKEND_PUBLIC_BASE_URL", "")
    # Item 8: OpenClaw publish webhook config — no defaults, mark as unconfigured when missing
    openclaw_publish_webhook_url: str = os.getenv("OPENCLAW_PUBLISH_WEBHOOK_URL", "")
    openclaw_publish_auth_token: str = os.getenv("OPENCLAW_PUBLISH_AUTH_TOKEN", "")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
