import Link from "next/link";

import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { getPerformanceSuggestion, sortByPublishedDesc } from "../../lib/product";

export default async function PostsPage() {
  const [posts, summary] = await Promise.all([apiClient.posts.list(), apiClient.dashboard.getSummary()]);
  const publishedPosts = sortByPublishedDesc(posts.filter((post) => post.status === "published"));

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="帖子与数据" title="发完以后，直接看帖子和表现，再决定要不要继续做同类主题" description="这里不按接口字段组织，而是先看哪些主题值得继续、哪些需要换角度。" />

        <div className="dashboard-hero posts-hero">
          <article className="dashboard-highlight">
            <span className="eyebrow">已发布内容</span>
            <strong>{publishedPosts.length}</strong>
            <p>已经审核通过并发出的帖子数量。发完之后先来这里看表现，再决定明天发什么。</p>
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
              <span>关注转化</span>
              <strong>{summary.followConversions.toLocaleString()}</strong>
            </article>
          </div>
        </div>

        <div className="post-list">
          {publishedPosts.length > 0 ? (
            publishedPosts.map((post) => (
              <article key={post.id} className="post-row product-post-row">
                <div className="post-main">
                  <div className="post-headline">
                    <div className="tag-row">
                      <StatusPill label="已审核通过" tone="positive" />
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
                  <Link href={`/posts/${post.id}`} className="text-link product-link">
                    查看这条帖子的记录
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <article className="product-empty-card">
              <strong>当前还没有已发布内容</strong>
              <p>等第一条内容审核通过并回写后，这里会按帖子维度展示浏览、点赞、收藏和评论表现。</p>
            </article>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
