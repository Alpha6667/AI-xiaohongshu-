"use client";

import { useEffect, useState } from "react";

import { apiClient } from "../lib/api/client";
import type { ImageProviderConfigResponse, ImageProviderId } from "../lib/api/types";
import { getDefaultImageModel, getImageProviderLabel, getImageProviderSetupMessage, getImageProviderTestMessage, imageProviderOptions } from "../lib/image-provider";
import { StatusPill } from "./ui";

const initialProvider: ImageProviderId = "openai";

function buildEmptyConfig(): ImageProviderConfigResponse {
  return {
    provider: initialProvider,
    imageModel: getDefaultImageModel(initialProvider),
    baseUrl: "",
    hasKey: false,
    maskedKey: null,
    updatedAt: null,
  };
}

export function ImageProviderSettingsPanel() {
  const [config, setConfig] = useState<ImageProviderConfigResponse>(buildEmptyConfig());
  const [apiKey, setApiKey] = useState("");
  const [modelEdited, setModelEdited] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [backendReady, setBackendReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function load() {
      try {
        const payload = await apiClient.settings.getImageProvider();
        if (disposed) {
          return;
        }
        setConfig({
          provider: payload.provider ?? initialProvider,
          imageModel: payload.imageModel || (payload.provider ? getDefaultImageModel(payload.provider as ImageProviderId) : getDefaultImageModel(initialProvider)),
          baseUrl: payload.baseUrl ?? "",
          hasKey: payload.hasKey,
          maskedKey: payload.maskedKey ?? null,
          updatedAt: payload.updatedAt ?? null,
        });
        setModelEdited(Boolean(payload.imageModel && payload.provider && payload.imageModel !== getDefaultImageModel(payload.provider as ImageProviderId)));
        setBackendReady(true);
      } catch (error) {
        if (disposed) {
          return;
        }
        setBackendReady(false);
        setConfig(buildEmptyConfig());
        setNotice(error instanceof Error ? `当前后端还没有提供模型配置接口，页面先按前端草稿模式展示。${getImageProviderSetupMessage(error.message)}` : "当前后端还没有提供模型配置接口，页面先按前端草稿模式展示。");
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      disposed = true;
    };
  }, []);

  function handleProviderChange(provider: ImageProviderId) {
    setConfig((current) => ({
      ...current,
      provider,
      imageModel: getDefaultImageModel(provider),
    }));
    setModelEdited(false);
    setNotice(null);
  }

  async function handleSave() {
    setSaving(true);
    setNotice(null);

    try {
      const payload = await apiClient.settings.saveImageProvider({
        provider: currentProvider,
        apiKey: apiKey.trim() || undefined,
        imageModel: modelEdited ? (config.imageModel?.trim() || undefined) : undefined,
        baseUrl: config.baseUrl?.trim() || undefined,
      });
      const nextProvider = (payload.provider as ImageProviderId | null | undefined) ?? currentProvider;
      setConfig({
        provider: nextProvider,
        imageModel: payload.imageModel || getDefaultImageModel(nextProvider),
        baseUrl: payload.baseUrl ?? "",
        hasKey: payload.hasKey,
        maskedKey: payload.maskedKey ?? null,
        updatedAt: payload.updatedAt ?? null,
      });
      setModelEdited(Boolean(payload.imageModel && payload.imageModel !== getDefaultImageModel(nextProvider)));
      setApiKey("");
      setBackendReady(true);
      setNotice(payload.hasKey ? "已保存模型厂商配置，后端后续会用这套配置去请求第三方生图服务。" : "已保存厂商和模型，但当前仍未配置 API Key。" );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存模型配置失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setNotice(null);

    try {
      const result = await apiClient.settings.testImageProvider({ provider: currentProvider });
      setNotice(getImageProviderTestMessage(result));
    } catch (error) {
      setNotice(error instanceof Error ? getImageProviderSetupMessage(error.message) : "测试连接失败");
    } finally {
      setTesting(false);
    }
  }

  const currentProvider: ImageProviderId = (config.provider as ImageProviderId) ?? initialProvider;
  const recommendedModel = getDefaultImageModel(currentProvider);
  const maskedKeyText = config.maskedKey ?? (config.hasKey ? "已配置，等待后端返回脱敏值" : "尚未配置");

  return (
    <div className="page-stack">
      {!backendReady ? (
        <article className="state-card state-card-warm">
          <strong>当前页面已就位，但后端配置接口还没接入到这个分支</strong>
          <p>你可以先确认厂商、默认模型和页面交互；等后端补上 `GET/POST /api/settings/image-provider` 后，这里会直接切到真实读写。</p>
        </article>
      ) : null}

      <div className="dashboard-hero product-hero">
        <article className="dashboard-highlight product-hero-main">
          <span className="eyebrow">AI 生成设置</span>
          <h2>先把生图厂商、Key 和默认模型稳定配好</h2>
          <p>这里保存的是服务端出图配置。页面只负责录入与脱敏展示，不会在浏览器里直接拿 Key 去请求第三方模型。</p>
        </article>

        <div className="product-hero-side compact-list-column">
          <article className={`state-card ${config.hasKey ? "state-card-positive" : "state-card-neutral"}`}>
            <strong>{config.hasKey ? "当前已保存 Key" : "当前还没有配置 Key"}</strong>
            <p>{config.hasKey ? `页面当前只展示脱敏结果：${maskedKeyText}` : "先完成厂商、模型和 API Key 保存，后续图片生成才能走真实服务端调用。"}</p>
          </article>
          <article className="state-card state-card-neutral">
            <strong>当前推荐模型</strong>
            <p>{getImageProviderLabel(currentProvider)} 默认使用 `{recommendedModel}`，切换厂商时会自动带出对应推荐模型。</p>
          </article>
        </div>
      </div>

      <div className="product-grid product-grid-two">
        <section className="product-card compact-list-column">
          <div className="product-section-head">
            <div>
              <span className="eyebrow">连接参数</span>
              <h3>选择厂商并保存服务端出图配置</h3>
            </div>
            {loading ? <StatusPill label="读取中" tone="warm" /> : <StatusPill label={backendReady ? "真实接口优先" : "前端草稿模式"} tone={backendReady ? "positive" : "warm"} />}
          </div>

          <div className="field-grid">
            <label className="field-block">
              <span>Provider</span>
              <select value={currentProvider} onChange={(event) => handleProviderChange(event.target.value as ImageProviderId)} disabled={saving || testing}>
                {imageProviderOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-block">
              <span>Image Model</span>
              <input value={config.imageModel ?? ""} onChange={(event) => {
                setModelEdited(true);
                setConfig((current) => ({ ...current, imageModel: event.target.value }));
              }} disabled={saving || testing} />
            </label>
          </div>

          <label className="field-block">
            <span>API Key</span>
            <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={config.hasKey ? `已保存脱敏值：${maskedKeyText}` : "请输入新的 API Key"} disabled={saving || testing} />
          </label>

          <label className="field-block">
            <span>Base URL（可选）</span>
            <input value={config.baseUrl ?? ""} onChange={(event) => setConfig((current) => ({ ...current, baseUrl: event.target.value }))} placeholder="默认留空，后端按厂商默认地址处理" disabled={saving || testing} />
          </label>

          <div className="action-row">
            <button type="button" onClick={handleSave} disabled={loading || saving || testing}>
              {saving ? "保存中..." : "保存配置"}
            </button>
            <button type="button" className="ghost-button" onClick={handleTest} disabled={loading || saving || testing}>
              {testing ? "测试中..." : "测试连接"}
            </button>
          </div>

          {notice ? <p className="feedback-text">{notice}</p> : null}
        </section>

        <section className="product-card compact-list-column">
          <div className="product-section-head">
            <div>
              <span className="eyebrow">当前状态</span>
              <h3>读取到的配置与安全边界</h3>
            </div>
          </div>

          <div className="detail-meta-grid">
            <article className="detail-meta-card">
              <span className="eyebrow">当前厂商</span>
              <strong>{getImageProviderLabel(currentProvider)}</strong>
              <p>切换厂商后，页面会自动带出推荐默认模型，但你仍然可以手动改模型名。</p>
            </article>

            <article className="detail-meta-card">
              <span className="eyebrow">Key 展示</span>
              <strong>{maskedKeyText}</strong>
              <p>页面只展示脱敏值，不提供完整 Key 回显，也不提供复制完整 Key 的入口。</p>
            </article>

            <article className="detail-meta-card">
              <span className="eyebrow">最近一次保存</span>
              <strong>{config.updatedAt ? new Date(config.updatedAt).toLocaleString("zh-CN") : "暂无记录"}</strong>
              <p>{config.baseUrl ? `当前已设置自定义 Base URL：${config.baseUrl}` : "当前未设置 Base URL，后端可按厂商默认地址处理。"}</p>
            </article>

            <article className="detail-meta-card">
              <span className="eyebrow">服务端约束</span>
              <strong>浏览器不直连模型厂商</strong>
              <p>后续真实生图必须仍然通过后端统一请求第三方 API，这里只负责配置输入、脱敏展示和测试触发。</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
