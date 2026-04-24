import Link from "next/link";

import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { adaptAccounts, adaptMessageTasks, buildAccountOverview, buildMessageTasks, getGenerationReadiness, getTaskOverview } from "../../lib/product";

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

export default async function TasksPage() {
  const [posts, accountRecords, taskRecords] = await Promise.all([apiClient.posts.list(), getAccountsOrNull(), getTasksOrNull()]);
  const accounts = accountRecords ? adaptAccounts(accountRecords) : buildAccountOverview(posts);
  const tasks = taskRecords ? adaptMessageTasks(taskRecords, posts, accounts, !accountRecords) : buildMessageTasks(posts, accounts);
  const overview = getTaskOverview(tasks);

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="消息任务中心" title="把用户发给 OpenClaw 的消息，清楚转成后台任务" description="这一页重点展示消息入口、系统生成任务、内容准备度和下一步确认动作之间的关系。" />

        {taskRecords ? null : (
          <article className="state-card state-card-warm">
            <strong>当前仍在使用展示层回退任务数据</strong>
            <p>`GET /api/tasks` 请求异常时，页面会临时回退到帖子推导任务视图，避免主链路中断。</p>
          </article>
        )}

        <div className="dashboard-hero publish-center-hero">
          <article className="dashboard-highlight">
            <span className="eyebrow">消息转任务</span>
            <strong>{overview.total}</strong>
            <p>今天已经从 OpenClaw 对话入口进入后台的任务数量。先看哪些内容已经补齐，哪些还停在等待确认或等待发布。</p>
          </article>

          <div className="metric-grid publish-metric-grid">
            <article className="metric-tile">
              <span>已生成候选</span>
              <strong>{overview.ready}</strong>
            </article>
            <article className="metric-tile">
              <span>待人工确认</span>
              <strong>{overview.waitingReview}</strong>
            </article>
            <article className="metric-tile">
              <span>涉及账号</span>
              <strong>{overview.todayAccounts}</strong>
            </article>
            <article className="metric-tile">
              <span>已进入发布链路</span>
              <strong>{tasks.filter((task) => task.stage === "waiting_publish" || task.stage === "publishing" || task.stage === "published").length}</strong>
            </article>
          </div>
        </div>
      </SectionCard>

      <section className="publish-center-list">
        {tasks.map((task) => (
          <SectionCard key={task.id} className="product-card publish-card message-task-card">
            {(() => {
              const readiness = getGenerationReadiness({ hasCopy: task.hasCopy, hasImages: task.hasImages, requiresReview: task.requiresReview });

              return (
                <>
                  <div className="publish-card-head">
              <div>
                <span className="eyebrow">{task.accountName}</span>
                <h3>{task.topic}</h3>
              </div>
              <div className="tag-row">
                <StatusPill label={task.stageLabel} tone={task.stageTone} />
                <StatusPill label={readiness.label} tone={readiness.tone} />
                <StatusPill label={`计划 ${new Date(task.plannedAt).toLocaleString("zh-CN")}`} />
              </div>
            </div>

            <div className="message-task-grid">
              <article className="detail-meta-card">
                <span className="eyebrow">用户发来的消息</span>
                <strong>OpenClaw 对话入口</strong>
                <p>{task.sourceMessage}</p>
              </article>
              <article className="detail-meta-card">
                <span className="eyebrow">系统生成的后台任务</span>
                <strong>{task.title}</strong>
                <p>{task.nextAction}</p>
              </article>
              <article className="detail-meta-card">
                <span className="eyebrow">内容准备度</span>
                <strong>{readiness.label}</strong>
                <p>{readiness.description}</p>
              </article>
            </div>

            <div className="row-metrics">
              <span>消息时间 {new Date(task.requestedAt).toLocaleString("zh-CN")}</span>
              <span>文案 {task.hasCopy ? "已生成" : "待生成"}</span>
              <span>图片 {task.hasImages ? "已生成" : "待生成"}</span>
              <span>人工确认 {task.requiresReview ? "已进入" : "尚未进入"}</span>
              <span>下一步 {task.nextAction}</span>
              <Link href={task.postId ? `/review?postId=${task.postId}` : "/review"} className="text-link product-link">
                去内容确认台
              </Link>
            </div>
                </>
              );
            })()}
          </SectionCard>
        ))}
      </section>
    </div>
  );
}
