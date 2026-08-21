import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { postApi } from "../../api/postApi";
import { UserAvatar } from "../common/UserAvatar";
import { Heart, MessageSquare, Trash2, Send } from "lucide-react";

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

  const isMyPost = (post.user?._id || post.user) === authUser._id;
  const author = post.user || {};

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
    if (!window.confirm("Are you sure you want to delete this post?")) return;

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

  return (
    <article className="post-card">
      <div className="post-card-header">
        <Link to={`/profile/${author.username}`} className="author-info">
          <UserAvatar user={author} size="md" />
          <div className="author-names">
            <span className="author-fullname">{author.fullname || "User"}</span>
            <span className="author-username">@{author.username || "user"}</span>
            <span className="post-dot">·</span>
            <time className="post-timestamp">{formatTime(post.createdAt)}</time>
          </div>
        </Link>

        {isMyPost && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="delete-post-btn"
            title="Delete post"
          >
            <Trash2 size={16} />
          </button>
        )}
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
      </div>

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
    </article>
  );
};
