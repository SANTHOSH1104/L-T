import React, { useState, useMemo } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  Calendar, 
  Users, 
  User, 
  Search, 
  Filter, 
  Layers, 
  Sparkles,
  Building2,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  CalendarCheck,
  CalendarDays
} from 'lucide-react';
import { AttendanceRecord, EmployeeSummary, ShiftConfig } from '../types/attendance';
import { generateEmployeeSummaries } from '../utils/calculator';
import { 
  exportAttendanceToExcel, 
  exportPayrollSummaryToExcel, 
  exportOvertimeReportToExcel, 
  exportMasterReportToExcel 
} from '../utils/excelParser';

interface ReportsTabProps {
  records: AttendanceRecord[];
  summaries: EmployeeSummary[];
  config: ShiftConfig;
}

type ReportType = 'MASTER' | 'PAYROLL' | 'LOGS' | 'OVERTIME';

export const ReportsTab: React.FC<ReportsTabProps> = ({
  records,
  summaries,
  config,
}) => {
  // Report Format
  const [reportType, setReportType] = useState<ReportType>('MASTER');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'present' | 'payable' | 'ot'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Date Range state
  const { minDate, maxDate, availableMonths } = useMemo(() => {
    let minD = '9999-12-31';
    let maxD = '0000-01-01';
    const months = new Set<string>();

    records.forEach(r => {
      if (r.date) {
        if (r.date < minD) minD = r.date;
        if (r.date > maxD) maxD = r.date;
        months.add(r.date.substring(0, 7));
      }
    });

    return {
      minDate: minD !== '9999-12-31' ? minD : '2026-10-01',
      maxDate: maxD !== '0000-01-01' ? maxD : '2026-10-31',
      availableMonths: Array.from(months).sort(),
    };
  }, [records]);

  const [startDate, setStartDate] = useState<string>(minDate);
  const [endDate, setEndDate] = useState<string>(maxDate);
  const [activeDatePreset, setActiveDatePreset] = useState<'FULL' | 'H1' | 'H2' | 'CUSTOM'>('FULL');

  // Export progress
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Available unique departments
  const departments = useMemo(() => {
    const depts = new Set<string>();
    summaries.forEach(s => {
      if (s.department) depts.add((s.department).trim().toUpperCase());
    });
    return Array.from(depts).sort();
  }, [summaries]);

  // Handle Preset Date changes
  const applyDatePreset = (preset: 'FULL' | 'H1' | 'H2') => {
    setActiveDatePreset(preset);
    setCurrentPage(1);
    if (preset === 'FULL') {
      setStartDate(minDate);
      setEndDate(maxDate);
    } else if (preset === 'H1') {
      setStartDate('2026-10-01');
      setEndDate('2026-10-15');
    } else if (preset === 'H2') {
      setStartDate('2026-10-16');
      setEndDate('2026-10-31');
    }
  };

  // 1. Filter matching raw records by Date Range
  const dateFilteredRecords = useMemo(() => {
    return records.filter(r => r.date >= startDate && r.date <= endDate);
  }, [records, startDate, endDate]);

  // 2. Dynamically recompute Employee Summaries for this exact date slice
  const dynamicSummaries = useMemo(() => {
    if (dateFilteredRecords.length === 0) return [];
    return generateEmployeeSummaries(dateFilteredRecords, config);
  }, [dateFilteredRecords, config]);

  // 3. Filter and Sort the dynamic summaries by Employee Search, Dept, and Multi-select
  const filteredAndSortedEmployees = useMemo(() => {
    return dynamicSummaries
      .filter(emp => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = emp.empName.toLowerCase().includes(q);
          const matchId = emp.empId.toLowerCase().includes(q);
          const matchDept = (emp.department || '').toLowerCase().includes(q);
          if (!matchName && !matchId && !matchDept) return false;
        }

        // Department filter
        if (selectedDept !== 'ALL') {
          if ((emp.department || '').trim().toUpperCase() !== selectedDept) return false;
        }

        // Multi-select filter (if any are specifically checked)
        if (selectedEmpIds.length > 0 && !selectedEmpIds.includes(emp.empId)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'id') diff = a.empId.localeCompare(b.empId);
        else if (sortBy === 'name') diff = a.empName.localeCompare(b.empName);
        else if (sortBy === 'present') diff = b.presentDays - a.presentDays;
        else if (sortBy === 'payable') diff = b.netPayableDays - a.netPayableDays;
        else if (sortBy === 'ot') diff = b.totalOtHours - a.totalOtHours;
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [dynamicSummaries, searchQuery, selectedDept, selectedEmpIds, sortBy, sortOrder]);

  // Target records for export (matching the filtered employee list)
  const targetRecordsForExport = useMemo(() => {
    const targetEmpIdSet = new Set(filteredAndSortedEmployees.map(e => e.empId));
    return dateFilteredRecords.filter(r => targetEmpIdSet.has(r.empId));
  }, [dateFilteredRecords, filteredAndSortedEmployees]);

  // Pagination calculation
  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredAndSortedEmployees.length / pageSize);
  const paginatedEmployees = useMemo(() => {
    if (pageSize === -1) return filteredAndSortedEmployees;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedEmployees.slice(start, start + pageSize);
  }, [filteredAndSortedEmployees, currentPage, pageSize]);

  // Multi-select toggles
  const toggleSelectEmp = (empId: string) => {
    setSelectedEmpIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = paginatedEmployees.map(e => e.empId);
    const allVisibleSelected = visibleIds.every(id => selectedEmpIds.includes(id));
    if (allVisibleSelected) {
      setSelectedEmpIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleClearAllSelections = () => {
    setSelectedEmpIds([]);
  };

  // Generated File Name Preview
  const generatedFilename = useMemo(() => {
    const cleanComp = (config.companyName || 'PunchPulse').replace(/[^a-zA-Z0-9]/g, '_');
    if (filteredAndSortedEmployees.length === 1) {
      const emp = filteredAndSortedEmployees[0];
      const cleanName = emp.empName.replace(/[^a-zA-Z0-9]/g, '_');
      return `${emp.empId}_${cleanName}_Attendance_${startDate}_to_${endDate}.xlsx`;
    }
    if (selectedDept !== 'ALL') {
      return `${cleanComp}_${selectedDept}_Report_${startDate}_to_${endDate}.xlsx`;
    }
    if (selectedEmpIds.length > 0) {
      return `${cleanComp}_Selected_${selectedEmpIds.length}_Staff_${startDate}_to_${endDate}.xlsx`;
    }
    return `${cleanComp}_Master_Payroll_Report_${startDate}_to_${endDate}.xlsx`;
  }, [config.companyName, filteredAndSortedEmployees, selectedDept, selectedEmpIds, startDate, endDate]);

  // Master Export Action
  const handleExecuteExport = () => {
    if (targetRecordsForExport.length === 0 || filteredAndSortedEmployees.length === 0) {
      alert('No matching attendance records found to export for the selected date range.');
      return;
    }

    setIsExporting(true);
    try {
      if (reportType === 'MASTER') {
        exportMasterReportToExcel(
          targetRecordsForExport,
          filteredAndSortedEmployees,
          generatedFilename,
          { includePayroll: true, includeDailyLogs: true, includeOvertime: true }
        );
      } else if (reportType === 'PAYROLL') {
        exportPayrollSummaryToExcel(filteredAndSortedEmployees, generatedFilename);
      } else if (reportType === 'LOGS') {
        exportAttendanceToExcel(targetRecordsForExport, generatedFilename);
      } else if (reportType === 'OVERTIME') {
        exportOvertimeReportToExcel(filteredAndSortedEmployees, generatedFilename);
      }

      setSuccessBanner(`Downloaded ${generatedFilename} successfully!`);
      setTimeout(() => setSuccessBanner(null), 4500);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to generate Excel file.');
    } finally {
      setIsExporting(false);
    }
  };

  // Instant Single Employee Export from Row Action
  const handleExportSingleEmployee = (emp: EmployeeSummary) => {
    const empRecords = dateFilteredRecords.filter(r => r.empId === emp.empId);
    const cleanName = emp.empName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${emp.empId}_${cleanName}_Attendance_${startDate}_to_${endDate}.xlsx`;

    exportMasterReportToExcel(
      empRecords,
      [emp],
      filename,
      { includePayroll: true, includeDailyLogs: true, includeOvertime: true }
    );

    setSuccessBanner(`Downloaded ${filename} for ${emp.empName}!`);
    setTimeout(() => setSuccessBanner(null), 4500);
  };

  // Stats for the Live Pre-Download Cards
  const totalWorkforceSelected = filteredAndSortedEmployees.length;
  const totalDailyRecordsCount = targetRecordsForExport.length;
  const totalPayableDaysSum = Number(filteredAndSortedEmployees.reduce((acc, e) => acc + e.netPayableDays, 0).toFixed(1));
  const totalOtHoursSum = Number(filteredAndSortedEmployees.reduce((acc, e) => acc + e.totalOtHours, 0).toFixed(1));

  return (
    <div className="w-full space-y-6">
      {/* 1. HERO BANNER: Executive Reporting Suite */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
            <span>ENTERPRISE REPORTING & EXPORT CENTER</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Live Recalculation Engine</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Custom Reports & Excel Downloads
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Generate and download verified Excel reports for a single person, selected employees, or the full company.
            Select custom date ranges or fortnights — the engine dynamically recomputes exact present and net payable days.
          </p>
        </div>

        {/* Primary Download Action in Banner */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={handleExecuteExport}
            disabled={isExporting || totalDailyRecordsCount === 0}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating Excel...' : 'Download Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center space-x-3 shadow-xs animate-in fade-in duration-200">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div>{successBanner}</div>
            <div className="text-[11px] text-emerald-700 font-normal">Excel file generated and ready in your browser downloads folder.</div>
          </div>
        </div>
      )}

      {/* 2. TOP 4 DYNAMIC KPI CARDS: Live Updates as Date & Person Change */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Target Workforce */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selected Workforce</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {totalWorkforceSelected} <span className="text-sm font-medium text-slate-500 font-sans">/ {summaries.length} Staff</span>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg w-fit font-medium">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{selectedDept === 'ALL' ? 'All Departments' : selectedDept}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Date Span & Total Punch Rows */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Span & Punch Logs</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight font-mono">
              {totalDailyRecordsCount.toLocaleString()} <span className="text-sm font-medium text-slate-500 font-sans">Logs</span>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg w-fit font-medium font-mono">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{startDate} → {endDate}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Net Payable Days (Dynamically Recalculated!) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Payable Days</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight font-mono">
              {totalPayableDaysSum.toLocaleString()} <span className="text-sm font-medium text-slate-500 font-sans">Days</span>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg w-fit font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Recalculated for this date slice</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Overtime Hours (Dynamically Recalculated!) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Overtime Hours</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight font-mono">
              +{totalOtHoursSum.toLocaleString()} <span className="text-sm font-medium text-slate-500 font-sans">hrs</span>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg w-fit font-medium">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Extra duty past shift timings</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE CONTROL CENTER: Date Range, Report Type & Employee Filters */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
        
        {/* ROW 1: Date Range Filters & Preset Shortcuts */}
        <div className="space-y-2.5 border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Select Date Range & Period</span>
            </div>

            {/* Quick Fortnight / Month Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyDatePreset('FULL')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeDatePreset === 'FULL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Full Month (01-31 Oct)
              </button>

              <button
                type="button"
                onClick={() => applyDatePreset('H1')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeDatePreset === 'H1'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                1st - 15th (1st Half)
              </button>

              <button
                type="button"
                onClick={() => applyDatePreset('H2')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeDatePreset === 'H2'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                16th - 31st (2nd Half)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">From Date (Start):</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveDatePreset('CUSTOM');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">To Date (End):</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveDatePreset('CUSTOM');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            {/* Report Type Selector */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Choose Export Format:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setReportType('MASTER')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    reportType === 'MASTER'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📦 Master 3-in-1
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('PAYROLL')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    reportType === 'PAYROLL'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📊 Payroll Only
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('LOGS')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    reportType === 'LOGS'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📑 Daily Logs
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('OVERTIME')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    reportType === 'OVERTIME'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ⏱️ OT Audit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Employee Search, Dept Filter, Multi-select Badge & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search single person by Name or Emp ID (e.g. 107815)..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Department Filter */}
            <div className="relative w-full sm:w-56">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer font-medium"
              >
                <option value="ALL">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-Select status and Clear button */}
          <div className="flex items-center space-x-2 shrink-0">
            {selectedEmpIds.length > 0 ? (
              <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
                <span className="text-xs font-bold text-indigo-900 font-mono">
                  {selectedEmpIds.length} Staff Checked
                </span>
                <button
                  type="button"
                  onClick={handleClearAllSelections}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-medium">
                {searchQuery ? 'Filtered results' : 'Showing all staff by default'}
              </span>
            )}

            {/* Download Button */}
            <button
              onClick={handleExecuteExport}
              disabled={isExporting || totalDailyRecordsCount === 0}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {selectedEmpIds.length > 0 ? `(${selectedEmpIds.length})` : 'All'}</span>
            </button>
          </div>
        </div>

        {/* Live File Preview Chip */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono">
          <span className="flex items-center space-x-1.5 truncate">
            <FileCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Target File: <strong className="text-slate-800">{generatedFilename}</strong></span>
          </span>
          <span className="text-emerald-700 font-bold shrink-0">
            {totalDailyRecordsCount.toLocaleString()} Daily Rows • {totalPayableDaysSum} Net Days
          </span>
        </div>
      </div>

      {/* 4. LIVE INTERACTIVE DATA TABLE: Shows All Details by Default */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              Live Attendance & Timesheet Ledger
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-200">
                {filteredAndSortedEmployees.length} Employees
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live calculated present days and overtime duty for {startDate} to {endDate}. Click the download icon on any row for that single person's report.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Page Size */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold outline-none cursor-pointer"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
            </div>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                {/* Checkbox column */}
                <th className="py-3 px-3 text-center w-10">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    title="Select/Deselect visible employees"
                    className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                </th>
                <th className="py-3 px-2 text-center w-10">#</th>
                <th className="py-3 px-4 sticky left-0 bg-slate-50 z-10 shadow-xs">Employee Details</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-2 text-center">Full (1.0)</th>
                <th className="py-3 px-2 text-center">Half (0.5)</th>
                <th className="py-3 px-2 text-center">Absent</th>
                <th className="py-3 px-2 text-center">Sunday</th>
                <th className="py-3 px-2 text-center">Holiday</th>
                <th className="py-3 px-3 text-right">Work Hours</th>
                <th className="py-3 px-3 text-right font-black text-purple-900">Total OT</th>
                <th className="py-3 px-3 text-center">OT Duty</th>
                <th className="py-3 px-4 text-right font-black text-emerald-800">Net Payable Days</th>
                <th className="py-3 px-3 text-center">Single Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">No employees match your search or filter</p>
                      <p className="text-xs text-slate-400">Try clearing the search box or selecting All Departments.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp, idx) => {
                  const globalRank = (pageSize === -1 ? 0 : (currentPage - 1) * pageSize) + idx + 1;
                  const isChecked = selectedEmpIds.includes(emp.empId);

                  return (
                    <tr 
                      key={emp.empId} 
                      className={`hover:bg-indigo-50/30 transition-colors group ${
                        isChecked ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectEmp(emp.empId)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* Rank */}
                      <td className="py-3 px-2 text-center font-mono text-slate-400">
                        {globalRank}
                      </td>

                      {/* Employee Details (Sticky Column) */}
                      <td className="py-3 px-4 sticky left-0 bg-white group-hover:bg-indigo-50/50 z-10 shadow-xs">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-900 text-sm">
                          {emp.empName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {emp.empId}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {(emp.department || 'GENERAL').trim().toUpperCase()}
                      </td>

                      {/* Full Days */}
                      <td className="py-3 px-2 text-center font-mono font-bold text-slate-800">
                        {emp.presentDays}
                      </td>

                      {/* Half Days */}
                      <td className="py-3 px-2 text-center font-mono font-semibold text-amber-600">
                        {emp.halfDays > 0 ? emp.halfDays : '-'}
                      </td>

                      {/* Absent Days */}
                      <td className="py-3 px-2 text-center font-mono font-semibold text-rose-600">
                        {emp.absentDays > 0 ? emp.absentDays : '-'}
                      </td>

                      {/* Sunday */}
                      <td className="py-3 px-2 text-center font-mono text-indigo-700">
                        {emp.totalSundays && emp.totalSundays > 0 ? emp.totalSundays : '-'}
                      </td>

                      {/* Holiday */}
                      <td className="py-3 px-2 text-center font-mono text-teal-700">
                        {emp.totalHolidays && emp.totalHolidays > 0 ? emp.totalHolidays : '-'}
                      </td>

                      {/* Total Work Hours */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {emp.totalWorkHours.toFixed(1)}h
                      </td>

                      {/* Total OT Hours */}
                      <td className="py-3 px-3 text-right">
                        {emp.totalOtHours > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 font-mono font-black text-xs">
                            +{emp.totalOtHours.toFixed(1)}h
                          </span>
                        ) : (
                          <span className="font-mono text-slate-300">0.0h</span>
                        )}
                      </td>

                      {/* OT Duty Days */}
                      <td className="py-3 px-3 text-center font-mono text-slate-700">
                        {emp.totalOtDuties && emp.totalOtDuties > 0 ? (
                          <span className="font-bold text-indigo-700">
                            {emp.totalOtDuties.toFixed(1)}d
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Net Payable Days */}
                      <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-800">
                        {emp.netPayableDays.toFixed(1)} Days
                      </td>

                      {/* Single Person Download Action */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleExportSingleEmployee(emp)}
                          title={`Download personal Excel report for ${emp.empName}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Report</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pageSize !== -1 && totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-800">
                {Math.min(currentPage * pageSize, filteredAndSortedEmployees.length)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{filteredAndSortedEmployees.length}</span> employees
            </div>

            <div className="flex items-center space-x-1.5 self-center sm:self-auto">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
