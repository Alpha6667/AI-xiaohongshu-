export type PostStatus = "draft" | "in_review" | "approved" | "publishing" | "under_review" | "published" | "rejected" | "publish_failed";

export type AccountConnectionStatus = "connected" | "disconnected" | "reauth_required" | "validating" | "unknown";

export type AccountSyncStatus = "idle" | "syncing" | "succeeded" | "failed" | "unknown";

export type ReviewStatus = "pending" | "under_review" | "approved" | "rejected" | "unknown";

export type ImageProviderId = "openai" | "volcengine" | "tencent" | "alibaba" | "bfl" | "stability";

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
  connectionStatus?: AccountConnectionStatus | string | null;
  reauthRequired?: boolean | null;
  connectedAt?: string | null;
  lastValidatedAt?: string | null;
  lastUsedAt?: string | null;
  lastAuthError?: string | null;
  lastSyncAt?: string | null;
  lastSyncStatus?: AccountSyncStatus | string | null;
  lastSyncError?: string | null;
}

export interface AccountWorkSyncItem {
  postId: string;
  title: string;
  topic: string;
  platformPostId?: string | null;
  platformUrl?: string | null;
  publishedAt?: string | null;
  reviewStatus?: ReviewStatus | string | null;
  likeCount: number;
  collectCount: number;
  commentCount: number;
  lastSyncAt?: string | null;
  lastSyncStatus?: AccountSyncStatus | string | null;
  syncError?: string | null;
  updatedAt: string;
}

export interface AccountWorksSyncResponse {
  accountId: string;
  connectionStatus?: AccountConnectionStatus | string | null;
  reauthRequired?: boolean | null;
  lastSyncAt?: string | null;
  lastSyncStatus?: AccountSyncStatus | string | null;
  lastSyncError?: string | null;
  works: AccountWorkSyncItem[];
}

export interface MessageTaskRecord {
  id: string;
  postId?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  sourceMessage?: string | null;
  requestedAt: string;
  plannedAt?: string | null;
  topic?: string | null;
  title?: string | null;
  stage?: string | null;
  stageLabel?: string | null;
  hasCopy?: boolean | null;
  hasImages?: boolean | null;
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
  executionId?: string | null;
  platformPostId?: string | null;
  publishedAt?: string | null;
  errorMessage?: string | null;
  failureType?: "retryable" | "non_retryable" | "rate_limited" | null;
  executionLogs?: string[];
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
  executionId?: string | null;
  platformPostId?: string | null;
  errorMessage?: string | null;
  failureType?: "retryable" | "non_retryable" | "rate_limited" | null;
  executionLogs?: string[];
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
  platformUrl?: string | null;
  reviewStatus?: ReviewStatus | string | null;
  likeCount?: number | null;
  collectCount?: number | null;
  commentCount?: number | null;
  lastSyncAt?: string | null;
  lastSyncStatus?: AccountSyncStatus | string | null;
  syncError?: string | null;
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

export interface ConfirmationSummary extends PostListItem {
  postId: string;
  accountName?: string | null;
  sourceMessage?: string | null;
  confirmationSource?: string | null;
  confirmationSourceLabel?: string | null;
}

export interface ConfirmationDetail extends PostDetail {
  postId: string;
  accountName?: string | null;
  sourceMessage?: string | null;
  confirmationSource?: string | null;
  confirmationSourceLabel?: string | null;
}

export interface ConfirmationUpdatePayload {
  title?: string;
  body?: string;
  tags?: string[];
  assetIds?: string[];
  accountId?: string;
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
