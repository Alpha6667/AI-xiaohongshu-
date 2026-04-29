from pydantic import BaseModel


class ImageProviderConfigResponse(BaseModel):
    provider: str | None = None
    imageModel: str | None = None
    baseUrl: str | None = None
    hasKey: bool
    maskedKey: str | None = None
    updatedAt: str | None = None


class ImageProviderConfigUpsertRequest(BaseModel):
    provider: str
    apiKey: str | None = None
    imageModel: str | None = None
    baseUrl: str | None = None


class ImageProviderTestRequest(BaseModel):
    provider: str | None = None


class ImageProviderTestResponse(BaseModel):
    provider: str
    imageModel: str
    baseUrl: str | None = None
    message: str
