import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard, SectionHeading, StatusPill } from "../../../components/ui";
import { apiClient } from "../../../lib/api/client";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = apiClient.posts.getById(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="Post Detail" title={post.title} description="详情页展示草稿内容、审核记录、发布记录和指标历史占位。" />

        <div className="detail-overview">
          <div>
            <StatusPill label={post.status} tone={post.status === "published" ? "positive" : post.status === "in_review" ? "warm" : "neutral"} />
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
              <SectionHeading eyebrow="Metrics" title="指标历史占位" description="后续直接对应 `GET /api/posts/{post_id}` 返回的 `metricsHistory`。" />
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
                      <strong>{record.status}</strong>
                      <p>{record.detail}</p>
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
