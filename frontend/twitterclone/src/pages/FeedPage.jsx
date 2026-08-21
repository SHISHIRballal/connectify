import React from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { RightSidebar } from "../components/layout/RightSidebar";
import { Feed } from "../components/feed/Feed";
import { Sparkles } from "lucide-react";

export const FeedPage = () => {
  return (
    <AppLayout>
      <div className="feed-page-layout">
        {/* Center Feed Column */}
        <main className="feed-center-column">
          <header className="feed-header">
            <h1 className="feed-title">Home</h1>
            <Sparkles size={20} className="header-sparkle-icon" />
          </header>

          <Feed />
        </main>

        {/* Right Suggestions Sidebar */}
        <RightSidebar />
      </div>
    </AppLayout>
  );
};
