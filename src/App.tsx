import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Header } from './components/layout/Header';
import { NavTab } from './components/layout/Sidebar';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { DashboardPage } from './pages/DashboardPage';
import { AttendancePage } from './pages/AttendancePage';
import { JournalPage } from './pages/JournalPage';
import { BehaviorPage } from './pages/BehaviorPage';
import { CounselingPage } from './pages/CounselingPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { GradeSummaryPage } from './pages/GradeSummaryPage';
import { MasterDataPage } from './pages/MasterDataPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  const renderCurrentPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />;
      case 'attendance':
        return <AttendancePage />;
      case 'journal':
        return <JournalPage />;
      case 'behavior':
        return <BehaviorPage />;
      case 'counseling':
        return <CounselingPage />;
      case 'assessment':
        return <AssessmentPage />;
      case 'grades':
        return <GradeSummaryPage />;
      case 'master':
        return <MasterDataPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={(tab) => setActiveTab(tab)} onOpenMenu={() => setMobileOpen(true)} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F4F9F7] text-slate-800 overflow-hidden font-sans">
      {/* Main View Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Sticky Header */}
        {activeTab !== 'dashboard' && (
          <Header activeTab={activeTab} onNavigate={setActiveTab} />
        )}

        {/* Scrollable Content Body */}
        <main className={activeTab === 'dashboard' ? "flex-1 min-w-0 overflow-y-auto p-0 pb-0" : "flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-8"}>
          <div className={activeTab === 'dashboard' ? "w-full" : "max-w-7xl mx-auto"}>{renderCurrentPage()}</div>
        </main>

        {/* Mobile Bottom Navigation Bar (Android Touch Friendly) */}
        {activeTab !== 'dashboard' && <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeTab === 'dashboard' ? 'text-[#168A48] font-bold' : 'text-slate-500'
            }`}
          >
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeTab === 'attendance' ? 'text-[#168A48] font-bold' : 'text-slate-500'
            }`}
          >
            <span>Absensi</span>
          </button>

          <button
            onClick={() => setActiveTab('journal')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeTab === 'journal' ? 'text-[#168A48] font-bold' : 'text-slate-500'
            }`}
          >
            <span>Jurnal</span>
          </button>

          <button
            onClick={() => setActiveTab('assessment')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeTab === 'assessment' ? 'text-[#168A48] font-bold' : 'text-slate-500'
            }`}
          >
            <span>Nilai</span>
          </button>

          <button
            onClick={() => setActiveTab('master')}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold text-slate-500"
          >
            <span>Menu</span>
          </button>
        </nav>}
      </div>

      {/* Floating Offline Notification */}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
