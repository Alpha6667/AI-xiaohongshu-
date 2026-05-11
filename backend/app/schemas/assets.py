from pydantic import BaseModel


class AssetUploadRequest(BaseModel):
    name: str
    fileName: str
    contentType: str
    postId: str | None = None
    type: str | None = None
    thumbnailUrl: str | None = None
    url: str | None = None
    width: int | None = None
    height: int | None = None
    durationSeconds: int | None = None


class AssetResponse(BaseModel):
    id: str
    name: str
    type: str
    fileName: str
    filename: str
    contentType: str
    mimeType: str
    url: str
    thumbnailUrl: str | None = None
    width: int | None = None
    height: int | None = None
    durationSeconds: int | None = None
    createdAt: str
