import type {
  AccountRecord,
  AccountWorksSyncResponse,
  AssetSummary,
  AssetUploadPayload,
  AssetUploadResponse,
  ConfirmationDetail,
  ConfirmationSummary,
  ConfirmationUpdatePayload,
  DashboardSummary,
  GenerationTaskPayload,
  ImageProviderConfigResponse,
  ImageProviderConfigUpsertRequest,
  ImageProviderTestResponse,
  MessageTaskRecord,
  PostDetail,
  PostListItem,
  PublishResponse,
  ReviewQueueItem,
  TaskRecordResponse,
} from "./types";

const API_PREFIX = "/api";

function getApiBaseUrl() {
  const publicBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  const internalBaseUrl = process.env.INTERNAL_API_BASE_URL?.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    return publicBaseUrl ?? "";
  }

  return internalBaseUrl ?? publicBaseUrl ?? "http://127.0.0.1:8000";
}

function endpoint(pathname: string) {
  return `${API_PREFIX}${pathname}`;
}

async function apiFetch<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const rawMessage = await response.text();
    let message = rawMessage || `Request failed: ${response.status}`;
    try {
      const parsed = JSON.parse(rawMessage) as { detail?: string };
      if (typeof parsed.detail === "string" && parsed.detail) {
        message = parsed.detail;
      }
    } catch {
      // Keep raw response text when it is not JSON.
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

function getReviewQueueItem(post: PostDetail): ReviewQueueItem {
  return {
    id: post.id,
    topic: post.topic,
    title: post.title,
    body: post.body,
    updatedAt: post.updatedAt,
    reviewRecords: post.reviewRecords,
  };
}

export const apiClient = {
  dashboard: {
    summaryEndpoint: endpoint("/dashboard/summary"),
    getSummary() {
      return apiFetch<DashboardSummary>(endpoint("/dashboard/summary"));
    },
  },
  tasks: {
    listEndpoint: endpoint("/tasks"),
    list() {
      return apiFetch<MessageTaskRecord[]>(endpoint("/tasks"));
    },
  },
  settings: {
    imageProviderEndpoint: endpoint("/settings/image-provider"),
    imageProviderTestEndpoint: endpoint("/settings/image-provider/test"),
    getImageProvider() {
      return apiFetch<ImageProviderConfigResponse>(endpoint("/settings/image-provider"));
    },
    saveImageProvider(payload: ImageProviderConfigUpsertRequest) {
      return apiFetch<ImageProviderConfigResponse>(endpoint("/settings/image-provider"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    testImageProvider(payload?: { provider?: string }) {
      return apiFetch<ImageProviderTestResponse>(endpoint("/settings/image-provider/test"), {
        method: "POST",
        body: JSON.stringify(payload ?? {}),
      });
    },
  },
  accounts: {
    listEndpoint: endpoint("/accounts"),
    worksSyncEndpoint(accountId: string) {
      return endpoint(`/accounts/${accountId}/works-sync`);
    },
    list() {
      return apiFetch<AccountRecord[]>(endpoint("/accounts"));
    },
    getWorksSync(accountId: string) {
      return apiFetch<AccountWorksSyncResponse>(endpoint(`/accounts/${accountId}/works-sync`));
    },
    triggerWorksSync(accountId: string) {
      return apiFetch<AccountWorksSyncResponse>(endpoint(`/accounts/${accountId}/works-sync`), {
        method: "POST",
      });
    },
  },
  confirmations: {
    listEndpoint: endpoint("/confirmations"),
    detailEndpoint(postId: string) {
      return endpoint(`/confirmations/${postId}`);
    },
    updateEndpoint(postId: string) {
      return endpoint(`/confirmations/${postId}`);
    },
    list() {
      return apiFetch<ConfirmationSummary[]>(endpoint("/confirmations"));
    },
    getById(postId: string) {
      return apiFetch<ConfirmationDetail>(endpoint(`/confirmations/${postId}`));
    },
    update(postId: string, payload: ConfirmationUpdatePayload) {
      return apiFetch<ConfirmationDetail>(endpoint(`/confirmations/${postId}`), {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
  },
  posts: {
    listEndpoint: endpoint("/posts"),
    createEndpoint: endpoint("/posts"),
    detailEndpoint(postId: string) {
      return endpoint(`/posts/${postId}`);
    },
    updateEndpoint(postId: string) {
      return endpoint(`/posts/${postId}`);
    },
    generateCopyEndpoint(postId: string) {
      return endpoint(`/posts/${postId}/generate-copy`);
    },
    generateImagesEndpoint(postId: string) {
      return endpoint(`/posts/${postId}/generate-images`);
    },
    refreshMetricsEndpoint(postId: string) {
      return endpoint(`/posts/${postId}/refresh-metrics`);
    },
    submitReviewEndpoint(postId: string) {
      return endpoint(`/posts/${postId}/submit-review`);
    },
    approveEndpoint(postId: string) {
      return endpoint(`/posts/${postId}/approve`);
    },
    rejectEndpoint(postId: string) {
      return endpoint(`/posts/${postId}/reject`);
    },
    publishEndpoint(postId: string) {
      return endpoint(`/posts/${postId}/publish`);
    },
    list() {
      return apiFetch<PostListItem[]>(endpoint("/posts"));
    },
    getById(postId: string) {
      return apiFetch<PostDetail>(endpoint(`/posts/${postId}`));
    },
    update(postId: string, payload: { topic?: string; title?: string; body?: string; tags?: string[]; assetIds?: string[]; accountId?: string }) {
      return apiFetch<PostListItem>(endpoint(`/posts/${postId}`), {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    generateCopy(postId: string, payload: GenerationTaskPayload) {
      return apiFetch<TaskRecordResponse>(endpoint(`/posts/${postId}/generate-copy`), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    generateImages(postId: string, payload: GenerationTaskPayload) {
      return apiFetch<TaskRecordResponse>(endpoint(`/posts/${postId}/generate-images`), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    refreshMetrics(postId: string) {
      return apiFetch<PostDetail>(endpoint(`/posts/${postId}/refresh-metrics`), {
        method: "POST",
      });
    },
    submitReview(postId: string, payload: { comment: string; operator: string }) {
      return apiFetch<PostDetail>(endpoint(`/posts/${postId}/submit-review`), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    approve(postId: string, payload: { comment: string; operator: string }) {
      return apiFetch<PostDetail>(endpoint(`/posts/${postId}/approve`), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    reject(postId: string, payload: { comment: string; operator: string }) {
      return apiFetch<PostDetail>(endpoint(`/posts/${postId}/reject`), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    publish(postId: string, payload: { comment: string; operator: string }) {
      return apiFetch<PublishResponse>(endpoint(`/posts/${postId}/publish`), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
  assets: {
    listEndpoint: endpoint("/assets"),
    uploadEndpoint: endpoint("/assets/upload"),
    list(params?: { postId?: string; ids?: string[] }) {
      const searchParams = new URLSearchParams();
      if (params?.postId) {
        searchParams.set("postId", params.postId);
      }
      if (params?.ids && params.ids.length > 0) {
        searchParams.set("ids", params.ids.join(","));
      }
      const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
      return apiFetch<AssetSummary[]>(`${endpoint("/assets")}${suffix}`);
    },
    upload(payload: AssetUploadPayload) {
      return apiFetch<AssetUploadResponse>(endpoint("/assets/upload"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
  review: {
    async list() {
      try {
        const confirmations = await apiFetch<ConfirmationSummary[]>(endpoint("/confirmations"));
        const inReviewPosts = confirmations.filter((post) => post.status === "in_review");
        const details = await Promise.all(inReviewPosts.map((post) => apiFetch<ConfirmationDetail>(endpoint(`/confirmations/${post.id}`))));
        return details.map(getReviewQueueItem);
      } catch {
        const posts = await apiFetch<PostListItem[]>(endpoint("/posts"));
        const inReviewPosts = posts.filter((post) => post.status === "in_review");
        const details = await Promise.all(inReviewPosts.map((post) => apiFetch<PostDetail>(endpoint(`/posts/${post.id}`))));
        return details.map(getReviewQueueItem);
      }
    },
  },
  workspace: {
    listCandidatePosts(posts: PostListItem[]) {
      return posts.filter((post) => post.status !== "published");
    },
    async getDraft() {
      const posts = await apiFetch<PostListItem[]>(endpoint("/posts"));
      const candidate = apiClient.workspace.listCandidatePosts(posts)[0];
      if (!candidate) {
        return null;
      }
      return apiFetch<PostDetail>(endpoint(`/posts/${candidate.id}`));
    },
  },
  imageProvider: {
    getConfig() {
      return apiFetch<ImageProviderConfigResponse>(endpoint("/settings/image-provider"));
    },
    upsertConfig(payload: ImageProviderConfigUpsertRequest) {
      return apiFetch<ImageProviderConfigResponse>(endpoint("/settings/image-provider"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    testConfig(payload: { provider?: string | null }) {
      return apiFetch<ImageProviderTestResponse>(endpoint("/settings/image-provider/test"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
};
