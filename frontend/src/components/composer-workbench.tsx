"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";

import { apiClient } from "../lib/api/client";
import type { PostDetail, PostListItem } from "../lib/api/types";
import { getImageProviderSetupMessage, isImageProviderSetupError } from "../lib/image-provider";
import type { AccountOverview, MessageTask } from "../lib/product";
import { buildCopyVariants, getAccountAvailabilityNotice, getAccountConnectionStatusLabel, getAccountConnectionStatusTone, getAccountStatusLabel, getAccountStatusTone, getCandidateAssets, getFailureTypeLabel, getPublishFlowState, getPublishNarrative, getPublishRecordLabel, getSharedConfirmationInfo, getStatusLabel, getStatusTone } from "../lib/product";
import { StatusPill } from "./ui";

export function ComposerWorkbench({
  post,
  candidates,
  accounts,
  task,
}: {
  post: PostDetail | null;
  candidates: PostListItem[];
  accounts: AccountOverview[];
  task: MessageTask | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [imageProviderSetupRequired, setImageProviderSetupRequired] = useState(false);
  const [noticeLink, setNoticeLink] = useState<{ href: string; label: string } | null>(null);

  const copyVariants = useMemo(() => (post ? buildCopyVariants(post) : []), [post]);
  const imageCandidates = useMemo(() => (post ? getCandidateAssets(post) : []), [post]);
  const hasRealCopy = copyVariants.length > 0;
  const hasRealImages = imageCandidates.length > 0;

  const initialAccountId = task?.accountId ?? accounts[0]?.id ?? "";
  const [selectedCopyId, setSelectedCopyId] = useState(copyVariants[0]?.id ?? "");
  const [selectedAssetId, setSelectedAssetId] = useState(imageCandidates[0]?.id ?? "");
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId);
  const [reviewComment, setReviewComment] = useState("这版已经确认完成，可以继续往下走。");

  useEffect(() => {
    setSelectedCopyId(copyVariants[0]?.id ?? "");
    setSelectedAssetId(imageCandidates[0]?.id ?? "");
    setSelectedAccountId(task?.accountId ?? accounts[0]?.id ?? "");
    setReviewComment("这版已经确认完成，可以继续往下走。");
    setNotice(null);
  }, [accounts, copyVariants, imageCandidates, post?.id, task?.accountId]);

  const selectedCopy = copyVariants.find((item) => item.id === selectedCopyId) ?? copyVariants[0] ?? null;
  const selectedAsset = imageCandidates.find((item) => item.id === selectedAssetId) ?? imageCandidates[0] ?? null;
  const selectedAccount = accounts.find((item) => item.id === selectedAccountId) ?? accounts[0] ?? null;
  const publishNarrative = post ? getPublishNarrative(post) : null;
  const publishFlowState = post ? getPublishFlowState(post) : null;
  const latestPublishRecord = post?.publishRecords.at(-1);
  const sharedConfirmation = post ? getSharedConfirmationInfo(post, task) : null;
  const accountAvailability = selectedAccount ? getAccountAvailabilityNotice(selectedAccount) : null;

  function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "请求失败";
  }

  async function handleRefreshAICandidates() {
    if (!post) {
      return;
    }

    setPending(true);
    setNotice(null);
    setImageProviderSetupRequired(false);
    setNoticeLink(null);

    try {
      const generateImages = async () => {
        try {
          return await apiClient.posts.generateImages(post.id, { operator: "frontend-operator", payload: { title: post.title, topic: post.topic } });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const status = (error as { status?: number }).status;
          if (status === 422 && (message === "provider_not_configured" || message === "provider_model_not_configured")) {
            const detail = message === "provider_model_not_configured"
              ? "图片模型未配置，请先前往模型设置页完成图片模型配置。"
              : "图片生成服务商未配置，请先前往模型设置页完成服务商配置。";
            throw new Error(`生图预检失败 — ${detail}`);
          }
          throw error;
        }
      };

      const [copyResult, imageResult] = await Promise.allSettled([
        apiClient.posts.generateCopy(post.id, { operator: "frontend-operator", payload: { topic: post.topic, title: post.title } }),
        generateImages(),
      ]);

      if (copyResult.status === "fulfilled" && imageResult.status === "fulfilled") {
        setNoticeLink(null);
        setNotice("已刷新候选内容，文案和图片任务都已重新提交，等待真实结果回写。");
        startTransition(() => router.refresh());
        return;
      }

      const copyFailedMessage = copyResult.status === "rejected" ? getErrorMessage(copyResult.reason) : null;
      const imageFailedMessage = imageResult.status === "rejected" ? getErrorMessage(imageResult.reason) : null;
      const imageNeedsProviderSetup = imageFailedMessage ? isImageProviderSetupError(imageFailedMessage) : false;

      if (imageNeedsProviderSetup) {
        setImageProviderSetupRequired(true);
      }

      if (copyResult.status === "fulfilled" && imageFailedMessage) {
        setNotice(`文案任务已重新提交，但图片生成失败：${getImageProviderSetupMessage(imageFailedMessage)}`);
        startTransition(() => router.refresh());
        return;
      }

      if (imageResult.status === "fulfilled" && copyFailedMessage) {
        setNotice(`图片任务已重新提交，但文案生成失败：${copyFailedMessage}`);
        startTransition(() => router.refresh());
        return;
      }

      setNotice(imageFailedMessage ? getImageProviderSetupMessage(imageFailedMessage) : (copyFailedMessage ?? "刷新候选内容失败"));
    } catch (error) {
      const message = getErrorMessage(error);
      setImageProviderSetupRequired(isImageProviderSetupError(message));
      setNotice(getImageProviderSetupMessage(message));
      if (message.includes("provider_not_configured") || message.includes("服务商未配置") || message.includes("模型未配置")) {
        setNoticeLink({ href: "/settings/models", label: "前往模型配置页" });
      }
    } finally {
      setPending(false);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function renderNotice() {
    if (!notice) {
      return null;
    }
    return (
      <p className="feedback-text">
        {notice}
        {noticeLink ? (
          <>
            {" "}
            <a href={noticeLink.href} className="text-link">
              {noticeLink.label}
            </a>
          </>
        ) : null}
      </p>
    );
  }

  async function handleSaveSelection() {
    if (!post || !selectedCopy) {
      return;
    }

    setPending(true);
    setNotice(null);
    setNoticeLink(null);

    try {
      await apiClient.confirmations.update(post.id, {
        title: selectedCopy.title,
        body: selectedCopy.body,
        tags: post.tags,
        assetIds: selectedAsset ? [selectedAsset.id] : post.assetIds,
        accountId: selectedAccount?.id,
      });
      setNoticeLink(null);
      setNotice(`已保存当前确认版。${selectedAccount ? `当前归属账号已更新为 ${selectedAccount.name}。` : ""}`);
      startTransition(() => router.refresh());
    } catch (error) {
      setNoticeLink(null);
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
    setNoticeLink(null);

    try {
      if ((action === "approve" || action === "publish") && selectedAccount?.id && selectedAccount.id !== post.accountId) {
        await apiClient.confirmations.update(post.id, { accountId: selectedAccount.id });
      }

      if (action === "submit") {
        await apiClient.posts.submitReview(post.id, { comment: reviewComment, operator: "frontend-operator" });
        setNoticeLink(null);
        setNotice("已提交人工确认，接下来可以在这里通过或退回。");
      }

      if (action === "approve") {
        await apiClient.posts.approve(post.id, { comment: reviewComment, operator: "frontend-operator" });
        setNoticeLink(null);
        setNotice(`这版已经确认通过${selectedAccount ? `，准备交给 ${selectedAccount.name}` : ""}。`);
      }

      if (action === "reject") {
        await apiClient.posts.reject(post.id, { comment: reviewComment, operator: "frontend-operator" });
        setNoticeLink(null);
        setNotice("这版已退回修改，可以继续调整文案、图片或账号选择。");
      }

      if (action === "publish") {
        const publishResult = await apiClient.posts.publish(post.id, { comment: reviewComment, operator: "frontend-operator" });
        const publishLabel = getPublishRecordLabel(publishResult.publishStatus);
        const failureType = getFailureTypeLabel(publishResult.failureType);
        setNoticeLink(null);
        setNotice(`${publishLabel}${selectedAccount ? `，目标账号 ${selectedAccount.name}` : ""}。${publishResult.detail}${failureType ? ` 失败分类：${failureType}。` : ""}`);
      }

      startTransition(() => router.refresh());
    } catch (error) {
      setNoticeLink(null);
      setNotice(error instanceof Error ? error.message : "执行失败");
    } finally {
      setPending(false);
    }
  }

  if (!post) {
    return (
      <section className="product-empty-card">
        <strong>当前还没有可确认的任务</strong>
        <p>等消息任务中心里有任务生成完成后，这里会进入“确认候选文案、确认候选图片、选择发布账号、交给 OpenClaw 去发”的工作流。</p>
      </section>
    );
  }

  return (
    <div className="composer-layout">
      <section className="composer-main-panel">
        <div className="composer-toolbar">
          <div>
            <span className="eyebrow">内容确认台</span>
            <h2>{post.topic}</h2>
            <p>{task ? `这条任务来自 ${task.accountName} 的聊天需求，先确认系统生成好的候选内容，再决定由哪个账号发。` : "先确认系统生成好的候选内容，再决定由哪个账号发。"}</p>
          </div>

          <div className="tag-row">
            <StatusPill label={getStatusLabel(post.status)} tone={getStatusTone(post.status)} />
            {task ? <StatusPill label={task.stageLabel} tone={task.stageTone} /> : null}
            {publishFlowState ? <StatusPill label={publishFlowState.label} tone={publishFlowState.tone} /> : null}
            {post.platformPostId ? <StatusPill label={`平台 ID ${post.platformPostId}`} tone="positive" /> : null}
            {getFailureTypeLabel(latestPublishRecord?.failureType) ? <StatusPill label={getFailureTypeLabel(latestPublishRecord?.failureType) ?? ""} tone="critical" /> : null}
          </div>
        </div>

        {sharedConfirmation ? (
          <section className="product-card message-source-card">
            <div className="product-section-head compact-section-head">
              <div>
                <span className="eyebrow">同一份确认对象</span>
                <h3>{sharedConfirmation.headline}</h3>
              </div>
              <StatusPill label={sharedConfirmation.sourceLabel} tone="positive" />
            </div>
            <p>{sharedConfirmation.detail}</p>
          </section>
        ) : null}

        {task ? (
          <section className="product-card message-source-card">
            <div className="product-section-head compact-section-head">
              <div>
                <span className="eyebrow">消息来源</span>
                <h3>这条内容最初是怎么进来的</h3>
              </div>
            </div>
            <div className="detail-meta-grid">
              <article className="detail-meta-card">
                <span className="eyebrow">用户消息</span>
                <strong>聊天入口</strong>
                <p>{task.sourceMessage}</p>
              </article>
              <article className="detail-meta-card">
                <span className="eyebrow">当前任务进度</span>
                <strong>{task.stageLabel}</strong>
                <p>{task.nextAction}</p>
              </article>
              {selectedAccount ? (
                <article className="detail-meta-card">
                  <span className="eyebrow">账号真实状态</span>
                  <strong>{accountAvailability?.title ?? "账号状态待确认"}</strong>
                  <p>{accountAvailability?.detail ?? "请先检查账号连接状态。"}</p>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="product-card">
          <div className="product-section-head">
            <div>
              <span className="eyebrow">第一步</span>
              <h3>确认系统生成的候选文案</h3>
            </div>
            <button type="button" className="ghost-button" onClick={handleRefreshAICandidates} disabled={pending}>
              刷新候选内容
            </button>
          </div>

          {hasRealCopy ? (
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
                    {post.tags.length > 0 ? <p className="muted-inline">标签：{post.tags.map((tag) => `#${tag}`).join(" ")}</p> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <article className="state-card state-card-neutral">
              <strong>文案还没生成完成</strong>
              <p>当前后端还没有返回真实标题和正文，所以这里暂时没有可确认的文案结果。</p>
            </article>
          )}
        </section>

        <section className="product-card">
          <div className="product-section-head">
            <div>
              <span className="eyebrow">第二步</span>
              <h3>确认系统生成的候选图片</h3>
            </div>
            <span className="muted-inline">候选图 {imageCandidates.length} 张</span>
          </div>

          {hasRealImages ? (
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
          ) : (
            <article className="state-card state-card-neutral">
              <strong>图片还没生成完成</strong>
              <p>当前后端还没有返回真实素材，所以这里暂时没有可确认的配图结果。</p>
              <p>如果是因为还没配置生图厂商或 API Key，可以先去 <Link href="/settings/models" className="text-link">AI 生成设置</Link> 完成配置。</p>
            </article>
          )}
        </section>

        <section className="product-card preview-card">
          <div className="product-section-head">
            <div>
              <span className="eyebrow">第三步</span>
              <h3>选定发布账号并确认最终预览</h3>
            </div>
            <strong>准备交给 OpenClaw 的确认版</strong>
          </div>

          <div className="preview-layout">
            <div className="phone-frame">
              <div className="phone-screen">
                {selectedAsset ? <div className="phone-cover" style={{ backgroundImage: `url(${selectedAsset.url})` }} /> : null}
                <div className="phone-copy">
                <strong>{selectedCopy?.title ?? (hasRealCopy ? post.title : "等待真实文案结果")}</strong>
                <p>{selectedCopy?.body ?? (hasRealCopy ? post.body : "当前还没有可预览的真实文案内容。")}</p>
                </div>
              </div>
            </div>

            <div className="preview-summary">
              <article className="preview-summary-card">
                <span className="eyebrow">发布账号</span>
                {selectedAccount ? (
                  <div className="account-identity">
                    {selectedAccount.avatarUrl ? <img src={selectedAccount.avatarUrl} alt={`${selectedAccount.name} 头像`} className="account-avatar" /> : <div className="account-avatar account-avatar-fallback">{selectedAccount.name.slice(0, 1)}</div>}
                    <div>
                      <strong>{selectedAccount.name}</strong>
                      <p>{selectedAccount.handle}，当前状态 {getAccountStatusLabel(selectedAccount.status)}。</p>
                    </div>
                  </div>
                ) : (
                  <p>先从右侧选择一个要发布的账号。</p>
                )}
                {selectedAccount ? (
                  <div className="tag-row">
                    <StatusPill label={getAccountConnectionStatusLabel(selectedAccount.connectionStatus)} tone={getAccountConnectionStatusTone(selectedAccount.connectionStatus)} />
                    {selectedAccount.lastValidatedAt ? <StatusPill label={`最近验证 ${new Date(selectedAccount.lastValidatedAt).toLocaleString("zh-CN")}`} /> : null}
                  </div>
                ) : null}
              </article>
              <article className="preview-summary-card">
                <span className="eyebrow">最终文案</span>
                <strong>{selectedCopy?.title ?? (hasRealCopy ? post.title : "等待真实文案结果")}</strong>
                <p>{selectedCopy?.summary ?? (hasRealCopy ? "当前展示的是后端返回的真实文案。" : "文案生成完成后，这里会显示真实标题和正文。")}</p>
              </article>
              <article className="preview-summary-card">
                <span className="eyebrow">最终图片</span>
                <strong>{selectedAsset?.name ?? "等待真实图片结果"}</strong>
                <p>{selectedAsset ? "这张图会被保存为这次任务的最终封面。" : "图片生成完成后，这里会显示真实素材。"}</p>
              </article>
              {publishFlowState ? (
                <article className={`preview-summary-card state-card state-card-${publishFlowState.tone}`}>
                  <span className="eyebrow">当前发布进度</span>
                  <strong>{publishFlowState.label}</strong>
                  <p>{publishFlowState.detail}</p>
                </article>
              ) : null}
              {publishNarrative ? (
                <article className={`state-card state-card-${publishNarrative.tone}`}>
                  <strong>{publishNarrative.headline}</strong>
                  <p>{publishNarrative.nextAction}</p>
                </article>
              ) : null}
              {accountAvailability ? (
                <article className={`state-card state-card-${accountAvailability.tone}`}>
                  <strong>{accountAvailability.title}</strong>
                  <p>{accountAvailability.detail}</p>
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
              <h3>确认账号并往下推进</h3>
            </div>
          </div>

          <div className="account-choice-list">
            {accounts.map((account) => {
              const active = account.id === selectedAccountId;

              return (
                <button key={account.id} type="button" className={`account-choice-card${active ? " account-choice-card-active" : ""}`} onClick={() => setSelectedAccountId(account.id)}>
                  <div className="queue-item-head account-choice-head">
                    <div className="account-identity">
                      {account.avatarUrl ? <img src={account.avatarUrl} alt={`${account.name} 头像`} className="account-avatar" /> : <div className="account-avatar account-avatar-fallback">{account.name.slice(0, 1)}</div>}
                      <div>
                        <strong>{account.name}</strong>
                        <p>{account.handle}</p>
                      </div>
                    </div>
                    <StatusPill label={getAccountStatusLabel(account.status)} tone={getAccountStatusTone(account.status)} />
                  </div>
                  <p>{account.summary}</p>
                  <div className="tag-row">
                    <StatusPill label={getAccountConnectionStatusLabel(account.connectionStatus)} tone={getAccountConnectionStatusTone(account.connectionStatus)} />
                    {account.lastValidatedAt ? <StatusPill label={`最近验证 ${new Date(account.lastValidatedAt).toLocaleString("zh-CN")}`} /> : null}
                  </div>
                </button>
              );
            })}
          </div>

          <label className="field-block">
            <span>给这次确认留一句说明</span>
            <textarea rows={4} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} disabled={pending} />
          </label>

          <div className="action-column">
            <button type="button" onClick={handleSaveSelection} disabled={pending || !selectedCopy || !selectedAccount || !hasRealCopy}>
              保存这次确认版
            </button>
            <button type="button" className="secondary-button" onClick={() => handleSubmitReview("submit")} disabled={pending || post.status !== "draft"}>
              提交人工确认
            </button>
            <button type="button" className="secondary-button" onClick={() => handleSubmitReview("approve")} disabled={pending || post.status !== "in_review"}>
              确认通过
            </button>
            <button type="button" className="secondary-button" onClick={() => handleSubmitReview("reject")} disabled={pending || post.status !== "in_review"}>
              退回修改
            </button>
            <button type="button" className="accent-button" onClick={() => handleSubmitReview("publish")} disabled={pending || post.status !== "approved" || !selectedAccount || !hasRealCopy || !hasRealImages || !accountAvailability?.canPublish}>
              交给 OpenClaw 按此账号去发
            </button>
          </div>

          {latestPublishRecord?.errorMessage ? <p className="feedback-text">最近失败原因：{latestPublishRecord.errorMessage}</p> : null}
          {selectedAccount && !accountAvailability?.canPublish ? <p className="feedback-text">当前账号还不能真实发布，请先处理连接状态后再继续。</p> : null}
          {notice ? <p className="feedback-text">{notice}</p> : null}
          {imageProviderSetupRequired ? <p className="feedback-text">当前图片生成依赖生图厂商配置，先去 <Link href="/settings/models" className="text-link">AI 生成设置</Link> 完成厂商、Key 和模型配置。</p> : null}
        </section>

        <section className="product-card">
          <div className="product-section-head compact-section-head">
            <div>
              <span className="eyebrow">待确认任务</span>
              <h3>今天的确认队列</h3>
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
