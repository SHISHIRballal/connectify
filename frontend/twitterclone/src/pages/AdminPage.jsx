import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AppLayout } from "../components/layout/AppLayout";
import { OverviewSection } from "../components/admin/OverviewSection";
import { UsersSection } from "../components/admin/UsersSection";
import { PostsSection } from "../components/admin/PostsSection";
import { ReportsSection } from "../components/admin/ReportsSection";
import { ModerationSection } from "../components/admin/ModerationSection";
import { AnalyticsSection } from "../components/admin/AnalyticsSection";
import {
  Shield,
  LayoutDashboard,
  Users,
  MessageSquare,
  Flag,
  FileText,
  BarChart3,
  CheckCircle,
} from "lucide-react";

export const AdminPage = () => {
  const { authUser } = useAuth();
  const myRole = (authUser.role || "USER").toUpperCase();
  const isAdmin = myRole === "ADMIN";

  // Tab State: "overview" | "users" | "posts" | "reports" | "moderation" | "analytics"
  const [activeTab, setActiveTab] = useState("overview");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  return (
    <AppLayout>
      <div className="admin-page-container">
        {/* Top Header Bar */}
        <header className="admin-header">
          <div className="admin-header-left">
            <div className="admin-icon-box">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="admin-title">
                {isAdmin ? "Connectify Admin Dashboard" : "Connectify Moderation Center"}
              </h1>
              <p className="admin-subtitle">
                Logged in as <strong className="user-role-highlight">{myRole}</strong> ({authUser.fullname} - @{authUser.username})
              </p>
            </div>
          </div>

          {toastMessage && (
            <div className="admin-toast-message">
              <CheckCircle size={16} />
              <span>{toastMessage}</span>
            </div>
          )}
        </header>

        {/* 6-Section Tabs Navigation Bar */}
        <div className="admin-tabs-bar">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <LayoutDashboard size={15} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <Users size={15} />
            <span>Users</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "posts" ? "active" : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            <MessageSquare size={15} />
            <span>Posts</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            <Flag size={15} />
            <span>Reports</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "moderation" ? "active" : ""}`}
            onClick={() => setActiveTab("moderation")}
          >
            <FileText size={15} />
            <span>Moderation</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <BarChart3 size={15} />
            <span>Analytics</span>
          </button>
        </div>

        {/* Dynamic Section View */}
        <div className="admin-content-view">
          {activeTab === "overview" && (
            <OverviewSection onNavigateTab={(tab) => setActiveTab(tab)} />
          )}

          {activeTab === "users" && (
            <UsersSection authUser={authUser} onShowToast={showToast} />
          )}

          {activeTab === "posts" && (
            <PostsSection authUser={authUser} onShowToast={showToast} />
          )}

          {activeTab === "reports" && (
            <ReportsSection authUser={authUser} onShowToast={showToast} />
          )}

          {activeTab === "moderation" && (
            <ModerationSection />
          )}

          {activeTab === "analytics" && (
            <AnalyticsSection />
          )}
        </div>
      </div>
    </AppLayout>
  );
};
