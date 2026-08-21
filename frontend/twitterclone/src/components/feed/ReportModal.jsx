import React, { useState } from "react";
import { reportApi } from "../../api/reportApi";
import { Modal } from "../common/Modal";
import { Flag, AlertCircle, CheckCircle } from "lucide-react";

const REASONS = [
  { value: "spam", label: "Spam or misleading" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate_speech", label: "Hate speech or discrimination" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "violence", label: "Violence or dangerous organizations" },
  { value: "other", label: "Other issue" },
];

export const ReportModal = ({ isOpen, onClose, postId, userId }) => {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await reportApi.createReport({
        reportedPostId: postId || null,
        reportedUserId: userId || null,
        reason,
        details: details.trim(),
      });

      if (data && data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setDetails("");
          onClose();
        }, 1500);
      } else {
        throw new Error(data?.message || "Failed to submit report");
      }
    } catch (err) {
      setError(err.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Content" maxWidth="480px">
      {success ? (
        <div className="report-success-state">
          <CheckCircle size={40} className="success-icon" />
          <h4>Report Submitted</h4>
          <p>Thank you for helping keep Connectify safe. Our moderation team will review this report.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="report-form">
          {error && (
            <div className="auth-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <p className="report-subtitle">
            Please select a reason why this content violates Connectify guidelines:
          </p>

          <div className="report-reasons-list">
            {REASONS.map((r) => (
              <label key={r.value} className={`report-reason-item ${reason === r.value ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={(e) => setReason(e.target.value)}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>

          <div className="input-group" style={{ marginTop: "12px" }}>
            <label>Additional Details (Optional)</label>
            <textarea
              className="report-details-textarea"
              rows={3}
              placeholder="Provide any additional context for moderators..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="modal-actions-row">
            <button type="button" onClick={onClose} className="modal-cancel-btn" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="modal-save-btn report-submit-btn" disabled={loading}>
              {loading ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <Flag size={14} />
                  <span>Submit Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
