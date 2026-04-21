import { AssetUploadPanel } from "../components/asset-upload-panel";
import { WorkspaceForm } from "../components/workspace-form";
import { SectionCard, SectionHeading, StatusPill } from "../components/ui";
import { apiClient } from "../lib/api/client";

export default async function HomePage() {
  const [draft, summary] = await Promise.all([apiClient.workspace.getDraft(), apiClient.dashboard.getSummary()]);

  return (
    <div className="page-stack">
      <section className="hero-grid">
        <SectionCard className="hero-card">
          <span className="eyebrow">Workspace Entry</span>
          <h2>生成、编辑、提交审核的主链路，要一眼看懂。</h2>
          <p>这一页现在直接基于真实草稿接口驱动，优先接通保存与提交审核，让前后端联调主链路先闭环。</p>

          <div className="quick-metrics">
            <div>
              <span>待审核</span>
              <strong>{summary.pendingReviewCount}</strong>
            </div>
            <div>
              <span>已发布</span>
              <strong>{summary.publishedCount}</strong>
            </div>
            <div>
              <span>总浏览</span>
              <strong>{summary.totalViews.toLocaleString()}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="flow-card">
          <span className="eyebrow">Workflow</span>
          <div className="flow-line">
            <span>主题输入</span>
            <span>AI 生成</span>
            <span>人工编辑</span>
            <span>提交审核</span>
          </div>
        </SectionCard>
      </section>

      <section className="workspace-grid">
        <SectionCard>
          <SectionHeading eyebrow="Topic" title="内容工作台" description="本轮接通真实草稿数据、保存动作和提交审核动作。" />

          {"id" in draft ? (
            <>
              <div className="tag-row">
                <StatusPill label={draft.status} tone={draft.status === "in_review" ? "warm" : draft.status === "approved" || draft.status === "published" ? "positive" : "neutral"} />
                {draft.tags.map((tag) => (
                  <StatusPill key={tag} label={`#${tag}`} />
                ))}
              </div>

              <WorkspaceForm post={draft} />
            </>
          ) : (
            <p className="muted-copy">当前还没有可编辑草稿，等待后端生成第一篇内容草稿。</p>
          )}

          <div className="endpoint-stack">
            <code>{apiClient.posts.createEndpoint}</code>
            <code>{"id" in draft ? apiClient.posts.updateEndpoint(draft.id) : apiClient.posts.updateEndpoint("{post_id}")}</code>
            <code>{"id" in draft ? apiClient.posts.submitReviewEndpoint(draft.id) : apiClient.posts.submitReviewEndpoint("{post_id}")}</code>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading eyebrow="Assets" title="图片上传区" description="第三轮补真实上传反馈；素材展示本身仍保留轻量占位，等待查询接口补齐。" />

          {"id" in draft ? <AssetUploadPanel postId={draft.id} assetIds={draft.assetIds} /> : <p className="muted-copy">当前没有可关联的真实草稿，暂不触发素材上传联调。</p>}

          <div className="asset-strip">
            {apiClient.assets.list().slice(0, 2).map((asset) => (
              <article key={asset.id} className="asset-tile">
                <div className="asset-thumb" style={{ backgroundImage: `url(${asset.url})` }} />
                <strong>{asset.name}</strong>
              </article>
            ))}
          </div>

          <code>{apiClient.assets.uploadEndpoint}</code>
        </SectionCard>
      </section>
    </div>
  );
}
