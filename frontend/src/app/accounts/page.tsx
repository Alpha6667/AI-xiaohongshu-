import Link from "next/link";

import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { adaptAccounts, adaptMessageTasks, buildAccountOverview, buildMessageTasks, getAccountStatusLabel, getAccountStatusTone } from "../../lib/product";

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

export default async function AccountsPage() {
  const [posts, accountRecords, taskRecords] = await Promise.all([apiClient.posts.list(), getAccountsOrNull(), getTasksOrNull()]);
  const accounts = accountRecords ? adaptAccounts(accountRecords) : buildAccountOverview(posts);
  const tasks = taskRecords ? adaptMessageTasks(taskRecords, posts, accounts) : buildMessageTasks(posts, accounts);

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="多账号运营" title="不要把账号能力藏在设置里，这里直接看谁在线、谁待处理、谁表现更好" description="这一页先把多账号运营结构搭对，后续再补更细的排班和权限。" />

        {accountRecords ? null : (
          <article className="state-card state-card-warm">
            <strong>当前仍在使用展示层回退账号数据</strong>
            <p>`GET /api/accounts` 请求异常时，页面会临时回退到帖子推导账号视图，避免主链路中断。</p>
          </article>
        )}

        <div className="dashboard-hero publish-center-hero">
          <article className="dashboard-highlight">
            <span className="eyebrow">账号概览</span>
            <strong>{accounts.length}</strong>
            <p>当前后台纳管的账号数量。重点先看哪些账号在线、今天谁有任务、哪个账号最近更值得继续发。</p>
          </article>

          <div className="metric-grid publish-metric-grid">
            <article className="metric-tile">
              <span>在线账号</span>
              <strong>{accounts.filter((account) => account.status === "online").length}</strong>
            </article>
            <article className="metric-tile">
              <span>执行中账号</span>
              <strong>{accounts.filter((account) => account.status === "busy").length}</strong>
            </article>
            <article className="metric-tile">
              <span>今日待处理任务</span>
              <strong>{accounts.reduce((sum, account) => sum + account.waitingCount, 0)}</strong>
            </article>
            <article className="metric-tile">
              <span>最近总互动</span>
              <strong>{accounts.reduce((sum, account) => sum + account.totalEngagement, 0).toLocaleString()}</strong>
            </article>
          </div>
        </div>
      </SectionCard>

      <section className="product-grid product-grid-two">
        {accounts.map((account) => {
          const accountTasks = tasks.filter((task) => task.accountId === account.id);

          return (
            <SectionCard key={account.id} className="product-card account-card">
              <div className="publish-card-head">
                <div>
                  <span className="eyebrow">{account.handle}</span>
                  <h3>{account.name}</h3>
                </div>
                <StatusPill label={getAccountStatusLabel(account.status)} tone={getAccountStatusTone(account.status)} />
              </div>

              <p>{account.summary}</p>

              <div className="product-stat-grid account-stat-grid">
                <article className="metric-tile">
                  <span>今日任务</span>
                  <strong>{account.todayTaskCount}</strong>
                </article>
                <article className="metric-tile">
                  <span>待处理</span>
                  <strong>{account.waitingCount}</strong>
                </article>
                <article className="metric-tile">
                  <span>已发布</span>
                  <strong>{account.publishedCount}</strong>
                </article>
                <article className="metric-tile">
                  <span>最近互动</span>
                  <strong>{account.totalEngagement.toLocaleString()}</strong>
                </article>
              </div>

              <article className="detail-meta-card">
                <span className="eyebrow">今天最值得继续的主题</span>
                <strong>{account.bestTopic}</strong>
                <p>最近活跃时间 {new Date(account.lastActiveAt).toLocaleString("zh-CN")}</p>
              </article>

              <div className="queue-list">
                {accountTasks.slice(0, 2).map((task) => (
                  <article key={task.id} className="queue-item">
                    <div className="queue-item-head">
                      <StatusPill label={task.stageLabel} tone={task.stageTone} />
                      <span className="muted-inline">{new Date(task.plannedAt).toLocaleString("zh-CN")}</span>
                    </div>
                    <strong>{task.topic}</strong>
                    <p>{task.nextAction}</p>
                  </article>
                ))}
              </div>

              <Link href="/tasks" className="text-link product-link">
                去看这个账号的任务
              </Link>
            </SectionCard>
          );
        })}
      </section>
    </div>
  );
}
