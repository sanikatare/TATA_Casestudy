import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopHeader } from '../components/TopHeader';

export const MainLayout: React.FC = () => {
  const location = useLocation();

  const getPageMeta = (pathname: string) => {
    switch (pathname) {
      case '/':
        return {
          title: 'Dashboard',
          description: 'Automotive ECU High-Level Design Intelligence & Monitoring'
        };
      case '/documents':
        return {
          title: 'Documents',
          description: 'Manage AUTOSAR HLD specifications, PDF parsing & vector chunks'
        };
      case '/assistant':
        return {
          title: 'HLD Assistant',
          description: 'Interactive architectural RAG workspace with verifiable citations'
        };
      case '/analysis':
        return {
          title: 'Analysis',
          description: 'Candidate software components, interfaces, ports, and signal flows'
        };
      case '/history':
        return {
          title: 'Query History',
          description: 'Comprehensive query audit trail with page-level citations'
        };
      case '/status':
        return {
          title: 'System Status',
          description: 'Operational health of FastAPI, PyMuPDF, ChromaDB, and SQLite'
        };
      case '/settings':
        return {
          title: 'Settings',
          description: 'Model configurations, embedding hyperparameters, and API paths'
        };
      default:
        return {
          title: 'AUTOSAR Assistant',
          description: 'Automotive High-Level Design Analysis Platform'
        };
    }
  };

  const meta = getPageMeta(location.pathname);

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden antialiased">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        {/* Top Header */}
        <TopHeader
          title={meta.title}
          description={meta.description}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/80">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
