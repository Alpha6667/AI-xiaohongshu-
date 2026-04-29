from fastapi import APIRouter, HTTPException, status

from app.schemas.image_provider import (
    ImageProviderConfigResponse,
    ImageProviderConfigUpsertRequest,
    ImageProviderTestRequest,
    ImageProviderTestResponse,
)
from app.services.image_provider import (
    ProviderNotConfiguredError,
    get_image_provider_config,
    test_image_provider_config,
    upsert_image_provider_config,
)


router = APIRouter(prefix="/api/settings/image-provider", tags=["image-provider-settings"])


@router.get("", response_model=ImageProviderConfigResponse)
def get_image_provider_config_route() -> ImageProviderConfigResponse:
    return get_image_provider_config()


@router.post("", response_model=ImageProviderConfigResponse)
def upsert_image_provider_config_route(payload: ImageProviderConfigUpsertRequest) -> ImageProviderConfigResponse:
    return upsert_image_provider_config(payload)


@router.post("/test", response_model=ImageProviderTestResponse)
def test_image_provider_config_route(payload: ImageProviderTestRequest) -> ImageProviderTestResponse:
    try:
        return test_image_provider_config(payload.provider)
    except ProviderNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
