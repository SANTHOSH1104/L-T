import React, { useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  Calendar, 
  Users, 
  User, 
  CheckSquare, 
  Square, 
  Clock, 
  Search, 
  Filter, 
  Layers, 
  Sparkles,
  Building2,
  CheckCircle2,
  FileCheck,
  TrendingUp,
  Award
} from 'lucide-react';
import { AttendanceRecord, EmployeeSummary, ShiftConfig } from '../types/attendance';
import { generateEmployeeSummaries } from '../utils/calculator';
import { 
  exportAttendanceToExcel, 
  exportPayrollSummaryToExcel, 
  exportOvertimeReportToExcel, 
  exportMasterReportToExcel 
} from '../utils/excelParser';

interface ExportReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  summaries: EmployeeSummary[];
  config: ShiftConfig;
}

type ReportType = 'MASTER' | 'PAYROLL' | 'LOGS' | 'OVERTIME';
type EmployeeScope = 'ALL' | 'DEPT' | 'SINGLE' | 'MULTIPLE';
type DateScope = 'ALL' | 'MONTH' | 'YEAR' | 'CUSTOM';

export const ExportReportsModal: React.FC<ExportReportsModalProps> = ({
  isOpen,
  onClose,
  records,
  summaries,
  config,
}) => {
  // 1. Report Type
  const [reportType, setReportType] = useState<ReportType>('MASTER');

  // 2. Employee Scope
  const [empScope, setEmpScope] = useState<EmployeeScope>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [singleEmpSearch, setSingleEmpSearch] = useState<string>('');
  const [selectedSingleEmpId, setSelectedSingleEmpId] = useState<string>('');
  const [multipleSearch, setMultipleSearch] = useState<string>('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

  // 3. Date Scope
  const [dateScope, setDateScope] = useState<DateScope>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-10-31');

  // Download state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  // Extract available unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    summaries.forEach(s => {
      if (s.department) set.add(s.department.trim());
    });
    return Array.from(set).sort();
  }, [summaries]);

  // Extract available unique months (YYYY-MM) and years (YYYY) from records
  const { availableMonths, availableYears, minDate, maxDate } = useMemo(() => {
    const monthsSet = new Set<string>();
    const yearsSet = new Set<string>();
    let minD = '9999-12-31';
    let maxD = '0000-01-01';

    records.forEach(r => {
      if (r.date) {
        if (r.date < minD) minD = r.date;
        if (r.date > maxD) maxD = r.date;
        const ym = r.date.substring(0, 7);
        const y = r.date.substring(0, 4);
        monthsSet.add(ym);
        yearsSet.add(y);
      }
    });

    return {
      availableMonths: Array.from(monthsSet).sort(),
      availableYears: Array.from(yearsSet).sort(),
      minDate: minD !== '9999-12-31' ? minD : '2026-10-01',
      maxDate: maxD !== '0000-01-01' ? maxD : '2026-10-31',
    };
  }, [records]);

  // Filter single employee candidates for autocomplete
  const filteredSingleCandidates = useMemo(() => {
    if (!singleEmpSearch.trim()) return summaries.slice(0, 10);
    const q = singleEmpSearch.toLowerCase();
    return summaries
      .filter(s => s.empName.toLowerCase().includes(q) || s.empId.toLowerCase().includes(q))
      .slice(0, 10);
  }, [summaries, singleEmpSearch]);

  // Filter multiple employee candidates
  const filteredMultipleCandidates = useMemo(() => {
    if (!multipleSearch.trim()) return summaries;
    const q = multipleSearch.toLowerCase();
    return summaries.filter(s => s.empName.toLowerCase().includes(q) || s.empId.toLowerCase().includes(q) || s.department.toLowerCase().includes(q));
  }, [summaries, multipleSearch]);

  // Effective Date Range based on dateScope
  const { effectiveStartDate, effectiveEndDate, dateRangeLabel } = useMemo(() => {
    if (dateScope === 'MONTH') {
      return {
        effectiveStartDate: `${selectedMonth}-01`,
        effectiveEndDate: `${selectedMonth}-31`,
        dateRangeLabel: `Month: ${selectedMonth}`,
      };
    }
    if (dateScope === 'YEAR') {
      return {
        effectiveStartDate: `${selectedYear}-01-01`,
        effectiveEndDate: `${selectedYear}-12-31`,
        dateRangeLabel: `Year: ${selectedYear}`,
      };
    }
    if (dateScope === 'CUSTOM') {
      return {
        effectiveStartDate: customStartDate,
        effectiveEndDate: customEndDate,
        dateRangeLabel: `${customStartDate} to ${customEndDate}`,
      };
    }
    return {
      effectiveStartDate: minDate,
      effectiveEndDate: maxDate,
      dateRangeLabel: `Full Period (${minDate} to ${maxDate})`,
    };
  }, [dateScope, selectedMonth, selectedYear, customStartDate, customEndDate, minDate, maxDate]);

  // Filter matching records based on Employee Scope + Date Scope
  const filteredMatchingRecords = useMemo(() => {
    return records.filter(r => {
      // Date filter
      if (r.date < effectiveStartDate || r.date > effectiveEndDate) {
        return false;
      }

      // Employee Scope filter
      if (empScope === 'DEPT') {
        if (selectedDept !== 'ALL' && r.department?.trim() !== selectedDept) return false;
      } else if (empScope === 'SINGLE') {
        if (selectedSingleEmpId && r.empId !== selectedSingleEmpId) return false;
      } else if (empScope === 'MULTIPLE') {
        if (selectedEmpIds.length > 0 && !selectedEmpIds.includes(r.empId)) return false;
      }

      return true;
    });
  }, [records, effectiveStartDate, effectiveEndDate, empScope, selectedDept, selectedSingleEmpId, selectedEmpIds]);

  // Dynamically recompute Employee Summaries for exact selected slice
  const dynamicSummaries = useMemo(() => {
    if (filteredMatchingRecords.length === 0) return [];
    return generateEmployeeSummaries(filteredMatchingRecords, config);
  }, [filteredMatchingRecords, config]);

  // Stats for the Live Pre-Download Inspector
  const previewStats = useMemo(() => {
    const totalRecordsCount = filteredMatchingRecords.length;
    const totalEmployeesCount = dynamicSummaries.length;
    const totalOtHours = Number(dynamicSummaries.reduce((acc, s) => acc + s.totalOtHours, 0).toFixed(1));
    const totalNetPayableDays = Number(dynamicSummaries.reduce((acc, s) => acc + s.netPayableDays, 0).toFixed(1));

    let filename = 'Attendance_Report.xlsx';
    const cleanComp = (config.companyName || 'PunchPulse').replace(/[^a-zA-Z0-9]/g, '_');

    if (empScope === 'SINGLE') {
      const emp = summaries.find(s => s.empId === selectedSingleEmpId);
      const name = emp ? emp.empName.replace(/[^a-zA-Z0-9]/g, '_') : 'Employee';
      filename = `${selectedSingleEmpId}_${name}_Attendance_${effectiveStartDate}_to_${effectiveEndDate}.xlsx`;
    } else if (empScope === 'DEPT') {
      const dept = selectedDept === 'ALL' ? 'AllDepartments' : selectedDept.replace(/[^a-zA-Z0-9]/g, '_');
      filename = `${cleanComp}_${dept}_Report_${effectiveStartDate}_to_${effectiveEndDate}.xlsx`;
    } else if (empScope === 'MULTIPLE') {
      filename = `${cleanComp}_Selected_${selectedEmpIds.length}_Staff_${effectiveStartDate}_to_${effectiveEndDate}.xlsx`;
    } else {
      filename = `${cleanComp}_Company_Master_${effectiveStartDate}_to_${effectiveEndDate}.xlsx`;
    }

    return {
      totalRecordsCount,
      totalEmployeesCount,
      totalOtHours,
      totalNetPayableDays,
      filename,
    };
  }, [filteredMatchingRecords, dynamicSummaries, empScope, selectedSingleEmpId, selectedDept, selectedEmpIds, config, summaries, effectiveStartDate, effectiveEndDate]);

  // Execute Excel Export
  const handleExport = async () => {
    if (filteredMatchingRecords.length === 0) {
      alert('No attendance records found matching your selected criteria.');
      return;
    }

    setIsExporting(true);
    try {
      if (reportType === 'MASTER') {
        exportMasterReportToExcel(
          filteredMatchingRecords,
          dynamicSummaries,
          previewStats.filename,
          { includePayroll: true, includeDailyLogs: true, includeOvertime: true }
        );
      } else if (reportType === 'PAYROLL') {
        exportPayrollSummaryToExcel(dynamicSummaries, previewStats.filename);
      } else if (reportType === 'LOGS') {
        exportAttendanceToExcel(filteredMatchingRecords, previewStats.filename);
      } else if (reportType === 'OVERTIME') {
        exportOvertimeReportToExcel(dynamicSummaries, previewStats.filename);
      }

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
      }, 4000);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to generate Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle multi-select employee
  const toggleSelectEmp = (empId: string) => {
    setSelectedEmpIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  // Select all or clear multiple employees
  const handleSelectAllMultiple = () => {
    if (selectedEmpIds.length === summaries.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(summaries.map(s => s.empId));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between border-b border-indigo-900/40">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
              <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-white text-lg sm:text-xl">Enterprise Export & Reports Hub</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Excel (.xlsx)
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Download verified attendance logs, working payroll timesheets, and overtime audits in any scope.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* STEP 1: REPORT TYPE SELECTION */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center">1</span>
                <span>Select Report Type</span>
              </span>
              <span className="text-[11px] text-slate-400">Choose structure of downloaded Excel</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Option 1: Master All-in-One Multi-Sheet */}
              <button
                type="button"
                onClick={() => setReportType('MASTER')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  reportType === 'MASTER'
                    ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">RECOMMENDED</span>
                </div>
                <div className="font-bold text-slate-900 text-xs mt-2">Master All-in-One</div>
                <p className="text-[11px] text-slate-500 mt-0.5">3 sheets: Payroll Summary + Daily Logs + OT Audit</p>
              </button>

              {/* Option 2: Payroll Timesheet */}
              <button
                type="button"
                onClick={() => setReportType('PAYROLL')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  reportType === 'PAYROLL'
                    ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div className="font-bold text-slate-900 text-xs mt-2">Payroll Timesheet</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Consolidated summary: Present, Absent & Net Payable Days</p>
              </button>

              {/* Option 3: Daily Punch Logs */}
              <button
                type="button"
                onClick={() => setReportType('LOGS')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  reportType === 'LOGS'
                    ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="font-bold text-slate-900 text-xs mt-2">Daily Biometric Logs</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Row-by-row punches: Date, In/Out, Muster PP/PA, Late & Extra</p>
              </button>

              {/* Option 4: Overtime Duty Audit */}
              <button
                type="button"
                onClick={() => setReportType('OVERTIME')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  reportType === 'OVERTIME'
                    ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="font-bold text-slate-900 text-xs mt-2">Overtime Duty Audit</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Ranked employee extra duty hours & OT shift duty days</p>
              </button>
            </div>
          </div>

          {/* STEP 2: EMPLOYEE SELECTION SCOPE */}
          <div className="space-y-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center">2</span>
                <span>Select Employee Scope (Whom to Export)</span>
              </span>

              {/* Scope Pills */}
              <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setEmpScope('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    empScope === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Staff ({summaries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEmpScope('DEPT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    empScope === 'DEPT' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  By Dept
                </button>
                <button
                  type="button"
                  onClick={() => setEmpScope('SINGLE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    empScope === 'SINGLE' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Single Person
                </button>
                <button
                  type="button"
                  onClick={() => setEmpScope('MULTIPLE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    empScope === 'MULTIPLE' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Multi-Select ({selectedEmpIds.length})
                </button>
              </div>
            </div>

            {/* Scope Details Controls */}
            {empScope === 'ALL' && (
              <div className="flex items-center space-x-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Exporting all <strong>{summaries.length} employees</strong> across the entire organization.</span>
              </div>
            )}

            {empScope === 'DEPT' && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Choose Department:</label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full sm:w-80 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}

            {empScope === 'SINGLE' && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700">Search & Select One Employee:</label>
                  {selectedSingleEmpId && (
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Selected ID: {selectedSingleEmpId}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by Emp ID or Name (e.g. 107815 or Siluvaiyesu)..."
                    value={singleEmpSearch}
                    onChange={(e) => setSingleEmpSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* Candidate List */}
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {filteredSingleCandidates.map(emp => (
                    <button
                      key={emp.empId}
                      type="button"
                      onClick={() => {
                        setSelectedSingleEmpId(emp.empId);
                        setSingleEmpSearch(`${emp.empId} - ${emp.empName}`);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-indigo-50/50 transition-colors cursor-pointer ${
                        selectedSingleEmpId === emp.empId ? 'bg-indigo-50 font-bold text-indigo-900' : 'text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{emp.empId}</span>
                        <span>{emp.empName}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">{emp.department}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {empScope === 'MULTIPLE' && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter employees by Name, ID, or Dept..."
                      value={multipleSearch}
                      onChange={(e) => setMultipleSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllMultiple}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      {selectedEmpIds.length === summaries.length ? 'Clear All' : 'Select All'}
                    </button>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {selectedEmpIds.length} Selected
                    </span>
                  </div>
                </div>

                {/* Multi-Select Checkbox Table */}
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {filteredMultipleCandidates.slice(0, 100).map(emp => {
                    const isChecked = selectedEmpIds.includes(emp.empId);
                    return (
                      <div
                        key={emp.empId}
                        onClick={() => toggleSelectEmp(emp.empId)}
                        className={`px-3 py-1.5 flex items-center justify-between text-xs hover:bg-slate-50 cursor-pointer select-none ${
                          isChecked ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                          <span className="font-mono text-[11px] text-slate-500">{emp.empId}</span>
                          <span className="font-bold text-slate-800">{emp.empName}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{emp.department}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: DATE RANGE & PERIOD SCOPE */}
          <div className="space-y-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center">3</span>
                <span>Select Date Range / Period (When)</span>
              </span>

              {/* Date Scope Pills */}
              <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setDateScope('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateScope === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Full Available
                </button>
                <button
                  type="button"
                  onClick={() => setDateScope('MONTH')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateScope === 'MONTH' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Month-Wise
                </button>
                <button
                  type="button"
                  onClick={() => setDateScope('YEAR')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateScope === 'YEAR' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Year-Wise
                </button>
                <button
                  type="button"
                  onClick={() => setDateScope('CUSTOM')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateScope === 'CUSTOM' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Custom Range
                </button>
              </div>
            </div>

            {/* Date Details Controls */}
            {dateScope === 'ALL' && (
              <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Exporting all available dates in database: <strong>{minDate}</strong> to <strong>{maxDate}</strong> (31 Days).</span>
              </div>
            )}

            {dateScope === 'MONTH' && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Select Month:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{m} (Full Month)</option>
                  ))}
                </select>
              </div>
            )}

            {dateScope === 'YEAR' && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Select Year:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y} Annual Consolidated</option>
                  ))}
                </select>
              </div>
            )}

            {dateScope === 'CUSTOM' && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">From Date (Start):</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">To Date (End):</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Quick Date Shortcuts */}
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-semibold">Shortcuts:</span>
                  <button
                    type="button"
                    onClick={() => { setCustomStartDate('2026-10-01'); setCustomEndDate('2026-10-15'); }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    1st - 15th (1st Half)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomStartDate('2026-10-16'); setCustomEndDate('2026-10-31'); }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    16th - 31st (2nd Half)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomStartDate('2026-10-01'); setCustomEndDate('2026-10-31'); }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    Entire Month
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: LIVE PRE-DOWNLOAD INSPECTOR & SUMMARY */}
          <div className="p-4 bg-gradient-to-r from-indigo-50/70 via-purple-50/70 to-emerald-50/70 rounded-2xl border border-indigo-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Live Pre-Export Audit & Recalculation</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white text-indigo-800 border border-indigo-200">
                {previewStats.totalRecordsCount.toLocaleString()} Matching Records
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/90 border border-indigo-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Employees</span>
                <span className="font-extrabold text-slate-900 text-sm font-mono">{previewStats.totalEmployeesCount} Staff</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 border border-indigo-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Date Span</span>
                <span className="font-extrabold text-slate-900 text-xs font-mono truncate block" title={dateRangeLabel}>
                  {dateRangeLabel}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 border border-indigo-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Net Payable Days</span>
                <span className="font-extrabold text-emerald-700 text-sm font-mono">{previewStats.totalNetPayableDays} Days</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 border border-indigo-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total OT Hours</span>
                <span className="font-extrabold text-purple-700 text-sm font-mono">+{previewStats.totalOtHours} hrs</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-600 pt-1 border-t border-indigo-100/60 font-mono">
              <FileCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">File to download: <strong className="text-indigo-900">{previewStats.filename}</strong></span>
            </div>
          </div>

          {/* Success Banner */}
          {exportSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Excel file generated and download started successfully!</span>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Attendance engine dynamically recomputes exact present days for the selected date slice.
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isExporting || previewStats.totalRecordsCount === 0}
              onClick={handleExport}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating Excel...' : 'Generate & Download Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

