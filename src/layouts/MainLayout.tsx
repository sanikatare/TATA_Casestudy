import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen bg-[#F8FAFC] text-slate-900 overflow-hidden antialiased select-auto">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F8FAFC]">
        {/* Scrollable Page Body with Generous Padding */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-10 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
