import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavbar } from '../components/TopNavbar';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar with Domains */}
      <TopNavbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
};
