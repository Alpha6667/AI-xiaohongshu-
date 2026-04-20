from app.models.asset import Asset
from app.repositories.memory import new_id, now_iso, repository
from app.schemas.assets import AssetResponse, AssetUploadRequest


def upload_asset(payload: AssetUploadRequest) -> AssetResponse:
    asset = Asset(
        id=new_id("asset"),
        name=payload.name,
        file_name=payload.fileName,
        content_type=payload.contentType,
        url=f"https://example.com/assets/{payload.fileName}",
        created_at=now_iso(),
    )
    repository.assets[asset.id] = asset
    return AssetResponse(
        id=asset.id,
        name=asset.name,
        fileName=asset.file_name,
        contentType=asset.content_type,
        url=asset.url,
        createdAt=asset.created_at,
    )
