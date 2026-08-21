import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import { UserAvatar } from "../common/UserAvatar";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Users,
  Search,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const UsersSection = ({ authUser, onShowToast }) => {
  const myRole = (authUser.role || "USER").toUpperCase();
  const isAdmin = myRole === "ADMIN";

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    type: "", // "suspend" | "activate" | "role"
    user: null,
    reason: "",
    newRole: "",
    loading: false,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.getUsers({
        page,
        limit: 15,
        search,
        role: roleFilter,
        status: statusFilter,
      });
      if (data && data.success) {
        setUsers(data.data.users || []);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openSuspendConfirm = (user) => {
    const reason = window.prompt(`Enter suspension reason for @${user.username}:`, "Violation of community standards");
    if (reason === null) return;

    setConfirmState({
      isOpen: true,
      type: "suspend",
      user,
      reason,
      newRole: "",
      loading: false,
    });
  };

  const openActivateConfirm = (user) => {
    setConfirmState({
      isOpen: true,
      type: "activate",
      user,
      reason: "",
      newRole: "",
      loading: false,
    });
  };

  const openRoleConfirm = (user, newRole) => {
    setConfirmState({
      isOpen: true,
      type: "role",
      user,
      reason: "",
      newRole,
      loading: false,
    });
  };

  const handleConfirmAction = async () => {
    const { type, user, reason, newRole } = confirmState;
    if (!user) return;

    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      if (type === "suspend") {
        await adminApi.suspendUser(user._id, reason);
        onShowToast(`User @${user.username} suspended.`);
      } else if (type === "activate") {
        await adminApi.activateUser(user._id);
        onShowToast(`User @${user.username} reactivated.`);
      } else if (type === "role") {
        await adminApi.changeRole(user._id, newRole);
        onShowToast(`User @${user.username} promoted to ${newRole}.`);
      }
      setConfirmState({ isOpen: false, type: "", user: null, reason: "", newRole: "", loading: false });
      fetchUsers();
    } catch (err) {
      alert(err.message || "Action failed");
      setConfirmState((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="admin-users-view">
      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="admin-select-filters">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="">All Roles</option>
            <option value="USER">Users</option>
            <option value="MODERATOR">Moderators</option>
            <option value="ADMIN">Admins</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={fetchUsers} />}

      {loading ? (
        <div className="admin-loading-box">
          <div className="spinner"></div>
          <span>Loading user directory...</span>
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users match search criteria"
          description="Try broadening your filter criteria."
        />
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSuspended = !!u.isSuspended;
                  const role = (u.role || "USER").toUpperCase();
                  const isMe = u._id === authUser._id;

                  return (
                    <tr key={u._id} className={isSuspended ? "row-suspended" : ""}>
                      <td>
                        <div className="table-user-cell">
                          <UserAvatar user={u} size="sm" />
                          <div>
                            <Link to={`/profile/${u.username}`} className="table-fullname">
                              {u.fullname}
                            </Link>
                            <span className="table-username">@{u.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="table-email">{u.email}</td>
                      <td>
                        {isAdmin && !isMe ? (
                          <select
                            value={role}
                            onChange={(e) => openRoleConfirm(u, e.target.value)}
                            className="role-selector-dropdown"
                          >
                            <option value="USER">USER</option>
                            <option value="MODERATOR">MODERATOR</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          <span className={`badge-role badge-role-${role.toLowerCase()}`}>{role}</span>
                        )}
                      </td>
                      <td>
                        {isSuspended ? (
                          <span className="badge-status suspended" title={u.suspensionReason}>
                            <AlertTriangle size={12} /> Suspended
                          </span>
                        ) : (
                          <span className="badge-status active">
                            <CheckCircle size={12} /> Active
                          </span>
                        )}
                      </td>
                      <td className="table-date">
                        {new Date(u.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      {isAdmin && (
                        <td>
                          {!isMe && role !== "ADMIN" && (
                            <div className="table-actions">
                              {isSuspended ? (
                                <button
                                  type="button"
                                  onClick={() => openActivateConfirm(u)}
                                  className="btn-admin-action activate"
                                  title="Reactivate account"
                                >
                                  <UserCheck size={14} /> Reactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openSuspendConfirm(u)}
                                  className="btn-admin-action suspend"
                                  title="Suspend account"
                                >
                                  <UserX size={14} /> Suspend
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="admin-pagination-bar">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="pagination-nav-btn"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="pagination-label">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="pagination-nav-btn"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        loading={confirmState.loading}
        title={
          confirmState.type === "suspend"
            ? `Suspend User @${confirmState.user?.username}`
            : confirmState.type === "activate"
            ? `Reactivate User @${confirmState.user?.username}`
            : `Change Role for @${confirmState.user?.username}`
        }
        message={
          confirmState.type === "suspend"
            ? `Are you sure you want to suspend @${confirmState.user?.username}? Reason: "${confirmState.reason}"`
            : confirmState.type === "activate"
            ? `Are you sure you want to reactivate @${confirmState.user?.username}?`
            : `Are you sure you want to change @${confirmState.user?.username}'s role to ${confirmState.newRole}?`
        }
        confirmLabel={
          confirmState.type === "suspend"
            ? "Suspend User"
            : confirmState.type === "activate"
            ? "Reactivate User"
            : "Update Role"
        }
        isDanger={confirmState.type === "suspend"}
      />
    </div>
  );
};
