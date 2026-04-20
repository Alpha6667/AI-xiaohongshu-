from fastapi import APIRouter, status

from app.schemas.assets import AssetResponse, AssetUploadRequest
from app.services.assets import upload_asset


router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.post("/upload", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(payload: AssetUploadRequest) -> AssetResponse:
    return upload_asset(payload)
