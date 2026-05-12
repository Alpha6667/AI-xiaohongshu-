import type {
  AccountConnectionStatus,
  AccountRecord,
  AccountSyncStatus,
  MessageTaskRecord,
  PostDetail,
  PostListItem,
  PostMetrics,
  PostStatus,
  PublishRecord,
  ReviewStatus,
} from "./api/types";

type AccountStatus = "online" | "offline" | "busy";
type MessageTaskStage = "waiting_generation" | "ready_to_confirm" | "waiting_publish" | "publishing" | "published" | "failed";

export interface AccountOverview {
  id: string;
  name: string;
  handle: string;
  status: AccountStatus;
  connectionStatus: AccountConnectionStatus;
  reauthRequired: boolean;
  summary: string;
  lastActiveAt: string;
  connectedAt: string | null;
  lastValidatedAt: string | null;
  lastUsedAt: string | null;
  lastAuthError: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: AccountSyncStatus;
  lastSyncError: string | null;
  todayTaskCount: number;
  waitingCount: number;
  publishedCount: number;
  totalEngagement: number;
  bestTopic: string;
}

export interface MessageTask {
  id: string;
  postId: string;
  accountId: string;
  accountName: string;
  sourceMessage: string;
  requestedAt: string;
  plannedAt: string;
  topic: string;
  title: string;
  stage: MessageTaskStage;
  stageLabel: string;
  stageTone: "neutral" | "warm" | "positive" | "critical";
  hasCopy: boolean;
  hasImages: boolean;
  requiresReview: boolean;
  nextAction: string;
}

export interface GenerationReadiness {
  key: "pending" | "copy_ready" | "image_ready" | "review_ready";
  label: string;
  description: string;
  tone: "neutral" | "warm" | "positive";
}

export interface PublishFlowState {
  label: string;
  detail: string;
  tone: "neutral" | "warm" | "positive" | "critical";
}

export interface SharedConfirmationInfo {
  headline: string;
  detail: string;
  sourceLabel: string;
}

export interface AccountAvailabilityNotice {
  title: string;
  detail: string;
  tone: "neutral" | "warm" | "positive" | "critical";
  canPublish: boolean;
}

export interface PostInteractionSummary {
  likes: number;
  collects: number;
  comments: number;
}

export interface PostSyncState {
  label: string;
  detail: string;
  tone: "neutral" | "warm" | "positive" | "critical";
}

const syncErrorLabels: Record<string, string> = {
  post_needs_manual_verification: "需要在小红书官方页面完成人工验证后再刷新数据",
};

const unassignedAccount: AccountOverview = {
  id: "",
  name: "未分配账号",
  handle: "当前还没有真实账号归属",
  status: "offline",
  connectionStatus: "unknown",
  reauthRequired: false,
  summary: "这条内容目前还没有绑定到任何真实账号。",
  lastActiveAt: new Date(0).toISOString(),
  connectedAt: null,
  lastValidatedAt: null,
  lastUsedAt: null,
  lastAuthError: null,
  lastSyncAt: null,
  lastSyncStatus: "unknown",
  lastSyncError: null,
  todayTaskCount: 0,
  waitingCount: 0,
  publishedCount: 0,
  totalEngagement: 0,
  bestTopic: "今天还没有已发布样本",
};

