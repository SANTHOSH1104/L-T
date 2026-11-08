import React from 'react';
import { 
  Building2, 
  Clock, 
  Download, 
  FileSpreadsheet,
  LogOut,
  UserCheck
} from 'lucide-react';
import { ShiftConfig } from '../types/attendance';
import { AdminUser } from '../types/auth';
import { downloadSampleExcelTemplate } from '../utils/excelParser';

interface NavbarProps {
  config: ShiftConfig;
  admin: AdminUser | null;
  onLogout: () => void;
  onOpenUpload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  admin,
  onLogout,
  onOpenUpload,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      {/* Left: Active Company & Rules indicator */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-slate-700 font-semibold text-sm">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>{config.companyName}</span>
        </div>
        <span className="text-slate-300">|</span>
        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Shift: {config.shiftStart} – {config.shiftEnd}</span>
          <span className="text-slate-400">({config.fullDayHours}h Full / {config.halfDayHours}h Half)</span>
        </div>
      </div>

      {/* Right: Quick Actions & Admin Profile */}
      <div className="flex items-center space-x-3">
        <button
          onClick={downloadSampleExcelTemplate}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="Download sample Excel sheet to test upload"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Sample Template</span>
        </button>

        <button
          onClick={onOpenUpload}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Upload Excel Sheet</span>
        </button>

        {/* Admin Profile & Logout */}
        {admin && (
          <div className="flex items-center pl-3 border-l border-slate-200 space-x-3">
            <div className="flex items-center space-x-2 text-left">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">{admin.name}</div>
                <div className="text-[10px] text-amber-600 font-semibold uppercase">{admin.role}</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Logout from Admin Console"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
