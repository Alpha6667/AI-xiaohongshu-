export type PostStatus = "draft" | "in_review" | "approved" | "publishing" | "published" | "publish_failed";

export interface DashboardSummary {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalFavorites: number;
  totalComments: number;
  followConversions: number;
  pendingReviewCount: number;
  publishedCount: number;
}

export interface AccountRecord {
  id: string;
  name: string;
  handle: string;
  status: string;
  summary?: string | null;
  lastActiveAt?: string | null;
  todayTaskCount?: number | null;
  waitingCount?: number | null;
  publishedCount?: number | null;
  totalEngagement?: number | null;
  bestTopic?: string | null;
}

export interface MessageTaskRecord {
  id: string;
  postId?: string | null;
  accountId?: string | null;
  sourceMessage?: string | null;
  requestedAt: string;
  plannedAt?: string | null;
  scheduledAt?: string | null;
  topic?: string | null;
  title?: string | null;
  stage?: string | null;
  stageLabel?: string | null;
  hasCopy?: boolean | null;
  hasImages?: boolean | null;
  requiresReview?: boolean | null;
  requiresHumanReview?: boolean | null;
  nextAction?: string | null;
}

export interface AssetItem {
  id: string;
  name: string;
  type: "image" | "cover";
  url: string;
  width: number;
  height: number;
  sizeKb: number;
  createdAt: string;
}

export interface AssetSummary {
  id: string;
  name: string;
  fileName: string;
  contentType: string;
  url: string;
  createdAt: string;
}

export interface AssetUploadPayload {
  name: string;
  fileName: string;
  contentType: string;
  postId?: string;
}

export interface AssetUploadResponse {
  id: string;
  name: string;
  fileName: string;
  contentType: string;
  url: string;
  createdAt: string;
}

export interface GenerationTaskPayload {
  operator?: string;
  payload?: Record<string, object | string | number | boolean | null>;
}

export interface TaskRecordResponse {
  taskId: string;
  postId: string;
  status: string;
  taskType: string;
  createdAt: string;
  message: string;
}

export interface PublishResponse {
  publishLogId: string;
  postId: string;
  status: PostStatus;
  publishStatus: "queued" | "succeeded" | "failed";
  detail: string;
  createdAt: string;
  message: string;
  platformPostId?: string | null;
  errorMessage?: string | null;
  failureType?: "retryable" | "non_retryable" | "rate_limited" | null;
}

export interface PostMetrics {
  views: number;
  likes: number;
  favorites: number;
  comments: number;
  followConversions: number;
}

export interface ReviewRecord {
  id: string;
  action: "submit" | "approve" | "reject";
  comment: string;
  operator: string;
  createdAt: string;
}

export interface PublishRecord {
  id: string;
  status: "queued" | "succeeded" | "failed";
  createdAt: string;
  detail: string;
  platformPostId?: string | null;
  errorMessage?: string | null;
  failureType?: "retryable" | "non_retryable" | "rate_limited" | null;
}

export interface MetricsHistoryItem {
  snapshotAt: string;
  views: number;
  likes: number;
  favorites: number;
  comments: number;
  followConversions: number;
}

export interface PostListItem {
  id: string;
  topic: string;
  title: string;
  body: string;
  tags: string[];
  status: PostStatus;
  publishedAt?: string;
  assetIds: string[];
  latestTaskIds: string[];
  accountId?: string | null;
  messageTaskId?: string | null;
  platformPostId?: string | null;
  latestMetrics: PostMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface PostDetail extends PostListItem {
  body: string;
  tags: string[];
  assetIds: string[];
  assets: AssetSummary[];
  reviewRecords: ReviewRecord[];
  publishRecords: PublishRecord[];
  metricsHistory: MetricsHistoryItem[];
}

export interface ReviewQueueItem {
  id: string;
  topic: string;
  title: string;
  body: string;
  updatedAt: string;
  reviewRecords: ReviewRecord[];
}

export interface WorkspaceDraft {
  topic: string;
  title: string;
  body: string;
  tags: string[];
  assetIds: string[];
}