const accountSeeds = [
  {
    id: "account-lulu",
    name: "小鹿的穿搭日记",
    handle: "@lulu_outfit",
    status: "online" as const,
    connectionStatus: "connected" as const,
    reauthRequired: false,
    summary: "偏穿搭和通勤内容，适合承接今晚的高意图任务。",
    connectedAt: "2026-04-22T09:12:00Z",
    lastValidatedAt: "2026-04-24T09:45:00Z",
    lastUsedAt: "2026-04-24T10:10:00Z",
    lastAuthError: null,
    lastActiveAt: "2026-04-22T11:58:00Z",
    lastSyncAt: "2026-04-24T10:20:00Z",
    lastSyncStatus: "succeeded" as const,
    lastSyncError: null,
  },
  {
    id: "account-yiyi",
    name: "一一的居家灵感",
    handle: "@yiyi_home",
    status: "busy" as const,
    connectionStatus: "validating" as const,
    reauthRequired: false,
    summary: "今天已有生成中的任务，更适合接家居与空间内容。",
    connectedAt: "2026-04-21T17:40:00Z",
    lastValidatedAt: "2026-04-24T09:32:00Z",
    lastUsedAt: "2026-04-24T09:32:00Z",
    lastAuthError: null,
    lastActiveAt: "2026-04-22T11:32:00Z",
    lastSyncAt: "2026-04-24T09:30:00Z",
    lastSyncStatus: "syncing" as const,
    lastSyncError: null,
  },
  {
    id: "account-momo",
    name: "Momo 轻食研究所",
    handle: "@momo_foodlab",
    status: "offline" as const,
    connectionStatus: "reauth_required" as const,
    reauthRequired: true,
    summary: "最近数据不错，但当前账号离线，需要稍后接回。",
    connectedAt: "2026-04-20T20:18:00Z",
    lastValidatedAt: "2026-04-24T07:50:00Z",
    lastUsedAt: "2026-04-23T21:14:00Z",
    lastAuthError: "登录态已失效，需要重新登录后才能继续发布和拉数。",
    lastActiveAt: "2026-04-22T08:20:00Z",
    lastSyncAt: "2026-04-24T07:50:00Z",
    lastSyncStatus: "failed" as const,
    lastSyncError: "登录态失效，最近一次拉取作品数据失败。",
  },
];

function coerceConnectionStatus(rawValue: AccountRecord["connectionStatus"], reauthRequired?: boolean | null): AccountConnectionStatus {
  if (reauthRequired) {
    return "reauth_required";
  }

  if (rawValue === "connected" || rawValue === "disconnected" || rawValue === "reauth_required" || rawValue === "validating") {
    return rawValue;
  }

  return "unknown";
}

function coerceSyncStatus(rawValue: AccountRecord["lastSyncStatus"]): AccountSyncStatus {
  if (rawValue === "idle" || rawValue === "syncing" || rawValue === "succeeded" || rawValue === "failed") {
    return rawValue;
  }

  return "unknown";
}

export function getSyncErrorLabel(syncError?: string | null) {
  if (!syncError) {
    return null;
  }

  return syncErrorLabels[syncError] ?? syncError;
}

export function getReviewStatus(post: Pick<PostListItem, "status"> & { reviewStatus?: ReviewStatus | string | null }) {
  if (post.reviewStatus === "under_review" || post.status === "under_review") {
    return "under_review" as const;
  }

  if (post.reviewStatus === "rejected" || post.status === "rejected") {
    return "rejected" as const;
  }

  if (post.reviewStatus === "approved" || post.status === "approved" || post.status === "published") {
    return "approved" as const;
  }

  if (post.reviewStatus === "pending" || post.status === "draft" || post.status === "in_review") {
    return "pending" as const;
  }

  return "unknown" as const;
}

export function sortByUpdatedDesc<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function sortByPublishedDesc<T extends { publishedAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => new Date(right.publishedAt ?? 0).getTime() - new Date(left.publishedAt ?? 0).getTime());
}

export function getStatusTone(status: PostStatus) {
  if (status === "published") {
    return "positive" as const;
  }

  if (status === "publish_failed" || status === "rejected") {
    return "critical" as const;
  }

  if (status === "in_review" || status === "publishing" || status === "under_review") {
    return "warm" as const;
  }

  if (status === "approved") {
    return "positive" as const;
  }

  return "neutral" as const;
}

export function getStatusLabel(status: PostStatus) {
  if (status === "draft") {
    return "待完善";
  }

  if (status === "in_review") {
    return "待确认";
  }

  if (status === "approved") {
    return "待发送";
  }

  if (status === "publishing") {
    return "发送中";
  }

  if (status === "under_review") {
    return "平台审核中";
  }

  if (status === "rejected") {
    return "审核未通过";
  }

  if (status === "publish_failed") {
    return "发送失败";
  }

  return "已发布";
}

export function getFailureTypeLabel(failureType?: PublishRecord["failureType"] | null) {
  if (failureType === "retryable") {
    return "可重试失败";
  }

  if (failureType === "non_retryable") {
    return "不可重试失败";
  }

  if (failureType === "rate_limited") {
    return "平台限流";
  }

  return null;
}

function getAssignedAccountSeed(post: Pick<PostListItem, "id" | "topic">) {
  const raw = `${post.id}${post.topic}`.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return accountSeeds[raw % accountSeeds.length];
}

