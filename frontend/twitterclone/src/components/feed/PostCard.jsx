import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { postApi } from "../../api/postApi";
import { aiApi } from "../../api/aiApi";
import { UserAvatar } from "../common/UserAvatar";
import { ReportModal } from "./ReportModal";
import { Heart, MessageSquare, Trash2, Send, Flag, Shield, Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";

export const PostCard = ({ post, onPostDeleted }) => {
  const { authUser } = useAuth();
  const [likes, setLikes] = useState(post.likes || []);
  const [isLiked, setIsLiked] = useState(
    (post.likes || []).some((id) => (id._id || id).toString() === authUser._id.toString())
  );
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // AI Summarization State
  const [summaryState, setSummaryState] = useState({
    loading: false,
    summary: null,
    error: null,
  });

  const author = post.user || {};
  const isMyPost = (author._id || author).toString() === authUser._id.toString();
  const myRole = (authUser.role || "USER").toUpperCase();
  const isModOrAdmin = ["MODERATOR", "ADMIN"].includes(myRole);
  const authorRole = (author.role || "USER").toUpperCase();

  // Show summarize button if the post has text content or comments
  const canSummarize = (post.text && post.text.trim().length > 10) || (comments && comments.length > 0);

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);

    if (diffSecs < 60) return "just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleLike = async () => {
    const previousLikes = [...likes];
    const previousIsLiked = isLiked;

    if (isLiked) {
      setIsLiked(false);
      setLikes(likes.filter((id) => (id._id || id).toString() !== authUser._id.toString()));
    } else {
      setIsLiked(true);
      setLikes([...likes, authUser._id]);
    }

    try {
      const data = await postApi.likePost(post._id);
      if (!data || !data.success) {
        setLikes(previousLikes);
        setIsLiked(previousIsLiked);
      }
    } catch {
      setLikes(previousLikes);
      setIsLiked(previousIsLiked);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || commentLoading) return;

    setCommentLoading(true);
    try {
      const data = await postApi.commentPost(post._id, commentText.trim());
      if (data && data.success) {
        setComments(data.data || []);
        setCommentText("");
      }
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmMsg = isMyPost
      ? "Are you sure you want to delete your post?"
      : `[${myRole} ACTION] Are you sure you want to delete @${author.username}'s post?`;

    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      const data = await postApi.deletePost(post._id);
      if (data && data.success) {
        if (onPostDeleted) {
          onPostDeleted(post._id);
        }
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      setIsDeleting(false);
    }
  };

  const handleSummarize = async () => {
    // If summary is already displayed, toggle it off
    if (summaryState.summary && !summaryState.error) {
      setSummaryState({ loading: false, summary: null, error: null });
      return;
    }

    setSummaryState({ loading: true, summary: null, error: null });

    try {
      const data = await aiApi.summarize([post._id]);
      if (data && data.success) {
        setSummaryState({
          loading: false,
          summary: data.data.summary,
          error: null,
        });
      } else {
        setSummaryState({
          loading: false,
          summary: null,
          error: data?.message || "Failed to generate summary",
        });
      }
    } catch (err) {
      setSummaryState({
        loading: false,
        summary: null,
        error: err.message || "Summarization failed. Please try again.",
      });
    }
  };

  return (
    <article className="post-card">
      <div className="post-card-header">
        <Link to={`/profile/${author.username}`} className="author-info">
          <UserAvatar user={author} size="md" />
          <div className="author-names">
            <span className="author-fullname">{author.fullname || "User"}</span>

            {/* Role Badge */}
            {authorRole === "ADMIN" && (
              <span className="role-tag admin-tag" title="Administrator">
                <Shield size={10} /> ADMIN
              </span>
            )}
            {authorRole === "MODERATOR" && (
              <span className="role-tag mod-tag" title="Moderator">
                <Shield size={10} /> MOD
              </span>
            )}

            <span className="author-username">@{author.username || "user"}</span>
            <span className="post-dot">·</span>
            <time className="post-timestamp">{formatTime(post.createdAt)}</time>
          </div>
        </Link>

        <div className="post-header-actions">
          {!isMyPost && (
            <button
              type="button"
              onClick={() => setIsReportOpen(true)}
              className="report-post-btn"
              title="Report post"
            >
              <Flag size={15} />
            </button>
          )}

          {(isMyPost || isModOrAdmin) && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={`delete-post-btn ${!isMyPost ? "mod-delete-btn" : ""}`}
              title={isMyPost ? "Delete post" : `Moderator delete post`}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="post-card-body">
        {post.text && <p className="post-text">{post.text}</p>}
        {post.img && (
          <div className="post-image-wrapper">
            <img src={post.img} alt="Post content" className="post-image" />
          </div>
        )}
      </div>

      <div className="post-card-footer">
        {/* Comment Action */}
        <button
          type="button"
          className={`post-action-btn comment-btn ${showComments ? "active" : ""}`}
          onClick={() => setShowComments(!showComments)}
        >
          <MessageSquare size={18} />
          <span>{comments.length}</span>
        </button>

        {/* Like Action */}
        <button
          type="button"
          className={`post-action-btn like-btn ${isLiked ? "liked" : ""}`}
          onClick={handleLike}
        >
          <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
          <span>{likes.length}</span>
        </button>

        {/* AI Summarize Action */}
        {canSummarize && (
          <button
            type="button"
            className={`post-action-btn summarize-btn ${summaryState.summary ? "active" : ""}`}
            onClick={handleSummarize}
            disabled={summaryState.loading}
            title="Summarize with AI"
          >
            {summaryState.loading ? (
              <Loader2 size={18} className="spin-animation" />
            ) : (
              <Sparkles size={18} />
            )}
            <span>{summaryState.loading ? "Summarizing..." : "Summarize"}</span>
          </button>
        )}
      </div>

      {/* AI Summary Display */}
      {summaryState.summary && (
        <div className="ai-summary-card">
          <div className="ai-summary-header">
            <Sparkles size={14} />
            <span>AI Summary</span>
          </div>
          <p className="ai-summary-text">{summaryState.summary}</p>
        </div>
      )}

      {/* AI Summary Error with Retry */}
      {summaryState.error && (
        <div className="ai-summary-error">
          <AlertCircle size={14} />
          <span>{summaryState.error}</span>
          <button type="button" onClick={handleSummarize} className="ai-retry-btn">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Comments Section Accordion */}
      {showComments && (
        <div className="comments-section">
          <form onSubmit={handleAddComment} className="add-comment-form">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="comment-input"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!commentText.trim() || commentLoading}
              className="comment-submit-btn"
            >
              {commentLoading ? <span className="spinner"></span> : <Send size={14} />}
            </button>
          </form>

          {comments.length > 0 ? (
            <div className="comments-list">
              {comments.map((comment, index) => {
                const commentUser = comment.user || {};
                const cRole = (commentUser.role || "USER").toUpperCase();
                return (
                  <div key={comment._id || index} className="comment-item">
                    <Link to={`/profile/${commentUser.username}`}>
                      <UserAvatar user={commentUser} size="xs" />
                    </Link>
                    <div className="comment-bubble">
                      <div className="comment-header">
                        <Link to={`/profile/${commentUser.username}`} className="comment-author">
                          {commentUser.fullname || "User"}
                        </Link>
                        {cRole === "ADMIN" && <span className="role-tag admin-tag-mini">ADMIN</span>}
                        {cRole === "MODERATOR" && <span className="role-tag mod-tag-mini">MOD</span>}
                        <span className="comment-time">{formatTime(comment.createdAt)}</span>
                      </div>
                      <p className="comment-text">{comment.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-comments-text">No comments yet. Be the first to comment!</p>
          )}
        </div>
      )}

      {/* Report Modal Dialog */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        postId={post._id}
        userId={author._id}
      />
    </article>
  );
};
