import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";

const metricMap = [
  { key: "totalPosts", label: "总帖子数" },
  { key: "totalViews", label: "浏览" },
  { key: "totalLikes", label: "点赞" },
  { key: "totalFavorites", label: "收藏" },
  { key: "totalComments", label: "评论" },
  { key: "followConversions", label: "关注转化" },
] as const;

export default async function DashboardPage() {
  const summary = await apiClient.dashboard.getSummary();
  const posts = await apiClient.posts.list();
  const publishedPosts = posts.filter((post) => post.status === "published");

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="Dashboard" title="看板页不是一排普通统计卡" description="保留信息层级，先把核心指标、近期表现和待处理事项做出明显主次。" />

        <div className="dashboard-hero">
          <article className="dashboard-highlight">
            <span className="eyebrow">Overview</span>
            <strong>{summary.totalViews.toLocaleString()}</strong>
            <p>当前发布内容累计浏览，作为第一眼看到的主指标。</p>
          </article>

          <div className="metric-grid">
            {metricMap.map((metric) => (
              <article key={metric.key} className="metric-tile">
                <span>{metric.label}</span>
                <strong>{summary[metric.key].toLocaleString()}</strong>
              </article>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="two-column-grid">
        <SectionCard>
          <SectionHeading eyebrow="Recent Performance" title="近期内容表现" />
          <div className="list-column">
            {publishedPosts.map((post) => (
              <article key={post.id} className="plain-row-card">
                <div>
                  <StatusPill label="已发布" tone="positive" />
                  <h3>{post.title}</h3>
                </div>
                <div className="row-metrics">
                  <span>浏览 {post.latestMetrics.views.toLocaleString()}</span>
                  <span>点赞 {post.latestMetrics.likes.toLocaleString()}</span>
                  <span>收藏 {post.latestMetrics.favorites.toLocaleString()}</span>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading eyebrow="Pending" title="待处理事项" />
          <div className="todo-stack">
            <article className="todo-card">
              <span className="todo-index">01</span>
              <div>
                <strong>审核中稿件</strong>
                <p>{summary.pendingReviewCount} 篇内容等待人工确认文案和封面语气。</p>
              </div>
            </article>
            <article className="todo-card">
              <span className="todo-index">02</span>
              <div>
                <strong>指标回填</strong>
                <p>当前已切到真实看板接口，本轮继续保证聚合字段稳定，不扩展趋势维度。</p>
              </div>
            </article>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