function getMessageTaskTone(stage: string | null | undefined) {
  if (stage === "ready_to_confirm" || stage === "in_review") {
    return "warm" as const;
  }

  if (stage === "waiting_publish" || stage === "approved" || stage === "published") {
    return "positive" as const;
  }

  if (stage === "failed" || stage === "publish_failed") {
    return "critical" as const;
  }

  return "neutral" as const;
}

function normalizeMessageTaskStage(stage: string | null | undefined): MessageTaskStage {
  if (stage === "waiting_review") {
    return "ready_to_confirm";
  }

  if (stage === "pending_generation") {
    return "waiting_generation";
  }

  if (stage === "waiting_publish" || stage === "publishing" || stage === "published" || stage === "failed") {
    return stage;
  }

  return "waiting_generation";
}

export function getWorkspaceCandidates(posts: PostListItem[]) {
  return sortByUpdatedDesc(posts.filter((post) => post.status !== "published"));
}

export function buildCopyVariants(post: PostDetail) {
  const hasRealCopy = post.title.trim().length > 0 && post.body.trim().length > 0;
  if (!hasRealCopy) {
    return [];
  }

  return [
    {
      id: `${post.id}-copy-real`,
      name: "真实结果",
      summary: "当前后端已返回的文案结果",
      title: post.title,
      body: post.body,
    },
  ];
}

export function getCandidateAssets(post: PostDetail) {
  if (post.assets.length > 0) {
    return post.assets;
  }

  return [];
}

export function getGenerationReadiness(input: { hasCopy: boolean; hasImages: boolean; requiresReview: boolean }) : GenerationReadiness {
  if (input.hasCopy && input.hasImages) {
    return {
      key: "review_ready",
      label: "已可确认",
      description: input.requiresReview ? "文案和图片都已生成，当前已经进入人工确认阶段。" : "文案和图片都已生成，已经可以进入确认流程。",
      tone: "positive",
    };
  }

  if (input.hasCopy) {
    return {
      key: "copy_ready",
      label: "文案已生成",
      description: "当前已经有真实文案结果，但图片还没生成完成。",
      tone: "warm",
    };
  }

  if (input.hasImages) {
    return {
      key: "image_ready",
      label: "图片已生成",
      description: "当前已经有真实图片结果，但文案还没生成完成。",
      tone: "warm",
    };
  }

  return {
    key: "pending",
    label: "尚未生成完成",
    description: "当前还没有真实文案或图片结果返回。",
    tone: "neutral",
  };
}

export function getPublishNarrative(post: PostDetail) {
  const latestRecord = post.publishRecords.at(-1);
  const failureType = getFailureTypeLabel(latestRecord?.failureType);

  if (post.status === "approved") {
    return {
      headline: "这条内容已经选定完成，下一步可以交给 OpenClaw 代发。",
      nextAction: "去内容确认台确认最终版和发布账号，然后点击交给 OpenClaw。",
      tone: "positive" as const,
    };
  }

  if (post.status === "publishing") {
    return {
      headline: "OpenClaw 已接单，正在提交平台并等待审核结果回写。",
      nextAction: "当前不需要重复点击，等待回写结果即可。",
      tone: "warm" as const,
    };
  }

  if (post.status === "under_review") {
    return {
      headline: "平台已收到内容，当前正处于审核阶段。",
      nextAction: "先不要重复发送，等待审核结果回写；如账号登录失效，先去账号页恢复连接。",
      tone: "warm" as const,
    };
  }

  if (post.status === "published") {
    return {
      headline: "平台已经通过审核，这条内容已正式发出。",
      nextAction: "去帖子与数据页看点赞、收藏和评论，再决定要不要继续做同主题。",
      tone: "positive" as const,
    };
  }

  if (post.status === "publish_failed") {
    return {
      headline: failureType ? `这次发送失败，当前判断为${failureType}。` : "这次发送失败，需要人工决定下一步。",
      nextAction:
        latestRecord?.failureType === "rate_limited"
          ? "建议错峰后重试，不要连续重复发送。"
          : latestRecord?.failureType === "retryable"
            ? "建议先稍后重试，或微调标题和首屏表达。"
            : "建议先检查内容表达和素材，再决定是否改稿后重新发送。",
      tone: "critical" as const,
    };
  }

  if (post.status === "rejected") {
    return {
      headline: "平台审核未通过，这条内容需要重新确认后再决定是否重发。",
      nextAction: latestRecord?.errorMessage || latestRecord?.detail || "建议回到内容确认台检查标题、正文和图片表达，再决定是否修改后重发。",
      tone: "critical" as const,
    };
  }

  if (post.status === "in_review") {
    return {
      headline: "这条内容还在人工确认阶段。",
      nextAction: "先在内容确认台确认系统生成的候选文案、图片和发布账号，再决定是否通过。",
      tone: "warm" as const,
    };
  }

  return {
    headline: "这条内容还在准备中，先把候选文案和图片补齐。",
    nextAction: "先去消息任务中心确认系统是否已完成生成，再进入内容确认台。",
    tone: "neutral" as const,
  };
}

