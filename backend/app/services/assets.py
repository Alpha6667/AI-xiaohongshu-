from fastapi import HTTPException, status

from app.models.asset import Asset
from app.models.enums import PostStatus
from app.repositories.memory import new_id, now_iso, repository
from app.schemas.assets import AssetResponse, AssetUploadRequest


def infer_asset_type(content_type: str, asset_type: str | None = None) -> str:
    if asset_type in {"image", "video"}:
        return asset_type
    if content_type.startswith("video/"):
        return "video"
    return "image"


def _serialize_asset(asset: Asset) -> AssetResponse:
    return AssetResponse(
        id=asset.id,
        name=asset.name,
        type=infer_asset_type(asset.content_type, asset.type),
        fileName=asset.file_name,
        filename=asset.file_name,
        contentType=asset.content_type,
        mimeType=asset.content_type,
        url=asset.url,
        thumbnailUrl=asset.thumbnail_url,
        width=asset.width,
        height=asset.height,
        durationSeconds=asset.duration_seconds,
        createdAt=asset.created_at,
    )


def list_assets(post_id: str | None = None, ids: str | None = None) -> list[AssetResponse]:
    filtered_ids: list[str] | None = None

    if post_id is not None:
        post = repository.posts.get(post_id)
        if post is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        filtered_ids = list(post.asset_ids)

    if ids:
        requested_ids = [item.strip() for item in ids.split(",") if item.strip()]
        if filtered_ids is None:
            filtered_ids = requested_ids
        else:
            requested_set = set(requested_ids)
            filtered_ids = [item for item in filtered_ids if item in requested_set]

    if filtered_ids is None:
        assets = list(repository.assets.values())
    else:
        assets = [repository.assets[item] for item in filtered_ids if item in repository.assets]

    assets.sort(key=lambda item: item.created_at, reverse=True)
    return [_serialize_asset(asset) for asset in assets]


def upload_asset(payload: AssetUploadRequest) -> AssetResponse:
    if payload.postId is not None:
        post = repository.posts.get(payload.postId)
        if post is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        if post.status in {PostStatus.PUBLISHED, PostStatus.PUBLISHING}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Published or publishing post cannot add assets",
            )

    asset = Asset(
        id=new_id("asset"),
        name=payload.name,
        file_name=payload.fileName,
        content_type=payload.contentType,
        url=payload.url or f"https://example.com/assets/{payload.fileName}",
        created_at=now_iso(),
        type=infer_asset_type(payload.contentType, payload.type),
        thumbnail_url=payload.thumbnailUrl,
        width=payload.width,
        height=payload.height,
        duration_seconds=payload.durationSeconds,
    )
    repository.assets[asset.id] = asset

    if payload.postId is not None:
        post = repository.posts[payload.postId]
        if asset.id not in post.asset_ids:
            post.asset_ids.append(asset.id)
            post.updated_at = asset.created_at

    repository.save()

    return _serialize_asset(asset)
