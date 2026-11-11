import React from 'react';
import { useAuth } from '../../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'attendance'
  | 'journal'
  | 'behavior'
  | 'counseling'
  | 'assessment'
  | 'exams'
  | 'exams'
  | 'grades'
  | 'master'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

interface MenuItem {
  id: NavTab;
  label: string;
  badge?: string;
  restricted?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { canAccessBK } = useAuth();

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Utama',
      items: [
        { id: 'dashboard', label: 'Dashboard' },
      ],
    },
    {
      title: 'KBM & Akademik',
      items: [
        { id: 'attendance', label: 'Absensi Digital' },
        { id: 'journal', label: 'Jurnal Guru' },
        { id: 'assessment', label: 'Penilaian' },
        { id: 'exams', label: 'Ujian' }
        { id: 'exams', label: 'Ujian' }
        { id: 'grades', label: 'Rekap Nilai' },
      ],
    },
    {
      title: 'Kesiswaan & Karakter',
      items: [
        { id: 'behavior', label: 'Perilaku Siswa' },
        {
          id: 'counseling',
          label: 'Bimbingan Konseling (BK)',
          badge: canAccessBK ? undefined : 'Terbatas',
          restricted: !canAccessBK,
        },
      ],
    },
    {
      title: 'Data & Informasi',
      items: [
        { id: 'master', label: 'Data Master' },
        { id: 'reports', label: 'Laporan' },
        { id: 'settings', label: 'Pengaturan' },
      ],
    },
  ];

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-200 md:static ${
          'w-[280px] shrink-0'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            {true && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-slate-900 truncate">
                  SIMPATIK AL-WASI’
                </span>
                <span className="text-[11px] font-medium text-slate-500 truncate">
                  SMP Islam Al-Wasi’
                </span>
              </div>
            )}
          </div>
          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden flex items-center justify-center w-8 h-8 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {true && (
                <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                        collapsed ? 'justify-center' : 'justify-start'
                      } ${
                        isActive
                          ? 'bg-[#e7f6f2] text-[#087d70] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between text-left truncate">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-slate-200 text-slate-700">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Quick Info Footer */}
        <div className="p-3 border-t border-slate-100 bg-[#F8FAF9]">
          <div
            className={`flex items-center gap-2.5 ${
              collapsed ? 'justify-center' : 'justify-start'
            }`}
          >
            
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-800 truncate">
                  SMP Islam Al-Wasi’
                </span>
                <span className="text-[11px] text-emerald-800 font-medium">
                  Maros, Sulawesi Selatan
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
