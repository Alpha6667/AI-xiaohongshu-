export type PostStatus = "draft" | "in_review" | "approved" | "published" | "failed";

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
  status: PostStatus;
  publishedAt?: string;
  coverUrl: string;
  latestMetrics: PostMetrics;
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
  postId: string;
  topic: string;
  title: string;
  submittedAt: string;
  operator: string;
  reviewComment: string;
}

export interface WorkspaceDraft {
  topic: string;
  title: string;
  body: string;
  tags: string[];
  assetIds: string[];
}
