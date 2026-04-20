from fastapi import APIRouter

from app.db.config import get_settings


router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, object]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": "backend",
        "corsOriginCount": len(settings.cors_origins),
    }
