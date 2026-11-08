import React from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  FileSpreadsheet, 
  ArrowUpRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { AttendanceRecord, EmployeeSummary, ShiftConfig } from '../types/attendance';

interface OverviewTabProps {
  records: AttendanceRecord[];
  summaries: EmployeeSummary[];
  config: ShiftConfig;
  onNavigate: (tab: 'upload' | 'logs' | 'payroll' | 'overtime') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  records,
  summaries,
  config,
  onNavigate,
}) => {
  // Calculations for KPI Cards
  const totalLogs = records.length;
  const totalEmployees = summaries.length;
  const presentCount = records.filter(r => r.status === 'PRESENT').length;
  const halfDayCount = records.filter(r => r.status === 'HALF_DAY').length;
  const absentCount = records.filter(r => r.status === 'ABSENT').length;
  const lateCount = records.filter(r => r.isLate).length;
  const totalOtHours = summaries.reduce((acc, s) => acc + s.totalOtHours, 0);
  const totalEstOtPay = summaries.reduce((acc, s) => acc + s.estimatedOtPay, 0);

  const attendanceRate = totalLogs > 0 
    ? Math.round(((presentCount + (halfDayCount * 0.5)) / totalLogs) * 100) 
    : 0;

  // Top 5 OT workers
  const topOtEmployees = [...summaries]
    .sort((a, b) => b.totalOtHours - a.totalOtHours)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Attendance Intelligence Engine Active</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance & Overtime Dashboard</h2>
          <p className="text-indigo-200 text-xs sm:text-sm mt-1">
            Real-time biometric calculation for {totalEmployees} employees across {totalLogs} punch logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('upload')}
            className="px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs sm:text-sm hover:bg-indigo-50 transition-all flex items-center space-x-2 shadow-md shadow-black/20"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>Process New Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Rate</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{attendanceRate}%</span>
            <span className="text-xs font-medium text-emerald-600">Net Payable</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, attendanceRate)}%` }}
            />
          </div>
        </div>

        {/* Total Overtime Hours */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total OT Hours</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{totalOtHours.toFixed(1)} hrs</span>
            <span className="text-xs font-medium text-purple-600">Extra Duty</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-mono">
            Rule: <span className="font-bold text-slate-800">&gt;= {config.minOtQualifyHours ?? 2.0} hrs</span> qualified for OT
          </p>
        </div>

        {/* Total Punches Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Punches Status</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Present
              </span>
              <span className="font-bold text-slate-800">{presentCount}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Half Day
              </span>
              <span className="font-bold text-slate-800">{halfDayCount}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Absent
              </span>
              <span className="font-bold text-slate-800">{absentCount}</span>
            </div>
          </div>
        </div>

        {/* Late In Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Late Arrivals</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-600">{lateCount}</span>
            <span className="text-xs font-medium text-slate-500">After grace period</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Cutoff: {config.shiftStart} (+{config.graceMinutes}m grace)
          </p>
        </div>
      </div>

      {/* Visual Analytics Strip: Attendance Distribution Donut & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Visual Donut Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Mix</span>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 font-medium">Present ({presentCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="text-slate-600 font-medium">Half Day ({halfDayCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="text-slate-600 font-medium">Absent ({absentCount})</span>
              </div>
            </div>
          </div>

          {/* SVG Donut */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="4"></circle>
              {totalLogs > 0 && (
                <>
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeDasharray={`${(presentCount / totalLogs) * 88} 88`}
                    strokeDashoffset="0"
                  ></circle>
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="4"
                    strokeDasharray={`${(halfDayCount / totalLogs) * 88} 88`}
                    strokeDashoffset={`${-((presentCount / totalLogs) * 88)}`}
                  ></circle>
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="4"
                    strokeDasharray={`${(absentCount / totalLogs) * 88} 88`}
                    strokeDashoffset={`${-(((presentCount + halfDayCount) / totalLogs) * 88)}`}
                  ></circle>
                </>
              )}
            </svg>
            <div className="absolute text-center">
              <span className="text-xs font-mono font-bold text-slate-800">{attendanceRate}%</span>
              <span className="block text-[9px] text-slate-400 uppercase">Rate</span>
            </div>
          </div>
        </div>

        {/* Overtime vs Regular Work Hours Comparison */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Hours Breakdown</span>
            <span className="text-xs text-slate-400 font-mono">Total {records.reduce((a, b) => a + b.totalHours, 0).toFixed(1)} hrs logged</span>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-semibold">Standard Shift Duty</span>
                <span className="font-mono font-bold text-slate-800">
                  {(records.reduce((a, b) => a + (b.totalHours - b.otHours), 0)).toFixed(1)} hrs
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-purple-700 font-semibold flex items-center gap-1">
                  <span>Overtime (OT) Duty</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 rounded font-bold">Extra</span>
                </span>
                <span className="font-mono font-bold text-purple-700">
                  +{totalOtHours.toFixed(1)} hrs
                </span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${Math.min(100, (totalOtHours / 30) * 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Top OT Workers & Quick Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top OT Workers */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Top Overtime (OT) Contributors</h3>
              <p className="text-xs text-slate-400">Employees with highest extra hours logged</p>
            </div>
            <button
              onClick={() => onNavigate('overtime')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Employee</th>
                  <th className="py-2.5 px-3">Dept</th>
                  <th className="py-2.5 px-3">Present Days</th>
                  <th className="py-2.5 px-3">OT Hours</th>
                  <th className="py-2.5 px-3 rounded-r-lg">Est. Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topOtEmployees.map((emp) => (
                  <tr key={emp.empId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800">{emp.empName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{emp.empId}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{emp.department}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{emp.presentDays} days</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold font-mono">
                        +{emp.totalOtHours} hrs
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      ₹{emp.estimatedOtPay.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shift Rules Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-800">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm">Active Calculation Policy</h3>
          </div>
          
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Standard Shift</div>
              <div className="font-bold text-slate-800 text-sm">
                {config.shiftStart} AM – {config.shiftEnd} PM
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Day Thresholds</div>
              <div className="flex justify-between text-slate-700">
                <span>Full Day (Present):</span>
                <span className="font-bold text-emerald-600">&gt;= {config.fullDayHours} hours</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Half Day:</span>
                <span className="font-bold text-amber-600">{config.halfDayHours} to {config.fullDayHours} hours</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Absent:</span>
                <span className="font-bold text-rose-600">&lt; {config.halfDayHours} hours</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Overtime (OT) Rules</div>
              <div className="flex justify-between text-slate-700">
                <span>OT Starts after:</span>
                <span className="font-bold text-purple-600">&gt; {config.otThresholdHours} hours</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Min. OT Qualification:</span>
                <span className="font-bold text-purple-700">&gt;= {config.minOtQualifyHours ?? 2.0} hrs</span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-xl space-y-1">
              <div className="text-indigo-600 font-semibold uppercase tracking-wider text-[10px]">Biometric Muster Mapping</div>
              <div className="grid grid-cols-3 gap-1 text-[11px] text-center pt-1 font-mono">
                <span className="bg-emerald-100 text-emerald-800 rounded px-1 py-0.5 font-bold">PP = 1.0d</span>
                <span className="bg-amber-100 text-amber-800 rounded px-1 py-0.5 font-bold">PA = 0.5d</span>
                <span className="bg-rose-100 text-rose-800 rounded px-1 py-0.5 font-bold">AA = 0.0d</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

