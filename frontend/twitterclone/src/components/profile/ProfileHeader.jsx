import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { userApi } from "../../api/userApi";
import { UserAvatar } from "../common/UserAvatar";
import { EditProfileModal } from "./EditProfileModal";
import {
  Calendar,
  Globe,
  UserPlus,
  Check,
  Edit3,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export const ProfileHeader = ({ user, onProfileUpdated }) => {
  const { authUser, updateUserInContext } = useAuth();
  const { onlineUsers } = useSocket();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFollowed, setIsFollowed] = useState(
    (user.followers || []).some((id) => (id._id || id).toString() === authUser._id.toString())
  );
  const [followersCount, setFollowersCount] = useState(user.followers?.length || 0);
  const [followLoading, setFollowLoading] = useState(false);

  const isMyProfile = user._id === authUser._id;
  const isOnline = onlineUsers.includes(user._id?.toString());

  const handleFollowToggle = async () => {
    if (followLoading) return;
    setFollowLoading(true);

    const previousFollowed = isFollowed;
    const previousCount = followersCount;

    // Optimistic toggle
    setIsFollowed(!previousFollowed);
    setFollowersCount(previousFollowed ? previousCount - 1 : previousCount + 1);

    try {
      const data = await userApi.followUser(user._id);
      if (!data || !data.success) {
        // Revert on failure
        setIsFollowed(previousFollowed);
        setFollowersCount(previousCount);
      }
    } catch {
      setIsFollowed(previousFollowed);
      setFollowersCount(previousCount);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUpdated = (updatedUser) => {
    if (isMyProfile) {
      updateUserInContext(updatedUser);
    }
    if (onProfileUpdated) {
      onProfileUpdated(updatedUser);
    }
  };

  return (
    <div className="profile-header-container">
      {/* Cover Image Banner */}
      <div
        className="profile-cover-banner"
        style={{
          backgroundImage: user.coverimg ? `url(${user.coverimg})` : "none",
          backgroundColor: "var(--bg-card)",
        }}
      />

      {/* Profile Bar */}
      <div className="profile-details-wrapper">
        <div className="profile-top-bar">
          <div className="profile-avatar-outer">
            <UserAvatar user={user} size="xl" isOnline={isOnline} showOnlineDot={true} />
          </div>

          <div className="profile-action-buttons">
            {isMyProfile ? (
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="profile-edit-btn"
              >
                <Edit3 size={16} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="profile-other-actions">
                <Link
                  to="/messages"
                  className="profile-message-btn"
                  title={`Message @${user.username}`}
                >
                  <MessageSquare size={16} />
                </Link>

                <button
                  type="button"
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`profile-follow-btn ${isFollowed ? "following" : ""}`}
                >
                  {isFollowed ? (
                    <>
                      <Check size={16} />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* User Info Details */}
        <div className="profile-user-info">
          <h2 className="profile-fullname">{user.fullname}</h2>
          <span className="profile-username">@{user.username}</span>

          {user.bio && <p className="profile-bio">{user.bio}</p>}

          <div className="profile-meta-row">
            {user.link && (
              <a
                href={user.link.startsWith("http") ? user.link : `https://${user.link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-meta-item link-item"
              >
                <Globe size={15} />
                <span>{user.link.replace(/^https?:\/\//, "")}</span>
              </a>
            )}

            {user.createdAt && (
              <div className="profile-meta-item">
                <Calendar size={15} />
                <span>Joined {new Date(user.createdAt).toLocaleDateString([], { month: "long", year: "numeric" })}</span>
              </div>
            )}
          </div>

          {/* Followers & Following Metrics */}
          <div className="profile-stats-row">
            <div className="stat-item">
              <span className="stat-count">{user.following?.length || 0}</span>
              <span className="stat-label">Following</span>
            </div>
            <div className="stat-item">
              <span className="stat-count">{followersCount}</span>
              <span className="stat-label">Followers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isMyProfile && (
        <EditProfileModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          user={user}
          onProfileUpdated={handleUpdated}
        />
      )}
    </div>
  );
};
