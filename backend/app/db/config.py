from dataclasses import dataclass
from functools import lru_cache
import os


@dataclass(frozen=True, slots=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ai_xiaohongshu")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    cors_origins: tuple[str, ...] = tuple(filter(None, os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:3000").split(",")))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
