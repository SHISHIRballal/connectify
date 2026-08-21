import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ForbiddenState } from "./ForbiddenState";

export const RequireRole = ({ allowedRoles = ["ADMIN", "MODERATOR"], children }) => {
  const { authUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="spinner large"></div>
      </div>
    );
  }

  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (authUser.role || "USER").toUpperCase();
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

  if (!normalizedAllowed.includes(userRole)) {
    return <ForbiddenState />;
  }

  return children;
};
