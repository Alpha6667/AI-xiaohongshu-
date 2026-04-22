from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.assets import router as assets_router
from app.api.routes.accounts import router as accounts_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.health import router as health_router
from app.api.routes.posts import router as posts_router
from app.api.routes.tasks import router as tasks_router
from app.db.config import get_settings


settings = get_settings()

app = FastAPI(title="AI Xiaohongshu Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(posts_router)
app.include_router(assets_router)
app.include_router(dashboard_router)
app.include_router(tasks_router)
app.include_router(accounts_router)