export function getPublishFlowState(post: PostDetail): PublishFlowState {
  const latestRecord = post.publishRecords.at(-1);

  if (post.status === "publish_failed" || latestRecord?.status === "failed") {
    return {
      label: "发布失败",
      detail: latestRecord?.errorMessage || latestRecord?.detail || "真实发布已失败，等待后端回写更明确的失败原因。",
      tone: "critical",
    };
  }

  if (post.status === "published" || latestRecord?.status === "succeeded") {
    return {
      label: "已发布",
      detail: post.publishedAt ? `发布时间 ${new Date(post.publishedAt).toLocaleString("zh-CN")}` : "真实发布已完成，等待发布时间回写。",
      tone: "positive",
    };
  }

  if (post.status === "rejected") {
    return {
      label: "审核未通过",
      detail: latestRecord?.errorMessage || latestRecord?.detail || "平台已返回未通过结果，需要人工判断是否改稿后重发。",
      tone: "critical",
    };
  }

  if (post.status === "under_review") {
    return {
      label: "平台审核中",
      detail: latestRecord?.detail || "平台已接收内容，当前等待审核结果回写。",
      tone: "warm",
    };
  }

  if (post.status === "publishing") {
    return {
      label: "执行中",
      detail: latestRecord?.detail || "OpenClaw 已接单，当前正在执行发布并等待回写。",
      tone: "warm",
    };
  }

  if (latestRecord?.status === "queued") {
    return {
      label: "已交给 OpenClaw",
      detail: latestRecord.detail || "真实发布请求已提交给 OpenClaw，等待进入执行阶段。",
      tone: "warm",
    };
  }

  return {
    label: "待交给 OpenClaw",
    detail: "当前还没有真实发布记录，仍停留在待发阶段。",
    tone: "neutral",
  };
}

export function getPublishRecordLabel(status?: PublishRecord["status"] | null) {
  if (status === "queued") {
    return "已交给 OpenClaw";
  }

  if (status === "succeeded") {
    return "已发布";
  }

  if (status === "failed") {
    return "发布失败";
  }

  return "暂无结果";
}

export function getPerformanceSuggestion(post: PostListItem) {
  const metrics = getPostInteractionSummary(post);
  const score = metrics.likes + metrics.collects * 2 + metrics.comments * 3;

  if (score >= 1200) {
    return "这类主题已经跑出明显反馈，建议继续做同系列并复用结构。";
  }

  if (score >= 300) {
    return "这类主题已经有稳定互动，可以继续做，但建议把首屏钩子再收紧一点。";
  }

  return "这类主题反馈还一般，建议换角度或缩小切口，再试一版。";
}

export function buildAccountOverview(posts: PostListItem[]): AccountOverview[] {
  return accountSeeds.map((seed) => {
    const accountPosts = posts.filter((post) => getAssignedAccountSeed(post).id === seed.id);
    const publishedCount = accountPosts.filter((post) => post.status === "published").length;
    const waitingCount = accountPosts.filter((post) => post.status === "draft" || post.status === "in_review" || post.status === "approved" || post.status === "under_review" || post.status === "rejected").length;
    const totalEngagement = accountPosts.reduce((sum, post) => {
      const metrics = getPostInteractionSummary(post);
      return sum + metrics.likes + metrics.collects + metrics.comments;
    }, 0);
    const bestPost = [...accountPosts].sort((left, right) => {
      const leftMetrics = getPostInteractionSummary(left);
      const rightMetrics = getPostInteractionSummary(right);
      return (rightMetrics.likes + rightMetrics.collects + rightMetrics.comments) - (leftMetrics.likes + leftMetrics.collects + leftMetrics.comments);
    })[0];

    return {
      ...seed,
      todayTaskCount: accountPosts.length,
      waitingCount,
      publishedCount,
      totalEngagement,
      bestTopic: bestPost?.topic ?? "今天还没有已发布样本",
    };
  });
}

