import { apiClient } from "./apiClient";

export const postApi = {
  getFeed: ({ cursor, limit = 10 } = {}) => {
    let url = `/api/posts/feed?limit=${limit}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }
    return apiClient(url);
  },

  getUserPosts: (username, { cursor, limit = 10 } = {}) => {
    let url = `/api/posts/user/${encodeURIComponent(username)}?limit=${limit}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }
    return apiClient(url);
  },

  createPost: ({ text, img }) =>
    apiClient("/api/posts/create", {
      method: "POST",
      body: { text, img },
    }),

  likePost: (postId) =>
    apiClient(`/api/posts/like/${postId}`, {
      method: "POST",
    }),

  commentPost: (postId, text) =>
    apiClient(`/api/posts/comment/${postId}`, {
      method: "POST",
      body: { text },
    }),

  deletePost: (postId) =>
    apiClient(`/api/posts/${postId}`, {
      method: "DELETE",
    }),
};
