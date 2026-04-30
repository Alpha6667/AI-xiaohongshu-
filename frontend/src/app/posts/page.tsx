import type { Metadata } from "next";
import Link from "next/link";

import { RefreshButton } from "../../components/refresh-button";
import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { adaptAccounts, buildAccountOverview, getAccountForPost, getPerformanceSuggestion, getPostInteractionSummary, getPostSyncState, getReviewStatus, getReviewStatusLabel, getReviewStatusTone, getStatusLabel, getStatusTone, sortByUpdatedDesc } from "../../lib/product";

export const metadata: Metadata = {
  title: "帖子与数据 | 小红书日常发帖工作台",
  description: "查看每条内容的发布时间、当前状态和互动数据，快速判断哪些内容值得继续跟进。",
};

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
  const timelinePosts = sortByUpdatedDesc(posts);

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="帖子与数据" title="把每条内容的发布时间、当前状态和数据结果放到同一页里看清楚" description="这里不再像接口列表，而是按运营视角看清楚每条内容发给了谁、现在表现怎么样。" />

        <div className="dashboard-hero posts-hero">
            <article className="dashboard-highlight">
            <span className="eyebrow">内容总览</span>
            <strong>{timelinePosts.length}</strong>
            <p>这里直接看真实帖子主表，按发布时间、当前状态和数据结果整理最近内容，不再把页面做成联调记录面板。</p>
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
              <span>平台审核中</span>
              <strong>{posts.filter((post) => post.status === "under_review").length}</strong>
            </article>
          </div>
        </div>

        <div className="action-row">
          <RefreshButton />
        </div>

        <div className="post-list">
          {timelinePosts.length > 0 ? (
            timelinePosts.map((post) => {
              const account = getAccountForPost(post, accounts, !accountRecords);
              const metrics = getPostInteractionSummary(post);
              const reviewStatus = getReviewStatus(post);
              const syncState = getPostSyncState(post);

              return (
                <article key={post.id} className="post-row product-post-row multi-account-post-row">
                  <div className="post-main">
                    <div className="post-headline">
                      <div className="tag-row">
                        <StatusPill label={getStatusLabel(post.status)} tone={getStatusTone(post.status)} />
                        <StatusPill label={getReviewStatusLabel(reviewStatus)} tone={getReviewStatusTone(reviewStatus)} />
                        <StatusPill label={account.name} />
                        {post.platformPostId ? <StatusPill label="已回写平台标识" tone="positive" /> : null}
                      </div>
                      <span className="muted-inline">{post.topic}</span>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{getPerformanceSuggestion(post)}</p>
                    <div className="row-metrics">
                      <span>浏览 {post.latestMetrics.views.toLocaleString()}</span>
                      <span>点赞 {metrics.likes.toLocaleString()}</span>
                      <span>收藏 {metrics.collects.toLocaleString()}</span>
                      <span>评论 {metrics.comments.toLocaleString()}</span>
                    </div>
                    <p className="muted-copy">{syncState.label}：{syncState.detail}</p>
                  </div>
                  <div className="post-side product-post-side">
                    <span>发布时间</span>
                    <strong>{post.publishedAt ? new Date(post.publishedAt).toLocaleString("zh-CN") : "尚未发布"}</strong>
                    <p className="muted-copy">账号归属：{account.id ? account.handle : "未分配账号"}</p>
                    <p className="muted-copy">当前状态：{getStatusLabel(post.status)}</p>
                    <Link href={`/posts/${post.id}`} className="text-link product-link">
                      查看完整记录
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <article className="product-empty-card">
              <strong>当前还没有可复盘的内容</strong>
              <p>等真实任务承接成帖子后，这里会按“发布时间 + 状态 + 数据结果”的顺序展示每条内容的完整记录。</p>
            </article>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
