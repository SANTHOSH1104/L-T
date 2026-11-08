import React from 'react';
import { 
  Building2, 
  Clock, 
  Download, 
  FileSpreadsheet,
  LogOut,
  UserCheck,
  Menu,
  Sparkles,
  CalendarDays
} from 'lucide-react';
import { ShiftConfig } from '../types/attendance';
import { AdminUser } from '../types/auth';
import { downloadSampleExcelTemplate } from '../utils/excelParser';

interface NavbarProps {
  config: ShiftConfig;
  admin: AdminUser | null;
  onLogout: () => void;
  onOpenUpload: () => void;
  onOpenExportReports?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  admin,
  onLogout,
  onOpenUpload,
  onOpenExportReports,
  onToggleMobileMenu,
}) => {
  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile Hamburger & Company / Shift Info */}
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Open mobile navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Company Title */}
        <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs sm:text-sm">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="truncate max-w-[130px] sm:max-w-[200px] md:max-w-none">
            {config.companyName || 'Enterprise HR'}
          </span>
        </div>

        <span className="hidden sm:inline text-slate-300">|</span>

        {/* Shift Details Badge (Desktop & Tablet) */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/60 rounded-lg text-xs font-medium text-slate-600">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Shift: <strong className="font-mono text-slate-800">{config.shiftStart} – {config.shiftEnd}</strong></span>
          <span className="text-slate-400 font-mono">({config.fullDayHours}h Full / {config.halfDayHours}h Half)</span>
        </div>
      </div>

      {/* Right: Quick Actions & Admin Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Sample Template Download */}
        <button
          onClick={downloadSampleExcelTemplate}
          className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
          title="Download sample Excel biometric sheet template"
        >
          <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="hidden sm:inline">Template</span>
        </button>

        {/* Export Reports Hub Button */}
        {onOpenExportReports && (
          <button
            onClick={onOpenExportReports}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-98"
            title="Open Enterprise Export & Reports Hub"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="hidden sm:inline">Export Reports</span>
          </button>
        )}

        {/* Upload Excel Button */}
        <button
          onClick={onOpenUpload}
          className="inline-flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all cursor-pointer active:scale-98"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="hidden xs:inline">Upload Excel</span>
        </button>

        {/* Admin Profile & Logout */}
        {admin && (
          <div className="flex items-center pl-2 sm:pl-3 border-l border-slate-200 space-x-2 sm:space-x-3">
            <div className="flex items-center space-x-2 text-left">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-indigo-100">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">{admin.name}</div>
                <div className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider">{admin.role}</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Logout from Admin Console"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
