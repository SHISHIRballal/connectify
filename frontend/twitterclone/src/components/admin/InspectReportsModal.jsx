import React, { useState, useEffect } from "react";
import { adminApi } from "../../api/adminApi";
import { Modal } from "../common/Modal";
import { UserAvatar } from "../common/UserAvatar";
import { Flag, CheckCircle, Clock } from "lucide-react";

export const InspectReportsModal = ({ isOpen, onClose, post, onReportResolved }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !post) return;

    const fetchReports = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await adminApi.getPostReports(post._id);
        if (data && data.success) {
          setReports(data.data || []);
        }
      } catch (err) {
        setError(err.message || "Failed to load post reports");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [isOpen, post]);

  const handleResolve = async (reportId) => {
    try {
      const data = await adminApi.resolveReport(reportId, {
        status: "RESOLVED",
        resolutionNotes: "Reviewed from post inspector",
        actionTaken: "NONE",
      });
      if (data && data.success) {
        setReports((prev) =>
          prev.map((r) => (r._id === reportId ? { ...r, status: "RESOLVED" } : r))
        );
        if (onReportResolved) onReportResolved();
      }
    } catch (err) {
      alert(err.message || "Failed to resolve report");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inspect Post Reports" maxWidth="600px">
      <div className="inspect-reports-container">
        {post && (
          <div className="post-preview-card">
            <span className="preview-label">Target Post:</span>
            <p className="preview-text">{post.text || "[No text content]"}</p>
            {post.img && <img src={post.img} alt="Post attachment" className="preview-img" />}
          </div>
        )}

        <h4 className="inspect-title">Filed Reports ({reports.length})</h4>

        {loading ? (
          <div className="admin-loading-box">
            <div className="spinner"></div>
            <span>Loading reports...</span>
          </div>
        ) : error ? (
          <div className="auth-error">{error}</div>
        ) : reports.length === 0 ? (
          <p className="no-reports-text">No reports filed for this post.</p>
        ) : (
          <div className="inspect-reports-list">
            {reports.map((report) => {
              const reporter = report.reporter || {};
              const isPending = report.status === "PENDING";

              return (
                <div key={report._id} className="inspect-report-item">
                  <div className="inspect-report-header">
                    <div className="inspect-reporter">
                      <UserAvatar user={reporter} size="xs" />
                      <span>@{reporter.username || "Anonymous"}</span>
                    </div>
                    <span className={`report-badge-status ${report.status.toLowerCase()}`}>
                      {report.status}
                    </span>
                  </div>

                  <div className="inspect-report-body">
                    <span className="report-reason-tag">
                      <Flag size={12} /> {report.reason.toUpperCase()}
                    </span>
                    {report.details && <p className="report-notes">"{report.details}"</p>}
                  </div>

                  <div className="inspect-report-footer">
                    <span className="report-time">
                      <Clock size={12} />
                      {new Date(report.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleResolve(report._id)}
                        className="btn-resolve-mini"
                      >
                        <CheckCircle size={12} /> Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
