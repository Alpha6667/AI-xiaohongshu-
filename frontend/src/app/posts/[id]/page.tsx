import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard, SectionHeading, StatusPill } from "../../../components/ui";
import { apiClient } from "../../../lib/api/client";
import type { PostDetail } from "../../../lib/api/types";

function getStatusTone(status: PostDetail["status"]) {
  if (status === "published") {
    return "positive" as const;
  }

  if (status === "publish_failed") {
    return "critical" as const;
  }

  if (status === "in_review" || status === "publishing") {
    return "warm" as const;
  }

  if (status === "approved") {
    return "positive" as const;
  }

  return "neutral" as const;
}

function getPublishSummary(post: PostDetail) {
  const latestRecord = post.publishRecords.at(-1);

  if (post.status === "published") {
    return latestRecord?.platformPostId ?? post.platformPostId
      ? `已完成发布，平台回写 ID：${latestRecord?.platformPostId ?? post.platformPostId}`
      : "已完成发布，等待平台 ID 展示。";
  }

  if (post.status === "publish_failed") {
    return latestRecord?.errorMessage || latestRecord?.detail || "发布失败，等待后端补充更明确的错误信息。";
  }

  if (post.status === "publishing") {
    return latestRecord?.detail || "发布请求已入队，等待结果回写。";
  }

  return post.platformPostId ? `当前已记录平台 ID：${post.platformPostId}` : "当前还未进入平台发布结果回写阶段。";
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

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="Post Detail" title={post.title} description="详情页直接展示真实草稿、发布结果回写和指标历史快照。" />

        <div className="detail-overview">
          <div>
            <StatusPill label={post.status} tone={getStatusTone(post.status)} />
            <p className="detail-topic">主题：{post.topic}</p>
          </div>
          <Link href="/posts" className="text-link">
            返回帖子列表
          </Link>
        </div>

        <div className="detail-layout">
          <div className="detail-primary">
            <SectionCard className="nested-card">
              <SectionHeading eyebrow="Draft" title="草稿内容" />
              <p className="body-copy">{post.body}</p>
              <div className="tag-row">
                {post.tags.map((tag) => (
                  <StatusPill key={tag} label={`#${tag}`} />
                ))}
              </div>
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="Publish State" title="发布状态回写" description="第五轮开始直接展示发布中、成功、失败三类真实状态。" />
              <div className="detail-meta-grid">
                <article className="detail-meta-card">
                  <span className="eyebrow">Status</span>
                  <strong>{post.status}</strong>
                  <p>{getPublishSummary(post)}</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">Platform</span>
                  <strong>{post.publishRecords.at(-1)?.platformPostId || post.platformPostId || "待回写"}</strong>
                  <p>{post.publishedAt ? `发布时间 ${new Date(post.publishedAt).toLocaleString("zh-CN")}` : "当前还没有平台发布时间回写。"}</p>
                </article>
              </div>
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="Assets" title="关联素材" description="当前直接使用详情接口返回的 `assets` 字段渲染真实素材。" />
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
              <SectionHeading eyebrow="Metrics" title="指标历史" description="当前直接渲染详情接口返回的 `metricsHistory` 真实快照。" />
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
                  <p className="muted-copy">尚无已发布后的指标快照。</p>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="detail-secondary">
            <SectionCard className="nested-card">
              <SectionHeading eyebrow="Review Records" title="审核记录" />
              <div className="history-stack">
                {post.reviewRecords.map((record) => (
                  <article key={record.id} className="plain-row-card">
                    <strong>{record.action}</strong>
                    <p>{record.comment}</p>
                    <span>{record.operator}</span>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="Publish Records" title="发布记录" />
              <div className="history-stack">
                {post.publishRecords.length > 0 ? (
                  post.publishRecords.map((record) => (
                    <article key={record.id} className="plain-row-card">
                      <div className="tag-row">
                        <StatusPill label={record.status} tone={record.status === "failed" ? "critical" : record.status === "succeeded" ? "positive" : "warm"} />
                        <span className="muted-inline">{new Date(record.createdAt).toLocaleString("zh-CN")}</span>
                      </div>
                      <p>{record.detail}</p>
                      {record.platformPostId ? <p className="muted-copy">平台帖子 ID：{record.platformPostId}</p> : null}
                      {record.errorMessage ? <p className="muted-copy">失败原因：{record.errorMessage}</p> : null}
                    </article>
                  ))
                ) : (
                  <p className="muted-copy">当前还没有发布记录。</p>
                )}
              </div>
            </SectionCard>

            <SectionCard className="nested-card">
              <SectionHeading eyebrow="Actions" title="接口边界" />
              <div className="endpoint-stack">
                <code>{apiClient.posts.detailEndpoint(post.id)}</code>
                <code>{apiClient.posts.updateEndpoint(post.id)}</code>
                <code>{apiClient.posts.publishEndpoint(post.id)}</code>
              </div>
            </SectionCard>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
