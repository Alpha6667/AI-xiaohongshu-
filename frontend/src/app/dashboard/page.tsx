import { RefreshButton } from "../../components/refresh-button";
import { CollapsibleDetails, CompactStatus, SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { adaptAccounts, getAccountAvailabilityNotice, getAccountForPost, getFailureTypeLabel, getPublishFlowState, getPublishNarrative, getPublishRecordLabel, getReviewStatus, getReviewStatusLabel, getReviewStatusTone, getStatusLabel, getStatusTone, sortByUpdatedDesc } from "../../lib/product";

async function getAccountsOrNull() {
  try {
    return await apiClient.accounts.list();
  } catch {
    return null;
  }
}

function getPublishSteps(post: { status: string; publishRecords: Array<{ status: string }> }) {
  const latestRecord = post.publishRecords.at(-1);
  const hasQueued = latestRecord?.status === "queued" || post.status === "publishing" || post.status === "under_review" || post.status === "published" || post.status === "rejected" || post.status === "publish_failed";
  const isExecuting = post.status === "publishing";
  const isUnderReview = post.status === "under_review";
  const isPublished = post.status === "published" || latestRecord?.status === "succeeded";
  const isRejected = post.status === "rejected";
  const isFailed = post.status === "publish_failed" || latestRecord?.status === "failed";

  return [
    { label: "待交给 OpenClaw", done: hasQueued || isPublished || isRejected || isFailed, active: !hasQueued && !isPublished && !isRejected && !isFailed },
    { label: "已交给 OpenClaw", done: hasQueued || isPublished || isRejected || isFailed, active: latestRecord?.status === "queued" },
    { label: "执行中", done: isExecuting || isUnderReview || isPublished || isRejected || isFailed, active: isExecuting },
    { label: "平台审核中", done: isUnderReview || isPublished || isRejected, active: isUnderReview },
    { label: isFailed ? "发布失败" : isRejected ? "审核未通过" : "已发布", done: isPublished || isRejected || isFailed, failed: isRejected || isFailed },
  ];
}

export default async function DashboardPage() {
  const [summary, posts, accountRecords] = await Promise.all([apiClient.dashboard.getSummary(), apiClient.posts.list(), getAccountsOrNull()]);
  const accounts = accountRecords ? adaptAccounts(accountRecords) : [];
  const centerPosts = sortByUpdatedDesc(posts.filter((post) => post.status === "approved" || post.status === "publishing" || post.status === "under_review" || post.status === "published" || post.status === "rejected" || post.status === "publish_failed")).sort((left, right) => Number(right.status === "publish_failed" || right.status === "rejected") - Number(left.status === "publish_failed" || left.status === "rejected")).slice(0, 6);
  const details = await Promise.all(centerPosts.map((post) => apiClient.posts.getById(post.id)));

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="发布中心" title="失败、发布中、已发布分开看" description="发布中心按异常优先排序，长说明收进状态卡和小问号。" />

        <div className="compact-status-row">
          <CompactStatus label="发送失败" value={posts.filter((post) => post.status === "publish_failed" || post.status === "rejected").length} tone={posts.some((post) => post.status === "publish_failed" || post.status === "rejected") ? "critical" : "positive"} />
          <CompactStatus label="发送中" value={posts.filter((post) => post.status === "publishing").length} tone="warm" />
          <CompactStatus label="审核中" value={posts.filter((post) => post.status === "under_review").length} tone="warm" />
          <CompactStatus label="已发布" value={summary.publishedCount} tone="positive" />
        </div>

        <div className="action-row">
          <RefreshButton />
        </div>
      </SectionCard>

      <section className="publish-center-list">
        {details.length > 0 ? (
          details.map((post) => {
            const latestRecord = post.publishRecords.at(-1);
            const narrative = getPublishNarrative(post);
            const publishFlowState = getPublishFlowState(post);
            const steps = getPublishSteps(post);
            const account = getAccountForPost(post, accounts);
            const availability = getAccountAvailabilityNotice(account);
            const reviewStatus = getReviewStatus(post);

            return (
              <SectionCard key={post.id} className="product-card publish-card">
                <div className="publish-card-head">
                  <div>
                    <span className="eyebrow">{account.name}</span>
                    <h3>{post.title}</h3>
                  </div>
                  <div className="tag-row">
                    <StatusPill label={getStatusLabel(post.status)} tone={getStatusTone(post.status)} />
                    <StatusPill label={getReviewStatusLabel(reviewStatus)} tone={getReviewStatusTone(reviewStatus)} />
                    <StatusPill label={publishFlowState.label} tone={publishFlowState.tone} />
                    {getFailureTypeLabel(latestRecord?.failureType) ? <StatusPill label={getFailureTypeLabel(latestRecord?.failureType) ?? ""} tone="critical" /> : null}
                  </div>
                </div>

                <div className="compact-publish-steps">
                  {steps.map((step) => <span key={step.label} className={`${step.failed ? "status-critical" : step.active ? "status-warm" : step.done ? "status-positive" : "status-neutral"}`}>{step.label}</span>)}
                </div>

                <div className="publish-card-body">
                  <article className={`state-card state-card-${narrative.tone}`}>
                    <strong>{narrative.headline}</strong>
                    <p>{narrative.nextAction}</p>
                  </article>

                  <article className={`state-card state-card-${publishFlowState.tone}`}>
                    <strong>{publishFlowState.label}</strong>
                    <p>{publishFlowState.detail}</p>
                  </article>

                  <div className="detail-meta-grid">
                    <article className="detail-meta-card">
                      <span className="eyebrow">执行账号</span>
                      <strong>{account.name}</strong>
                      <p>{account.id ? account.handle : "这条内容当前还没有绑定到真实账号。"}</p>
                    </article>
                    <article className="detail-meta-card">
                      <span className="eyebrow">OpenClaw 回写</span>
                      <strong>{getPublishRecordLabel(latestRecord?.status)}</strong>
                      <p>{latestRecord?.detail ?? "还没有产生发送记录。"}</p>
                    </article>
                    <article className="detail-meta-card">
                      <span className="eyebrow">平台结果</span>
                      <strong>{post.platformPostId ?? "待回写"}</strong>
                      <p>{post.publishedAt ? `通过时间 ${new Date(post.publishedAt).toLocaleString("zh-CN")}` : latestRecord?.errorMessage ?? "等待平台结果。"}</p>
                    </article>
                    <article className="detail-meta-card">
                      <span className="eyebrow">下一步动作</span>
                      <strong>{publishFlowState.label}</strong>
                      <p>{narrative.nextAction}</p>
                    </article>
                  </div>
                  <CollapsibleDetails summary="账号可用性和执行明细">
                    <article className={`state-card state-card-${availability.tone}`}>
                      <strong>{availability.title}</strong>
                      <p>{availability.detail}</p>
                    </article>
                  </CollapsibleDetails>
                </div>
              </SectionCard>
            );
          })
        ) : (
          <SectionCard className="product-empty-card">
            <strong>发布中心当前还没有需要跟进的内容</strong>
            <p>等你在内容确认台确认好文案、图片和账号后，这里会开始显示执行进度、审核回写和失败原因。</p>
          </SectionCard>
        )}
      </section>
    </div>
  );
}
