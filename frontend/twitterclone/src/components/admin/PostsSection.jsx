import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import { postApi } from "../../api/postApi";
import { UserAvatar } from "../common/UserAvatar";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";
import { ConfirmDialog } from "./ConfirmDialog";
import { InspectReportsModal } from "./InspectReportsModal";
import {
  MessageSquare,
  Search,
  Flag,
  Trash2,
  Heart,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from "lucide-react";

export const PostsSection = ({ authUser, onShowToast }) => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [hasReportsOnly, setHasReportsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Inspect reports modal
  const [inspectPost, setInspectPost] = useState(null);

  // Delete post confirmation dialog
  const [deleteConfirmState, setDeleteConfirmState] = useState({
    isOpen: false,
    post: null,
    loading: false,
  });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.getPosts({
        page,
        limit: 15,
        search,
        hasReports: hasReportsOnly,
      });
      if (data && data.success) {
        setPosts(data.data.posts || []);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [page, search, hasReportsOnly]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDeletePost = async () => {
    const post = deleteConfirmState.post;
    if (!post) return;

    setDeleteConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await postApi.deletePost(post._id);
      onShowToast("Post deleted successfully.");
      setDeleteConfirmState({ isOpen: false, post: null, loading: false });
      fetchPosts();
    } catch (err) {
      alert(err.message || "Failed to delete post");
      setDeleteConfirmState((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="admin-posts-view">
      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search posts by content..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="admin-toggle-filter">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={hasReportsOnly}
              onChange={(e) => {
                setHasReportsOnly(e.target.checked);
                setPage(1);
              }}
            />
            <span>Reported Posts Only</span>
          </label>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={fetchPosts} />}

      {loading ? (
        <div className="admin-loading-box">
          <div className="spinner"></div>
          <span>Loading posts directory...</span>
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No posts found"
          description="Try adjusting your search criteria or report filter."
        />
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Author</th>
                  <th>Content Preview</th>
                  <th>AI Moderation</th>
                  <th>Engagement</th>
                  <th>Reports</th>
                  <th>Published</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const author = post.user || {};
                  const hasReports = post.reportCount > 0;
                  const modStatus = post.moderationStatus || "SAFE";
                  const modScore = typeof post.moderationScore === "number" ? Math.round(post.moderationScore * 100) : 0;

                  return (
                    <tr key={post._id} className={hasReports ? "row-has-reports" : ""}>
                      <td>
                        <div className="table-user-cell">
                          <UserAvatar user={author} size="sm" />
                          <div>
                            <Link to={`/profile/${author.username}`} className="table-fullname">
                              {author.fullname || "Unknown"}
                            </Link>
                            <span className="table-username">@{author.username || "user"}</span>
                          </div>
                        </div>
                      </td>

                      <td className="table-content-preview">
                        <p className="table-post-text">{post.text || "[Image only]"}</p>
                        {post.img && (
                          <img src={post.img} alt="Post preview" className="table-post-thumbnail" />
                        )}
                      </td>

                      {/* AI Moderation Status Badge */}
                      <td>
                        <div
                          className={`ai-mod-badge mod-${modStatus.toLowerCase()}`}
                          title={post.moderationReason || `AI Risk Score: ${modScore}%`}
                        >
                          {modStatus === "SAFE" && <ShieldCheck size={12} />}
                          {modStatus === "FLAGGED" && <ShieldAlert size={12} />}
                          {modStatus === "BLOCKED" && <ShieldX size={12} />}
                          <span>{modStatus}</span>
                          {modScore > 0 && <span className="mod-score-sub">{modScore}%</span>}
                        </div>
                      </td>

                      <td>
                        <div className="table-engagement-cell">
                          <span className="engagement-item">
                            <Heart size={13} /> {post.likesCount}
                          </span>
                          <span className="engagement-item">
                            <MessageSquare size={13} /> {post.commentsCount}
                          </span>
                        </div>
                      </td>

                      <td>
                        {hasReports ? (
                          <button
                            type="button"
                            onClick={() => setInspectPost(post)}
                            className="badge-report-count"
                            title="Inspect reports"
                          >
                            <Flag size={12} />
                            <span>{post.reportCount} Reports</span>
                            {post.pendingReportCount > 0 && (
                              <span className="pending-indicator">({post.pendingReportCount} new)</span>
                            )}
                          </button>
                        ) : (
                          <span className="text-muted" style={{ fontSize: "12px" }}>
                            0 reports
                          </span>
                        )}
                      </td>

                      <td className="table-date">
                        {new Date(post.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td>
                        <div className="table-actions">
                          {hasReports && (
                            <button
                              type="button"
                              onClick={() => setInspectPost(post)}
                              className="btn-inspect-action"
                              title="Inspect reports"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmState({ isOpen: true, post, loading: false })}
                            className="btn-delete-action"
                            title="Delete post"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="admin-pagination-bar">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="pagination-nav-btn"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="pagination-label">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="pagination-nav-btn"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Inspect Reports Modal */}
      {inspectPost && (
        <InspectReportsModal
          isOpen={!!inspectPost}
          onClose={() => setInspectPost(null)}
          post={inspectPost}
          onReportResolved={fetchPosts}
        />
      )}

      {/* Delete Post Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState({ isOpen: false, post: null, loading: false })}
        onConfirm={handleDeletePost}
        loading={deleteConfirmState.loading}
        title="Delete Post"
        message={`Are you sure you want to delete @${deleteConfirmState.post?.user?.username}'s post? This action is permanent and will be logged in the moderation audit trail.`}
        confirmLabel="Delete Post"
        isDanger={true}
      />
    </div>
  );
};
