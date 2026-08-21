import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { userApi } from "../../api/userApi";
import { UserAvatar } from "../common/UserAvatar";
import { Users, UserPlus, Check, Sparkles } from "lucide-react";

export const RightSidebar = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [followedMap, setFollowedMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const data = await userApi.getSuggestions();
        if (data && data.success) {
          setSuggestions(data.data || []);
        }
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  const handleFollow = async (userId) => {
    try {
      const isCurrentlyFollowed = followedMap[userId];
      setFollowedMap((prev) => ({ ...prev, [userId]: !isCurrentlyFollowed }));

      const data = await userApi.followUser(userId);
      if (!data || !data.success) {
        // Revert on failure
        setFollowedMap((prev) => ({ ...prev, [userId]: isCurrentlyFollowed }));
      }
    } catch {
      setFollowedMap((prev) => ({ ...prev, [userId]: !followedMap[userId] }));
    }
  };

  return (
    <aside className="right-sidebar">
      {/* Who to Follow Widget */}
      <div className="sidebar-widget">
        <div className="widget-header">
          <Users size={18} />
          <h3>Who to follow</h3>
        </div>

        {loading ? (
          <div className="widget-loading">
            <span className="spinner"></span>
          </div>
        ) : suggestions.length === 0 ? (
          <p className="widget-empty">No suggestions available right now.</p>
        ) : (
          <div className="suggestions-list">
            {suggestions.slice(0, 5).map((user) => {
              const isFollowed = followedMap[user._id];
              return (
                <div key={user._id} className="suggestion-item">
                  <Link to={`/profile/${user.username}`} className="suggestion-user-info">
                    <UserAvatar user={user} size="sm" />
                    <div className="suggestion-names">
                      <span className="suggestion-name">{user.fullname}</span>
                      <span className="suggestion-username">@{user.username}</span>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleFollow(user._id)}
                    className={`follow-toggle-btn ${isFollowed ? "following" : ""}`}
                  >
                    {isFollowed ? (
                      <>
                        <Check size={14} />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Connectify Info Widget */}
      <div className="sidebar-widget info-widget">
        <div className="info-header">
          <Sparkles size={16} className="info-sparkle" />
          <h4>Connectify</h4>
        </div>
        <p>Production real-time social platform with Socket.IO messaging and infinite scrolling feed.</p>
        <div className="widget-footer-links">
          <span>Privacy</span> · <span>Terms</span> · <span>© 2026 Connectify</span>
        </div>
      </div>
    </aside>
  );
};
