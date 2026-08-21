import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { analyticsApi } from "../../api/analyticsApi";
import { UserAvatar } from "../common/UserAvatar";
import { ErrorState } from "../common/ErrorState";
import {
  Users,
  UserPlus,
  Activity,
  MessageSquare,
  Heart,
  MessageCircle,
  UserCheck,
  Flag,
  Shield,
  Hash,
  Award,
  Calendar,
  Sparkles,
} from "lucide-react";

export const AnalyticsSection = () => {
  const [timeframe, setTimeframe] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await analyticsApi.getSummary({ timeframe });
      if (res && res.success) {
        setData(res.data);
      } else {
        throw new Error(res?.message || "Failed to load analytics data");
      }
    } catch (err) {
      setError(err.message || "Failed to load platform analytics");
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="admin-loading-box">
        <div className="spinner"></div>
        <span>Calculating real-time platform metrics...</span>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchAnalytics} />;
  }

  const users = data?.users || {};
  const posts = data?.posts || {};
  const engagement = data?.engagement || {};
  const moderation = data?.moderation || {};

  const postsPerDay = posts.postsPerDay || [];
  const signupsPerDay = users.signupsPerDay || [];
  const trendingHashtags = engagement.trendingHashtags || [];
  const mostActiveUsers = engagement.mostActiveUsers || [];
  const reportsByReason = moderation.reportsByReason || [];
  const actionsByType = moderation.actionsByType || [];
  const moderatorLeaderboard = moderation.moderatorLeaderboard || [];

  // Calculate maximum for chart normalization
  const maxPostsInDay = Math.max(...postsPerDay.map((p) => p.count), 1);
  const maxSignupsInDay = Math.max(...signupsPerDay.map((s) => s.count), 1);
  const chartMax = Math.max(maxPostsInDay, maxSignupsInDay, 5);

  const totalReports = reportsByReason.reduce((sum, r) => sum + r.count, 0) || 1;
  const totalActions = actionsByType.reduce((sum, a) => sum + a.count, 0) || 1;
  const maxHashtagCount = trendingHashtags[0]?.count || 1;

  return (
    <div className="analytics-dashboard-view">
      {/* Timeframe Filter Header */}
      <div className="analytics-header-bar">
        <div className="analytics-header-left">
          <div className="analytics-title-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="analytics-main-title">Platform Intelligence & Analytics</h2>
            <p className="analytics-main-subtitle">
              Real-time aggregation of activity, engagement, and safety trends
            </p>
          </div>
        </div>

        <div className="timeframe-toggle-group">
          <Calendar size={14} className="calendar-icon" />
          {[
            { key: "7d", label: "7 Days" },
            { key: "30d", label: "30 Days" },
            { key: "90d", label: "90 Days" },
            { key: "all", label: "All Time" },
          ].map((tf) => (
            <button
              key={tf.key}
              type="button"
              className={`timeframe-pill-btn ${timeframe === tf.key ? "active" : ""}`}
              onClick={() => setTimeframe(tf.key)}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* 8 Core Metrics Grid */}
      <div className="analytics-metrics-grid">
        {/* Metric 1: Total Users */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-name">Total Users</span>
            <div className="metric-icon blue"><Users size={16} /></div>
          </div>
          <div className="metric-number">{users.totalUsers || 0}</div>
          <span className="metric-subtext">Registered accounts</span>
        </div>

        {/* Metric 2: New Users */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-name">New Users</span>
            <div className="metric-icon green"><UserPlus size={16} /></div>
          </div>
          <div className="metric-number">+{users.newUsers || 0}</div>
          <span className="metric-subtext">In selected timeframe</span>
        </div>

        {/* Metric 3: Active Users */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-name">Active Users</span>
            <div className="metric-icon purple"><Activity size={16} /></div>
          </div>
          <div className="metric-number">{users.activeUsersCount || 0}</div>
          <span className="metric-subtext">Post / comment creators</span>
        </div>

        {/* Metric 4: Total Posts */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-name">Total Posts</span>
            <div className="metric-icon indigo"><MessageSquare size={16} /></div>
          </div>
          <div className="metric-number">{posts.totalPosts || 0}</div>
          <span className="metric-subtext">+{posts.newPosts || 0} in timeframe</span>
        </div>

        {/* Metric 5: Total Likes */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-name">Total Likes</span>
            <div className="metric-icon red"><Heart size={16} /></div>
          </div>
          <div className="metric-number">{posts.totalLikes || 0}</div>
          <span className="metric-subtext">~{posts.averageLikesPerPost || 0} avg / post</span>
        </div>

        {/* Metric 6: Total Comments */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-name">Total Comments</span>
            <div className="metric-icon amber"><MessageCircle size={16} /></div>
          </div>
          <div className="metric-number">{posts.totalComments || 0}</div>
          <span className="metric-subtext">~{posts.averageCommentsPerPost || 0} avg / post</span>
        </div>

        {/* Metric 7: Follow Connections */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-name">Follow Graph</span>
            <div className="metric-icon teal"><UserCheck size={16} /></div>
          </div>
          <div className="metric-number">{engagement.totalFollows || 0}</div>
          <span className="metric-subtext">Total follow relationships</span>
        </div>

        {/* Metric 8: Total Reports */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-name">Total Reports</span>
            <div className="metric-icon orange"><Flag size={16} /></div>
          </div>
          <div className="metric-number">{moderation.totalReports || 0}</div>
          <span className="metric-subtext">+{moderation.newReports || 0} in timeframe</span>
        </div>
      </div>

      {/* Daily Activity Time Series Chart */}
      <div className="analytics-chart-card">
        <div className="chart-card-header">
          <div>
            <h3>Daily Content & Signup Activity</h3>
            <p className="chart-card-subtitle">Volume of new posts published per day</p>
          </div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-dot dot-posts"></span> Posts</span>
          </div>
        </div>

        <div className="chart-bars-container">
          {postsPerDay.length === 0 ? (
            <div className="chart-empty-state">
              <p>No activity recorded during this period.</p>
            </div>
          ) : (
            <div className="time-series-bar-chart">
              {postsPerDay.map((p) => {
                const heightPercent = Math.max(Math.round((p.count / chartMax) * 100), 8);
                return (
                  <div key={p.date} className="chart-bar-column">
                    <span className="bar-tooltip-val">{p.count}</span>
                    <div className="chart-bar-track">
                      <div
                        className="chart-bar-fill bar-fill-posts"
                        style={{ height: `${heightPercent}%` }}
                        title={`${p.date}: ${p.count} posts`}
                      />
                    </div>
                    <span className="chart-bar-date">{p.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Grid: Trending Hashtags & Most Active Users */}
      <div className="analytics-two-col-grid">
        {/* Left: Trending Hashtags */}
        <div className="analytics-panel-card">
          <div className="panel-card-header">
            <div className="panel-icon-box amber"><Hash size={18} /></div>
            <div>
              <h3>Trending Hashtags</h3>
              <p className="panel-card-sub">Most referenced topics across posts</p>
            </div>
          </div>

          <div className="hashtags-ranking-list">
            {trendingHashtags.length === 0 ? (
              <p className="empty-section-text">No hashtags used in posts yet. Try posting with #hashtags!</p>
            ) : (
              trendingHashtags.map((ht, index) => {
                const percent = Math.round((ht.count / maxHashtagCount) * 100);
                return (
                  <div key={ht.tag} className="hashtag-rank-item">
                    <span className="hashtag-rank-number">#{index + 1}</span>
                    <div className="hashtag-details">
                      <div className="hashtag-name-row">
                        <span className="hashtag-tag-text">{ht.tag}</span>
                        <span className="hashtag-occurrences">{ht.count} posts</span>
                      </div>
                      <div className="hashtag-progress-track">
                        <div className="hashtag-progress-fill" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Most Active Users */}
        <div className="analytics-panel-card">
          <div className="panel-card-header">
            <div className="panel-icon-box purple"><Award size={18} /></div>
            <div>
              <h3>Top Content Creators</h3>
              <p className="panel-card-sub">Users with highest publishing and engagement volume</p>
            </div>
          </div>

          <div className="active-users-list">
            {mostActiveUsers.length === 0 ? (
              <p className="empty-section-text">No active creators found in this timeframe.</p>
            ) : (
              mostActiveUsers.map((creator, index) => (
                <div key={creator._id} className="active-creator-item">
                  <span className="creator-rank-badge">{index + 1}</span>
                  <UserAvatar user={creator} size="sm" />
                  <div className="creator-info">
                    <Link to={`/profile/${creator.username}`} className="creator-name">
                      {creator.fullname}
                    </Link>
                    <span className="creator-username">@{creator.username}</span>
                  </div>
                  <div className="creator-stats-chips">
                    <span className="creator-chip posts-chip" title="Total Posts">
                      {creator.postCount} posts
                    </span>
                    <span className="creator-chip likes-chip" title="Likes Received">
                      <Heart size={10} fill="currentColor" /> {creator.totalLikesReceived}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Moderation Breakdowns */}
      <div className="analytics-two-col-grid">
        {/* Reports by Reason */}
        <div className="analytics-panel-card">
          <div className="panel-card-header">
            <div className="panel-icon-box red"><Flag size={18} /></div>
            <div>
              <h3>Reports Breakdown by Reason</h3>
              <p className="panel-card-sub">Flagged violation categories</p>
            </div>
          </div>

          <div className="distribution-bars-list">
            {reportsByReason.length === 0 ? (
              <p className="empty-section-text">No reports submitted yet.</p>
            ) : (
              reportsByReason.map((r) => {
                const percent = Math.round((r.count / totalReports) * 100);
                return (
                  <div key={r.reason} className="distribution-item">
                    <div className="dist-label-row">
                      <span className="dist-label">{r.reason.toUpperCase()}</span>
                      <span className="dist-count">{r.count} ({percent}%)</span>
                    </div>
                    <div className="dist-track">
                      <div className="dist-fill fill-red" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Moderation Actions by Type */}
        <div className="analytics-panel-card">
          <div className="panel-card-header">
            <div className="panel-icon-box blue"><Shield size={18} /></div>
            <div>
              <h3>Moderation Actions Breakdown</h3>
              <p className="panel-card-sub">Enforcement operations performed</p>
            </div>
          </div>

          <div className="distribution-bars-list">
            {actionsByType.length === 0 ? (
              <p className="empty-section-text">No moderation actions recorded yet.</p>
            ) : (
              actionsByType.map((a) => {
                const percent = Math.round((a.count / totalActions) * 100);
                return (
                  <div key={a.action} className="distribution-item">
                    <div className="dist-label-row">
                      <span className="dist-label">{a.action}</span>
                      <span className="dist-count">{a.count} ({percent}%)</span>
                    </div>
                    <div className="dist-track">
                      <div className="dist-fill fill-blue" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
