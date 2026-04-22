import { ComposerWorkbench } from "../../components/composer-workbench";
import { SectionCard, SectionHeading } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import { buildAccountOverview, buildMessageTasks, getWorkspaceCandidates } from "../../lib/product";

function getSelectedPostId(searchParams: { postId?: string | string[] } | undefined) {
  if (!searchParams?.postId) {
    return null;
  }

  return Array.isArray(searchParams.postId) ? searchParams.postId[0] : searchParams.postId;
}

export default async function ReviewPage({ searchParams }: { searchParams?: Promise<{ postId?: string | string[] }> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [posts, assets] = await Promise.all([apiClient.posts.list(), apiClient.assets.list()]);
  const accounts = buildAccountOverview(posts);
  const tasks = buildMessageTasks(posts, accounts);
  const candidates = getWorkspaceCandidates(posts);
  const selectedPostId = getSelectedPostId(resolvedSearchParams) ?? candidates[0]?.id ?? null;
  const selectedPost = selectedPostId ? await apiClient.posts.getById(selectedPostId) : null;
  const selectedTask = tasks.find((task) => task.postId === selectedPostId) ?? null;

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="内容确认台" title="确认系统已经生成好的候选文案、候选图片，并明确由哪个账号发" description="这里不再从零输入主题，而是承接消息任务中心里已经生成好的内容，完成最后一次人工确认。" />
        <ComposerWorkbench post={selectedPost} allAssets={assets} candidates={candidates} accounts={accounts} task={selectedTask} />
      </SectionCard>
    </div>
  );
}
