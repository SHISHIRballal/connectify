import React, { useState, useEffect } from "react";
import { adminApi } from "../../api/adminApi";
import { UserAvatar } from "../common/UserAvatar";
import { ErrorState } from "../common/ErrorState";
import {
  Users,
  MessageSquare,
  Flag,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export const OverviewSection = ({ onNavigateTab }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOverview = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.getOverview();
      if (res && res.success) {
        setData(res.data);
      } else {
        throw new Error(res?.message || "Failed to load overview data");
      }
    } catch (err) {
      setError(err.message || "Failed to load overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="admin-loading-box">
        <div className="spinner"></div>
        <span>Loading overview metrics...</span>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchOverview} />;
  }

  const metrics = data?.metrics || {};
  const users = metrics.users || {};
  const posts = metrics.posts || {};
  const reports = metrics.reports || {};
  const moderation = metrics.moderation || {};

  return (
    <div className="overview-section">
      {/* Top 4 Stat Cards */}
      <div className="stat-cards-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Total Users</span>
            <div className="stat-card-icon users-icon">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-card-value">{users.total || 0}</div>
          <div className="stat-card-meta">
            <span className="text-active">{users.active || 0} active</span> ·{" "}
            <span className="text-suspended">{users.suspended || 0} suspended</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Total Posts</span>
            <div className="stat-card-icon posts-icon">
              <MessageSquare size={20} />
            </div>
          </div>
          <div className="stat-card-value">{posts.total || 0}</div>
          <div className="stat-card-meta">
            <span>+{posts.createdLast24h || 0} in last 24h</span> ·{" "}
            <span>{posts.withImages || 0} with media</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Pending Reports</span>
            <div className="stat-card-icon reports-icon">
              <Flag size={20} />
            </div>
          </div>
          <div className="stat-card-value">{reports.pending || 0}</div>
          <div className="stat-card-meta">
            <span>{reports.resolved || 0} resolved</span> ·{" "}
            <span>{reports.dismissed || 0} dismissed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Moderation Actions</span>
            <div className="stat-card-icon mod-icon">
              <Shield size={20} />
            </div>
          </div>
          <div className="stat-card-value">{moderation.totalActions || 0}</div>
          <div className="stat-card-meta">
            <span>{users.moderators || 0} mods</span> ·{" "}
            <span>{users.admins || 0} admins active</span>
          </div>
        </div>
      </div>

      {/* Split View: Recent Activity & Pending Queue */}
      <div className="overview-split-grid">
        {/* Left: Pending Reports Queue */}
        <div className="overview-panel">
          <div className="panel-header">
            <div className="panel-title-box">
              <Flag size={18} />
              <h3>Pending Reports Queue</h3>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                className="panel-view-all-btn"
                onClick={() => onNavigateTab("reports")}
              >
                <span>View all</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          <div className="panel-content">
            {(!data.recentPendingReports || data.recentPendingReports.length === 0) ? (
              <div className="panel-empty">
                <CheckCircle size={32} className="text-active" />
                <p>No pending reports. All clear!</p>
              </div>
            ) : (
              <div className="overview-reports-list">
                {data.recentPendingReports.map((report) => (
                  <div key={report._id} className="overview-report-item">
                    <div className="report-item-left">
                      <span className="report-item-reason">{report.reason.toUpperCase()}</span>
                      <p className="report-item-text">
                        {report.reportedPost?.text || `Reported user @${report.reportedUser?.username || "user"}`}
                      </p>
                      <span className="report-item-reporter">
                        By @{report.reporter?.username || "user"}
                      </span>
                    </div>
                    {onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab("reports")}
                        className="btn-triage-mini"
                      >
                        Triage
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Moderation Audit Logs */}
        <div className="overview-panel">
          <div className="panel-header">
            <div className="panel-title-box">
              <Clock size={18} />
              <h3>Recent Moderation Activity</h3>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                className="panel-view-all-btn"
                onClick={() => onNavigateTab("moderation")}
              >
                <span>View all</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          <div className="panel-content">
            {(!data.recentLogs || data.recentLogs.length === 0) ? (
              <div className="panel-empty">
                <Shield size={32} />
                <p>No recent moderation activity.</p>
              </div>
            ) : (
              <div className="overview-logs-list">
                {data.recentLogs.map((log) => (
                  <div key={log._id} className="overview-log-item">
                    <UserAvatar user={log.moderator} size="xs" />
                    <div className="log-item-details">
                      <p className="log-item-action">
                        <strong>@{log.moderator?.username || "Staff"}</strong>{" "}
                        <span className="log-badge-mini">{log.action}</span>
                      </p>
                      <span className="log-item-time">
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