export function adaptAccounts(records: AccountRecord[]): AccountOverview[] {
  return records.map((record) => {
    return {
      id: record.id,
      name: record.name,
      handle: record.handle,
      status: (record.status === "online" || record.status === "offline" || record.status === "busy") ? record.status : "offline",
      connectionStatus: coerceConnectionStatus(record.connectionStatus, record.reauthRequired),
      reauthRequired: Boolean(record.reauthRequired),
      summary: record.summary ?? "当前账号暂无摘要。",
      lastActiveAt: record.lastActiveAt ?? new Date(0).toISOString(),
      connectedAt: record.connectedAt ?? null,
      lastValidatedAt: record.lastValidatedAt ?? null,
      lastUsedAt: record.lastUsedAt ?? null,
      lastAuthError: record.lastAuthError ?? null,
      lastSyncAt: record.lastSyncAt ?? null,
      lastSyncStatus: coerceSyncStatus(record.lastSyncStatus),
      lastSyncError: record.lastSyncError ?? null,
      todayTaskCount: record.todayTaskCount ?? 0,
      waitingCount: record.waitingCount ?? 0,
      publishedCount: record.publishedCount ?? 0,
      totalEngagement: record.totalEngagement ?? 0,
      bestTopic: record.bestTopic ?? "今天还没有已发布样本",
    };
  });
}

export function getAccountForPost(post: Pick<PostListItem, "id" | "topic"> & { accountId?: string | null }, accounts?: AccountOverview[], allowSeedFallback = false) {
  if (!accounts) {
    const seed = getAssignedAccountSeed(post);
    return {
      ...seed,
      todayTaskCount: 0,
      waitingCount: 0,
      publishedCount: 0,
      totalEngagement: 0,
      bestTopic: "今天还没有已发布样本",
    };
  }

  if (post.accountId) {
    const matched = accounts.find((item) => item.id === post.accountId);
    if (matched) {
      return matched;
    }
  }

  if (allowSeedFallback) {
    const seed = getAssignedAccountSeed(post);
    return {
      ...seed,
      todayTaskCount: 0,
      waitingCount: 0,
      publishedCount: 0,
      totalEngagement: 0,
      bestTopic: "今天还没有已发布样本",
    };
  }

  return unassignedAccount;
}

function getMessageTaskStage(post: PostListItem): Pick<MessageTask, "stage" | "stageLabel" | "stageTone" | "requiresReview" | "nextAction"> {
  if (post.status === "draft") {
    return {
      stage: "waiting_generation",
      stageLabel: "等待生成完成",
      stageTone: "neutral",
      requiresReview: false,
      nextAction: "等待系统把候选文案和图片补齐，再进入内容确认台。",
    };
  }

  if (post.status === "in_review") {
    return {
      stage: "ready_to_confirm",
      stageLabel: "待人工确认",
      stageTone: "warm",
      requiresReview: true,
      nextAction: "已经有候选内容，需要你确认文案、图片和发布账号。",
    };
  }

  if (post.status === "approved") {
    return {
      stage: "waiting_publish",
      stageLabel: "待交给 OpenClaw",
      stageTone: "positive",
      requiresReview: false,
      nextAction: "内容已确认完成，下一步可以直接交给 OpenClaw 代发。",
    };
  }

  if (post.status === "publishing") {
    return {
      stage: "publishing",
      stageLabel: "执行中",
      stageTone: "warm",
      requiresReview: false,
      nextAction: "OpenClaw 正在执行，不需要重复处理。",
    };
  }

  if (post.status === "under_review") {
    return {
      stage: "publishing",
      stageLabel: "平台审核中",
      stageTone: "warm",
      requiresReview: false,
      nextAction: "平台正在审核，等待审核结果回写。",
    };
  }

  if (post.status === "rejected") {
    return {
      stage: "failed",
      stageLabel: "审核未通过",
      stageTone: "critical",
      requiresReview: true,
      nextAction: "需要回到确认台检查文案和图片，再决定是否修改后重发。",
    };
  }

  if (post.status === "publish_failed") {
    return {
      stage: "failed",
      stageLabel: "发送失败待处理",
      stageTone: "critical",
      requiresReview: true,
      nextAction: "需要判断是重试、换账号，还是回内容确认台改稿。",
    };
  }

  return {
    stage: "published",
    stageLabel: "已发布可复盘",
    stageTone: "positive",
    requiresReview: false,
    nextAction: "去帖子与数据页看这条内容的表现。",
  };
}

