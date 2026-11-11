import React from 'react';

export type NavTab =
  | 'dashboard'
  | 'attendance'
  | 'journal'
  | 'behavior'
  | 'counseling'
  | 'assessment'
  | 'exams'
  | 'grades'
  | 'master'
  | 'reports'
  | 'settings'
  | 'ils';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = () => null;
