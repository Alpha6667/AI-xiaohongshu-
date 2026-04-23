import type { AccountRecord, AssetSummary, MessageTaskRecord, PostDetail, PostListItem, PostStatus, PublishRecord } from "./api/types";

type AccountStatus = "online" | "offline" | "busy";
type MessageTaskStage = "waiting_generation" | "ready_to_confirm" | "waiting_publish" | "publishing" | "published" | "failed";

export interface AccountOverview {
  id: string;
  name: string;
  handle: string;
  status: AccountStatus;
  summary: string;
  lastActiveAt: string;
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

const accountSeeds = [
  {
    id: "account-lulu",
    name: "小鹿的穿搭日记",
    handle: "@lulu_outfit",
    status: "online" as const,
    summary: "偏穿搭和通勤内容，适合承接今晚的高意图任务。",
    lastActiveAt: "2026-04-22T11:58:00Z",
  },
  {
    id: "account-yiyi",
    name: "一一的居家灵感",
    handle: "@yiyi_home",
    status: "busy" as const,
    summary: "今天已有生成中的任务，更适合接家居与空间内容。",
    lastActiveAt: "2026-04-22T11:32:00Z",
  },
  {
    id: "account-momo",
    name: "Momo 轻食研究所",
    handle: "@momo_foodlab",
    status: "offline" as const,
    summary: "最近数据不错，但当前账号离线，需要稍后接回。",
    lastActiveAt: "2026-04-22T08:20:00Z",
  },
];

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

export function getWorkspaceCandidates(posts: PostListItem[]) {
  return sortByUpdatedDesc(posts.filter((post) => post.status !== "published"));
}

export function buildCopyVariants(post: PostDetail) {
  const intro = post.body.split(/[。！？]/).map((part) => part.trim()).filter(Boolean);
  const firstLine = intro[0] ?? post.body;
  const secondLine = intro[1] ?? "把重点放在真实体验、收藏价值和可执行步骤上。";
  const tags = post.tags.slice(0, 3).map((tag) => `#${tag}`).join(" ");

  return [
    {
      id: `${post.id}-copy-1`,
      name: "版本 A",
      summary: "稳妥日常版，适合直接发布",
      title: post.title,
      body: `${firstLine}。${secondLine}。最后补一段今天就能照着做的小步骤，方便读者收藏。${tags ? `\n\n${tags}` : ""}`,
    },
    {
      id: `${post.id}-copy-2`,
      name: "版本 B",
      summary: "更强调情绪钩子和收藏点",
      title: `${post.title}｜今天就想把这一版发出去`,
      body: `如果今天只发一条，我会发这版：${firstLine}。把最容易被忽略的细节说清楚，再给读者一个马上能照做的清单。${tags ? `\n\n${tags}` : ""}`,
    },
    {
      id: `${post.id}-copy-3`,
      name: "版本 C",
      summary: "更像真实分享，适合评论互动",
      title: `${post.topic}：我会留下这一版`,
      body: `先说结论：${post.title}。${firstLine}。如果你也准备发同类主题，建议把“为什么值得试”和“具体怎么做”写在前两屏，更容易带来评论和收藏。${tags ? `\n\n${tags}` : ""}`,
    },
  ];
}

export function getCandidateAssets(post: PostDetail, assets: AssetSummary[]) {
  if (post.assets.length > 0) {
    return post.assets;
  }

  return assets.slice(0, 4);
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

export function getPerformanceSuggestion(post: PostListItem) {
  const score = post.latestMetrics.likes + post.latestMetrics.favorites * 2 + post.latestMetrics.comments * 3;

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
    const waitingCount = accountPosts.filter((post) => post.status === "draft" || post.status === "in_review" || post.status === "approved").length;
    const totalEngagement = accountPosts.reduce((sum, post) => sum + post.latestMetrics.likes + post.latestMetrics.favorites + post.latestMetrics.comments, 0);
    const bestPost = [...accountPosts].sort((left, right) => (right.latestMetrics.likes + right.latestMetrics.favorites + right.latestMetrics.comments) - (left.latestMetrics.likes + left.latestMetrics.favorites + left.latestMetrics.comments))[0];

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

export function adaptAccounts(records: AccountRecord[], posts: PostListItem[]): AccountOverview[] {
  return records.map((record) => {
    const accountPosts = posts.filter((post) => post.accountId === record.id);
    const publishedCount = record.publishedCount ?? accountPosts.filter((post) => post.status === "published").length;
    const waitingCount = record.waitingCount ?? accountPosts.filter((post) => post.status === "draft" || post.status === "in_review" || post.status === "approved").length;
    const totalEngagement = record.totalEngagement ?? accountPosts.reduce((sum, post) => sum + post.latestMetrics.likes + post.latestMetrics.favorites + post.latestMetrics.comments, 0);

    return {
      id: record.id,
      name: record.name,
      handle: record.handle,
      status: (record.status === "online" || record.status === "offline" || record.status === "busy") ? record.status : "offline",
      summary: record.summary ?? "当前后端未返回账号摘要。",
      lastActiveAt: record.lastActiveAt ?? new Date(0).toISOString(),
      todayTaskCount: record.todayTaskCount ?? accountPosts.length,
      waitingCount,
      publishedCount,
      totalEngagement,
      bestTopic: record.bestTopic ?? accountPosts[0]?.topic ?? "今天还没有已发布样本",
    };
  });
}

export function getAccountForPost(post: Pick<PostListItem, "id" | "topic"> & { accountId?: string | null }, accounts?: AccountOverview[]) {
  if (post.accountId) {
    const matched = accounts?.find((item) => item.id === post.accountId);
    if (matched) {
      return matched;
    }
  }

  const seed = getAssignedAccountSeed(post);
  return accounts?.find((item) => item.id === seed.id) ?? {
    ...seed,
    todayTaskCount: 0,
    waitingCount: 0,
    publishedCount: 0,
    totalEngagement: 0,
    bestTopic: "今天还没有已发布样本",
  };
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
      stageLabel: "发送与审核中",
      stageTone: "warm",
      requiresReview: false,
      nextAction: "OpenClaw 正在执行，不需要重复处理。",
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
    const account = getAccountForPost(post, accounts);
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

export function adaptMessageTasks(records: MessageTaskRecord[], posts: PostListItem[], accounts?: AccountOverview[]) {
  return records.map((record) => {
    const post = posts.find((item) => item.id === record.postId) ?? null;
    const account = record.accountId
      ? accounts?.find((item) => item.id === record.accountId) ?? null
      : post
        ? getAccountForPost(post, accounts)
        : null;
    const stage = record.stage ?? post?.status ?? "waiting_generation";
    const stageLabel = record.stageLabel
      ?? (stage === "ready_to_confirm" ? "待人工确认" : stage === "waiting_publish" ? "待交给 OpenClaw" : stage === "publishing" ? "发送与审核中" : stage === "published" ? "已发布可复盘" : stage === "failed" ? "发送失败待处理" : "等待生成完成");

    return {
      id: record.id,
      postId: record.postId ?? post?.id ?? "",
      accountId: record.accountId ?? account?.id ?? "",
      accountName: account?.name ?? "未分配账号",
      sourceMessage: record.sourceMessage ?? `当前后端未返回原始消息，已从任务 ${record.id} 进入后台。`,
      requestedAt: record.requestedAt,
      plannedAt: record.plannedAt ?? record.scheduledAt ?? post?.updatedAt ?? record.requestedAt,
      topic: record.topic ?? post?.topic ?? "未命名任务",
      title: record.title ?? post?.title ?? "等待系统生成标题",
      stage: (stage === "ready_to_confirm" || stage === "waiting_publish" || stage === "publishing" || stage === "published" || stage === "failed") ? stage : "waiting_generation",
      stageLabel,
      stageTone: getMessageTaskTone(stage),
      hasCopy: record.hasCopy ?? Boolean(post?.title.trim() && post?.body.trim()),
      hasImages: record.hasImages ?? Boolean(post?.assetIds.length),
      requiresReview: record.requiresReview ?? record.requiresHumanReview ?? (stage === "ready_to_confirm" || stage === "failed"),
      nextAction: record.nextAction ?? (stage === "ready_to_confirm" ? "已经有候选内容，需要你确认文案、图片和发布账号。" : stage === "waiting_publish" ? "内容已确认完成，下一步可以直接交给 OpenClaw 代发。" : stage === "publishing" ? "OpenClaw 正在执行，不需要重复处理。" : stage === "published" ? "去帖子与数据页看这条内容的表现。" : stage === "failed" ? "需要判断是重试、换账号，还是回内容确认台改稿。" : "等待系统把候选文案和图片补齐，再进入内容确认台。"),
    } satisfies MessageTask;
  });
}

export function getMessageTaskForPost(post: Pick<PostListItem, "id"> & { messageTaskId?: string | null }, tasks: MessageTask[]) {
  if (post.messageTaskId) {
    const matched = tasks.find((item) => item.id === post.messageTaskId);
    if (matched) {
      return matched;
    }
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