export function buildMessageTasks(posts: PostListItem[], accounts?: AccountOverview[]) {
  return sortByUpdatedDesc(posts).map((post, index) => {
    const account = getAccountForPost(post, accounts, true);
    const stage = getMessageTaskStage(post);
    const hasCopy = post.title.trim().length > 0 && post.body.trim().length > 0;
    const hasImages = post.assetIds.length > 0;

    return {
      id: `message-task-${post.id}`,
      postId: post.id,
      accountId: account.id,
      accountName: account.name,
      sourceMessage: `OpenClaw，我今天想发一条关于“${post.topic}”的内容，优先安排给${account.name}${index % 2 === 0 ? "，今晚 19:30 前确认。" : "，如果内容合适今天就发。"}`,
      requestedAt: post.createdAt,
      plannedAt: new Date(new Date(post.updatedAt).getTime() + 1000 * 60 * 90).toISOString(),
      topic: post.topic,
      title: post.title,
      stage: stage.stage,
      stageLabel: stage.stageLabel,
      stageTone: stage.stageTone,
      hasCopy,
      hasImages,
      requiresReview: stage.requiresReview,
      nextAction: stage.nextAction,
    } satisfies MessageTask;
  });
}

export function adaptMessageTasks(records: MessageTaskRecord[], posts: PostListItem[], accounts?: AccountOverview[], allowSeedFallback = false) {
  return records.map((record) => {
    const post = posts.find((item) => item.id === record.postId) ?? null;
    const account = record.accountId
      ? accounts?.find((item) => item.id === record.accountId) ?? null
      : post?.accountId
        ? getAccountForPost(post, accounts, allowSeedFallback)
        : null;
    const stage = normalizeMessageTaskStage(record.stage ?? post?.status ?? "waiting_generation");

    return {
      id: record.id,
      postId: record.postId ?? post?.id ?? "",
      accountId: record.accountId ?? account?.id ?? "",
      accountName: record.accountName ?? account?.name ?? "未分配账号",
      sourceMessage: record.sourceMessage ?? `当前后端未返回原始消息，已从任务 ${record.id} 进入后台。`,
      requestedAt: record.requestedAt,
      plannedAt: record.plannedAt ?? post?.updatedAt ?? record.requestedAt,
      topic: record.topic ?? post?.topic ?? "未命名任务",
      title: record.title ?? post?.title ?? "等待系统生成标题",
      stage,
      stageLabel: record.stageLabel ?? "等待生成完成",
      stageTone: getMessageTaskTone(stage),
      hasCopy: record.hasCopy ?? Boolean(post?.title.trim() && post?.body.trim()),
      hasImages: record.hasImages ?? Boolean(post?.assetIds.length),
      requiresReview: record.requiresHumanReview ?? (stage === "ready_to_confirm" || stage === "failed"),
      nextAction: record.nextAction ?? "等待系统把候选文案和图片补齐，再进入内容确认台。",
    } satisfies MessageTask;
  });
}

export function getMessageTaskForPost(post: Pick<PostListItem, "id"> & { messageTaskId?: string | null }, tasks: MessageTask[]) {
  if (post.messageTaskId) {
    const matched = tasks.find((item) => item.id === post.messageTaskId);
    if (matched) {
      return matched;
    }

    return null;
  }

  return tasks.find((item) => item.postId === post.id) ?? null;
}

export function getTaskOverview(tasks: MessageTask[]) {
  return {
    total: tasks.length,
    ready: tasks.filter((task) => task.hasCopy && task.hasImages).length,
    waitingReview: tasks.filter((task) => task.requiresReview).length,
    todayAccounts: new Set(tasks.map((task) => task.accountId)).size,
  };
}

export function getAccountStatusLabel(status: AccountStatus) {
  if (status === "online") {
    return "在线";
  }

  if (status === "busy") {
    return "执行中";
  }

  return "离线";
}

