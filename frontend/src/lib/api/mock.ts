import type {
  AssetItem,
  DashboardSummary,
  PostDetail,
  PostListItem,
  ReviewQueueItem,
  WorkspaceDraft,
} from "./types";

const assets: AssetItem[] = [
  {
    id: "asset-1",
    name: "夜色封面",
    type: "cover",
    url: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
    width: 1200,
    height: 1600,
    sizeKb: 418,
    createdAt: "2026-04-20T02:00:00Z",
  },
  {
    id: "asset-2",
    name: "桌面氛围图",
    type: "image",
    url: "https://images.unsplash.com/photo-1516383607781-913a19294fd1?auto=format&fit=crop&w=1200&q=80",
    width: 1200,
    height: 1500,
    sizeKb: 362,
    createdAt: "2026-04-19T07:30:00Z",
  },
  {
    id: "asset-3",
    name: "空间细节图",
    type: "image",
    url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
    width: 1200,
    height: 1500,
    sizeKb: 338,
    createdAt: "2026-04-18T09:30:00Z",
  },
];

const posts: PostDetail[] = [
  {
    id: "post-001",
    topic: "春季护肤选题",
    title: "换季敏感肌，先把护肤节奏慢下来",
    status: "in_review",
    publishedAt: undefined,
    latestTaskIds: ["task-review-001"],
    platformPostId: null,
    createdAt: "2026-04-20T04:30:00Z",
    updatedAt: "2026-04-20T06:20:00Z",
    latestMetrics: {
      views: 0,
      likes: 0,
      favorites: 0,
      comments: 0,
      followConversions: 0,
    },
    body: "第一屏强调换季时屏障波动，第二屏写使用感，第三屏给出简单可执行的护理节奏。整体语气保持克制和可信赖，不做激进承诺。",
    tags: ["敏感肌", "换季护理", "内容选题"],
    assetIds: ["asset-1", "asset-2"],
    assets: [
      {
        id: "asset-1",
        name: "夜色封面",
        fileName: "cover-night.jpg",
        contentType: "image/jpeg",
        url: assets[0].url,
        createdAt: assets[0].createdAt,
      },
      {
        id: "asset-2",
        name: "桌面氛围图",
        fileName: "desk-mood.jpg",
        contentType: "image/jpeg",
        url: assets[1].url,
        createdAt: assets[1].createdAt,
      },
    ],
    reviewRecords: [
      {
        id: "review-1",
        action: "submit",
        comment: "已补充封面和标题候选，请审核语气是否足够自然。",
        operator: "Nora",
        createdAt: "2026-04-20T05:10:00Z",
      },
    ],
    publishRecords: [],
    metricsHistory: [],
  },
  {
    id: "post-002",
    topic: "桌搭内容策划",
    title: "让办公区更像灵感区，而不是任务堆积区",
    status: "draft",
    publishedAt: undefined,
    latestTaskIds: ["task-draft-001"],
    platformPostId: null,
    createdAt: "2026-04-19T08:20:00Z",
    updatedAt: "2026-04-19T12:48:00Z",
    latestMetrics: {
      views: 0,
      likes: 0,
      favorites: 0,
      comments: 0,
      followConversions: 0,
    },
    body: "内容从灯光、桌面秩序、收纳细节切入，强调轻改造和拍摄角度建议，让读者能快速照着做。",
    tags: ["桌搭", "办公区", "氛围感"],
    assetIds: ["asset-2"],
    assets: [
      {
        id: "asset-2",
        name: "桌面氛围图",
        fileName: "desk-mood.jpg",
        contentType: "image/jpeg",
        url: assets[1].url,
        createdAt: assets[1].createdAt,
      },
    ],
    reviewRecords: [],
    publishRecords: [],
    metricsHistory: [],
  },
  {
    id: "post-003",
    topic: "品牌空间拍摄记录",
    title: "一个让人愿意停留的品牌空间，细节都在光线里",
    status: "published",
    publishedAt: "2026-04-17T09:30:00Z",
    latestTaskIds: ["task-publish-001"],
    platformPostId: "xh-post-003",
    createdAt: "2026-04-16T09:00:00Z",
    updatedAt: "2026-04-18T03:10:00Z",
    latestMetrics: {
      views: 18234,
      likes: 1260,
      favorites: 842,
      comments: 115,
      followConversions: 93,
    },
    body: "从动线、材质与光影节奏切入，像编辑手记一样记录空间感受，同时给出读者可复制的拍摄提示。",
    tags: ["品牌空间", "门店拍摄", "内容策划"],
    assetIds: ["asset-3"],
    assets: [
      {
        id: "asset-3",
        name: "空间细节图",
        fileName: "brand-space-detail.jpg",
        contentType: "image/jpeg",
        url: assets[2].url,
        createdAt: assets[2].createdAt,
      },
    ],
    reviewRecords: [
      {
        id: "review-2",
        action: "approve",
        comment: "保留叙述节奏，封面文案通过。",
        operator: "Mika",
        createdAt: "2026-04-16T12:00:00Z",
      },
    ],
    publishRecords: [
      {
        id: "publish-1",
        status: "succeeded",
        createdAt: "2026-04-17T09:30:00Z",
        detail: "已推送到发布任务队列并成功回写 platform_post_id。",
      },
    ],
    metricsHistory: [
      {
        snapshotAt: "2026-04-17T12:00:00Z",
        views: 9420,
        likes: 602,
        favorites: 388,
        comments: 43,
        followConversions: 35,
      },
      {
        snapshotAt: "2026-04-18T12:00:00Z",
        views: 18234,
        likes: 1260,
        favorites: 842,
        comments: 115,
        followConversions: 93,
      },
    ],
  },
];

