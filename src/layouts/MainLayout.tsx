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
          title: 'Executive Dashboard',
          description: 'Automotive ECU High-Level Design Intelligence & Operational Telemetry'
        };
      case '/documents':
        return {
          title: 'Document Repository',
          description: 'Manage AUTOSAR HLD specifications, PDF parsing & ChromaDB vector chunks'
        };
      case '/assistant':
        return {
          title: 'HLD RAG Assistant',
          description: 'Interactive architectural RAG workspace with verifiable page citations'
        };
      case '/analysis':
        return {
          title: 'Architecture Analysis',
          description: 'Candidate software components, interfaces, ports, and signal flows'
        };
      case '/history':
        return {
          title: 'Query History & Audit',
          description: 'Comprehensive query audit trail with page-level citation verification'
        };
      case '/status':
        return {
          title: 'System Diagnostics',
          description: 'Operational health of REST API, PyMuPDF engine, ChromaDB, and SQLite'
        };
      case '/settings':
        return {
          title: 'Configuration',
          description: 'Model configurations, embedding hyperparameters, and retrieval depth'
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
    <div className="flex h-screen w-screen bg-[#F8FAFC] text-slate-900 overflow-hidden antialiased select-auto">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F8FAFC]">
        {/* Top Header */}
        <TopHeader
          title={meta.title}
          description={meta.description}
        />

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
