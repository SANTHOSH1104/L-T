import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Search, 
  CheckCircle2, 
  Clock, 
  Users, 
  FileText, 
  Printer, 
  Building2 
} from 'lucide-react';
import { EmployeeSummary, ShiftConfig } from '../types/attendance';
import { exportPayrollSummaryToExcel } from '../utils/excelParser';
import { Button, Input, Modal, Badge } from './common';
import { formatHours } from '../utils/formatters';

interface PayrollTimesheetTabProps {
  summaries: EmployeeSummary[];
  config: ShiftConfig;
}

export const PayrollTimesheetTab: React.FC<PayrollTimesheetTabProps> = ({
  summaries,
  config,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'ot' | 'present' | 'payable'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState<EmployeeSummary | null>(null);

  // Search & sorting with clean trimmed strings
  const filteredAndSorted = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return summaries
      .filter(s => 
        s.empName.toLowerCase().includes(cleanSearch) ||
        s.empId.toLowerCase().includes(cleanSearch) ||
        s.department.toLowerCase().includes(cleanSearch)
      )
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'id') diff = a.empId.localeCompare(b.empId);
        else if (sortBy === 'ot') diff = a.totalOtHours - b.totalOtHours;
        else if (sortBy === 'present') diff = a.presentDays - b.presentDays;
        else if (sortBy === 'payable') diff = a.netPayableDays - b.netPayableDays;
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [summaries, searchTerm, sortBy, sortOrder]);

  const toggleSort = (field: 'id' | 'ot' | 'present' | 'payable') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const totalPayrollPayableDays = summaries.reduce((acc, s) => acc + s.netPayableDays, 0);
  const totalOtHoursAll = summaries.reduce((acc, s) => acc + s.totalOtHours, 0);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Monthly Payroll & Timesheet Summary</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated employee attendance, payable days & OT calculation ready for payroll processing.
          </p>
        </div>

        <Button
          variant="success"
          size="md"
          icon={<Download className="w-4 h-4" />}
          disabled={filteredAndSorted.length === 0}
          onClick={() => exportPayrollSummaryToExcel(filteredAndSorted)}
        >
          Export Payroll Summary (.xlsx)
        </Button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Total Net Payable Days</div>
            <div className="text-xl font-bold text-slate-800">{totalPayrollPayableDays.toFixed(1)} Days</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Total Overtime (OT) Logged</div>
            <div className="text-xl font-bold text-purple-700">{formatHours(totalOtHoursAll)}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">
              OT Qualified Staff
            </div>
            <div className="text-xl font-bold text-indigo-700">
              {summaries.filter(s => s.totalOtHours > 0).length} Staff
            </div>
          </div>
        </div>
      </div>

      {/* Search and Sort Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            icon={<Search className="w-4 h-4 text-slate-400" />}
            placeholder="Search employee or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Sort by:</span>
          <button
            onClick={() => toggleSort('payable')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
              sortBy === 'payable' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Payable Days
          </button>
          <button
            onClick={() => toggleSort('ot')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
              sortBy === 'ot' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            OT Hours
          </button>
        </div>
      </div>

      {/* Main Timesheet Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 sticky left-0 bg-slate-50 z-20 shadow-xs border-r border-slate-200 min-w-[170px]">Employee</th>
                <th className="py-3 px-3">Dept</th>
                <th className="py-3 px-2 text-center">Total</th>
                <th className="py-3 px-2 text-center text-emerald-700">Present (1.0)</th>
                <th className="py-3 px-2 text-center text-amber-600">Half (0.5)</th>
                <th className="py-3 px-2 text-center text-rose-600">Absent</th>
                <th className="py-3 px-2 text-center text-blue-600">OD</th>
                <th className="py-3 px-2 text-center text-indigo-600">Sunday</th>
                <th className="py-3 px-2 text-center text-teal-600">Holiday</th>
                <th className="py-3 px-3 text-center bg-emerald-50/50 font-bold text-emerald-800">
                  Payable Days
                </th>
                <th className="py-3 px-2 text-center font-mono">Work Hours</th>
                <th className="py-3 px-2 text-center bg-purple-50/50 font-bold text-purple-800">
                  OT Hours
                </th>
                <th className="py-3 px-3 text-center rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-slate-400">
                    No employee summaries available.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((s) => {
                  return (
                    <tr key={s.empId} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-xs border-r border-slate-100 min-w-[170px]">
                        <div className="font-bold text-slate-800">{s.empName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.empId}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{s.department}</td>
                      <td className="py-3 px-2 text-center font-mono font-medium text-slate-700">{s.totalDays}</td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-emerald-700">{s.presentDays}</td>
                      <td className="py-3 px-2 text-center font-mono font-semibold text-amber-600">{s.halfDays}</td>
                      <td className="py-3 px-2 text-center font-mono font-semibold text-rose-600">{s.absentDays}</td>
                      <td className="py-3 px-2 text-center font-mono font-medium text-blue-700">{s.totalOnDuty || 0}</td>
                      <td className="py-3 px-2 text-center font-mono font-medium text-indigo-700">{s.totalSundays || 0}</td>
                      <td className="py-3 px-2 text-center font-mono font-medium text-teal-700">{s.totalHolidays || 0}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-800 bg-emerald-50/30">
                        {Number(s.netPayableDays.toFixed(3))}
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-slate-600">{formatHours(s.totalWorkHours)}</td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-purple-700 bg-purple-50/30">
                        {s.totalOtHours > 0 ? `+${s.totalOtHours}h` : '0h'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<FileText className="w-3.5 h-3.5" />}
                          onClick={() => setSelectedPayslipEmp(s)}
                        >
                          Payslip
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reusable Printable Payslip Modal */}
      <Modal
        isOpen={Boolean(selectedPayslipEmp)}
        onClose={() => setSelectedPayslipEmp(null)}
        title={config.companyName}
        subtitle="Monthly Attendance & Overtime Statement"
        maxWidth="lg"
      >
        {selectedPayslipEmp && (
          <div className="space-y-4">
            {/* Employee Info Card */}
            <div className="p-4 bg-slate-50 rounded-2xl grid grid-cols-2 gap-3 text-xs border border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Employee Name</span>
                <span className="font-bold text-slate-900 text-sm">{selectedPayslipEmp.empName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Employee ID</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{selectedPayslipEmp.empId}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Department</span>
                <span className="font-semibold text-slate-700">{selectedPayslipEmp.department}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Pay Period</span>
                <span className="font-semibold text-slate-700">November 2026</span>
              </div>
            </div>

            {/* Attendance Days Breakdown Table */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Attendance Breakdown</div>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600">Total Recorded Days</span>
                  <span className="font-mono font-bold text-slate-900">{selectedPayslipEmp.totalDays} Days</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Full Days (Present @ 1.0)
                  </span>
                  <span className="font-mono font-bold text-emerald-700">{selectedPayslipEmp.presentDays} Days</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span> Half Days (@ 0.5)
                  </span>
                  <span className="font-mono font-bold text-amber-700">{selectedPayslipEmp.halfDays} Days</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Absent Days (@ 0.0)
                  </span>
                  <span className="font-mono font-bold text-rose-700">{selectedPayslipEmp.absentDays} Days</span>
                </div>
                <div className="flex justify-between p-2.5 bg-emerald-50 font-bold">
                  <span className="text-emerald-900">Net Payable Days for Salary</span>
                  <span className="font-mono text-emerald-800 text-sm">
                    {selectedPayslipEmp.netPayableDays.toFixed(1)} Days
                  </span>
                </div>
              </div>
            </div>

            {/* Overtime (OT) Record */}
            <div className="p-3.5 bg-purple-50/70 border border-purple-200/60 rounded-2xl text-xs space-y-1.5">
              <div className="flex justify-between items-center text-purple-900 font-bold text-[11px] uppercase tracking-wider">
                <span>Overtime (OT) Tracking</span>
                <span className="font-mono text-xs">Min Rule: &gt;= {config.minOtQualifyHours ?? 2.0}h</span>
              </div>
              <div className="flex justify-between text-purple-800 pt-1">
                <span>Total Qualified OT Hours:</span>
                <span className="font-bold font-mono text-sm">+{selectedPayslipEmp.totalOtHours} Hours</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={() => setSelectedPayslipEmp(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
