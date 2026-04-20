from fastapi import APIRouter

from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard import get_dashboard_summary


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def dashboard_summary() -> DashboardSummaryResponse:
    return get_dashboard_summary()
