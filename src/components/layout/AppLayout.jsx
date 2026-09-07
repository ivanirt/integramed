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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Left Menu Sidebar */}
      <Sidebar onOpenSettings={onOpenSettings} />

      {/* Main App Right Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <TopHeader
          serverInfo={serverInfo}
          onScheduleEncounter={onScheduleEncounter}
          onOpenSettings={onOpenSettings}
        />

        {/* Dynamic Page Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
