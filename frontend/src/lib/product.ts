import type { AssetSummary, PostDetail, PostListItem, PostStatus, PublishRecord } from "./api/types";

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
      nextAction: "去发帖工作台确认最终版，然后点击交给 OpenClaw。",
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
      nextAction: "先在发帖工作台确认最终文案和图片，再决定是否通过。",
      tone: "warm" as const,
    };
  }

  return {
    headline: "这条内容还在准备中，先把主题、文案和图片挑好。",
    nextAction: "先去发帖工作台生成候选并选定最终版。",
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
