import React from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  ClipboardList, 
  Users, 
  ClockAlert, 
  Settings, 
  CheckCircle2,
  Building2
} from 'lucide-react';
import { ShiftConfig } from '../types/attendance';

export type TabType = 'overview' | 'upload' | 'logs' | 'payroll' | 'overtime' | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  config: ShiftConfig;
  totalRecordsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  config,
  totalRecordsCount,
}) => {
  const menuItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'upload', label: 'Upload & Process', icon: <UploadCloud className="w-5 h-5" /> },
    { 
      id: 'logs', 
      label: 'Daily Logs', 
      icon: <ClipboardList className="w-5 h-5" />, 
      badge: totalRecordsCount > 0 ? String(totalRecordsCount) : undefined 
    },
    { id: 'payroll', label: 'Payroll Timesheet', icon: <Users className="w-5 h-5" /> },
    { id: 'overtime', label: 'OT Analytics', icon: <ClockAlert className="w-5 h-5" /> },
    { id: 'settings', label: 'Shift & Rules', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <span className="font-extrabold text-xl">M</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight tracking-tight">PunchPulse HR</h1>
            <p className="text-xs text-amber-400 font-medium">Attendance & OT SaaS</p>
          </div>
        </div>
      </div>

      {/* Company / Shift Quick Info */}
      <div className="mx-4 my-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs space-y-1">
        <div className="flex items-center text-slate-400">
          <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
          <span className="truncate font-semibold text-slate-200">{config.companyName}</span>
        </div>
        <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-700/40">
          <span>Shift: {config.shiftStart} - {config.shiftEnd}</span>
          <span className="text-emerald-400 font-mono">Min {config.fullDayHours}h</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {menuItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        <div className="flex items-center space-x-1.5 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="font-medium text-slate-300">Biometric Excel Ready</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Calculates Present, Half-Day & Overtime instantly.</p>
      </div>
    </aside>
  );
};

