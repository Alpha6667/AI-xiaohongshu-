import { ComposerWorkbench } from "../../components/composer-workbench";
import { SectionCard, SectionHeading } from "../../components/ui";
import { apiClient } from "../../lib/api/client";
import type { PostDetail, PostListItem } from "../../lib/api/types";
import { adaptAccounts, adaptMessageTasks, buildMessageTasks, getMessageTaskForPost, getWorkspaceCandidates } from "../../lib/product";

async function getConfirmationsOrFallback(): Promise<PostListItem[]> {
  try {
    return await apiClient.confirmations.list();
  } catch {
    return await apiClient.posts.list();
  }
}

async function getConfirmationDetailOrFallback(postId: string): Promise<PostDetail> {
  try {
    return await apiClient.confirmations.getById(postId);
  } catch {
    return await apiClient.posts.getById(postId);
  }
}

async function getTasksOrNull() {
  try {
    return await apiClient.tasks.list();
  } catch {
    return null;
  }
}

async function getAccountsOrNull() {
  try {
    return await apiClient.accounts.list();
  } catch {
    return null;
  }
}

function getSelectedPostId(searchParams: { postId?: string | string[] } | undefined) {
  if (!searchParams?.postId) {
    return null;
  }

  return Array.isArray(searchParams.postId) ? searchParams.postId[0] : searchParams.postId;
}

export default async function ReviewPage({ searchParams }: { searchParams?: Promise<{ postId?: string | string[] }> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [posts, accountRecords, taskRecords] = await Promise.all([getConfirmationsOrFallback(), getAccountsOrNull(), getTasksOrNull()]);
  const accounts = accountRecords ? adaptAccounts(accountRecords) : [];
  const tasks = taskRecords ? adaptMessageTasks(taskRecords, posts, accounts) : buildMessageTasks(posts, accounts);
  const candidates = getWorkspaceCandidates(posts);
  const selectedPostId = getSelectedPostId(resolvedSearchParams) ?? candidates[0]?.id ?? null;
  const selectedPost = selectedPostId ? await getConfirmationDetailOrFallback(selectedPostId) : null;
  const selectedTask = selectedPost ? getMessageTaskForPost(selectedPost, tasks) : null;

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="内容确认台" title="确认系统已经生成好的候选文案、候选图片，并明确由哪个账号发" description="这里不再从零输入主题，而是承接消息任务中心里已经生成好的内容，完成最后一次人工确认。" />
        <ComposerWorkbench post={selectedPost} candidates={candidates} accounts={accounts} task={selectedTask} />
      </SectionCard>
    </div>
  );
}
