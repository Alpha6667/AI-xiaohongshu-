import Link from "next/link";

import { AssetUploadPanel } from "../components/asset-upload-panel";
import { WorkspaceForm } from "../components/workspace-form";
import { SectionCard, SectionHeading, StatusPill } from "../components/ui";
import { apiClient } from "../lib/api/client";
import type { PostListItem } from "../lib/api/types";

function getStatusTone(status: string) {
  if (status === "published") {
    return "positive" as const;
  }

  if (status === "publish_failed") {
    return "critical" as const;
  }

  if (status === "in_review" || status === "publishing") {
    return "warm" as const;
  }

  if (status === "approved") {
    return "positive" as const;
  }

  return "neutral" as const;
}

function getWorkspaceCandidates(posts: PostListItem[]) {
  return apiClient.workspace.listCandidatePosts(posts);
}

function getSelectedPostId(searchParams: { postId?: string | string[] } | undefined) {
  if (!searchParams?.postId) {
    return null;
  }

  return Array.isArray(searchParams.postId) ? searchParams.postId[0] : searchParams.postId;
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ postId?: string | string[] }> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [posts, summary] = await Promise.all([apiClient.posts.list(), apiClient.dashboard.getSummary()]);
  const workspaceCandidates = getWorkspaceCandidates(posts);
  const selectedPostId = getSelectedPostId(resolvedSearchParams);
  const selectedCandidate = workspaceCandidates.find((post) => post.id === selectedPostId) ?? null;
  const selectedPost = selectedCandidate ? await apiClient.posts.getById(selectedCandidate.id) : null;
  const hasInvalidSelection = Boolean(selectedPostId) && !selectedCandidate;

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
          <SectionHeading eyebrow="Topic" title="内容工作台" description="第六轮开始明确当前工作对象，不再默认抓取第一篇草稿。" />

          {workspaceCandidates.length > 0 ? (
            <>
              <div className="workspace-selector-header">
                <div>
                  <span className="eyebrow">Workspace Context</span>
                  <p className="muted-copy">请先明确当前正在处理的帖子，再进入生成、编辑和发布动作。</p>
                </div>
                <strong>{selectedPost ? `当前工作对象：${selectedPost.title}` : "当前未选择工作对象"}</strong>
              </div>

              <div className="workspace-selector-list">
                {workspaceCandidates.map((post) => {
                  const active = selectedPost?.id === post.id;

                  return (
                    <Link key={post.id} href={`/?postId=${post.id}`} className={`workspace-option${active ? " workspace-option-active" : ""}`}>
                      <div className="workspace-option-head">
                        <StatusPill label={post.status} tone={getStatusTone(post.status)} />
                        <span className="muted-inline">{new Date(post.updatedAt).toLocaleString("zh-CN")}</span>
                      </div>
                      <strong>{post.title}</strong>
                      <p>{post.topic}</p>
                    </Link>
                  );
                })}
              </div>

              {hasInvalidSelection ? <p className="feedback-text">当前 `postId` 不在可工作的帖子集合中，请重新选择。</p> : null}

              {selectedPost ? (
                <>
                  <div className="tag-row">
                    <StatusPill label={selectedPost.status} tone={getStatusTone(selectedPost.status)} />
                    {selectedPost.tags.map((tag) => (
                      <StatusPill key={tag} label={`#${tag}`} />
                    ))}
                  </div>

                  <WorkspaceForm post={selectedPost} />
                </>
              ) : (
                <div className="workspace-empty-state">
                  <strong>还没有选中当前工作的帖子</strong>
                  <p className="muted-copy">请从上方列表中明确选择一个当前工作对象，再进行生成、审核、发布或素材关联。</p>
                </div>
              )}
            </>
          ) : (
            <div className="workspace-empty-state">
              <strong>当前没有可工作的帖子</strong>
              <p className="muted-copy">当前所有帖子都已发布或系统尚未生成新的工作项，工作台保持空状态。</p>
            </div>
          )}

          <div className="endpoint-stack">
            <code>{apiClient.posts.createEndpoint}</code>
            <code>{selectedPost ? apiClient.posts.updateEndpoint(selectedPost.id) : apiClient.posts.updateEndpoint("{post_id}")}</code>
            <code>{selectedPost ? apiClient.posts.generateCopyEndpoint(selectedPost.id) : apiClient.posts.generateCopyEndpoint("{post_id}")}</code>
            <code>{selectedPost ? apiClient.posts.generateImagesEndpoint(selectedPost.id) : apiClient.posts.generateImagesEndpoint("{post_id}")}</code>
            <code>{selectedPost ? apiClient.posts.submitReviewEndpoint(selectedPost.id) : apiClient.posts.submitReviewEndpoint("{post_id}")}</code>
            <code>{selectedPost ? apiClient.posts.publishEndpoint(selectedPost.id) : apiClient.posts.publishEndpoint("{post_id}")}</code>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading eyebrow="Assets" title="图片上传区" description="素材区只跟随当前明确选中的工作对象，避免继续隐式绑定第一篇草稿。" />

          {selectedPost ? <AssetUploadPanel postId={selectedPost.id} assetIds={selectedPost.assetIds} assets={selectedPost.assets} /> : <p className="muted-copy">当前没有选中工作对象，暂不触发素材上传与关联。</p>}

          <code>{apiClient.assets.uploadEndpoint}</code>
        </SectionCard>
      </section>
    </div>
  );
}
