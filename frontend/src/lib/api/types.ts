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
}

export interface PublishResponse {
  publishLogId: string;
  postId: string;
  status: PostStatus;
  detail: string;
  createdAt: string;
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
  platformPostId?: string | null;
  latestMetrics: PostMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface PostDetail extends PostListItem {
  body: string;
  tags: string[];
  assetIds: string[];
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
