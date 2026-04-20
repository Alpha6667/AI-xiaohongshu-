import { apiClient } from "../lib/api/client";
import { SectionCard, SectionHeading, StatusPill } from "../components/ui";

export default function HomePage() {
  const draft = apiClient.workspace.getDraft();
  const summary = apiClient.dashboard.getSummary();

  return (
    <div className="page-stack">
      <section className="hero-grid">
        <SectionCard className="hero-card">
          <span className="eyebrow">Workspace Entry</span>
          <h2>生成、编辑、提交审核的主链路，要一眼看懂。</h2>
          <p>
            这一页先承载内容工作台入口，用 mock 数据把主题输入、文案编辑、图片选择和 AI 生成动作都摆出来，便于后续直接接真实接口。
          </p>

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
          <SectionHeading eyebrow="Topic" title="内容工作台" description="预留 `POST /api/posts`、`PATCH /api/posts/{post_id}`、生成与审核相关接口边界。" />

          <div className="field-grid">
            <label className="field-block">
              <span>主题输入</span>
              <input defaultValue={draft.topic} readOnly />
            </label>
            <label className="field-block">
              <span>标题</span>
              <input defaultValue={draft.title} readOnly />
            </label>
          </div>

          <label className="field-block">
            <span>正文编辑</span>
            <textarea defaultValue={draft.body} rows={8} readOnly />
          </label>

          <div className="field-block">
            <span>标签区域</span>
            <div className="tag-row">
              {draft.tags.map((tag) => (
                <StatusPill key={tag} label={`#${tag}`} />
              ))}
            </div>
          </div>

          <div className="field-block">
            <span>AI 操作入口</span>
            <div className="action-row">
              <button type="button">生成文案</button>
              <button type="button">生成图片</button>
              <button type="button">提交审核</button>
            </div>
            <div className="endpoint-stack">
              <code>{apiClient.posts.createEndpoint}</code>
              <code>{apiClient.posts.generateCopyEndpoint("post-001")}</code>
              <code>{apiClient.posts.generateImagesEndpoint("post-001")}</code>
              <code>{apiClient.posts.submitReviewEndpoint("post-001")}</code>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading eyebrow="Assets" title="图片上传区" description="当前先展示素材入口与挂载关系，等待 `POST /api/assets/upload` 接入。" />

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
