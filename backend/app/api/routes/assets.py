from fastapi import APIRouter, Query, status

from app.schemas.assets import AssetResponse, AssetUploadRequest
from app.services.assets import list_assets, upload_asset


router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("", response_model=list[AssetResponse])
def list_assets_route(
    postId: str | None = Query(default=None),
    ids: str | None = Query(default=None, description="Comma-separated asset IDs"),
) -> list[AssetResponse]:
    return list_assets(post_id=postId, ids=ids)


@router.post("/upload", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(payload: AssetUploadRequest) -> AssetResponse:
    return upload_asset(payload)
