import Link from "next/link";

import { SectionCard, SectionHeading, StatusPill } from "../components/ui";
import { apiClient } from "../lib/api/client";
import { getFailureTypeLabel, getPublishNarrative, getStatusLabel, getStatusTone, getWorkspaceCandidates, sortByPublishedDesc } from "../lib/product";

export default async function HomePage() {
  const [posts, summary] = await Promise.all([apiClient.posts.list(), apiClient.dashboard.getSummary()]);
  const workspaceCandidates = getWorkspaceCandidates(posts);
  const todayFocus = workspaceCandidates[0] ?? null;
  const latestResultPost = [...posts]
    .filter((post) => post.status === "publishing" || post.status === "published" || post.status === "publish_failed")
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0] ?? null;
  const recentPublished = sortByPublishedDesc(posts.filter((post) => post.status === "published")).slice(0, 4);

  const [todayFocusDetail, latestResultDetail] = await Promise.all([
    todayFocus ? apiClient.posts.getById(todayFocus.id) : Promise.resolve(null),
    latestResultPost ? apiClient.posts.getById(latestResultPost.id) : Promise.resolve(null),
  ]);

  const publishNarrative = latestResultDetail ? getPublishNarrative(latestResultDetail) : null;
  const aiCopyReady = workspaceCandidates.filter((post) => post.title.trim() && post.body.trim()).length;
  const aiImageReady = todayFocusDetail?.assets.length ?? 0;

  return (
    <div className="page-stack">
      <section className="product-hero">
        <SectionCard className="hero-card product-hero-main">
          <span className="eyebrow">总览首页</span>
          <h2>今天先看账号、主题、候选是否准备好，再决定什么时候交给 OpenClaw 去发。</h2>
          <p>这里先把真正影响今天发帖节奏的信息放在前面，不再按接口或调试模块拆页面。</p>

          <div className="quick-metrics">
            <div>
              <span>账号状态</span>
              <strong>已连接</strong>
            </div>
            <div>
              <span>今天待发</span>
              <strong>{workspaceCandidates.length}</strong>
            </div>
            <div>
              <span>已发总浏览</span>
              <strong>{summary.totalViews.toLocaleString()}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="product-hero-side">
          <span className="eyebrow">今日节奏</span>
          <div className="flow-line product-flow-line">
            <span>1. 选今天的主题</span>
            <span>2. 看 AI 候选</span>
            <span>3. 人工挑最终版</span>
            <span>4. 交给 OpenClaw</span>
            <span>5. 看审核和数据</span>
          </div>
        </SectionCard>
      </section>

      <section className="product-grid product-grid-two">
        <SectionCard className="product-card">
          <SectionHeading eyebrow="今天准备发什么" title={todayFocus ? todayFocus.topic : "今天还没有新主题"} description="先明确今天优先推进哪条内容，再进入挑选文案和图片。" />
          {todayFocus ? (
            <div className="decision-card">
              <div className="tag-row">
                <StatusPill label={getStatusLabel(todayFocus.status)} tone={getStatusTone(todayFocus.status)} />
                <StatusPill label={`更新时间 ${new Date(todayFocus.updatedAt).toLocaleString("zh-CN")}`} />
              </div>
              <strong>{todayFocus.title}</strong>
              <p>这条内容现在是今天最靠前的待处理项，建议直接进入发帖工作台完成筛选和确认。</p>
              <Link href={`/review?postId=${todayFocus.id}`} className="text-link product-link">
                进入发帖工作台
              </Link>
            </div>
          ) : (
            <div className="product-empty-card">
              <strong>当前没有待推进的主题</strong>
              <p>如果今天暂时没有新主题，可以先去帖子与数据页复盘最近表现，再决定下一个方向。</p>
            </div>
          )}
        </SectionCard>

        <SectionCard className="product-card">
          <SectionHeading eyebrow="AI 是否准备好" title="候选文案和候选图片" description="只看今天发帖真正需要的准备度，不再展示技术入口。" />
          <div className="product-stat-grid">
            <article className="metric-tile">
              <span>可直接挑选的主题</span>
              <strong>{aiCopyReady}</strong>
              <p>已有标题和正文基础，可以直接进入 3 版候选挑选。</p>
            </article>
            <article className="metric-tile">
              <span>今天主题候选图</span>
              <strong>{aiImageReady}</strong>
              <p>{todayFocusDetail ? `当前主题已挂接 ${aiImageReady} 张候选图。` : "等选中今天主题后再看候选图。"}</p>
            </article>
          </div>
          <Link href={todayFocus ? `/review?postId=${todayFocus.id}` : "/review"} className="text-link product-link">
            去确认今天的文案和图片
          </Link>
        </SectionCard>
      </section>

      <section className="product-grid product-grid-two">
        <SectionCard className="product-card">
          <SectionHeading eyebrow="最近发布结果" title={latestResultDetail ? latestResultDetail.title : "最近还没有新的发布结果"} description="先看最近一次发送走到哪一步，以及你下一步该做什么。" />
          {latestResultDetail && publishNarrative ? (
            <div className="decision-card">
              <div className="tag-row">
                <StatusPill label={getStatusLabel(latestResultDetail.status)} tone={getStatusTone(latestResultDetail.status)} />
                {latestResultDetail.platformPostId ? <StatusPill label={`平台 ID ${latestResultDetail.platformPostId}`} tone="positive" /> : null}
                {getFailureTypeLabel(latestResultDetail.publishRecords.at(-1)?.failureType) ? <StatusPill label={getFailureTypeLabel(latestResultDetail.publishRecords.at(-1)?.failureType) ?? ""} tone="critical" /> : null}
              </div>
              <strong>{publishNarrative.headline}</strong>
              <p>{publishNarrative.nextAction}</p>
              <Link href="/dashboard" className="text-link product-link">
                去发布中心看完整过程
              </Link>
            </div>
          ) : (
            <div className="product-empty-card">
              <strong>最近还没有发送记录</strong>
              <p>等你把今天的内容交给 OpenClaw 后，这里会先告诉你发送到哪一步、是否过审、接下来该怎么做。</p>
            </div>
          )}
        </SectionCard>

        <SectionCard className="product-card">
          <SectionHeading eyebrow="最近已发帖子" title="发完后可以直接回看" description="发完不需要再跳技术页，直接看最近几条内容和表现入口。" />
          <div className="list-column compact-list-column">
            {recentPublished.length > 0 ? (
              recentPublished.map((post) => (
                <article key={post.id} className="plain-row-card product-row-card">
                  <div className="post-headline">
                    <strong>{post.title}</strong>
                    <StatusPill label="已发布" tone="positive" />
                  </div>
                  <p>{post.topic}</p>
                  <div className="row-metrics">
                    <span>点赞 {post.latestMetrics.likes.toLocaleString()}</span>
                    <span>收藏 {post.latestMetrics.favorites.toLocaleString()}</span>
                    <span>评论 {post.latestMetrics.comments.toLocaleString()}</span>
                  </div>
                  <Link href={`/posts/${post.id}`} className="text-link product-link">
                    直接查看这条帖子的记录
                  </Link>
                </article>
              ))
            ) : (
              <div className="product-empty-card">
                <strong>还没有已发帖子</strong>
                <p>等第一条内容发布通过后，这里会直接出现最近帖子入口和基础数据。</p>
              </div>
            )}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
