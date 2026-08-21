import React from "react";
import { Sparkles } from "lucide-react";

export const EmptyState = ({
  icon: Icon = Sparkles,
  title = "No content yet",
  description = "Check back later or start sharing with the community.",
  action = null,
}) => {
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon-box">
        <Icon size={44} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
};
