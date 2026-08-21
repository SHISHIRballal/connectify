import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UserAvatar } from "../common/UserAvatar";
import { MessageSquare } from "lucide-react";

export const MobileHeader = () => {
  const { authUser } = useAuth();
  if (!authUser) return null;

  return (
    <header className="mobile-top-header">
      <Link to={`/profile/${authUser.username}`} className="mobile-header-avatar">
        <UserAvatar user={authUser} size="sm" />
      </Link>

      <Link to="/" className="mobile-header-logo">
        <MessageSquare size={22} className="logo-icon" />
        <span className="logo-text">Connectify</span>
      </Link>

      <Link to="/messages" className="mobile-header-chat-btn" title="Messages">
        <MessageSquare size={20} />
      </Link>
    </header>
  );
};
