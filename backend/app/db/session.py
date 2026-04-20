from app.db.config import get_settings


def get_database_state() -> dict[str, str]:
    settings = get_settings()
    return {
        "databaseUrl": settings.database_url,
        "driver": "in-memory-placeholder",
    }
