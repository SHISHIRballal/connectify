import React from "react";

export const PostSkeleton = () => (
  <div className="post-skeleton">
    <div className="skeleton-header">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-lines">
        <div className="skeleton-line short"></div>
        <div className="skeleton-line mini"></div>
      </div>
    </div>
    <div className="skeleton-line long"></div>
    <div className="skeleton-line medium"></div>
  </div>
);

export const ProfileSkeleton = () => (
  <div className="profile-skeleton">
    <div className="skeleton-cover"></div>
    <div className="skeleton-profile-header">
      <div className="skeleton-avatar-large"></div>
      <div className="skeleton-line medium" style={{ marginTop: "16px" }}></div>
      <div className="skeleton-line short"></div>
      <div className="skeleton-line long" style={{ marginTop: "12px" }}></div>
    </div>
  </div>
);

export const ConversationSkeleton = () => (
  <div className="conversation-skeleton">
    <div className="skeleton-avatar"></div>
    <div className="skeleton-lines">
      <div className="skeleton-line medium"></div>
      <div className="skeleton-line short"></div>
    </div>
  </div>
);
