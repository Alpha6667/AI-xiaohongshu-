import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { getFailureTypeLabel, getPublishNarrative, getStatusLabel, getStatusTone, sortByUpdatedDesc } from "../../lib/product";

function getPublishSteps(status: string, hasPublishRecord: boolean) {
  return [
    { label: "已交给 OpenClaw", done: hasPublishRecord },
    { label: "正在上传与提交", done: status === "publishing" || status === "published" || status === "publish_failed", active: status === "publishing" },
    { label: "等待平台审核", done: status === "published" || status === "publish_failed", active: status === "publishing" },
    { label: "审核通过已发布", done: status === "published", failed: status === "publish_failed" },
  ];
}

export default async function DashboardPage() {
  const [summary, posts] = await Promise.all([apiClient.dashboard.getSummary(), apiClient.posts.list()]);
  const centerPosts = sortByUpdatedDesc(posts.filter((post) => post.status === "approved" || post.status === "publishing" || post.status === "published" || post.status === "publish_failed")).slice(0, 6);
  const details = await Promise.all(centerPosts.map((post) => apiClient.posts.getById(post.id)));

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="发布中心" title="OpenClaw 走到哪一步、你下一步该做什么" description="这里只回答真正影响发送结果的问题：已经发出去没有、卡在哪一步、下一步是重试还是换稿。" />

        <div className="dashboard-hero publish-center-hero">
          <article className="dashboard-highlight">
            <span className="eyebrow">当前总览</span>
            <strong>{summary.publishedCount}</strong>
            <p>已经审核通过并成功发出的内容数量。今天如果还要继续发，优先看下面哪些内容正在等待你处理。</p>
          </article>

          <div className="metric-grid publish-metric-grid">
            <article className="metric-tile">
              <span>等待人工确认</span>
              <strong>{summary.pendingReviewCount}</strong>
            </article>
            <article className="metric-tile">
              <span>累计点赞</span>
              <strong>{summary.totalLikes.toLocaleString()}</strong>
            </article>
            <article className="metric-tile">
              <span>累计收藏</span>
              <strong>{summary.totalFavorites.toLocaleString()}</strong>
            </article>
            <article className="metric-tile">
              <span>累计评论</span>
              <strong>{summary.totalComments.toLocaleString()}</strong>
            </article>
          </div>
        </div>
      </SectionCard>

      <section className="publish-center-list">
        {details.length > 0 ? (
          details.map((post) => {
            const latestRecord = post.publishRecords.at(-1);
            const narrative = getPublishNarrative(post);
            const steps = getPublishSteps(post.status, post.publishRecords.length > 0);

            return (
              <SectionCard key={post.id} className="product-card publish-card">
                <div className="publish-card-head">
                  <div>
                    <span className="eyebrow">{post.topic}</span>
                    <h3>{post.title}</h3>
                  </div>
                  <div className="tag-row">
                    <StatusPill label={getStatusLabel(post.status)} tone={getStatusTone(post.status)} />
                    {getFailureTypeLabel(latestRecord?.failureType) ? <StatusPill label={getFailureTypeLabel(latestRecord?.failureType) ?? ""} tone="critical" /> : null}
                  </div>
                </div>

                <div className="publish-steps">
                  {steps.map((step) => (
                    <article key={step.label} className={`publish-step${step.done ? " publish-step-done" : ""}${step.active ? " publish-step-active" : ""}${step.failed ? " publish-step-failed" : ""}`}>
                      <strong>{step.label}</strong>
                    </article>
                  ))}
                </div>

                <div className="publish-card-body">
                  <article className={`state-card state-card-${narrative.tone}`}>
                    <strong>{narrative.headline}</strong>
                    <p>{narrative.nextAction}</p>
                  </article>

                  <div className="detail-meta-grid">
                    <article className="detail-meta-card">
                      <span className="eyebrow">OpenClaw 回写</span>
                      <strong>{latestRecord?.status ?? "尚未开始"}</strong>
                      <p>{latestRecord?.detail ?? "还没有产生发送记录。"}</p>
                    </article>
                    <article className="detail-meta-card">
                      <span className="eyebrow">平台结果</span>
                      <strong>{post.platformPostId ?? "待回写"}</strong>
                      <p>{post.publishedAt ? `通过时间 ${new Date(post.publishedAt).toLocaleString("zh-CN")}` : latestRecord?.errorMessage ?? "等待平台结果。"}</p>
                    </article>
                  </div>
                </div>
              </SectionCard>
            );
          })
        ) : (
          <SectionCard className="product-empty-card">
            <strong>发布中心当前还没有需要跟进的内容</strong>
            <p>等你在发帖工作台确认并交给 OpenClaw 后，这里会开始显示发送进度、审核回写和失败原因。</p>
          </SectionCard>
        )}
      </section>
    </div>
  );
}
