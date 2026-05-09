import type { Metadata } from "next";
import Link from "next/link";

import { RefreshButton } from "../../components/refresh-button";
import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { adaptAccounts, buildAccountOverview, getAccountForPost, getPostSyncState, getReviewStatus, getReviewStatusLabel, getReviewStatusTone, getStatusLabel, getStatusTone, sortByUpdatedDesc } from "../../lib/product";

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

        <div className="product-table-scroll">
          {timelinePosts.length > 0 ? (
            <table className="product-data-table posts-data-table">
              <thead>
                <tr>
                  <th scope="col">内容</th>
                  <th scope="col">账号</th>
                  <th scope="col">状态</th>
                  <th scope="col" className="numeric-cell">浏览</th>
                  <th scope="col" className="numeric-cell">点赞</th>
                  <th scope="col" className="numeric-cell">收藏</th>
                  <th scope="col" className="numeric-cell">评论</th>
                  <th scope="col" className="numeric-cell">关注转化</th>
                  <th scope="col">最近拉数</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {timelinePosts.map((post) => {
                  const account = getAccountForPost(post, accounts, !accountRecords);
                  const reviewStatus = getReviewStatus(post);
                  const syncState = getPostSyncState(post);

                  return (
                    <tr key={post.id}>
                      <td className="content-cell">
                        <strong>{post.title || post.topic}</strong>
                        <span>{post.topic}</span>
                      </td>
                      <td>
                        <strong>{account.name}</strong>
                        <span className="muted-inline">{account.id ? account.handle : "未分配账号"}</span>
                      </td>
                      <td>
                        <div className="table-status-stack">
                          <StatusPill label={getStatusLabel(post.status)} tone={getStatusTone(post.status)} />
                          <StatusPill label={getReviewStatusLabel(reviewStatus)} tone={getReviewStatusTone(reviewStatus)} />
                        </div>
                      </td>
                      <td className="numeric-cell">{post.latestMetrics.views.toLocaleString()}</td>
                      <td className="numeric-cell">{post.latestMetrics.likes.toLocaleString()}</td>
                      <td className="numeric-cell">{post.latestMetrics.favorites.toLocaleString()}</td>
                      <td className="numeric-cell">{post.latestMetrics.comments.toLocaleString()}</td>
                      <td className="numeric-cell">{post.latestMetrics.followConversions.toLocaleString()}</td>
                      <td>
                        <strong>{post.lastSyncAt ? new Date(post.lastSyncAt).toLocaleString("zh-CN") : syncState.label}</strong>
                        <span className="muted-inline">{syncState.detail}</span>
                      </td>
                      <td>
                        <Link href={`/posts/${post.id}`} className="text-link product-link">
                          查看完整记录
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
