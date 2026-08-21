import React, { useState, useEffect, useCallback } from "react";
import { adminApi } from "../../api/adminApi";
import { UserAvatar } from "../common/UserAvatar";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";
import {
  FileText,
  Shield,
  Clock,
  Filter,
} from "lucide-react";

export const ModerationSection = () => {
  const [logs, setLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.getModerationLogs({ page: 1, limit: 50 });
      if (data && data.success) {
        setLogs(data.data.logs || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = actionFilter
    ? logs.filter((l) => l.action === actionFilter)
    : logs;

  return (
    <div className="admin-logs-view">
      {/* Action Filter */}
      <div className="admin-filter-bar">
        <div className="admin-select-filters">
          <div className="filter-select-wrapper">
            <Filter size={14} className="filter-icon" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="admin-select"
            >
              <option value="">All Action Types</option>
              <option value="DELETE_POST">DELETE_POST</option>
              <option value="SUSPEND_USER">SUSPEND_USER</option>
              <option value="ACTIVATE_USER">ACTIVATE_USER</option>
              <option value="CHANGE_ROLE">CHANGE_ROLE</option>
              <option value="RESOLVE_REPORT">RESOLVE_REPORT</option>
              <option value="DISMISS_REPORT">DISMISS_REPORT</option>
            </select>
          </div>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={fetchLogs} />}

      {loading ? (
        <div className="admin-loading-box">
          <div className="spinner"></div>
          <span>Loading moderation audit trail...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No moderation logs found"
          description="Privileged actions taken by staff members will appear here in chronological order."
        />
      ) : (
        <div className="logs-timeline">
          {filteredLogs.map((log) => {
            const moderator = log.moderator || {};
            const modRole = (moderator.role || "MOD").toUpperCase();

            return (
              <div key={log._id} className="log-timeline-item">
                <div className="log-icon-col">
                  <Shield size={16} />
                </div>
                <div className="log-content">
                  <div className="log-header-row">
                    <div className="log-moderator-info">
                      <UserAvatar user={moderator} size="xs" />
                      <span className="log-moderator-name">@{moderator.username || "Staff"}</span>
                      <span className={`badge-role-mini role-${modRole.toLowerCase()}`}>{modRole}</span>
                    </div>
                    <span className="log-timestamp">
                      <Clock size={12} />
                      {new Date(log.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="log-action-row">
                    <span className="log-action-tag">{log.action}</span>
                    <span className="log-target-tag">Target: {log.targetType}</span>
                  </div>

                  {log.details && (
                    <div className="log-details-block">
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