export function getAccountStatusTone(status: AccountStatus) {
  if (status === "online") {
    return "positive" as const;
  }

  if (status === "busy") {
    return "warm" as const;
  }

  return "critical" as const;
}

export function getAccountConnectionStatusLabel(status: AccountConnectionStatus) {
  if (status === "connected") {
    return "已连接";
  }

  if (status === "reauth_required") {
    return "需重新登录";
  }

  if (status === "validating") {
    return "验证中";
  }

  if (status === "disconnected") {
    return "未连接";
  }

  return "连接状态未知";
}

export function getAccountConnectionStatusTone(status: AccountConnectionStatus) {
  if (status === "connected") {
    return "positive" as const;
  }

  if (status === "validating") {
    return "warm" as const;
  }

  if (status === "reauth_required" || status === "disconnected") {
    return "critical" as const;
  }

  return "neutral" as const;
}

export function getAccountSyncStatusLabel(status: AccountSyncStatus) {
  if (status === "succeeded") {
    return "同步成功";
  }

  if (status === "syncing") {
    return "同步中";
  }

  if (status === "failed") {
    return "同步失败";
  }

  if (status === "idle") {
    return "等待同步";
  }

  return "同步状态未知";
}

export function getAccountSyncStatusTone(status: AccountSyncStatus) {
  if (status === "succeeded") {
    return "positive" as const;
  }

  if (status === "syncing") {
    return "warm" as const;
  }

  if (status === "failed") {
    return "critical" as const;
  }

  return "neutral" as const;
}

export function getAccountAvailabilityNotice(account: AccountOverview): AccountAvailabilityNotice {
  if (account.connectionStatus === "connected" && !account.reauthRequired) {
    return {
      title: "账号可真实发布",
      detail: account.lastValidatedAt
        ? `最近一次验证成功于 ${new Date(account.lastValidatedAt).toLocaleString("zh-CN")}。`
        : "当前账号连接正常，可以继续真实发布和拉取作品数据。",
      tone: "positive",
      canPublish: true,
    };
  }

  if (account.connectionStatus === "validating") {
    return {
      title: "账号正在验证中",
      detail: "当前账号正在刷新连接状态，建议等待验证完成后再继续真实发布。",
      tone: "warm",
      canPublish: false,
    };
  }

  if (account.connectionStatus === "reauth_required") {
    return {
      title: "连接已失效，请重新登录",
      detail: account.lastAuthError ?? "当前账号登录态已失效，页面不能继续假设它仍可发布。",
      tone: "critical",
      canPublish: false,
    };
  }

  if (account.connectionStatus === "disconnected") {
    return {
      title: "账号尚未连接",
      detail: "当前还没有连接到小红书，先完成连接后再继续真实发布。",
      tone: "critical",
      canPublish: false,
    };
  }

  return {
    title: "账号状态待确认",
    detail: "后端暂未返回稳定的连接状态字段，先以账号页展示的真实状态为准。",
    tone: "neutral",
    canPublish: false,
  };
}

export function getSharedConfirmationInfo(post: PostDetail, task?: MessageTask | null): SharedConfirmationInfo {
  const reviewedOnWeb = post.reviewRecords.length > 0 || post.status === "approved" || post.status === "publishing" || post.status === "under_review" || post.status === "published" || post.status === "rejected" || post.status === "publish_failed";

  return {
    headline: "QQ / OpenClaw 和网页端正在协同同一份确认对象",
    detail: task
      ? `这条内容先从聊天消息“${task.sourceMessage}”进入系统，后端生成的标题、正文和图片会同时提供给 OpenClaw 与网页端；你现在在网页上看到的就是同一份待确认内容。`
      : "当前网页端展示的是后端返回的真实标题、正文和图片结果；OpenClaw 与网页端围绕的是同一份内容对象，而不是两套独立草稿。",
    sourceLabel: reviewedOnWeb ? "当前以网页确认版为准" : "当前以 OpenClaw 最新生成结果为准",
  };
}

export function getReviewStatusLabel(status: ReturnType<typeof getReviewStatus>) {
  if (status === "approved") {
    return "已通过";
  }

  if (status === "under_review") {
    return "平台审核中";
  }

  if (status === "rejected") {
    return "审核未通过";
  }

  if (status === "pending") {
    return "待审核";
  }

  return "等待审核结果";
}

