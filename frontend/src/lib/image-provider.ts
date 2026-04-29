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
  const normalized = message.toLowerCase();
  return normalized.includes("provider_not_configured") || normalized.includes("image provider") || normalized.includes("未配置") || normalized.includes("api key");
}

export function getImageProviderSetupMessage(message?: string) {
  if (!message) {
    return "当前还没有配置生图厂商或 API Key，请先去 AI 生成设置完成配置。";
  }

  if (isProviderNotConfiguredMessage(message)) {
    return "当前还没有配置生图厂商或 API Key，请先去 AI 生成设置完成厂商、Key 和模型配置。";
  }

  return message;
}
