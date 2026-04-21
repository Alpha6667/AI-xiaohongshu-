from fastapi import HTTPException, status

from app.models.asset import Asset
from app.models.enums import PostStatus
from app.repositories.memory import new_id, now_iso, repository
from app.schemas.assets import AssetResponse, AssetUploadRequest


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
        url=f"https://example.com/assets/{payload.fileName}",
        created_at=now_iso(),
    )
    repository.assets[asset.id] = asset

    if payload.postId is not None:
        post = repository.posts[payload.postId]
        if asset.id not in post.asset_ids:
            post.asset_ids.append(asset.id)
            post.updated_at = asset.created_at

    return AssetResponse(
        id=asset.id,
        name=asset.name,
        fileName=asset.file_name,
        contentType=asset.content_type,
        url=asset.url,
        createdAt=asset.created_at,
    )
