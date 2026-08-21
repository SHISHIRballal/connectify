import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { Home, MessageSquare, User, LogOut } from "lucide-react";

export const MobileBottomNav = () => {
  const { authUser, logout } = useAuth();
  const { isConnected, onlineUsers } = useSocket();
  const location = useLocation();

  if (!authUser) return null;

  const isFeedActive = location.pathname === "/";
  const isMessagesActive = location.pathname === "/messages";
  const isProfileActive = location.pathname === `/profile/${authUser.username}`;

  return (
    <nav className="mobile-bottom-nav">
      <Link to="/" className={`mobile-nav-item ${isFeedActive ? "active" : ""}`}>
        <Home size={22} />
        <span className="mobile-nav-label">Home</span>
      </Link>

      <Link to="/messages" className={`mobile-nav-item ${isMessagesActive ? "active" : ""}`}>
        <div className="nav-icon-badge-wrapper">
          <MessageSquare size={22} />
          {isConnected && onlineUsers.length > 0 && <span className="nav-online-dot"></span>}
        </div>
        <span className="mobile-nav-label">Messages</span>
      </Link>

      <Link
        to={`/profile/${authUser.username}`}
        className={`mobile-nav-item ${isProfileActive ? "active" : ""}`}
      >
        <User size={22} />
        <span className="mobile-nav-label">Profile</span>
      </Link>

      <button type="button" onClick={logout} className="mobile-nav-item logout-item">
        <LogOut size={20} />
        <span className="mobile-nav-label">Logout</span>
      </button>
    </nav>
  );
};
