import React, { useMemo } from 'react';
import { 
  Clock, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Building2, 
  Award,
  Zap
} from 'lucide-react';
import { EmployeeSummary, ShiftConfig } from '../types/attendance';

interface OvertimeAnalyticsTabProps {
  summaries: EmployeeSummary[];
  config: ShiftConfig;
}

export const OvertimeAnalyticsTab: React.FC<OvertimeAnalyticsTabProps> = ({
  summaries,
  config,
}) => {
  // Aggregate department-wise OT
  const deptOtMap = useMemo(() => {
    const map = new Map<string, { totalOtHours: number; employeeCount: number }>();
    summaries.forEach(s => {
      const existing = map.get(s.department) || { totalOtHours: 0, employeeCount: 0 };
      existing.totalOtHours = Number((existing.totalOtHours + s.totalOtHours).toFixed(2));
      existing.employeeCount += 1;
      map.set(s.department, existing);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].totalOtHours - a[1].totalOtHours);
  }, [summaries]);

  // High OT workers (>= 4 hours OT)
  const highOtWorkers = useMemo(() => {
    return summaries
      .filter(s => s.totalOtHours >= 4)
      .sort((a, b) => b.totalOtHours - a.totalOtHours);
  }, [summaries]);

  const totalOtHours = summaries.reduce((acc, s) => acc + s.totalOtHours, 0);
  const otQualifiedStaff = summaries.filter(s => s.totalOtHours > 0).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Overtime (OT) Intelligence & Audit</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Breakdown of extra working hours, department distribution, and overtime qualification audit.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Overtime Hours</div>
              <div className="text-2xl font-bold text-slate-900">{totalOtHours.toFixed(1)} hrs</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 font-mono">
            Threshold: Any duty &gt; {config.otThresholdHours} hours/day
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">OT Qualified Staff</div>
              <div className="text-2xl font-bold text-indigo-700">{otQualifiedStaff} Employees</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 font-mono">
            Min. {config.minOtQualifyHours ?? 2.0}h threshold achieved
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Heavy OT Staff (&gt;= 4h)</div>
              <div className="text-2xl font-bold text-amber-600">{highOtWorkers.length} Employees</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Employees requiring overtime audit
          </p>
        </div>
      </div>

      {/* Department-wise OT Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Department OT Breakdown</h3>
          </div>

          <div className="space-y-3">
            {deptOtMap.map(([dept, data]) => {
              const pct = totalOtHours > 0 ? Math.round((data.totalOtHours / totalOtHours) * 100) : 0;
              const avgOt = data.employeeCount > 0 ? (data.totalOtHours / data.employeeCount).toFixed(1) : '0.0';
              return (
                <div key={dept} className="p-3 bg-slate-50 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{dept}</span>
                    <span className="font-mono font-bold text-purple-700">
                      {data.totalOtHours}h ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-purple-600 h-1.5 rounded-full" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{data.employeeCount} staff members</span>
                    <span className="font-medium text-slate-600 font-mono">Avg: {avgOt}h / employee</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* High Overtime Workers List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-sm">Top Overtime Workers</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Employee</th>
                  <th className="py-2.5 px-3">Dept</th>
                  <th className="py-2.5 px-3">OT Hours</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-right">Payable Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {highOtWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No employees with heavy overtime logged.
                    </td>
                  </tr>
                ) : (
                  highOtWorkers.map((w) => (
                    <tr key={w.empId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800">{w.empName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{w.empId}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{w.department}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-purple-700">
                        +{w.totalOtHours}h
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {w.netPayableDays.toFixed(1)} Days
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
