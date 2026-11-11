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

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  const renderCurrentPage = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPage onNavigate={setActiveTab} />;
      case 'attendance': return <AttendancePage />;
      case 'journal': return <JournalPage />;
      case 'behavior': return <BehaviorPage />;
      case 'counseling': return <CounselingPage />;
      case 'assessment': return <AssessmentPage />;
      case 'grades': return <GradeSummaryPage />;
      case 'master': return <MasterDataPage />;
      case 'reports': return <ReportsPage />;
      case 'settings': return <SettingsPage />;
      case 'exams': return <ExamPage />;
      default: return <DashboardPage onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#F3F8F7] font-sans text-[#0F2A25]">
      <Header activeTab={activeTab} onNavigate={setActiveTab} />
      <main className="min-h-0 flex-1 overflow-y-auto pb-20 md:pb-8">
        <div className={activeTab === 'dashboard' ? 'w-full' : 'mx-auto w-full max-w-7xl px-4 py-5 md:px-6'}>{renderCurrentPage()}</div>
      </main>
      {activeTab !== 'dashboard' && <nav aria-label="Navigasi bawah" className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[#DCE8E5] bg-white px-2 py-1.5 shadow-lg lg:hidden">
        {([
          ['dashboard', 'Beranda'],
          ['attendance', 'Presensi'],
          ['journal', 'Jurnal'],
          ['assessment', 'Nilai'],
          ['master', 'Menu'],
        ] as [NavTab, string][]).map(([tab, label]) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex min-h-11 items-center justify-center rounded-lg px-3 text-xs font-semibold ${activeTab === tab ? 'text-[#018470]' : 'text-[#4A5F5A]'}`}>{label}</button>)}
      </nav>}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return <AuthProvider><DataProvider><AppContent /></DataProvider></AuthProvider>;
}
