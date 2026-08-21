import React from "react";
import { Modal } from "../common/Modal";
import { AlertTriangle } from "lucide-react";

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to perform this action?",
  confirmLabel = "Confirm",
  isDanger = true,
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="420px">
      <div className="confirm-dialog-body">
        {isDanger && (
          <div className="confirm-icon-box">
            <AlertTriangle size={32} />
          </div>
        )}
        <p className="confirm-message">{message}</p>

        <div className="modal-actions-row">
          <button type="button" onClick={onClose} className="modal-cancel-btn" disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`modal-save-btn ${isDanger ? "danger-btn" : ""}`}
            disabled={loading}
          >
            {loading ? <span className="spinner"></span> : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
