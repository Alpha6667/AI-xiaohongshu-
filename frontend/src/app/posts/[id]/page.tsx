import Link from "next/link";
import { notFound } from "next/navigation";

import { RefreshButton } from "../../../components/refresh-button";
import { SectionCard, SectionHeading, StatusPill } from "../../../components/ui";
import { apiClient } from "../../../lib/api/client";
import type { PostDetail } from "../../../lib/api/types";
import { adaptAccounts, adaptMessageTasks, buildAccountOverview, buildMessageTasks, getAccountAvailabilityNotice, getAccountForPost, getFailureTypeLabel, getGenerationReadiness, getMessageTaskForPost, getPostInteractionSummary, getPostSyncState, getPublishFlowState, getPublishNarrative, getPublishRecordLabel, getReviewStatus, getReviewStatusLabel, getReviewStatusTone, getSharedConfirmationInfo, getStatusLabel, getStatusTone } from "../../../lib/product";

async function getTasksOrNull() {
  try {
    return await apiClient.tasks.list();
  } catch {
    return null;
  }
}

async function getAccountsOrNull() {
  try {
    return await apiClient.accounts.list();
  } catch {
    return null;
  }
}

function getPublishSummary(post: PostDetail) {
  const latestRecord = post.publishRecords.at(-1);

  if (post.status === "published") {
    return latestRecord?.platformPostId ?? post.platformPostId
      ? `已完成发布，平台回写 ID：${latestRecord?.platformPostId ?? post.platformPostId}`
      : "已完成发布，等待平台 ID 展示。";
  }

  if (post.status === "publish_failed") {
    return latestRecord?.errorMessage || latestRecord?.detail || "发布失败，等待更明确的错误信息回写。";
  }

  if (post.status === "publishing") {
    return latestRecord?.detail || "发布请求已入队，等待结果回写。";
  }

  return post.platformPostId ? `当前已记录平台 ID：${post.platformPostId}` : "当前还未进入平台发布结果回写阶段。";
}

