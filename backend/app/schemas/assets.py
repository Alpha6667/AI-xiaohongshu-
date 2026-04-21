from pydantic import BaseModel


class AssetUploadRequest(BaseModel):
    name: str
    fileName: str
    contentType: str
    postId: str | None = None


class AssetResponse(BaseModel):
    id: str
    name: str
    fileName: str
    contentType: str
    url: str
    createdAt: str
