import React from "react";

export const UserAvatar = ({
  user,
  size = "md", // "xs", "sm", "md", "lg", "xl"
  isOnline = false,
  showOnlineDot = false,
  className = "",
}) => {
  const fullname = user?.fullname || "";
  const profileimg = user?.profileimg || "";
  const initial = fullname ? fullname.charAt(0).toUpperCase() : "U";

  return (
    <div className={`user-avatar-container size-${size} ${className}`}>
      {profileimg ? (
        <img src={profileimg} alt={fullname || "User avatar"} className="user-avatar-image" />
      ) : (
        <div className="user-avatar-fallback">
          <span>{initial}</span>
        </div>
      )}
      {showOnlineDot && (
        <span className={`avatar-presence-dot ${isOnline ? "online" : "offline"}`} />
      )}
    </div>
  );
};
