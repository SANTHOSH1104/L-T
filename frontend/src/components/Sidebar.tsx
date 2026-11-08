import React from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  ClipboardList, 
  Users, 
  ClockAlert, 
  Settings, 
  CheckCircle2,
  Building2,
  CalendarDays,
  X,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { ShiftConfig } from '../types/attendance';

export type TabType = 'overview' | 'upload' | 'logs' | 'payroll' | 'overtime' | 'holidays' | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  config: ShiftConfig;
  totalRecordsCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  config,
  totalRecordsCount,
  isOpenMobile = false,
  onCloseMobile = () => {},
}) => {
  const menuItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'upload', label: 'Upload & Process', icon: <UploadCloud className="w-4 h-4" /> },
    { 
      id: 'logs', 
      label: 'Daily Logs', 
      icon: <ClipboardList className="w-4 h-4" />, 
      badge: totalRecordsCount > 0 ? String(totalRecordsCount) : undefined 
    },
    { id: 'payroll', label: 'Payroll Timesheet', icon: <Users className="w-4 h-4" /> },
    { id: 'overtime', label: 'OT Analytics', icon: <ClockAlert className="w-4 h-4" /> },
    { id: 'holidays', label: 'Company Leave', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'settings', label: 'Shift & Rules', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleItemClick = (id: TabType) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 border-r border-slate-800/80 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <span className="font-extrabold text-lg tracking-wider">M</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse"></span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-bold text-white text-base leading-tight tracking-tight">PunchPulse HR</h1>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">PRO</span>
            </div>
            <p className="text-[11px] text-amber-400 font-medium">Biometric & OT SaaS</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Company / Shift Quick Card */}
      <div className="mx-4 my-3 p-3 bg-gradient-to-br from-slate-800/90 to-slate-800/40 rounded-xl border border-slate-700/50 shadow-inner text-xs space-y-1.5">
        <div className="flex items-center justify-between text-slate-400">
          <div className="flex items-center min-w-0 mr-2">
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-indigo-400 shrink-0" />
            <span className="truncate font-semibold text-slate-200">{config.companyName || 'PunchPulse HR'}</span>
          </div>
          <span className="shrink-0 inline-flex items-center px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
            Active
          </span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1.5 border-t border-slate-700/50">
          <span className="font-mono text-slate-300">{config.shiftStart} – {config.shiftEnd}</span>
          <span className="text-amber-400 font-mono font-semibold">{config.fullDayHours}h Full</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Main Navigation
        </div>
        {menuItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`p-1 rounded-lg transition-colors ${
                  isActive 
                    ? 'text-white bg-indigo-500/40' 
                    : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'
                }`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700/80 group-hover:border-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info & Engine Status */}
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-500 bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[11px] text-slate-300">Biometric Engine 2.0</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">v2.4</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
          Automatic Sunday WW, Overtime ht, and Company Holidays sync.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 min-h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Modal Sidebar */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Dark Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
