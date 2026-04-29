import type { ImageProviderId } from "./api/types";

export const imageProviderOptions: Array<{ id: ImageProviderId; label: string; defaultModel: string }> = [
  { id: "openai", label: "OpenAI", defaultModel: "gpt-image-1" },
  { id: "volcengine", label: "火山方舟", defaultModel: "seedream" },
  { id: "tencent", label: "腾讯混元", defaultModel: "hunyuan-image" },
  { id: "alibaba", label: "阿里云通义万相", defaultModel: "wanx" },
  { id: "bfl", label: "Black Forest Labs", defaultModel: "flux.2" },
  { id: "stability", label: "Stability AI", defaultModel: "stable-image" },
];

const providerLabels = new Map(imageProviderOptions.map((item) => [item.id, item.label]));
const defaultModels = new Map(imageProviderOptions.map((item) => [item.id, item.defaultModel]));

export function getImageProviderLabel(provider: ImageProviderId) {
  return providerLabels.get(provider) ?? provider;
}

export function getDefaultImageModel(provider: ImageProviderId) {
  return defaultModels.get(provider) ?? "gpt-image-1";
}

export function isProviderNotConfiguredMessage(message: string) {
  return message.trim() === "provider_not_configured";
}

export function isProviderModelNotConfiguredMessage(message: string) {
  return message.trim() === "provider_model_not_configured";
}

export function isImageProviderSetupError(message: string) {
  return isProviderNotConfiguredMessage(message) || isProviderModelNotConfiguredMessage(message);
}

export function getImageProviderSetupMessage(message?: string) {
  if (!message) {
    return "当前还没有配置生图厂商或 API Key，请先去 AI 生成设置完成配置。";
  }

  if (isProviderNotConfiguredMessage(message)) {
    return "当前还没有配置生图厂商或 API Key，请先去 AI 生成设置完成厂商、Key 和模型配置。";
  }

  if (isProviderModelNotConfiguredMessage(message)) {
    return "当前厂商还没有可用的默认模型，请先去 AI 生成设置补齐模型配置。";
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("image provider") || normalized.includes("未配置") || normalized.includes("api key")) {
    return "当前还没有配置生图厂商或 API Key，请先去 AI 生成设置完成厂商、Key 和模型配置。";
  }

  return message;
}

export function getImageProviderTestMessage(result: { ok: boolean; code?: string | null; message: string }) {
  if (result.ok) {
    return result.message || "测试通过，当前配置已可用于服务端图片生成。";
  }

  if (result.code === "provider_not_configured") {
    return "当前还没有配置可用的生图厂商或 API Key，请先保存配置后再测试。";
  }

  if (result.code === "provider_model_not_configured") {
    return "当前厂商还没有可用模型，请先补齐或修改 Image Model 后再测试。";
  }

  return result.message || "当前配置暂不可用，请先检查厂商、Key 和模型设置。";
}