function getMetricsState(post: PostDetail) {
  if (post.metricsHistory.length === 0) {
    if (post.status === "published") {
      return {
        title: "已发布但暂无历史快照",
        description: "帖子已经发布，但指标采集结果还没有回写到历史中，可能是 worker 任务尚未追加快照。",
        tone: "warm" as const,
      };
    }

    return {
      title: "当前暂无指标历史",
      description: "帖子还未进入稳定采集阶段，所以详情页暂时不展示历史曲线。",
      tone: "neutral" as const,
    };
  }

  const latestSnapshot = post.metricsHistory.at(-1);
  if (!latestSnapshot) {
    return {
      title: "历史快照读取异常",
      description: "接口返回了历史数量，但最新快照无法读取，建议后端排查持久化序列。",
      tone: "critical" as const,
    };
  }

  const hasSummaryMismatch = latestSnapshot.views !== post.latestMetrics.views
    || latestSnapshot.likes !== post.latestMetrics.likes
    || latestSnapshot.favorites !== post.latestMetrics.favorites
    || latestSnapshot.comments !== post.latestMetrics.comments
    || latestSnapshot.followConversions !== post.latestMetrics.followConversions;

  if (hasSummaryMismatch) {
    return {
      title: "历史尾项与最新汇总不一致",
      description: "详情页指标历史的最后一项与帖子最新汇总不一致，建议后端核对汇总口径或写入顺序。",
      tone: "critical" as const,
    };
  }

  if (post.status === "published" && latestSnapshot.views === 0 && latestSnapshot.likes === 0 && latestSnapshot.favorites === 0 && latestSnapshot.comments === 0 && latestSnapshot.followConversions === 0) {
    return {
      title: "已发布但当前快照仍为 0",
      description: "当前已有历史快照，但所有指标仍为 0，可能只是刚发布后的初始采集结果。",
      tone: "warm" as const,
    };
  }

  return {
    title: "指标历史已回写",
    description: `当前已记录 ${post.metricsHistory.length} 条历史快照，详情页展示的是最新持久化结果。`,
    tone: "positive" as const,
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [postList, accountRecords, taskRecords] = await Promise.all([apiClient.posts.list(), getAccountsOrNull(), getTasksOrNull()]);
  let post: PostDetail;

  try {
    post = await apiClient.posts.getById(id);
  } catch (error) {
    if (typeof error === "object" && error && "status" in error && error.status === 404) {
      notFound();
    }
    throw error;
  }

  if (!post) {
    notFound();
  }

  const metricsState = getMetricsState(post);
  const latestPublishRecord = post.publishRecords.at(-1);
  const publishNarrative = getPublishNarrative(post);
  const publishFlowState = getPublishFlowState(post);
  const accounts = accountRecords ? adaptAccounts(accountRecords) : buildAccountOverview(postList);
  const tasks = taskRecords ? adaptMessageTasks(taskRecords, postList, accounts, !accountRecords) : buildMessageTasks(postList, accounts);
  const account = getAccountForPost(post, accounts, !accountRecords);
  const messageTask = getMessageTaskForPost(post, tasks);
  const sharedConfirmation = getSharedConfirmationInfo(post, messageTask);
  const accountAvailability = getAccountAvailabilityNotice(account);
  const syncState = getPostSyncState(post);
  const interactionSummary = getPostInteractionSummary(post);
  const reviewStatus = getReviewStatus(post);
  const generationReadiness = getGenerationReadiness({
    hasCopy: Boolean(post.title.trim() && post.body.trim()),
    hasImages: post.assets.length > 0 || post.assetIds.length > 0,
    requiresReview: messageTask?.requiresReview ?? post.status === "in_review",
  });

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="帖子记录" title={post.title || post.topic} description="直接看这条内容从定稿、发送到数据回写的完整记录。" />

        <div className="detail-overview">
          <div>
            <StatusPill label={getStatusLabel(post.status)} tone={getStatusTone(post.status)} />
            <StatusPill label={getReviewStatusLabel(reviewStatus)} tone={getReviewStatusTone(reviewStatus)} />
            <StatusPill label={publishFlowState.label} tone={publishFlowState.tone} />
            <p className="detail-topic">主题：{post.topic}</p>
          </div>
          <div className="action-row">
            <RefreshButton />
            <Link href="/posts" className="text-link product-link">
              返回帖子与数据
            </Link>
          </div>
        </div>

        <div className="detail-layout">
          <div className="detail-primary">
            <SectionCard className="nested-card">
              <SectionHeading eyebrow="同一份确认对象" title={sharedConfirmation.headline} />
              <article className="state-card state-card-positive">
                <strong>{sharedConfirmation.sourceLabel}</strong>
                <p>{sharedConfirmation.detail}</p>
              </article>
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="最终稿" title="这次实际准备发出的内容" />
              {post.title.trim() || post.body.trim() ? (
                <>
                  <strong>{post.title || "当前标题尚未生成"}</strong>
                  <p className="body-copy">{post.body}</p>
                  <div className="tag-row">
                    {post.tags.map((tag) => (
                      <StatusPill key={tag} label={`#${tag}`} />
                    ))}
                  </div>
                </>
              ) : (
                <article className="state-card state-card-neutral">
                  <strong>文案还没生成完成</strong>
                  <p>当前后端还没有返回真实标题和正文，所以这里暂时没有可查看的最终稿。</p>
                </article>
              )}
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="发送结果" title="OpenClaw 与平台回写" description="这里看发送现在走到哪一步，以及下一步该怎么处理。" />
              <article className={`state-card state-card-${publishFlowState.tone}`}>
                <strong>{publishFlowState.label}</strong>
                <p>{publishFlowState.detail}</p>
              </article>
              <article className={`state-card state-card-${publishNarrative.tone}`}>
                <strong>{publishNarrative.headline}</strong>
                <p>{publishNarrative.nextAction}</p>
              </article>
              <div className="detail-meta-grid">
                <article className="detail-meta-card">
                  <span className="eyebrow">当前状态</span>
                  <strong>{getStatusLabel(post.status)}</strong>
                  <p>{getPublishSummary(post)}</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">平台回写</span>
                  <strong>{latestPublishRecord?.platformPostId || post.platformPostId || "待回写"}</strong>
                  <p>{post.publishedAt ? `发布时间 ${new Date(post.publishedAt).toLocaleString("zh-CN")}` : "当前还没有平台发布时间回写。"}</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">平台审核状态</span>
                  <strong>{getReviewStatusLabel(reviewStatus)}</strong>
                  <p>{publishFlowState.detail}</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">最近一次结果</span>
                  <strong>{getPublishRecordLabel(latestPublishRecord?.status)}</strong>
                  <p>{latestPublishRecord?.errorMessage || latestPublishRecord?.detail || "当前还没有发布结果记录。"}</p>
                  {latestPublishRecord?.createdAt ? <p>记录时间：{new Date(latestPublishRecord.createdAt).toLocaleString("zh-CN")}</p> : null}
                  {getFailureTypeLabel(latestPublishRecord?.failureType) ? <p>失败分类：{getFailureTypeLabel(latestPublishRecord?.failureType)}</p> : null}
                </article>
              </div>
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="生成准备度" title="这条内容目前走到哪一步" />
              <article className={`state-card state-card-${generationReadiness.tone}`}>
                <strong>{generationReadiness.label}</strong>
                <p>{generationReadiness.description}</p>
              </article>
              <div className="detail-meta-grid">
                <article className="detail-meta-card">
                  <span className="eyebrow">文案结果</span>
                  <strong>{post.title.trim() && post.body.trim() ? "文案已生成" : "尚未生成完成"}</strong>
                  <p>{post.title.trim() && post.body.trim() ? "后端已返回真实标题和正文。" : "当前还没有真实标题和正文可用。"}</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">图片结果</span>
                  <strong>{post.assets.length > 0 || post.assetIds.length > 0 ? "图片已生成" : "尚未生成完成"}</strong>
                  <p>{post.assets.length > 0 || post.assetIds.length > 0 ? "后端已返回真实素材或素材关联。" : "当前还没有真实素材可用。"}</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">人工确认</span>
                  <strong>{messageTask?.requiresReview ?? post.status === "in_review" ? "已进入人工确认" : "尚未进入人工确认"}</strong>
                  <p>{messageTask?.nextAction ?? "等待任务链路继续推进后再进入确认。"}</p>
                </article>
              </div>
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="这次配图" title="关联素材" description="这里展示这条内容当前挂接的真实图片素材。" />
              {post.assets.length > 0 ? (
                <div className="asset-grid">
                  {post.assets.map((asset) => (
                    <article key={asset.id} className="asset-card">
                      <div className="asset-cover" style={{ backgroundImage: `url(${asset.url})` }} />
                      <div className="asset-copy">
                        <StatusPill label={asset.contentType} />
                        <h3>{asset.name}</h3>
                        <p>{asset.fileName}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted-copy">当前还没有已关联素材。</p>
              )}
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="数据表现" title="指标历史" description="直接看这条内容回写过来的真实快照变化。" />
              <article className={`state-card state-card-${metricsState.tone}`}>
                <strong>{metricsState.title}</strong>
                <p>{metricsState.description}</p>
              </article>
              <div className="detail-meta-grid">
                <article className="detail-meta-card">
                  <span className="eyebrow">当前互动</span>
                  <strong>点赞 {interactionSummary.likes.toLocaleString()}</strong>
                  <p>收藏 {interactionSummary.collects.toLocaleString()}，评论 {interactionSummary.comments.toLocaleString()}，浏览 {post.latestMetrics.views.toLocaleString()}。</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">最近同步</span>
                  <strong>{syncState.label}</strong>
                  <p>{syncState.detail}</p>
                </article>
              </div>
              <div className="history-stack">
                {post.metricsHistory.length > 0 ? (
                  post.metricsHistory.map((item) => (
                    <article key={item.snapshotAt} className="plain-row-card">
                      <strong>{new Date(item.snapshotAt).toLocaleString("zh-CN")}</strong>
                      <div className="row-metrics compact-metrics">
                        <span>浏览 {item.views.toLocaleString()}</span>
                        <span>点赞 {item.likes.toLocaleString()}</span>
                        <span>收藏 {item.favorites.toLocaleString()}</span>
                        <span>评论 {item.comments.toLocaleString()}</span>
                        <span>关注转化 {item.followConversions.toLocaleString()}</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="muted-copy">当前没有可展示的历史快照，详情页已退回到无数据状态提示。</p>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="detail-secondary">
            <SectionCard className="nested-card">
              <SectionHeading eyebrow="任务上下文" title="这条内容属于哪个账号、最初来自什么消息" />
              <div className="detail-meta-grid">
                <article className="detail-meta-card">
                  <span className="eyebrow">归属账号</span>
                  <strong>{account.name}</strong>
                  <p>{account.id ? `${account.handle}，当前账号状态会在多账号运营页继续跟进。` : "这条内容当前还没有绑定到真实账号。"}</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">原始消息任务</span>
                  <strong>{post.messageTaskId ?? messageTask?.id ?? "已进入帖子详情视图"}</strong>
                  <p>{messageTask?.sourceMessage ?? "这条内容已经脱离消息中心的待办队列，正在查看完整记录。"}</p>
                </article>
                <article className={`detail-meta-card state-card state-card-${accountAvailability.tone}`}>
                  <span className="eyebrow">账号可用性</span>
                  <strong>{accountAvailability.title}</strong>
                  <p>{accountAvailability.detail}</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">平台链接</span>
                  <strong>{post.platformUrl ? "可直接查看平台页" : "暂未回写平台链接"}</strong>
                  <p>{post.platformUrl ?? "后端当前只返回平台帖子标识，等待平台链接字段稳定回写。"}</p>
                </article>
              </div>
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="人工确认记录" title="这条内容是怎么被确认下来的" />
              <div className="history-stack">
                {post.reviewRecords.length > 0 ? (
                  post.reviewRecords.map((record) => (
                    <article key={record.id} className="plain-row-card">
                      <strong>{record.action}</strong>
                      <p>{record.comment}</p>
                      <span>{record.operator}</span>
                    </article>
                  ))
                ) : (
                  <p className="muted-copy">当前还没有人工确认记录。</p>
                )}
              </div>
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="OpenClaw 发送记录" title="发送过程明细" />
              <div className="history-stack">
                {post.publishRecords.length > 0 ? (
                  post.publishRecords.map((record) => (
                    <article key={record.id} className="plain-row-card">
                      <div className="tag-row">
                        <StatusPill label={getPublishRecordLabel(record.status)} tone={record.status === "failed" ? "critical" : record.status === "succeeded" ? "positive" : "warm"} />
                        <span className="muted-inline">{new Date(record.createdAt).toLocaleString("zh-CN")}</span>
                      </div>
                      <p>{record.detail}</p>
                      {record.platformPostId ? <p className="muted-copy">平台帖子 ID：{record.platformPostId}</p> : null}
                      {record.errorMessage ? <p className="muted-copy">失败原因：{record.errorMessage}</p> : null}
                      {getFailureTypeLabel(record.failureType) ? <p className="muted-copy">失败分类：{getFailureTypeLabel(record.failureType)}</p> : null}
                    </article>
                  ))
                ) : (
                  <p className="muted-copy">当前还没有发布记录。</p>
                )}
              </div>
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="这条内容的结论" title="下一步建议" />
              <article className={`state-card state-card-${publishNarrative.tone}`}>
                <strong>{publishNarrative.headline}</strong>
                <p>{publishNarrative.nextAction}</p>
              </article>
              <article className="detail-meta-card">
                <span className="eyebrow">最新汇总</span>
                <strong>浏览 {post.latestMetrics.views.toLocaleString()}</strong>
                <p>点赞 {interactionSummary.likes.toLocaleString()}，收藏 {interactionSummary.collects.toLocaleString()}，评论 {interactionSummary.comments.toLocaleString()}，关注转化 {post.latestMetrics.followConversions.toLocaleString()}。</p>
              </article>
            </SectionCard>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
