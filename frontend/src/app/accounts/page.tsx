import Link from "next/link";

import { RefreshButton } from "../../components/refresh-button";
import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { adaptAccounts, adaptMessageTasks, buildAccountOverview, buildMessageTasks, getAccountAvailabilityNotice, getAccountConnectionStatusLabel, getAccountConnectionStatusTone, getAccountStatusLabel, getAccountStatusTone, getAccountSyncStatusLabel, getAccountSyncStatusTone } from "../../lib/product";

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
  const tasks = taskRecords ? adaptMessageTasks(taskRecords, posts, accounts, !accountRecords) : buildMessageTasks(posts, accounts);

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="多账号运营" title="直接看哪些账号已连接、哪些需要重新登录、哪些同步异常" description="这里优先展示真实账号可用性，而不是只看运营卡片。" />

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
            <p>重点先看哪些账号已连接可真实发布，哪些账号登录失效需要处理，哪些账号最近拉数失败。</p>
          </article>

          <div className="metric-grid publish-metric-grid">
            <article className="metric-tile">
              <span>已连接</span>
              <strong>{accounts.filter((account) => account.connectionStatus === "connected" && !account.reauthRequired).length}</strong>
            </article>
            <article className="metric-tile">
              <span>需重新登录</span>
              <strong>{accounts.filter((account) => account.connectionStatus === "reauth_required" || account.reauthRequired).length}</strong>
            </article>
            <article className="metric-tile">
              <span>同步中</span>
              <strong>{accounts.filter((account) => account.lastSyncStatus === "syncing").length}</strong>
            </article>
            <article className="metric-tile">
              <span>同步失败</span>
              <strong>{accounts.filter((account) => account.lastSyncStatus === "failed").length}</strong>
            </article>
          </div>
        </div>

        <div className="action-row">
          <RefreshButton />
        </div>
      </SectionCard>

      <section className="product-grid product-grid-two">
        {accounts.map((account) => {
          const accountTasks = tasks.filter((task) => task.accountId === account.id);
          const availability = getAccountAvailabilityNotice(account);

          return (
            <SectionCard key={account.id} className="product-card account-card">
              <div className="publish-card-head">
                <div>
                  <span className="eyebrow">{account.handle}</span>
                  <h3>{account.name}</h3>
                </div>
                <div className="tag-row">
                  <StatusPill label={getAccountStatusLabel(account.status)} tone={getAccountStatusTone(account.status)} />
                  <StatusPill label={getAccountConnectionStatusLabel(account.connectionStatus)} tone={getAccountConnectionStatusTone(account.connectionStatus)} />
                  <StatusPill label={getAccountSyncStatusLabel(account.lastSyncStatus)} tone={getAccountSyncStatusTone(account.lastSyncStatus)} />
                </div>
              </div>

              <p>{account.summary}</p>

              <article className={`state-card state-card-${availability.tone}`}>
                <strong>{availability.title}</strong>
                <p>{availability.detail}</p>
              </article>

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

              <div className="detail-meta-grid">
                <article className="detail-meta-card">
                  <span className="eyebrow">最近一次验证</span>
                  <strong>{account.lastValidatedAt ? new Date(account.lastValidatedAt).toLocaleString("zh-CN") : "暂无记录"}</strong>
                  <p>{account.connectedAt ? `连接建立于 ${new Date(account.connectedAt).toLocaleString("zh-CN")}` : "后端暂未返回连接建立时间。"}</p>
                </article>
                <article className="detail-meta-card">
                  <span className="eyebrow">最近一次同步</span>
                  <strong>{account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString("zh-CN") : "暂无记录"}</strong>
                  <p>{account.lastSyncError ?? "当前没有同步错误摘要。"}</p>
                </article>
              </div>

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
