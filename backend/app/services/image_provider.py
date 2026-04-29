from dataclasses import replace

from app.models.image_provider import ImageProviderConfig
from app.repositories.memory import now_iso, repository
from app.schemas.image_provider import (
    ImageProviderConfigResponse,
    ImageProviderConfigUpsertRequest,
    ImageProviderTestResponse,
)


DEFAULT_IMAGE_MODELS: dict[str, str] = {
    "openai": "gpt-image-1",
    "bfl": "flux.2",
    "volcengine": "seedream",
    "tencent": "hunyuan-image",
    "alibaba": "wanx",
    "stability": "stable-image",
}


class ProviderNotConfiguredError(Exception):
    pass


def _normalize_provider(provider: str) -> str:
    return provider.strip().lower()


def _resolve_image_model(provider: str, image_model: str | None) -> str:
    normalized_provider = _normalize_provider(provider)
    if image_model is not None and image_model.strip():
        return image_model.strip()
    return DEFAULT_IMAGE_MODELS.get(normalized_provider, "")


def _mask_api_key(api_key: str) -> str | None:
    if not api_key:
        return None
    if len(api_key) <= 8:
        return "*" * len(api_key)
    return f"{api_key[:4]}{'*' * (len(api_key) - 8)}{api_key[-4:]}"


def _serialize_config(config: ImageProviderConfig | None) -> ImageProviderConfigResponse:
    if config is None:
        return ImageProviderConfigResponse(hasKey=False)
    return ImageProviderConfigResponse(
        provider=config.provider,
        imageModel=config.image_model,
        baseUrl=config.base_url,
        hasKey=bool(config.api_key),
        maskedKey=_mask_api_key(config.api_key),
        updatedAt=config.updated_at,
    )


def get_image_provider_config() -> ImageProviderConfigResponse:
    return _serialize_config(repository.image_provider_config)


def upsert_image_provider_config(payload: ImageProviderConfigUpsertRequest) -> ImageProviderConfigResponse:
    normalized_provider = _normalize_provider(payload.provider)
    existing = repository.image_provider_config

    api_key = existing.api_key if existing is not None else ""
    if payload.apiKey is not None:
        api_key = payload.apiKey.strip()

    config = ImageProviderConfig(
        provider=normalized_provider,
        api_key=api_key,
        image_model=_resolve_image_model(normalized_provider, payload.imageModel),
        base_url=payload.baseUrl.strip() if payload.baseUrl else None,
        updated_at=now_iso(),
    )
    repository.image_provider_config = config
    repository.save()
    return _serialize_config(config)


def prepare_image_provider_for_generation(provider: str | None = None) -> ImageProviderConfig:
    config = repository.image_provider_config
    if config is None:
        raise ProviderNotConfiguredError("provider_not_configured")

    if provider is not None and _normalize_provider(provider) != config.provider:
        raise ProviderNotConfiguredError("provider_not_configured")

    if not config.provider or not config.api_key:
        raise ProviderNotConfiguredError("provider_not_configured")

    image_model = config.image_model or _resolve_image_model(config.provider, None)
    if not image_model:
        raise ProviderNotConfiguredError("provider_not_configured")

    return replace(config, image_model=image_model)


def test_image_provider_config(provider: str | None = None) -> ImageProviderTestResponse:
    config = prepare_image_provider_for_generation(provider)
    return ImageProviderTestResponse(
        provider=config.provider,
        imageModel=config.image_model,
        baseUrl=config.base_url,
        message="Image provider configuration is ready for server-side generation",
    )
