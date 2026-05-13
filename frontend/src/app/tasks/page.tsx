import Link from "next/link";

import { CompactStatus, SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { adaptAccounts, adaptMessageTasks, buildMessageTasks, getGenerationReadiness, getTaskOverview } from "../../lib/product";

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
  const accounts = accountRecords ? adaptAccounts(accountRecords) : [];
  const tasks = taskRecords ? adaptMessageTasks(taskRecords, posts, accounts) : buildMessageTasks(posts, accounts);
  const overview = getTaskOverview(tasks);
  const sortedTasks = [...tasks].sort((left, right) => Number(right.requiresReview) - Number(left.requiresReview) || new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime());

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="消息任务中心" title="发帖任务看板" description="按任务状态、内容准备度和下一步动作组织，优先处理待确认和异常任务。" />

        {taskRecords ? null : (
          <article className="state-card state-card-warm">
            <strong>当前仍在使用展示层回退任务数据</strong>
            <p>`GET /api/tasks` 请求异常时，页面会临时回退到帖子推导任务视图，避免主链路中断。</p>
          </article>
        )}

        <div className="compact-status-row">
          <CompactStatus label="全部任务" value={overview.total} />
          <CompactStatus label="待确认" value={overview.waitingReview} tone={overview.waitingReview > 0 ? "warm" : "positive"} />
          <CompactStatus label="已生成" value={overview.ready} tone="positive" />
          <CompactStatus label="涉及账号" value={overview.todayAccounts} />
        </div>
      </SectionCard>

      <section className="task-board-list">
        {sortedTasks.map((task) => {
          const readiness = getGenerationReadiness({ hasCopy: task.hasCopy, hasImages: task.hasImages, requiresReview: task.requiresReview });
          const reviewHref = task.postId ? { pathname: "/review", query: { postId: task.postId } } : "/review";

          return (
            <SectionCard key={task.id} className="product-card task-board-card message-task-card">
              <div className="task-card-head">
                <div className="task-card-title">
                  <span className="eyebrow">发布账号</span>
                  <strong>{task.accountName || "未分配账号"}</strong>
                  <h3>{task.topic}</h3>
                </div>
                <div className="tag-row task-status-row">
                  <StatusPill label={task.stageLabel} tone={task.stageTone} />
                  <StatusPill label={readiness.label} tone={readiness.tone} />
                </div>
              </div>

              <div className="task-card-grid">
                <article className="task-info-tile">
                  <span>文案状态</span>
                  <strong>{task.hasCopy ? "已生成" : "待生成"}</strong>
                  <p>{task.hasCopy ? "已有可确认文案。" : "等待生成标题和正文。"}</p>
                </article>
                <article className="task-info-tile">
                  <span>图片状态</span>
                  <strong>{task.hasImages ? "已生成" : "待生成"}</strong>
                  <p>{task.hasImages ? "已有候选图片。" : "等待生成或关联素材。"}</p>
                </article>
                <article className="task-info-tile">
                  <span>人工确认</span>
                  <strong>{task.requiresReview ? "已进入" : "尚未进入"}</strong>
                  <p>{task.requiresReview ? "需要人工确认后继续。" : "等待内容准备完成。"}</p>
                </article>
                <article className="task-info-tile">
                  <span>时间安排</span>
                  <strong>{new Date(task.plannedAt).toLocaleString("zh-CN")}</strong>
                  <p>消息时间 {new Date(task.requestedAt).toLocaleString("zh-CN")}</p>
                </article>
              </div>

              <div className="task-next-step">
                <div>
                  <span className="eyebrow">下一步动作</span>
                  <p>{task.nextAction}</p>
                </div>
                <div className="task-action-row">
                  <Link href={reviewHref} className="button-link accent-button-link">
                    去内容确认台
                  </Link>
                  {task.postId ? (
                    <Link href={`/posts/${task.postId}`} className="button-link ghost-button-link">
                      查看帖子详情
                    </Link>
                  ) : null}
                </div>
              </div>
            </SectionCard>
          );
        })}
      </section>
    </div>
  );
}
