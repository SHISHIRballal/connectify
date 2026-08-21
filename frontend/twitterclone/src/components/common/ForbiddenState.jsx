import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const ForbiddenState = ({
  title = "403 - Access Denied",
  message = "You do not have the required permissions to view this administrative page.",
}) => {
  return (
    <div className="forbidden-state-container">
      <div className="forbidden-icon-box">
        <ShieldAlert size={56} />
      </div>
      <h2 className="forbidden-title">{title}</h2>
      <p className="forbidden-description">{message}</p>
      <Link to="/" className="forbidden-back-btn">
        <ArrowLeft size={16} />
        <span>Return to Feed</span>
      </Link>
    </div>
  );
};
