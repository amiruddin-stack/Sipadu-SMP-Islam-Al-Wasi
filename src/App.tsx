import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Header } from './components/layout/Header';
import { PageBanner } from './components/layout/PageBanner';
import { NavTab, DesktopSidebar } from './components/layout/Sidebar';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { DashboardPage } from './pages/DashboardPage';
import { AttendancePage } from './pages/AttendancePage';
import { JournalPage } from './pages/JournalPage';
import { BehaviorPage } from './pages/BehaviorPage';
import { CounselingPage } from './pages/CounselingPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { GradeSummaryPage } from './pages/GradeSummaryPage';
import { MasterDataPage, RegistrationPage } from './pages/MasterDataPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ExamPage } from './pages/ExamPage';
import { LoginPage } from './pages/LoginPage';

function ComingSoonPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#E3F7EC] text-3xl font-black text-[#0B8F4D]">ILS</div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#0B8F4D]">SIMPATIK AL-WASI’</p>
      <h1 className="text-3xl font-bold text-slate-800">ILS</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Fitur ini sedang dalam tahap persiapan dan akan segera tersedia.</p>
      <span className="mt-6 rounded-full bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700">Coming Soon</span>
    </section>
  );
}

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTabState] = useState<NavTab>(() => (new URLSearchParams(window.location.search).get('page') as NavTab) || 'dashboard');
  const setActiveTab = (tab: NavTab) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', tab);
    window.history.pushState({ simpatikTab: tab }, '', url);
    setActiveTabState(tab);
  };
  React.useEffect(() => {
    const restore = () => {
      const tab = (window.history.state?.simpatikTab || new URLSearchParams(window.location.search).get('page') || 'dashboard') as NavTab;
      setActiveTabState(tab);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fbf9]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="text-sm font-medium text-slate-500">Memeriksa sesi SIMPATIK…</p>
        </div>
      </main>
    );
  }

  const sharedExamLink = new URLSearchParams(window.location.search).has('ujian');
  if (sharedExamLink) return <ExamPage />;

  if (!currentUser) return <LoginPage />;

  const registrationType = new URLSearchParams(window.location.search).get('daftar');
  if (registrationType === 'guru' || registrationType === 'siswa') return <RegistrationPage type={registrationType} />;

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
      case 'classes': return <MasterDataPage initialSubTab="kelas" />;
      case 'subjects': return <MasterDataPage initialSubTab="mapel" />;
      case 'reports': return <ReportsPage />;
      case 'settings': return <SettingsPage />;
      case 'exams': return <ExamPage onBack={() => setActiveTab('dashboard')} />;
      case 'ils': return <ComingSoonPage />;
      default: return <DashboardPage activeTab={activeTab} onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen w-full font-sans text-slate-800" style={{ backgroundColor: '#FFFFFF', backgroundImage: 'radial-gradient(circle at 82% 16%, rgba(160, 226, 206, 0.30) 0%, rgba(198, 240, 226, 0.16) 30%, transparent 60%), radial-gradient(circle at 12% 26%, rgba(192, 238, 222, 0.24) 0%, transparent 45%), radial-gradient(circle at 50% 12%, rgba(215, 246, 238, 0.28) 0%, transparent 55%), linear-gradient(180deg, #F5FAF8 0%, #FFFFFF 100%)' }}>
      <div className="flex min-h-screen w-full">
        <DesktopSidebar activeTab={activeTab} onNavigate={setActiveTab} />
        <div className="min-w-0 flex-1">
          {activeTab !== 'dashboard' && <div className="lg:hidden"><Header activeTab={activeTab} onNavigate={setActiveTab} /></div>}
          <main className="min-h-screen w-full p-0">
            <div className={activeTab === 'dashboard' ? 'w-full' : 'mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-6'}>
              {activeTab !== 'dashboard' && activeTab !== 'subjects' && <PageBanner activeTab={activeTab} onBack={() => { if (window.history.length > 1) window.history.back(); else setActiveTab('dashboard'); }} />}
              {renderCurrentPage()}
            </div>
          </main>
        </div>
      </div>
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
