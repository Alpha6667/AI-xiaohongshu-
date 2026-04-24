import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { adaptAccounts, buildAccountOverview, getAccountForPost, getFailureTypeLabel, getPublishNarrative, getStatusLabel, getStatusTone, sortByUpdatedDesc } from "../../lib/product";

async function getAccountsOrNull() {
  try {
    return await apiClient.accounts.list();
  } catch {
    return null;
  }
}

function getPublishSteps(status: string, hasPublishRecord: boolean) {
  return [
    { label: "OpenClaw 已接单", done: hasPublishRecord },
    { label: "已上传并提交", done: status === "publishing" || status === "published" || status === "publish_failed", active: status === "publishing" },
    { label: "等待平台审核", done: status === "published" || status === "publish_failed", active: status === "publishing" },
    { label: "结果已回到后台", done: status === "published", failed: status === "publish_failed" },
  ];
}

export default async function DashboardPage() {
  const [summary, posts, accountRecords] = await Promise.all([apiClient.dashboard.getSummary(), apiClient.posts.list(), getAccountsOrNull()]);
  const accounts = accountRecords ? adaptAccounts(accountRecords) : buildAccountOverview(posts);
  const centerPosts = sortByUpdatedDesc(posts.filter((post) => post.status === "approved" || post.status === "publishing" || post.status === "published" || post.status === "publish_failed")).slice(0, 6);
  const details = await Promise.all(centerPosts.map((post) => apiClient.posts.getById(post.id)));

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="发布中心" title="重点看 OpenClaw 是否已执行、是否上传成功、是否进入审核、下一步该怎么处理" description="这页继续保留，但要从多账号任务视角告诉你：哪条内容在哪个账号上执行、卡在哪一步、失败后怎么办。" />

        <div className="dashboard-hero publish-center-hero">
          <article className="dashboard-highlight">
            <span className="eyebrow">今日执行概览</span>
            <strong>{centerPosts.length}</strong>
            <p>当前已经进入确认完成、执行中或已回写阶段的任务数量。优先看下面哪些任务还需要你判断是否重试、换账号或回确认台改稿。</p>
          </article>

          <div className="metric-grid publish-metric-grid">
            <article className="metric-tile">
              <span>已回写发布</span>
              <strong>{summary.publishedCount}</strong>
            </article>
            <article className="metric-tile">
              <span>发送中</span>
              <strong>{posts.filter((post) => post.status === "publishing").length}</strong>
            </article>
            <article className="metric-tile">
              <span>发送失败</span>
              <strong>{posts.filter((post) => post.status === "publish_failed").length}</strong>
            </article>
            <article className="metric-tile">
              <span>涉及账号</span>
              <strong>{accounts.filter((account) => account.todayTaskCount > 0).length}</strong>
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
            const account = getAccountForPost(post, accounts, !accountRecords);

            return (
              <SectionCard key={post.id} className="product-card publish-card">
                <div className="publish-card-head">
                  <div>
                    <span className="eyebrow">{account.name}</span>
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
                      <span className="eyebrow">执行账号</span>
                      <strong>{account.name}</strong>
                      <p>{account.id ? account.handle : "这条内容当前还没有绑定到真实账号。"}</p>
                    </article>
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
            <p>等你在内容确认台确认好文案、图片和账号后，这里会开始显示执行进度、审核回写和失败原因。</p>
          </SectionCard>
        )}
      </section>
    </div>
  );
}
