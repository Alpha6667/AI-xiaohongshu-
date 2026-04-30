from fastapi import APIRouter

from app.db.config import get_settings


router = APIRouter(tags=["health"])


def _health_payload() -> dict[str, object]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": "backend",
        "corsOriginCount": len(settings.cors_origins),
    }


@router.get("/health")
def health_check() -> dict[str, object]:
    return _health_payload()


@router.get("/api/health")
def api_health_check() -> dict[str, object]:
    return _health_payload()
