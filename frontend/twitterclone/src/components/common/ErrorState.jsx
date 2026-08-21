import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export const ErrorState = ({ message = "Something went wrong.", onRetry = null }) => {
  return (
    <div className="error-state-card">
      <AlertCircle size={28} className="error-state-icon" />
      <div className="error-state-content">
        <h4 className="error-state-title">Error</h4>
        <p className="error-state-text">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="error-state-retry-btn">
          <RefreshCw size={15} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
