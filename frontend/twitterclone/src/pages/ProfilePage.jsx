import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { userApi } from "../api/userApi";
import { postApi } from "../api/postApi";
import { AppLayout } from "../components/layout/AppLayout";
import { RightSidebar } from "../components/layout/RightSidebar";
import { ProfileHeader } from "../components/profile/ProfileHeader";
import { PostCard } from "../components/feed/PostCard";
import { ProfileSkeleton, PostSkeleton } from "../components/common/LoadingSkeleton";
import { ErrorState } from "../components/common/ErrorState";
import { EmptyState } from "../components/common/EmptyState";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { ArrowLeft, MessageSquare, CheckCircle2 } from "lucide-react";

export const ProfilePage = () => {
  const { username } = useParams();

  const [profileUser, setProfileUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch Profile User Info
  const fetchProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      setProfileError(null);
      const data = await userApi.getProfile(username);
      if (data && data.success) {
        setProfileUser(data.data);
      } else {
        setProfileError(data?.message || "User not found");
      }
    } catch (err) {
      setProfileError(err.message || "Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  }, [username]);

  // Fetch User Posts with Cursor Pagination
  const fetchUserPosts = useCallback(
    async ({ isInitial = false, cursorToUse = null }) => {
      if (isInitial) {
        setPostsLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await postApi.getUserPosts(username, {
          cursor: cursorToUse,
          limit: 10,
        });

        if (data && data.success) {
          const { posts: newPosts, nextCursor, hasNextPage: more } = data.data;

          setPosts((prev) => {
            if (isInitial) return newPosts || [];
            const existingIds = new Set(prev.map((p) => p._id));
            const unique = (newPosts || []).filter((p) => !existingIds.has(p._id));
            return [...prev, ...unique];
          });

          setCursor(nextCursor);
          setHasNextPage(more);
        }
      } catch (err) {
        console.error("Error fetching user posts:", err);
      } finally {
        if (isInitial) {
          setPostsLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [username]
  );

  useEffect(() => {
    fetchProfile();
    fetchUserPosts({ isInitial: true, cursorToUse: null });
  }, [fetchProfile, fetchUserPosts]);

  // Infinite Scroll Handler
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !loadingMore && !postsLoading && cursor) {
      fetchUserPosts({ isInitial: false, cursorToUse: cursor });
    }
  }, [fetchUserPosts, hasNextPage, loadingMore, postsLoading, cursor]);

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage,
    isLoading: loadingMore || postsLoading,
    onLoadMore: handleLoadMore,
    rootMargin: "250px",
  });

  const handlePostDeleted = (deletedId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedId));
  };

  return (
    <AppLayout>
      <div className="feed-page-layout">
        {/* Center Profile Column */}
        <main className="feed-center-column">
          <header className="profile-top-nav-header">
            <Link to="/" className="back-nav-btn" title="Back to Feed">
              <ArrowLeft size={20} />
            </Link>
            <div className="top-nav-title-box">
              <h1 className="top-nav-fullname">{profileUser?.fullname || username}</h1>
              <span className="top-nav-post-count">{posts.length} Posts</span>
            </div>
          </header>

          {profileLoading ? (
            <ProfileSkeleton />
          ) : profileError ? (
            <ErrorState message={profileError} onRetry={fetchProfile} />
          ) : (
            <>
              {/* Profile Header Card */}
              <ProfileHeader
                user={profileUser}
                onProfileUpdated={(updated) => setProfileUser(updated)}
              />

              {/* User Posts Stream */}
              <div className="profile-feed-stream">
                <div className="profile-tabs-bar">
                  <span className="profile-tab active">Posts</span>
                </div>

                {postsLoading && (
                  <div className="feed-skeletons">
                    <PostSkeleton />
                    <PostSkeleton />
                  </div>
                )}

                {!postsLoading && posts.length === 0 && (
                  <EmptyState
                    icon={MessageSquare}
                    title="No posts yet"
                    description={`@${username} hasn't published any posts.`}
                  />
                )}

                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onPostDeleted={handlePostDeleted}
                  />
                ))}

                {loadingMore && (
                  <div className="feed-loading-more">
                    <div className="spinner"></div>
                    <span>Loading more posts...</span>
                  </div>
                )}

                {!postsLoading && !hasNextPage && posts.length > 0 && (
                  <div className="feed-end-state">
                    <CheckCircle2 size={20} className="end-icon" />
                    <span>You've reached the end of @{username}'s posts.</span>
                  </div>
                )}

                <div ref={sentinelRef} className="scroll-sentinel" aria-hidden="true" />
              </div>
            </>
          )}
        </main>

        {/* Right Suggestions Sidebar */}
        <RightSidebar />
      </div>
    </AppLayout>
  );
};
