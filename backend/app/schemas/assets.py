from pydantic import BaseModel


class AssetUploadRequest(BaseModel):
    name: str
    fileName: str
    contentType: str


class AssetResponse(BaseModel):
    id: str
    name: str
    fileName: str
    contentType: str
    url: str
    createdAt: str
