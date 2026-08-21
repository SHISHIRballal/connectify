import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { UserAvatar } from "../common/UserAvatar";
import { Home, MessageSquare, User, LogOut } from "lucide-react";

export const SidebarNav = () => {
  const { authUser, logout } = useAuth();
  const { isConnected, onlineUsers } = useSocket();
  const location = useLocation();

  if (!authUser) return null;

  const isFeedActive = location.pathname === "/";
  const isMessagesActive = location.pathname === "/messages";
  const isProfileActive = location.pathname === `/profile/${authUser.username}`;

  return (
    <aside className="main-sidebar-nav">
      <div className="nav-top">
        {/* Brand Logo */}
        <Link to="/" className="nav-brand">
          <div className="brand-icon-box">
            <MessageSquare size={24} />
          </div>
          <span className="brand-title">Connectify</span>
        </Link>

        {/* Navigation Links */}
        <nav className="nav-links">
          <Link to="/" className={`nav-link-item ${isFeedActive ? "active" : ""}`}>
            <Home size={22} />
            <span className="nav-label">Home</span>
          </Link>

          <Link to="/messages" className={`nav-link-item ${isMessagesActive ? "active" : ""}`}>
            <div className="nav-icon-badge-wrapper">
              <MessageSquare size={22} />
              {isConnected && (
                <span className="nav-online-dot" title={`${onlineUsers.length} online`}></span>
              )}
            </div>
            <span className="nav-label">Messages</span>
          </Link>

          <Link
            to={`/profile/${authUser.username}`}
            className={`nav-link-item ${isProfileActive ? "active" : ""}`}
          >
            <User size={22} />
            <span className="nav-label">Profile</span>
          </Link>
        </nav>
      </div>

      {/* User Info Card & Logout Footer */}
      <div className="nav-bottom">
        <Link to={`/profile/${authUser.username}`} className="nav-user-badge">
          <UserAvatar user={authUser} size="md" isOnline={true} showOnlineDot={true} />
          <div className="user-details-nav">
            <span className="nav-fullname">{authUser.fullname}</span>
            <span className="nav-username">@{authUser.username}</span>
          </div>
        </Link>

        <button type="button" onClick={logout} className="nav-logout-btn" title="Log out">
          <LogOut size={18} />
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
};
