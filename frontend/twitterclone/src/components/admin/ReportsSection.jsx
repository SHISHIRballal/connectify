import React, { useState, useEffect, useCallback } from "react";
import { adminApi } from "../../api/adminApi";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Flag,
  Trash2,
  UserX,
  XCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

export const ReportsSection = ({ authUser, onShowToast }) => {
  const myRole = (authUser.role || "USER").toUpperCase();
  const isAdmin = myRole === "ADMIN";

  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    reportId: null,
    actionTaken: "NONE",
    notes: "",
    loading: false,
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.getReports({
        status: statusFilter,
      });
      if (data && data.success) {
        setReports(data.data.reports || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const openResolutionConfirm = (reportId, actionTaken) => {
    const defaultNotes =
      actionTaken === "DISMISSED"
        ? "Reviewed and determined no guideline violation"
        : actionTaken === "POST_DELETED"
        ? "Content violated guidelines and was removed"
        : actionTaken === "USER_SUSPENDED"
        ? "Account suspended for severe guideline violations"
        : "Report reviewed and resolved";

    const notes = window.prompt(`Enter resolution notes:`, defaultNotes);
    if (notes === null) return;

    setConfirmState({
      isOpen: true,
      reportId,
      actionTaken,
      notes,
      loading: false,
    });
  };

  const handleExecuteResolution = async () => {
    const { reportId, actionTaken, notes } = confirmState;
    if (!reportId) return;

    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      const data = await adminApi.resolveReport(reportId, {
        status: actionTaken === "DISMISSED" ? "DISMISSED" : "RESOLVED",
        resolutionNotes: notes,
        actionTaken,
      });

      if (data && data.success) {
        onShowToast("Report resolution completed.");
        setConfirmState({ isOpen: false, reportId: null, actionTaken: "NONE", notes: "", loading: false });
        fetchReports();
      }
    } catch (err) {
      alert(err.message || "Failed to resolve report");
      setConfirmState((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="admin-reports-view">
      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-status-tabs">
          {["PENDING", "RESOLVED", "DISMISSED"].map((st) => (
            <button
              key={st}
              type="button"
              className={`status-tab-btn ${statusFilter === st ? "active" : ""}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={fetchReports} />}

      {loading ? (
        <div className="admin-loading-box">
          <div className="spinner"></div>
          <span>Loading moderation reports...</span>
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Flag}
          title={`No ${statusFilter.toLowerCase()} reports`}
          description="All clear! No reports match the current filter."
        />
      ) : (
        <div className="reports-grid">
          {reports.map((report) => {
            const reporter = report.reporter || {};
            const reportedUser = report.reportedUser || {};
            const reportedPost = report.reportedPost;

            return (
              <div key={report._id} className="report-card">
                <div className="report-card-top">
                  <div className="report-badge-reason">
                    <Flag size={14} />
                    <span>{report.reason.toUpperCase()}</span>
                  </div>
                  <span className={`report-badge-status ${report.status.toLowerCase()}`}>
                    {report.status}
                  </span>
                </div>

                <div className="report-parties">
                  <p>
                    <strong>Reporter:</strong> @{reporter.username || "Unknown"}
                  </p>
                  {reportedUser.username && (
                    <p>
                      <strong>Reported User:</strong> @{reportedUser.username}
                      {reportedUser.isSuspended && <span className="text-danger"> (Suspended)</span>}
                    </p>
                  )}
                </div>

                {report.details && (
                  <div className="report-details-box">
                    <p>"{report.details}"</p>
                  </div>
                )}

                {/* Reported Post Preview if applicable */}
                {reportedPost && (
                  <div className="reported-content-preview">
                    <span className="preview-label">Reported Post Content:</span>
                    <p className="preview-text">{reportedPost.text || "[No text]"}</p>
                    {reportedPost.img && (
                      <img src={reportedPost.img} alt="Reported post attachment" className="preview-img" />
                    )}
                  </div>
                )}

                {/* Resolution Info if already resolved */}
                {report.resolvedBy && (
                  <div className="resolution-info-box">
                    <p>
                      <strong>Reviewed by:</strong> @{report.resolvedBy.username} · Action:{" "}
                      <code>{report.actionTaken}</code>
                    </p>
                    {report.resolutionNotes && <p>Notes: {report.resolutionNotes}</p>}
                  </div>
                )}

                {/* Actions for PENDING reports */}
                {report.status === "PENDING" && (
                  <div className="report-actions-row">
                    {reportedPost && (
                      <button
                        type="button"
                        onClick={() => openResolutionConfirm(report._id, "POST_DELETED")}
                        className="btn-report-action delete-post"
                        title="Delete reported post and mark resolved"
                      >
                        <Trash2 size={14} /> Delete Post
                      </button>
                    )}

                    {reportedUser._id && isAdmin && !reportedUser.isSuspended && (
                      <button
                        type="button"
                        onClick={() => openResolutionConfirm(report._id, "USER_SUSPENDED")}
                        className="btn-report-action suspend-user"
                        title="Suspend reported user and mark resolved"
                      >
                        <UserX size={14} /> Suspend User
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openResolutionConfirm(report._id, "DISMISSED")}
                      className="btn-report-action dismiss"
                    >
                      <XCircle size={14} /> Dismiss
                    </button>

                    <button
                      type="button"
                      onClick={() => openResolutionConfirm(report._id, "NONE")}
                      className="btn-report-action resolve"
                    >
                      <CheckCircle size={14} /> Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleExecuteResolution}
        loading={confirmState.loading}
        title="Confirm Report Resolution"
        message={`Execute action "${confirmState.actionTaken}" for this report with notes: "${confirmState.notes}"?`}
        confirmLabel="Confirm Resolution"
        isDanger={confirmState.actionTaken === "POST_DELETED" || confirmState.actionTaken === "USER_SUSPENDED"}
      />
    </div>
  );
};
