"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";

import { apiClient } from "../lib/api/client";
import type { AssetSummary, PostDetail, PostListItem } from "../lib/api/types";
import { buildCopyVariants, getCandidateAssets, getFailureTypeLabel, getPublishNarrative, getStatusLabel, getStatusTone } from "../lib/product";
import { StatusPill } from "./ui";

export function ComposerWorkbench({
  post,
  allAssets,
  candidates,
}: {
  post: PostDetail | null;
  allAssets: AssetSummary[];
  candidates: PostListItem[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const copyVariants = useMemo(() => (post ? buildCopyVariants(post) : []), [post]);
  const imageCandidates = useMemo(() => (post ? getCandidateAssets(post, allAssets) : []), [allAssets, post]);

  const [selectedCopyId, setSelectedCopyId] = useState(copyVariants[0]?.id ?? "");
  const [selectedAssetId, setSelectedAssetId] = useState(imageCandidates[0]?.id ?? "");
  const [reviewComment, setReviewComment] = useState("这版已经确认完成，可以继续往下走。");

  useEffect(() => {
    setSelectedCopyId(copyVariants[0]?.id ?? "");
    setSelectedAssetId(imageCandidates[0]?.id ?? "");
    setReviewComment("这版已经确认完成，可以继续往下走。");
    setNotice(null);
  }, [copyVariants, imageCandidates, post?.id]);

  const selectedCopy = copyVariants.find((item) => item.id === selectedCopyId) ?? copyVariants[0] ?? null;
  const selectedAsset = imageCandidates.find((item) => item.id === selectedAssetId) ?? imageCandidates[0] ?? null;
  const publishNarrative = post ? getPublishNarrative(post) : null;
  const latestPublishRecord = post?.publishRecords.at(-1);

  async function handleRefreshAICandidates() {
    if (!post) {
      return;
    }

    setPending(true);
    setNotice(null);

    try {
      const [copyTask, imageTask] = await Promise.all([
        apiClient.posts.generateCopy(post.id, { operator: "frontend-operator", payload: { topic: post.topic, title: post.title } }),
        apiClient.posts.generateImages(post.id, { operator: "frontend-operator", payload: { title: post.title, topic: post.topic } }),
      ]);
      setNotice(`已刷新 AI 候选：文案任务 ${copyTask.status}，图片任务 ${imageTask.status}。`);
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "刷新 AI 候选失败");
    } finally {
      setPending(false);
    }
  }

  async function handleSaveSelection() {
    if (!post || !selectedCopy) {
      return;
    }

    setPending(true);
    setNotice(null);

    try {
      await apiClient.posts.update(post.id, {
        topic: post.topic,
        title: selectedCopy.title,
        body: selectedCopy.body,
        tags: post.tags,
        assetIds: selectedAsset ? [selectedAsset.id] : post.assetIds,
      });
      setNotice("已把当前选中的文案和图片保存为今天准备发的最终版。");
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存最终版失败");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmitReview(action: "submit" | "approve" | "reject" | "publish") {
    if (!post) {
      return;
    }

    setPending(true);
    setNotice(null);

    try {
      if (action === "submit") {
        await apiClient.posts.submitReview(post.id, { comment: reviewComment, operator: "frontend-operator" });
        setNotice("已提交确认，接下来可以在工作台里通过或退回。");
      }

      if (action === "approve") {
        await apiClient.posts.approve(post.id, { comment: reviewComment, operator: "frontend-operator" });
        setNotice("这版已经确认通过，可以交给 OpenClaw 去发。");
      }

      if (action === "reject") {
        await apiClient.posts.reject(post.id, { comment: reviewComment, operator: "frontend-operator" });
        setNotice("这版已退回修改，可以继续调整文案和图片。");
      }

      if (action === "publish") {
        const publishResult = await apiClient.posts.publish(post.id, { comment: reviewComment, operator: "frontend-operator" });
        const failureType = getFailureTypeLabel(publishResult.failureType);
        setNotice(`已交给 OpenClaw 去发。当前状态：${publishResult.publishStatus}${failureType ? `，失败分类：${failureType}` : ""}。`);
      }

      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "执行失败");
    } finally {
      setPending(false);
    }
  }

  if (!post) {
    return (
      <section className="product-empty-card">
        <strong>今天还没有可操作的主题</strong>
        <p>等新主题创建完成后，这里会直接进入“生成候选文案和图片、人工挑选最终版、交给 OpenClaw 去发”的工作流。</p>
      </section>
    );
  }

  return (
    <div className="composer-layout">
      <section className="composer-main-panel">
        <div className="composer-toolbar">
          <div>
            <span className="eyebrow">今天要发</span>
            <h2>{post.topic}</h2>
            <p>先选定文案和图片，再决定是否提交确认、通过或交给 OpenClaw 去发。</p>
          </div>

          <div className="tag-row">
            <StatusPill label={getStatusLabel(post.status)} tone={getStatusTone(post.status)} />
            {post.platformPostId ? <StatusPill label={`平台 ID ${post.platformPostId}`} tone="positive" /> : null}
            {getFailureTypeLabel(latestPublishRecord?.failureType) ? <StatusPill label={getFailureTypeLabel(latestPublishRecord?.failureType) ?? ""} tone="critical" /> : null}
          </div>
        </div>

        <section className="product-card">
          <div className="product-section-head">
            <div>
              <span className="eyebrow">第一步</span>
              <h3>先看 AI 给出的 3 版文案</h3>
            </div>
            <button type="button" className="ghost-button" onClick={handleRefreshAICandidates} disabled={pending}>
              刷新 AI 候选
            </button>
          </div>

          <div className="candidate-grid">
            {copyVariants.map((variant) => {
              const active = variant.id === selectedCopy?.id;

              return (
                <button key={variant.id} type="button" className={`candidate-card${active ? " candidate-card-active" : ""}`} onClick={() => setSelectedCopyId(variant.id)}>
                  <div className="candidate-head">
                    <StatusPill label={variant.name} tone={active ? "positive" : "neutral"} />
                    <span className="muted-inline">{variant.summary}</span>
                  </div>
                  <strong>{variant.title}</strong>
                  <p>{variant.body}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="product-card">
          <div className="product-section-head">
            <div>
              <span className="eyebrow">第二步</span>
              <h3>挑今天要配的图片</h3>
            </div>
            <span className="muted-inline">候选图 {imageCandidates.length} 张</span>
          </div>

          <div className="candidate-image-grid">
            {imageCandidates.map((asset) => {
              const active = asset.id === selectedAsset?.id;

              return (
                <button key={asset.id} type="button" className={`image-option${active ? " image-option-active" : ""}`} onClick={() => setSelectedAssetId(asset.id)}>
                  <div className="image-option-cover" style={{ backgroundImage: `url(${asset.url})` }} />
                  <div className="image-option-copy">
                    <strong>{asset.name}</strong>
                    <p>{asset.fileName}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="product-card preview-card">
          <div className="product-section-head">
            <div>
              <span className="eyebrow">第三步</span>
              <h3>确认手机里的最终预览</h3>
            </div>
            <strong>准备交给 OpenClaw 的最终版</strong>
          </div>

          <div className="preview-layout">
            <div className="phone-frame">
              <div className="phone-screen">
                {selectedAsset ? <div className="phone-cover" style={{ backgroundImage: `url(${selectedAsset.url})` }} /> : null}
                <div className="phone-copy">
                  <strong>{selectedCopy?.title ?? post.title}</strong>
                  <p>{selectedCopy?.body ?? post.body}</p>
                </div>
              </div>
            </div>

            <div className="preview-summary">
              <article className="preview-summary-card">
                <span className="eyebrow">最终文案</span>
                <strong>{selectedCopy?.title ?? post.title}</strong>
                <p>{selectedCopy?.summary ?? "当前先用帖子里已有文案。"}</p>
              </article>
              <article className="preview-summary-card">
                <span className="eyebrow">最终图片</span>
                <strong>{selectedAsset?.name ?? "暂未选择图片"}</strong>
                <p>{selectedAsset ? "这张图会被保存为今天准备发送的最终封面。" : "需要先从候选图里挑一张。"}</p>
              </article>
              {publishNarrative ? (
                <article className={`state-card state-card-${publishNarrative.tone}`}>
                  <strong>{publishNarrative.headline}</strong>
                  <p>{publishNarrative.nextAction}</p>
                </article>
              ) : null}
            </div>
          </div>
        </section>
      </section>

      <aside className="composer-side-panel">
        <section className="product-card action-panel-card">
          <div className="product-section-head compact-section-head">
            <div>
              <span className="eyebrow">第四步</span>
              <h3>往下推进</h3>
            </div>
          </div>

          <label className="field-block">
            <span>给自己留一句操作说明</span>
            <textarea rows={4} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} disabled={pending} />
          </label>

          <div className="action-column">
            <button type="button" onClick={handleSaveSelection} disabled={pending || !selectedCopy}>
              保存今天这版
            </button>
            <button type="button" className="secondary-button" onClick={() => handleSubmitReview("submit")} disabled={pending || post.status !== "draft"}>
              提交确认
            </button>
            <button type="button" className="secondary-button" onClick={() => handleSubmitReview("approve")} disabled={pending || post.status !== "in_review"}>
              确认通过
            </button>
            <button type="button" className="secondary-button" onClick={() => handleSubmitReview("reject")} disabled={pending || post.status !== "in_review"}>
              退回修改
            </button>
            <button type="button" className="accent-button" onClick={() => handleSubmitReview("publish")} disabled={pending || post.status !== "approved"}>
              确认这版并交给 OpenClaw 去发
            </button>
          </div>

          {latestPublishRecord?.errorMessage ? <p className="feedback-text">最近失败原因：{latestPublishRecord.errorMessage}</p> : null}
          {notice ? <p className="feedback-text">{notice}</p> : null}
        </section>

        <section className="product-card">
          <div className="product-section-head compact-section-head">
            <div>
              <span className="eyebrow">待处理主题</span>
              <h3>今天的工作队列</h3>
            </div>
          </div>

          <div className="queue-list">
            {candidates.map((item) => (
              <Link key={item.id} href={`/review?postId=${item.id}`} className={`queue-item${item.id === post.id ? " queue-item-active" : ""}`}>
                <div className="queue-item-head">
                  <StatusPill label={getStatusLabel(item.status)} tone={getStatusTone(item.status)} />
                  <span className="muted-inline">{new Date(item.updatedAt).toLocaleString("zh-CN")}</span>
                </div>
                <strong>{item.topic}</strong>
                <p>{item.title}</p>
              </Link>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
