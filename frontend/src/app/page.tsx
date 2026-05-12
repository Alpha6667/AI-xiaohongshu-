import Link from "next/link";

import { CompactStatus, SectionCard, SectionHeading, StatusPill } from "../components/ui";
import { apiClient } from "../lib/api/client";
import { adaptAccounts, adaptMessageTasks, buildAccountOverview, buildMessageTasks, getAccountForPost, getAccountStatusLabel, getAccountStatusTone, getFailureTypeLabel, getPublishNarrative, getTaskOverview, sortByPublishedDesc } from "../lib/product";

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

export default async function HomePage() {
  const [posts, summary, accountRecords, taskRecords] = await Promise.all([apiClient.posts.list(), apiClient.dashboard.getSummary(), getAccountsOrNull(), getTasksOrNull()]);
  const accounts = accountRecords ? adaptAccounts(accountRecords) : buildAccountOverview(posts);
  const tasks = taskRecords ? adaptMessageTasks(taskRecords, posts, accounts, !accountRecords) : buildMessageTasks(posts, accounts);
  const overview = getTaskOverview(tasks);
  const latestPublishPost = [...posts].filter((post) => post.status === "publishing" || post.status === "published" || post.status === "publish_failed").sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0] ?? null;
  const latestPublishDetail = latestPublishPost ? await apiClient.posts.getById(latestPublishPost.id) : null;
  const publishNarrative = latestPublishDetail ? getPublishNarrative(latestPublishDetail) : null;
  const recentPublished = sortByPublishedDesc(posts.filter((post) => post.status === "published")).slice(0, 4);
  const busyAccounts = accounts.filter((account) => account.todayTaskCount > 0).slice(0, 3);
  const failedPosts = posts.filter((post) => post.status === "publish_failed" || post.status === "rejected");
  const urgentTasks = tasks.filter((task) => task.requiresReview || task.stage === "failed" || task.stage === "ready_to_confirm").slice(0, 4);
  const disconnectedAccounts = accounts.filter((account) => account.reauthRequired || account.connectionStatus === "reauth_required" || account.lastSyncStatus === "failed");

  return (
    <div className="page-stack">
      <section className="product-hero compact-hero">
        <SectionCard className="hero-card product-hero-main">
          <span className="eyebrow">今天最该处理</span>
          <h2>{failedPosts.length > 0 ? "先处理发布失败" : overview.waitingReview > 0 ? "先确认待发布内容" : disconnectedAccounts.length > 0 ? "先恢复异常账号" : "今天链路正常"}</h2>
          <div className="compact-status-row">
            <CompactStatus label="待确认" value={overview.waitingReview} tone={overview.waitingReview > 0 ? "warm" : "positive"} />
            <CompactStatus label="发布失败" value={failedPosts.length} tone={failedPosts.length > 0 ? "critical" : "positive"} />
            <CompactStatus label="账号异常" value={disconnectedAccounts.length} tone={disconnectedAccounts.length > 0 ? "critical" : "positive"} />
          </div>
        </SectionCard>

        <SectionCard className="product-hero-side">
          <SectionHeading eyebrow="快速入口" title="按优先级处理" description="异常和待处理内容排在首页首屏，正常复盘放到后面。" />
          <div className="compact-action-list">
            <Link href="/dashboard" className="compact-action-item">发布中心</Link>
            <Link href="/tasks" className="compact-action-item">消息任务</Link>
            <Link href="/accounts" className="compact-action-item">账号状态</Link>
          </div>
        </SectionCard>
      </section>

      <section className="product-grid product-grid-two">
        <SectionCard className="product-card">
          <SectionHeading eyebrow="待处理任务" title="需要你出手的内容" description="只展示待确认或异常任务，完整列表进入消息任务中心。" />
          <div className="list-column compact-list-column">
            {(urgentTasks.length > 0 ? urgentTasks : tasks.slice(0, 3)).map((task) => (
              <article key={task.id} className="plain-row-card product-row-card">
                <div className="post-headline">
                  <strong>{task.topic}</strong>
                  <StatusPill label={task.stageLabel} tone={task.stageTone} />
                </div>
                <div className="row-metrics">
                  <span>账号 {task.accountName}</span>
                  <span>文案 {task.hasCopy ? "已就绪" : "待生成"}</span>
                  <span>图片 {task.hasImages ? "已就绪" : "待生成"}</span>
                </div>
                <Link href="/tasks" className="text-link product-link">
                  去消息任务中心看完整进度
                </Link>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="product-card">
          <SectionHeading eyebrow="账号风险" title="先看异常账号" description="优先列出登录失效、同步失败或需要处理的账号。" />
          <div className="list-column compact-list-column">
            {(disconnectedAccounts.length > 0 ? disconnectedAccounts : busyAccounts).map((account) => (
              <article key={account.id} className="plain-row-card product-row-card">
                <div className="post-headline">
                  <strong>{account.name}</strong>
                  <StatusPill label={getAccountStatusLabel(account.status)} tone={getAccountStatusTone(account.status)} />
                </div>
                <p>{account.summary}</p>
                <div className="row-metrics">
                  <span>今日任务 {account.todayTaskCount}</span>
                  <span>待处理 {account.waitingCount}</span>
                  <span>已发布 {account.publishedCount}</span>
                </div>
              </article>
            ))}
          </div>
          <Link href="/accounts" className="text-link product-link">
            去看多账号运营安排
          </Link>
        </SectionCard>
      </section>

      <section className="product-grid product-grid-two">
        <SectionCard className="product-card">
          <SectionHeading eyebrow="最近发布进展" title={latestPublishDetail ? latestPublishDetail.title : "最近还没有新的发布进展"} description="首页保留发布结果，但重点是告诉你 OpenClaw 执行到了哪一步。" />
          {latestPublishDetail && publishNarrative ? (
            <div className="decision-card">
              <div className="tag-row">
                <StatusPill label={publishNarrative.headline} tone={publishNarrative.tone} />
                {getFailureTypeLabel(latestPublishDetail.publishRecords.at(-1)?.failureType) ? <StatusPill label={getFailureTypeLabel(latestPublishDetail.publishRecords.at(-1)?.failureType) ?? ""} tone="critical" /> : null}
              </div>
              <strong>{publishNarrative.nextAction}</strong>
              <p>{latestPublishDetail.platformPostId ? `平台帖子已回写：${latestPublishDetail.platformPostId}` : "当前还在等待平台返回更明确结果。"}</p>
              <Link href="/dashboard" className="text-link product-link">
                去发布中心继续跟进
              </Link>
            </div>
          ) : (
            <div className="product-empty-card">
              <strong>今天还没有新的发布进展</strong>
              <p>等内容确认完成并交给 OpenClaw 后，这里会开始显示执行状态和审核结果。</p>
            </div>
          )}
        </SectionCard>

        <SectionCard className="product-card">
          <SectionHeading eyebrow="最近已发布内容" title="回后台直接看多账号结果" description="帖子与数据页继续保留，但首页先给你最近可复盘的内容入口。" />
          <div className="list-column compact-list-column">
            {recentPublished.length > 0 ? (
              recentPublished.map((post) => {
                const account = getAccountForPost(post, accounts, !accountRecords);

                return (
                  <article key={post.id} className="plain-row-card product-row-card">
                    <div className="post-headline">
                      <strong>{post.title}</strong>
                      <StatusPill label="已发布" tone="positive" />
                    </div>
                    <p>{account?.name ?? "未分配账号"}</p>
                    <div className="row-metrics">
                      <span>浏览 {post.latestMetrics.views.toLocaleString()}</span>
                      <span>点赞 {post.latestMetrics.likes.toLocaleString()}</span>
                      <span>收藏 {post.latestMetrics.favorites.toLocaleString()}</span>
                    </div>
                    <Link href={`/posts/${post.id}`} className="text-link product-link">
                      看这条内容的记录
                    </Link>
                  </article>
                );
              })
            ) : (
              <div className="product-empty-card">
                <strong>还没有已发布内容</strong>
                <p>等第一条任务走完整条链路后，这里会开始显示多账号发布结果和数据入口。</p>
              </div>
            )}
          </div>
        </SectionCard>
      </section>

      <section className="product-grid product-grid-two">
        <SectionCard className="product-card">
          <SectionHeading eyebrow="整体结果" title="今天后台先给你任务面，再给你结果面" description="保留核心结果指标，但不再让它们占据首页第一屏。" />
          <div className="product-stat-grid">
            <article className="metric-tile">
              <span>今日涉及账号</span>
              <strong>{overview.todayAccounts}</strong>
              <p>今天已经有发帖任务流转进后台的账号数量。</p>
            </article>
            <article className="metric-tile">
              <span>总浏览</span>
              <strong>{summary.totalViews.toLocaleString()}</strong>
              <p>用于快速感知最近整体分发规模。</p>
            </article>
            <article className="metric-tile">
              <span>总点赞</span>
              <strong>{summary.totalLikes.toLocaleString()}</strong>
              <p>先看互动结果，再决定哪些账号和主题要继续加码。</p>
            </article>
            <article className="metric-tile">
              <span>已发布</span>
              <strong>{summary.publishedCount}</strong>
              <p>当前已经通过审核并完成回写的内容数量。</p>
            </article>
          </div>
        </SectionCard>

        <SectionCard className="product-card">
          <SectionHeading eyebrow="下一步入口" title="今天最常用的三个页面" description="先把结构搭对，让操作路径一眼能懂。" />
          <div className="list-column compact-list-column">
            <article className="decision-card">
              <strong>先看消息任务中心</strong>
              <p>确认聊天里来的需求都变成了什么任务、是否已经生成候选内容。</p>
              <Link href="/tasks" className="text-link product-link">进入消息任务中心</Link>
            </article>
            <article className="decision-card">
              <strong>再去内容确认台</strong>
              <p>确认文案、图片和发布账号，决定由哪个账号发出。</p>
              <Link href="/review" className="text-link product-link">进入内容确认台</Link>
            </article>
            <article className="decision-card">
              <strong>最后看发布与数据</strong>
              <p>确认 OpenClaw 是否执行成功，以及每个账号的内容表现如何。</p>
              <Link href="/dashboard" className="text-link product-link">进入发布中心</Link>
            </article>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
