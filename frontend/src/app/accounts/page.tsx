import Link from "next/link";

import { AccountSyncButton } from "../../components/account-sync-button";
import { RefreshButton } from "../../components/refresh-button";
import { CollapsibleDetails, CompactStatus, SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import type { AccountWorksSyncResponse } from "../../lib/api/types";
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

async function getWorksSyncOrNull(accountId: string) {
  try {
    return await apiClient.accounts.getWorksSync(accountId);
  } catch {
    return null;
  }
}

export default async function AccountsPage() {
  const [posts, accountRecords, taskRecords] = await Promise.all([apiClient.posts.list(), getAccountsOrNull(), getTasksOrNull()]);
  const accounts = accountRecords ? adaptAccounts(accountRecords) : buildAccountOverview(posts);
  const tasks = taskRecords ? adaptMessageTasks(taskRecords, posts, accounts, !accountRecords) : buildMessageTasks(posts, accounts);
  const workSyncResults = accountRecords ? await Promise.all(accounts.map((account) => getWorksSyncOrNull(account.id))) : [];
  const worksSyncByAccountId = new Map<string, AccountWorksSyncResponse>();
  workSyncResults.forEach((item) => {
    if (item) {
      worksSyncByAccountId.set(item.accountId, item);
    }
  });
  const abnormalAccounts = accounts.filter((account) => account.reauthRequired || account.connectionStatus === "reauth_required" || account.lastSyncStatus === "failed");
  const sortedAccounts = [...accounts].sort((left, right) => Number(abnormalAccounts.includes(right)) - Number(abnormalAccounts.includes(left)) || right.waitingCount - left.waitingCount);

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="多账号运营" title="账号异常和可用性" description="异常账号优先，正常账号收起次要明细。" />

        {accountRecords ? null : (
          <article className="state-card state-card-warm">
            <strong>当前仍在使用展示层回退账号数据</strong>
            <p>`GET /api/accounts` 请求异常时，页面会临时回退到帖子推导账号视图，避免主链路中断。</p>
          </article>
        )}

        {accountRecords && worksSyncByAccountId.size !== accounts.length ? (
          <article className="state-card state-card-warm">
            <strong>部分账号的作品同步详情暂不可用</strong>
            <p>账号状态已走真实接口；若单个 `works-sync` 请求失败，页面会保留账号卡片并仅缺少作品同步明细。</p>
          </article>
        ) : null}

        <div className="compact-status-row">
          <CompactStatus label="账号总数" value={accounts.length} />
          <CompactStatus label="已连接" value={accounts.filter((account) => account.connectionStatus === "connected" && !account.reauthRequired).length} tone="positive" />
          <CompactStatus label="需登录" value={accounts.filter((account) => account.connectionStatus === "reauth_required" || account.reauthRequired).length} tone={abnormalAccounts.length > 0 ? "critical" : "positive"} />
          <CompactStatus label="同步失败" value={accounts.filter((account) => account.lastSyncStatus === "failed").length} tone={accounts.some((account) => account.lastSyncStatus === "failed") ? "critical" : "positive"} />
        </div>

        <div className="action-row">
          <RefreshButton />
        </div>
      </SectionCard>

      <section className="product-grid product-grid-two">
        {sortedAccounts.map((account) => {
          const accountTasks = tasks.filter((task) => task.accountId === account.id);
          const availability = getAccountAvailabilityNotice(account);
          const worksSync = worksSyncByAccountId.get(account.id) ?? null;

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

              <article className={`state-card state-card-${availability.tone}`}>
                <strong>{availability.title}</strong>
                <p>{availability.detail}</p>
              </article>

              <div className="compact-status-row">
                <CompactStatus label="今日任务" value={account.todayTaskCount} />
                <CompactStatus label="待处理" value={account.waitingCount} tone={account.waitingCount > 0 ? "warm" : "positive"} />
                <CompactStatus label="已发布" value={account.publishedCount} tone="positive" />
                <CompactStatus label="互动" value={account.totalEngagement.toLocaleString()} />
              </div>

              <CollapsibleDetails summary="账号明细">
                <div className="detail-meta-grid">
                  <article className="detail-meta-card">
                    <span className="eyebrow">推荐主题</span>
                    <strong>{account.bestTopic}</strong>
                    <p>最近活跃 {new Date(account.lastActiveAt).toLocaleString("zh-CN")}</p>
                  </article>
                  <article className="detail-meta-card">
                    <span className="eyebrow">最近同步</span>
                    <strong>{account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString("zh-CN") : "暂无记录"}</strong>
                    <p>{account.lastSyncError ?? "当前没有同步错误摘要。"}</p>
                  </article>
                </div>
              </CollapsibleDetails>

              <div className="action-row">
                <AccountSyncButton accountId={account.id} />
              </div>

              {worksSync ? (
                <div className="queue-list">
                  {worksSync.works.slice(0, 3).map((work) => (
                    <article key={work.postId} className="queue-item">
                      <div className="queue-item-head">
                        <StatusPill label={getAccountSyncStatusLabel((work.lastSyncStatus as "idle" | "syncing" | "succeeded" | "failed" | "unknown") ?? "unknown")} tone={getAccountSyncStatusTone((work.lastSyncStatus as "idle" | "syncing" | "succeeded" | "failed" | "unknown") ?? "unknown")} />
                        <span className="muted-inline">{work.lastSyncAt ? new Date(work.lastSyncAt).toLocaleString("zh-CN") : "暂无同步时间"}</span>
                      </div>
                      <strong>{work.title}</strong>
                      <p>{work.likeCount} 赞 / {work.collectCount} 藏 / {work.commentCount} 评</p>
                      <p>{work.syncError ?? (work.platformUrl ? `已同步真实作品：${work.platformUrl}` : "当前还没有回写真实作品链接。")}</p>
                    </article>
                  ))}
                </div>
              ) : null}

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
