import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { UserAvatar } from "../common/UserAvatar";
import { AiAssistantModal } from "../ai/AiAssistantModal";
import { Home, MessageSquare, User, Shield, LogOut, Sparkles } from "lucide-react";

export const SidebarNav = () => {
  const { authUser, logout } = useAuth();
  const { isConnected, onlineUsers } = useSocket();
  const [isAiOpen, setIsAiOpen] = useState(false);
  const location = useLocation();

  if (!authUser) return null;

  const isFeedActive = location.pathname === "/";
  const isMessagesActive = location.pathname === "/messages";
  const isProfileActive = location.pathname === `/profile/${authUser.username}`;
  const isAdminActive = location.pathname.startsWith("/admin");

  const userRole = (authUser.role || "USER").toUpperCase();
  const isModOrAdmin = ["ADMIN", "MODERATOR"].includes(userRole);

  return (
    <>
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

            {/* AI Assistant Nav Item */}
            <button
              type="button"
              onClick={() => setIsAiOpen(true)}
              className="nav-link-item ai-assistant-nav-btn"
              title="Open AI Assistant"
            >
              <div className="ai-nav-icon-box">
                <Sparkles size={22} />
              </div>
              <span className="nav-label">AI Assistant</span>
            </button>

            {isModOrAdmin && (
              <Link to="/admin" className={`nav-link-item ${isAdminActive ? "active admin-active" : ""}`}>
                <Shield size={22} />
                <span className="nav-label">{userRole === "ADMIN" ? "Admin Panel" : "Moderation"}</span>
              </Link>
            )}
          </nav>
        </div>

        {/* User Info Card & Logout Footer */}
        <div className="nav-bottom">
          <Link to={`/profile/${authUser.username}`} className="nav-user-badge">
            <UserAvatar user={authUser} size="md" isOnline={true} showOnlineDot={true} />
            <div className="user-details-nav">
              <span className="nav-fullname">
                {authUser.fullname}
                {userRole === "ADMIN" && <span className="badge-role-admin">ADMIN</span>}
                {userRole === "MODERATOR" && <span className="badge-role-mod">MOD</span>}
              </span>
              <span className="nav-username">@{authUser.username}</span>
            </div>
          </Link>

          <button type="button" onClick={logout} className="nav-logout-btn" title="Log out">
            <LogOut size={18} />
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Floating AI Assistant Trigger Button (Bottom Right) */}
      <button
        type="button"
        onClick={() => setIsAiOpen(true)}
        className="floating-ai-launcher"
        title="Ask Connectify AI Assistant"
      >
        <Sparkles size={22} />
        <span className="floating-ai-text">AI Assistant</span>
      </button>

      {/* AI Assistant Modal */}
      <AiAssistantModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </>
  );
};
