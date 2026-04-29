"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { apiClient } from "../../../lib/api/client";
import type { ImageProviderConfigResponse } from "../../../lib/api/types";

const PROVIDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "openai", label: "OpenAI" },
  { value: "bfl", label: "Black Forest Labs (Flux)" },
  { value: "volcengine", label: "火山引擎 (Seedream)" },
  { value: "tencent", label: "腾讯混元" },
  { value: "alibaba", label: "阿里巴巴 (通义万相)" },
  { value: "stability", label: "Stability AI" },
];

const PROVIDER_DEFAULTS: Record<string, { imageModel: string; baseUrl?: string }> = {
  openai: { imageModel: "gpt-image-1" },
  bfl: { imageModel: "flux.2" },
  volcengine: { imageModel: "seedream" },
  tencent: { imageModel: "hunyuan-image" },
  alibaba: { imageModel: "wanx" },
  stability: { imageModel: "stable-image" },
};

function EmptyState() {
  return (
    <div className="settings-section">
      <p className="settings-hint">当前还没有配置图片生成服务商。选择一个服务商并填写 API Key 即可开始生成图片。</p>
    </div>
  );
}

function ConfigBanner({ config }: { config: ImageProviderConfigResponse }) {
  if (!config.provider) {
    return null;
  }

  const providerLabel = PROVIDER_OPTIONS.find((item) => item.value === config.provider)?.label ?? config.provider;

  return (
    <div className="settings-section settings-config-banner">
      <span className="settings-banner-eyebrow">当前配置</span>
      <strong>{providerLabel}</strong>
      <p>
        默认模型：{config.imageModel || "未设置"}
        {config.baseUrl ? ` | API 地址：${config.baseUrl}` : ""}
      </p>
      {config.hasKey ? (
        <p className="settings-key-info">API Key 已配置 (显示：{config.maskedKey ?? "***"})</p>
      ) : (
        <p className="settings-key-info settings-key-missing">API Key 未配置</p>
      )}
      {config.updatedAt ? (
        <p className="settings-key-info">最近更新：{new Date(config.updatedAt).toLocaleString("zh-CN")}</p>
      ) : null}
    </div>
  );
}

export function ModelSettingsPage({ initialConfig }: { initialConfig: ImageProviderConfigResponse | null }) {
  const router = useRouter();
  const [config, setConfig] = useState<ImageProviderConfigResponse | null>(initialConfig);
  const [provider, setProvider] = useState(config?.provider ?? "openai");
  const [apiKey, setApiKey] = useState("");
  const [imageModel, setImageModel] = useState(config?.imageModel ?? "");
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? "");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "positive" | "critical" | "neutral"; text: string } | null>(null);

  const handleProviderChange = (value: string) => {
    setProvider(value);
    const defaults = PROVIDER_DEFAULTS[value];
    if (defaults) {
      setImageModel(defaults.imageModel);
      setBaseUrl(defaults.baseUrl ?? "");
    } else {
      setImageModel("");
      setBaseUrl("");
    }
  };

  const handleSave = async () => {
    setPending(true);
    setNotice(null);
    try {
      const result = await apiClient.imageProvider.upsertConfig({
        provider,
        apiKey: apiKey || undefined,
        imageModel: imageModel || undefined,
        baseUrl: baseUrl || undefined,
      });
      setConfig(result);
      setApiKey("");
      setNotice({ tone: "positive", text: `配置已保存。当前服务商：${PROVIDER_OPTIONS.find((item) => item.value === result.provider)?.label ?? result.provider}，默认模型：${result.imageModel ?? "未设置"}。` });
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice({ tone: "critical", text: error instanceof Error ? error.message : "保存配置失败" });
    } finally {
      setPending(false);
    }
  };

  const handleTest = async () => {
    setPending(true);
    setNotice(null);
    try {
      const result = await apiClient.imageProvider.testConfig({ provider: provider || undefined });
      setNotice({ tone: "positive", text: `连接测试通过。服务商：${PROVIDER_OPTIONS.find((item) => item.value === result.provider)?.label ?? result.provider}，模型：${result.imageModel}。${result.message}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = (error as { status?: number }).status;
      if (status === 422 && message === "provider_not_configured") {
        setNotice({ tone: "critical", text: "测试失败 — 服务商未配置或 API Key 缺失。请先选择服务商并填写 API Key。" });
      } else {
        setNotice({ tone: "critical", text: `测试失败：${message}` });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="settings-layout">
      {config?.provider ? <ConfigBanner config={config} /> : <EmptyState />}

      <div className="settings-section">
        <h3>服务商配置</h3>

        <label className="field-block">
          <span>图片生成服务商</span>
          <select value={provider} onChange={(event) => handleProviderChange(event.target.value)} disabled={pending}>
            {PROVIDER_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field-block">
          <span>API Key</span>
          <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} disabled={pending} placeholder={config?.hasKey ? "留空则不更新已有 Key" : "填写服务商的 API Key"} />
          <span className="field-hint">{config?.hasKey ? "当前已保存 API Key，留空则保留现有 Key 不变。" : "必填，用于后端调用图片生成接口。"}</span>
        </label>

        <label className="field-block">
          <span>模型名称（可选）</span>
          <input type="text" value={imageModel} onChange={(event) => setImageModel(event.target.value)} disabled={pending} placeholder="留空则使用所选服务商的默认模型" />
          <span className="field-hint">留空时后端会根据所选服务商自动补齐默认模型。</span>
        </label>

        <label className="field-block">
          <span>自定义 API 地址（可选）</span>
          <input type="text" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} disabled={pending} placeholder="留空则使用服务商官方地址" />
          <span className="field-hint">仅当你使用代理或兼容接口时需要填写。</span>
        </label>

        {notice ? (
          <p className={`settings-notice settings-notice-${notice.tone}`}>{notice.text}</p>
        ) : null}

        <div className="settings-actions">
          <button type="button" onClick={handleSave} disabled={pending || !provider}>
            保存配置
          </button>
          <button type="button" className="secondary-button" onClick={handleTest} disabled={pending}>
            测试连接
          </button>
        </div>
      </div>
    </div>
  );
}
