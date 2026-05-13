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
        <SectionHeading eyebrow="消息任务中心" title="紧凑任务列表" description="异常、待确认和最近消息排在前面，长说明收进小问号。" />

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

      <section className="compact-list-shell">
        {sortedTasks.map((task) => (
          <SectionCard key={task.id} className="product-card compact-task-card message-task-card">
            {(() => {
              const readiness = getGenerationReadiness({ hasCopy: task.hasCopy, hasImages: task.hasImages, requiresReview: task.requiresReview });

              return (
                <>
                  <div className="compact-row-head">
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

            <div className="row-metrics">
              <span>消息时间 {new Date(task.requestedAt).toLocaleString("zh-CN")}</span>
              <span>文案 {task.hasCopy ? "已生成" : "待生成"}</span>
              <span>图片 {task.hasImages ? "已生成" : "待生成"}</span>
              <span>人工确认 {task.requiresReview ? "已进入" : "尚未进入"}</span>
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