export function getReviewStatusTone(status: ReturnType<typeof getReviewStatus>) {
  if (status === "approved") {
    return "positive" as const;
  }

  if (status === "under_review") {
    return "warm" as const;
  }

  if (status === "rejected") {
    return "critical" as const;
  }

  return "neutral" as const;
}

export function getPostInteractionSummary(post: Pick<PostListItem, "latestMetrics" | "likeCount" | "collectCount" | "commentCount">): PostInteractionSummary {
  return {
    likes: post.likeCount ?? post.latestMetrics.likes,
    collects: post.collectCount ?? post.latestMetrics.favorites,
    comments: post.commentCount ?? post.latestMetrics.comments,
  };
}

export function getPostSyncState(post: Pick<PostListItem, "lastSyncAt" | "lastSyncStatus" | "syncError">): PostSyncState {
  const syncStatus = coerceSyncStatus(post.lastSyncStatus);

  if (syncStatus === "failed") {
    return {
      label: "同步失败",
      detail: getSyncErrorLabel(post.syncError) ?? "最近一次同步失败，等待账号恢复后重新拉取作品数据。",
      tone: "critical",
    };
  }

  if (syncStatus === "syncing") {
    return {
      label: "同步中",
      detail: post.lastSyncAt ? `最近一次同步启动于 ${new Date(post.lastSyncAt).toLocaleString("zh-CN")}` : "后台正在同步最新平台数据。",
      tone: "warm",
    };
  }

  if (syncStatus === "succeeded") {
    return {
      label: "同步成功",
      detail: post.lastSyncAt ? `最近一次同步成功于 ${new Date(post.lastSyncAt).toLocaleString("zh-CN")}` : "最近一次平台同步已完成。",
      tone: "positive",
    };
  }

  return {
    label: "等待同步",
    detail: post.lastSyncAt ? `最近一次记录时间 ${new Date(post.lastSyncAt).toLocaleString("zh-CN")}` : "暂无同步状态。",
    tone: "neutral",
  };
}

type MetricsSourceInput = Pick<PostListItem, "latestMetrics" | "lastSyncStatus" | "syncError" | "metricsSource"> & {
  metricsHistory?: Array<Pick<PostMetrics, "views" | "likes" | "favorites" | "comments" | "followConversions"> & { source?: string | null }>;
};

function hasAnyMetrics(metrics: Pick<PostMetrics, "views" | "likes" | "favorites" | "comments" | "followConversions">) {
  return metrics.views > 0 || metrics.likes > 0 || metrics.favorites > 0 || metrics.comments > 0 || metrics.followConversions > 0;
}

export function getMetricsSourceState(post: MetricsSourceInput) {
  if (post.lastSyncStatus === "failed") {
    return {
      label: "抓取失败",
      detail: getSyncErrorLabel(post.syncError) ?? "最近一次指标抓取失败。",
      tone: "critical" as const,
    };
  }

  if ((post.metricsHistory && post.metricsHistory.length === 0) || !hasAnyMetrics(post.latestMetrics)) {
    return {
      label: "暂无数据",
      detail: "暂无可展示的指标快照。",
      tone: "neutral" as const,
    };
  }

  const source = post.latestMetrics.source ?? post.metricsSource ?? post.metricsHistory?.at(-1)?.source;
  if (source === "xhs_creator_center") {
    return {
      label: "真实数据",
      detail: "来自小红书创作者中心抓取结果。",
      tone: "positive" as const,
    };
  }

  if (source === "mock") {
    return {
      label: "测试数据",
      detail: "当前展示的是测试数据。",
      tone: "warm" as const,
    };
  }

  return {
    label: "暂无数据",
    detail: "暂无可识别的数据来源。",
    tone: "neutral" as const,
  };
}

export function getMetricsSnapshotSourceLabel(source?: string | null) {
  if (source === "xhs_creator_center") {
    return "真实数据";
  }

  if (source === "mock") {
    return "测试数据";
  }

  return "暂无数据";
}

export function isOperationalPost(post: Pick<PostListItem, "status" | "title" | "topic">) {
  const text = `${post.title} ${post.topic}`.toLowerCase();
  const generatedContentTask = ["generate", "content"].join("_");
  const isDebugPost = ["test", "测试", "debug", "调试", "指令", "联调", generatedContentTask].some((keyword) => text.includes(keyword));
  return ["published", "publishing", "publish_failed"].includes(post.status) && !isDebugPost;
}