const workspaceDraft: WorkspaceDraft = {
  topic: "春季护肤内容排期",
  title: "换季敏感肌，先把护肤节奏慢下来",
  body: "从清洁、舒缓到屏障修护，围绕低刺激和真实体验展开，优先强化收藏价值和可信度。",
  tags: ["敏感肌", "春季护肤", "真实体验"],
  assetIds: ["asset-1", "asset-2"],
};

const dashboardSummary: DashboardSummary = {
  totalPosts: posts.length,
  totalViews: posts.reduce((sum, post) => sum + post.latestMetrics.views, 0),
  totalLikes: posts.reduce((sum, post) => sum + post.latestMetrics.likes, 0),
  totalFavorites: posts.reduce((sum, post) => sum + post.latestMetrics.favorites, 0),
  totalComments: posts.reduce((sum, post) => sum + post.latestMetrics.comments, 0),
  followConversions: posts.reduce((sum, post) => sum + post.latestMetrics.followConversions, 0),
  pendingReviewCount: posts.filter((post) => post.status === "in_review").length,
  publishedCount: posts.filter((post) => post.status === "published").length,
};

const reviewQueue: ReviewQueueItem[] = [
  {
    id: "post-001",
    topic: "春季护肤选题",
    title: "换季敏感肌，先把护肤节奏慢下来",
    body: "第一屏强调换季时屏障波动，第二屏写使用感，第三屏给出简单可执行的护理节奏。整体语气保持克制和可信赖，不做激进承诺。",
    updatedAt: "2026-04-20T05:10:00Z",
    reviewRecords: [
      {
        id: "review-1",
        action: "submit",
        comment: "重点确认第二屏是否需要增加成分解释，结尾 CTA 是否自然。",
        operator: "Nora",
        createdAt: "2026-04-20T05:10:00Z",
      },
    ],
  },
];

export const mockApi = {
  getDashboardSummary() {
    return dashboardSummary;
  },
  listPosts(): PostListItem[] {
    return posts.map(({ reviewRecords: _reviewRecords, publishRecords: _publishRecords, metricsHistory: _metricsHistory, ...rest }) => rest);
  },
  getPostById(postId: string) {
    return posts.find((post) => post.id === postId);
  },
  listAssets() {
    return assets;
  },
  listReviewQueue() {
    return reviewQueue;
  },
  getWorkspaceDraft() {
    return workspaceDraft;
  },
};
