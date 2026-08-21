import React, { useState, useEffect, useCallback } from "react";
import { postApi } from "../../api/postApi";
import { CreatePost } from "./CreatePost";
import { PostCard } from "./PostCard";
import { PostSkeleton } from "../common/LoadingSkeleton";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import { Sparkles, CheckCircle2 } from "lucide-react";

export const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Fetch feed posts with cursor-based pagination
  const fetchFeed = useCallback(
    async ({ isInitial = false, cursorToUse = null }) => {
      if (isInitial) {
        setIsInitialLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const data = await postApi.getFeed({ cursor: cursorToUse, limit: 10 });
        if (!data || !data.success) {
          throw new Error(data?.message || "Failed to load feed");
        }

        const { posts: newPosts, nextCursor, hasNextPage: more } = data.data;

        setPosts((prev) => {
          if (isInitial) {
            return newPosts || [];
          }
          // Strict duplicate prevention by post ID
          const existingIds = new Set(prev.map((p) => p._id));
          const uniqueIncoming = (newPosts || []).filter((p) => !existingIds.has(p._id));
          return [...prev, ...uniqueIncoming];
        });

        setCursor(nextCursor);
        setHasNextPage(more);
        setError(null);
      } catch (err) {
        console.error("Feed error:", err);
        setError(err.message || "Failed to load posts");
      } finally {
        if (isInitial) {
          setIsInitialLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchFeed({ isInitial: true, cursorToUse: null });
  }, [fetchFeed]);

  // Load next page callback triggered by IntersectionObserver
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isLoadingMore && !isInitialLoading && cursor) {
      fetchFeed({ isInitial: false, cursorToUse: cursor });
    }
  }, [fetchFeed, hasNextPage, isLoadingMore, isInitialLoading, cursor]);

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage,
    isLoading: isLoadingMore || isInitialLoading,
    onLoadMore: handleLoadMore,
    rootMargin: "250px",
  });

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  return (
    <div className="feed-container">
      {/* Create Post Composer */}
      <CreatePost onPostCreated={handlePostCreated} />

      {/* Feed Stream */}
      <div className="feed-stream">
        {/* Initial Loading Skeletons */}
        {isInitialLoading && (
          <div className="feed-skeletons">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        )}

        {/* Error State */}
        {error && (
          <ErrorState
            message={error}
            onRetry={() => fetchFeed({ isInitial: true, cursorToUse: null })}
          />
        )}

        {/* Empty State */}
        {!isInitialLoading && !error && posts.length === 0 && (
          <EmptyState
            icon={Sparkles}
            title="No posts yet"
            description="Be the first to share something with the community!"
          />
        )}

        {/* Posts List */}
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onPostDeleted={handlePostDeleted}
          />
        ))}

        {/* Bottom Loading Indicator for Infinite Scroll */}
        {isLoadingMore && (
          <div className="feed-loading-more">
            <div className="spinner"></div>
            <span>Loading more posts...</span>
          </div>
        )}

        {/* End of Feed Indicator */}
        {!isInitialLoading && !hasNextPage && posts.length > 0 && (
          <div className="feed-end-state">
            <CheckCircle2 size={20} className="end-icon" />
            <span>You're all caught up! You've reached the end of the feed.</span>
          </div>
        )}

        {/* IntersectionObserver Sentinel */}
        <div ref={sentinelRef} className="scroll-sentinel" aria-hidden="true" />
      </div>
    </div>
  );
};
