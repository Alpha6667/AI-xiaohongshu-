import { mockApi } from "./mock";

const API_PREFIX = "/api";

function endpoint(pathname: string) {
  return `${API_PREFIX}${pathname}`;
}

export const apiClient = {
  dashboard: {
    summaryEndpoint: endpoint("/dashboard/summary"),
    getSummary: mockApi.getDashboardSummary,
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
    list: mockApi.listPosts,
    getById: mockApi.getPostById,
  },
  assets: {
    uploadEndpoint: endpoint("/assets/upload"),
    list: mockApi.listAssets,
  },
  review: {
    list: mockApi.listReviewQueue,
  },
  workspace: {
    getDraft: mockApi.getWorkspaceDraft,
  },
};
