import React from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function AppLayout({
  children,
  serverInfo,
  onScheduleEncounter,
  onOpenSettings
}) {
  return (
    <div style={{ display: 'flex', height: '100vh', maxHeight: '100vh', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
      {/* Left Menu Sidebar */}
      <Sidebar onOpenSettings={onOpenSettings} />

      {/* Main App Right Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        {/* Top Header Bar */}
        <TopHeader
          serverInfo={serverInfo}
          onScheduleEncounter={onScheduleEncounter}
          onOpenSettings={onOpenSettings}
        />

        {/* Dynamic Page Body with visible vertical scrollbar */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
