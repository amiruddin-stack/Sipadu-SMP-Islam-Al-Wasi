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
import { ExamPage } from './pages/ExamPage';

function ComingSoonPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-3xl font-black text-emerald-700">ILS</div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">SIMPATIK AL-WASI’</p>
      <h1 className="text-3xl font-bold text-slate-800">ILS</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Fitur ini sedang dalam tahap persiapan dan akan segera tersedia.</p>
      <span className="mt-6 rounded-full bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700">Coming Soon</span>
    </section>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  const renderCurrentPage = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPage activeTab={activeTab} onNavigate={(tab) => setActiveTab(tab)} />;
      case 'attendance': return <AttendancePage />;
      case 'journal': return <JournalPage />;
      case 'behavior': return <BehaviorPage />;
      case 'counseling': return <CounselingPage />;
      case 'assessment': return <AssessmentPage />;
      case 'grades': return <GradeSummaryPage />;
      case 'master': return <MasterDataPage />;
      case 'classes': return <MasterDataPage initialSubTab="akademik" />;
      case 'subjects': return <MasterDataPage initialSubTab="akademik" />;
      case 'reports': return <ReportsPage />;
      case 'settings': return <SettingsPage />;
      case 'exams': return <ExamPage />;
      case 'ils': return <ComingSoonPage />;
      default: return <DashboardPage activeTab={activeTab} onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#F4F9F7] font-sans text-slate-800">
      {activeTab !== 'dashboard' && <Header activeTab={activeTab} onNavigate={setActiveTab} />}
      <main className="min-h-0 flex-1 overflow-y-auto p-0">
        <div className={activeTab === 'dashboard' ? 'w-full' : 'mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-6'}>
          {renderCurrentPage()}
        </div>
      </main>
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
