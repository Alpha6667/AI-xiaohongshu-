import Link from "next/link";

import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { adaptAccounts, buildAccountOverview, getAccountForPost, getPerformanceSuggestion, sortByPublishedDesc } from "../../lib/product";

async function getAccountsOrNull() {
  try {
    return await apiClient.accounts.list();
  } catch {
    return null;
  }
}

export default async function PostsPage() {
  const [posts, summary, accountRecords] = await Promise.all([apiClient.posts.list(), apiClient.dashboard.getSummary(), getAccountsOrNull()]);
  const accounts = accountRecords ? adaptAccounts(accountRecords) : buildAccountOverview(posts);
  const publishedPosts = sortByPublishedDesc(posts.filter((post) => post.status === "published"));

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="帖子与数据" title="强化多账号视角后，要清楚看到哪个账号发了哪条内容、表现怎么样" description="这页保留，但不再只看内容本身，也要能一眼看到账号归属和账号结果差异。" />

        <div className="dashboard-hero posts-hero">
          <article className="dashboard-highlight">
            <span className="eyebrow">已发布内容</span>
            <strong>{publishedPosts.length}</strong>
            <p>已经完成审核并回写的内容数量。发完以后先按账号和内容一起复盘，而不是只看单条帖子数据。</p>
          </article>

          <div className="metric-grid publish-metric-grid">
            <article className="metric-tile">
              <span>总点赞</span>
              <strong>{summary.totalLikes.toLocaleString()}</strong>
            </article>
            <article className="metric-tile">
              <span>总收藏</span>
              <strong>{summary.totalFavorites.toLocaleString()}</strong>
            </article>
            <article className="metric-tile">
              <span>总评论</span>
              <strong>{summary.totalComments.toLocaleString()}</strong>
            </article>
            <article className="metric-tile">
              <span>活跃账号</span>
              <strong>{accounts.filter((account) => account.publishedCount > 0).length}</strong>
            </article>
          </div>
        </div>

        <div className="post-list">
          {publishedPosts.length > 0 ? (
            publishedPosts.map((post) => {
              const account = getAccountForPost(post, accounts);

              return (
                <article key={post.id} className="post-row product-post-row multi-account-post-row">
                  <div className="post-main">
                    <div className="post-headline">
                      <div className="tag-row">
                        <StatusPill label="已审核通过" tone="positive" />
                        <StatusPill label={account.name} />
                        {post.messageTaskId ? <StatusPill label={`任务 ${post.messageTaskId}`} /> : null}
                        {post.platformPostId ? <StatusPill label={`平台 ID ${post.platformPostId}`} tone="positive" /> : null}
                      </div>
                      <span className="muted-inline">{post.topic}</span>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{getPerformanceSuggestion(post)}</p>
                    <div className="row-metrics">
                      <span>浏览 {post.latestMetrics.views.toLocaleString()}</span>
                      <span>点赞 {post.latestMetrics.likes.toLocaleString()}</span>
                      <span>收藏 {post.latestMetrics.favorites.toLocaleString()}</span>
                      <span>评论 {post.latestMetrics.comments.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="post-side product-post-side">
                    <span>发布时间</span>
                    <strong>{post.publishedAt ? new Date(post.publishedAt).toLocaleString("zh-CN") : "待回写"}</strong>
                    <p className="muted-copy">账号归属：{account.handle}</p>
                    <Link href={`/posts/${post.id}`} className="text-link product-link">
                      查看这条帖子的记录
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <article className="product-empty-card">
              <strong>当前还没有已发布内容</strong>
              <p>等第一条任务审核通过并回写后，这里会按“账号 + 内容”维度展示浏览、点赞、收藏和评论表现。</p>
            </article>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
