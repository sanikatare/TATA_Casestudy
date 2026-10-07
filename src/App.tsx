import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DomainProvider } from './context/DomainContext';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { DocumentsPage } from './pages/Documents';
import { HLDAssistantPage } from './pages/HLDAssistant';
import { AnalysisPage } from './pages/Analysis';
import { HistoryPage } from './pages/History';
import { SystemStatusPage } from './pages/SystemStatus';
import { SettingsPage } from './pages/Settings';

export default function App() {
  return (
    <DomainProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="assistant" element={<HLDAssistantPage />} />
            <Route path="analysis" element={<AnalysisPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="status" element={<SystemStatusPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DomainProvider>
  );
}
