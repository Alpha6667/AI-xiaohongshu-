import Link from "next/link";
import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";

function getCoverStyle(postId: string) {
  const covers = [
    "linear-gradient(135deg, rgba(127, 97, 71, 0.28), rgba(255, 255, 255, 0.82))",
    "linear-gradient(135deg, rgba(96, 115, 92, 0.24), rgba(255, 255, 255, 0.78))",
    "linear-gradient(135deg, rgba(89, 86, 118, 0.24), rgba(255, 255, 255, 0.78))",
  ];
  const index = postId.charCodeAt(postId.length - 1) % covers.length;
  return covers[index];
}

function getStatusTone(status: string) {
  if (status === "published") {
    return "positive" as const;
  }

  if (status === "in_review") {
    return "warm" as const;
  }

  return "neutral" as const;
}

export default async function PostsPage() {
  const posts = await apiClient.posts.list();

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="Posts" title="帖子列表" description="列表页先展示状态、发布时间、封面、标题和最新指标，字段命名按 API 合同预留。" />

        <div className="post-list">
          {posts.map((post) => (
            <Link key={post.id} href={`/posts/${post.id}`} className="post-row">
              <div className="post-cover" style={{ background: getCoverStyle(post.id) }} />
              <div className="post-main">
                <div className="post-headline">
                  <StatusPill label={post.status} tone={getStatusTone(post.status)} />
                  <span className="muted-inline">{post.topic}</span>
                </div>
                <h3>{post.title}</h3>
                <p>更新时间 {new Date(post.updatedAt).toLocaleString("zh-CN")}</p>
              </div>
              <div className="post-side">
                <span>发布时间</span>
                <strong>{post.publishedAt ? new Date(post.publishedAt).toLocaleString("zh-CN") : "待发布"}</strong>
                <div className="row-metrics compact-metrics">
                  <span>浏览 {post.latestMetrics.views.toLocaleString()}</span>
                  <span>点赞 {post.latestMetrics.likes.toLocaleString()}</span>
                  <span>收藏 {post.latestMetrics.favorites.toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
