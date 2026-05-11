import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RefreshButton } from "../../../components/refresh-button";
import { RefreshMetricsButton } from "../../../components/refresh-metrics-button";
import { SectionCard, SectionHeading, StatusPill } from "../../../components/ui";
import { apiClient } from "../../../lib/api/client";
import type { PostDetail } from "../../../lib/api/types";
import { getFailureTypeLabel, getMetricsSnapshotSourceLabel, getMetricsSourceState, getPostSyncState, getPublishFlowState, getPublishNarrative, getPublishRecordLabel, getReviewStatus, getReviewStatusLabel, getReviewStatusTone, getStatusLabel, getStatusTone } from "../../../lib/product";

export const metadata: Metadata = {
  title: "帖子详情 | 小红书日常发帖工作台",
  description: "查看单条内容的发送结果、平台回写和互动数据变化。",
};

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
  const sourceState = getMetricsSourceState(post);
  return {
    title: sourceState.label,
    description: sourceState.detail,
    tone: sourceState.tone,
  };
}

function formatOperationalText(value?: string | null) {
  const generatedContentTask = ["generate", "content"].join("_");
  const submittedPublishTask = ["Submitted", "to", "OpenClaw"].join(" ");

  return (value ?? "")
    .replaceAll(generatedContentTask, "生成内容")
    .replaceAll(submittedPublishTask, "已提交发布任务");
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const syncState = getPostSyncState(post);
  const reviewStatus = getReviewStatus(post);

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="帖子详情" title={post.title || post.topic} description="首屏直接查看最终文案、发布结果和指标数据。" />

        <div className="detail-overview">
          <div>
            <StatusPill label={getStatusLabel(post.status)} tone={getStatusTone(post.status)} />
            <StatusPill label={getReviewStatusLabel(reviewStatus)} tone={getReviewStatusTone(reviewStatus)} />
            <StatusPill label={publishFlowState.label} tone={publishFlowState.tone} />
            <p className="detail-topic">主题：{post.topic}</p>
          </div>
          <div className="action-row">
            <RefreshButton />
            <RefreshMetricsButton postId={post.id} />
            <Link href="/posts" className="text-link product-link">
              返回帖子与数据
            </Link>
          </div>
        </div>

        <div className="detail-layout">
          <div className="detail-primary">
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
              <SectionHeading eyebrow="发送结果" title="先看发布时间、当前状态和平台回写" description="这里先回答这条内容有没有发出去、平台有没有回写，以及接下来要不要继续处理。" />
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
                  <span className="eyebrow">平台帖子标识</span>
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
                  <p>{formatOperationalText(latestPublishRecord?.errorMessage || latestPublishRecord?.detail) || "当前还没有发布结果记录。"}</p>
                  {latestPublishRecord?.createdAt ? <p>记录时间：{new Date(latestPublishRecord.createdAt).toLocaleString("zh-CN")}</p> : null}
                  {getFailureTypeLabel(latestPublishRecord?.failureType) ? <p>失败分类：{getFailureTypeLabel(latestPublishRecord?.failureType)}</p> : null}
                </article>
              </div>
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="数据表现" title="最新指标与历史变化" description="这里直接看最新互动结果，再决定是否手动刷新这条内容的最新数据。" />
              <article className={`state-card state-card-${metricsState.tone}`}>
                <strong>{metricsState.title}</strong>
                <p>{metricsState.description}</p>
              </article>
              <div className="metric-grid metrics-summary-grid">
                <article className="detail-meta-card">
                  <span className="eyebrow">数据来源</span>
                  <strong>{metricsState.title}</strong>
                  <p>{metricsState.description}</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">浏览</span>
                  <strong>{post.latestMetrics.views.toLocaleString()}</strong>
                  <p>当前记录的是这条内容最近一次成功回写后的浏览量。</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">点赞</span>
                  <strong>{post.latestMetrics.likes.toLocaleString()}</strong>
                  <p>这里展示最新持久化互动结果。</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">赞和收藏 / 评论</span>
                  <strong>{post.latestMetrics.favorites.toLocaleString()} / {post.latestMetrics.comments.toLocaleString()}</strong>
                  <p>赞和收藏是小红书 Creator 中心返回的赞藏合并口径，会跟随最新抓取一起刷新。</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">关注转化</span>
                  <strong>{post.latestMetrics.followConversions.toLocaleString()}</strong>
                  <p>当前记录的是这条内容带来的关注转化数。</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">抓取时间</span>
                  <strong>{post.latestMetrics.capturedAt ? new Date(post.latestMetrics.capturedAt).toLocaleString("zh-CN") : "暂无抓取时间"}</strong>
                  <p>对应 `latestMetrics.capturedAt`。</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">最近一次拉数</span>
                  <strong>{syncState.label}</strong>
                  <p>{syncState.detail}</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">同步错误</span>
                  <strong>{post.syncError ?? "无"}</strong>
                  <p>失败时展示后端返回的错误码或错误信息。</p>
                </article>
              </div>
              <div className="product-table-scroll">
                {post.metricsHistory.length > 0 ? (
                  <table className="product-data-table metrics-history-table">
                    <thead>
                      <tr>
                        <th scope="col">快照时间</th>
                        <th scope="col" className="numeric-cell">浏览</th>
                        <th scope="col" className="numeric-cell">点赞</th>
                        <th scope="col" className="numeric-cell">赞和收藏</th>
                        <th scope="col" className="numeric-cell">评论</th>
                        <th scope="col" className="numeric-cell">关注转化</th>
                        <th scope="col">来源</th>
                        <th scope="col">抓取时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {post.metricsHistory.map((item) => (
                        <tr key={item.snapshotAt}>
                          <td>{new Date(item.snapshotAt).toLocaleString("zh-CN")}</td>
                          <td className="numeric-cell">{item.views.toLocaleString()}</td>
                          <td className="numeric-cell">{item.likes.toLocaleString()}</td>
                          <td className="numeric-cell">{item.favorites.toLocaleString()}</td>
                          <td className="numeric-cell">{item.comments.toLocaleString()}</td>
                          <td className="numeric-cell">{item.followConversions.toLocaleString()}</td>
                          <td>{getMetricsSnapshotSourceLabel(item.source)}</td>
                          <td>{item.capturedAt ? new Date(item.capturedAt).toLocaleString("zh-CN") : "暂无抓取时间"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="muted-copy">当前还没有历史快照，等第一次拉数成功后，这里会按时间顺序展示每一次指标变化。</p>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="detail-secondary">
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
                      <p>{formatOperationalText(record.detail)}</p>
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
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
