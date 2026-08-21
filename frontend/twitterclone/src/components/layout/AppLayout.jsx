import React from "react";
import { SidebarNav } from "./SidebarNav";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";

export const AppLayout = ({ children }) => {
  return (
    <div className="main-app-layout">
      {/* Mobile Top Header */}
      <MobileHeader />

      {/* Desktop/Tablet Left Sidebar */}
      <SidebarNav />

      {/* Main Content Area */}
      <div className="app-main-content">{children}</div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};
