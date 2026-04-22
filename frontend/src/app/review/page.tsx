import { ComposerWorkbench } from "../../components/composer-workbench";
import { SectionCard, SectionHeading } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { getWorkspaceCandidates } from "../../lib/product";

function getSelectedPostId(searchParams: { postId?: string | string[] } | undefined) {
  if (!searchParams?.postId) {
    return null;
  }

  return Array.isArray(searchParams.postId) ? searchParams.postId[0] : searchParams.postId;
}

export default async function ReviewPage({ searchParams }: { searchParams?: Promise<{ postId?: string | string[] }> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [posts, assets] = await Promise.all([apiClient.posts.list(), apiClient.assets.list()]);
  const candidates = getWorkspaceCandidates(posts);
  const selectedPostId = getSelectedPostId(resolvedSearchParams) ?? candidates[0]?.id ?? null;
  const selectedPost = selectedPostId ? await apiClient.posts.getById(selectedPostId) : null;

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="发帖工作台" title="今天发什么、选哪版、什么时候交给 OpenClaw" description="把主题输入、AI 候选、人工作出最终选择和最终发送动作放在同一条工作流里。" />
        <ComposerWorkbench post={selectedPost} allAssets={assets} candidates={candidates} />
      </SectionCard>
    </div>
  );
}
