"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { apiClient } from "../lib/api/client";
import { StatusPill } from "./ui";

export function AssetUploadPanel({ postId, assetIds }: { postId: string; assetIds: string[] }) {
  const router = useRouter();
  const [name, setName] = useState("工作台新素材");
  const [fileName, setFileName] = useState("workspace-asset.jpg");
  const [contentType, setContentType] = useState("image/jpeg");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleUpload() {
    setPending(true);
    setNotice(null);

    try {
      const asset = await apiClient.assets.upload({
        name,
        fileName,
        contentType,
        postId,
      });

      setNotice(`素材 ${asset.name} 已上传，并已关联到当前帖子（${asset.id}）。`);
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "素材上传失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="asset-upload-panel">
      <div className="field-grid">
        <label className="field-block">
          <span>素材名称</span>
          <input value={name} onChange={(event) => setName(event.target.value)} disabled={pending} />
        </label>
        <label className="field-block">
          <span>文件名</span>
          <input value={fileName} onChange={(event) => setFileName(event.target.value)} disabled={pending} />
        </label>
      </div>

      <label className="field-block">
        <span>内容类型</span>
        <input value={contentType} onChange={(event) => setContentType(event.target.value)} disabled={pending} />
      </label>

      <div className="asset-meta-row">
        <span className="muted-copy">当前帖子已关联 {assetIds.length} 个素材</span>
        <div className="tag-row">
          {assetIds.length > 0 ? assetIds.map((assetId) => <StatusPill key={assetId} label={assetId} />) : <StatusPill label="暂无已关联素材" />}
        </div>
      </div>

      <div className="action-row">
        <button type="button" onClick={handleUpload} disabled={pending}>
          {pending ? "上传中..." : "上传并关联素材"}
        </button>
      </div>

      {notice ? <p className="feedback-text">{notice}</p> : null}
    </div>
  );
}
