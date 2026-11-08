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
  CalendarDays,
  X,
  UserCheck,
  RotateCcw
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
  const [showOnlySelected, setShowOnlySelected] = useState<boolean>(false);

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

  // 3. Filter and Sort the dynamic summaries for the Live Table Display
  // IMPORTANT: We do NOT filter out non-selected employees by default so you can check 2, 3, 5, or more staff!
  const filteredAndSortedEmployees = useMemo(() => {
    return dynamicSummaries
      .filter(emp => {
        // If user explicitly toggled "Show Only Selected"
        if (showOnlySelected && selectedEmpIds.length > 0 && !selectedEmpIds.includes(emp.empId)) {
          return false;
        }

        // Search query: supports single name/ID, or multiple separated by comma, semicolon, slash, pipe, or newline (Excel paste)
        if (searchQuery.trim()) {
          const tokens = searchQuery
            .split(/[,;/|\n]+/)
            .map(t => t.trim().toLowerCase())
            .filter(Boolean);

          if (tokens.length > 0) {
            const matchesAnyToken = tokens.some(token => {
              const matchName = emp.empName.toLowerCase().includes(token);
              const matchId = emp.empId.toLowerCase().includes(token);
              const matchDept = (emp.department || '').toLowerCase().includes(token);
              return matchName || matchId || matchDept;
            });
            if (!matchesAnyToken) return false;
          }
        }

        // Department filter
        if (selectedDept !== 'ALL') {
          if ((emp.department || '').trim().toUpperCase() !== selectedDept) return false;
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
  }, [dynamicSummaries, showOnlySelected, selectedEmpIds, searchQuery, selectedDept, sortBy, sortOrder]);

  // 4. Target Employees for Export:
  // If user selected 1 or more specific employees via checkbox -> export those selected!
  // Otherwise -> export all currently filtered employees!
  const targetEmployeesForExport = useMemo(() => {
    if (selectedEmpIds.length > 0) {
      const selectedSet = new Set(selectedEmpIds);
      return dynamicSummaries.filter(e => selectedSet.has(e.empId));
    }
    return filteredAndSortedEmployees;
  }, [dynamicSummaries, selectedEmpIds, filteredAndSortedEmployees]);

  // Target records for export (matching the target employees)
  const targetRecordsForExport = useMemo(() => {
    const targetEmpIdSet = new Set(targetEmployeesForExport.map(e => e.empId));
    return dateFilteredRecords.filter(r => targetEmpIdSet.has(r.empId));
  }, [dateFilteredRecords, targetEmployeesForExport]);

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
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedEmpIds.includes(id));
    if (allVisibleSelected) {
      setSelectedEmpIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleClearAllSelections = () => {
    setSelectedEmpIds([]);
    setShowOnlySelected(false);
  };

  const handleResetAll = () => {
    setSearchQuery('');
    setSelectedEmpIds([]);
    setShowOnlySelected(false);
    setSelectedDept('ALL');
    setActiveDatePreset('FULL');
    setStartDate(minDate);
    setEndDate(maxDate);
    setCurrentPage(1);
    setSortBy('id');
    setSortOrder('asc');
    setReportType('MASTER');
    setSuccessBanner(null);
  };

  // Search match selection helpers
  const areAllSearchMatchesSelected = useMemo(() => {
    if (!searchQuery.trim() || filteredAndSortedEmployees.length === 0) return false;
    return filteredAndSortedEmployees.every(emp => selectedEmpIds.includes(emp.empId));
  }, [searchQuery, filteredAndSortedEmployees, selectedEmpIds]);

  const handleToggleSelectSearchMatches = () => {
    const matchIds = filteredAndSortedEmployees.map(e => e.empId);
    if (areAllSearchMatchesSelected) {
      setSelectedEmpIds(prev => prev.filter(id => !matchIds.includes(id)));
    } else {
      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...matchIds])));
    }
  };

  // Generated File Name Preview
  const generatedFilename = useMemo(() => {
    const cleanComp = (config.companyName || 'PunchPulse').replace(/[^a-zA-Z0-9]/g, '_');
    if (selectedEmpIds.length === 1) {
      const emp = summaries.find(s => s.empId === selectedEmpIds[0]);
      const cleanName = (emp?.empName || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
      return `${selectedEmpIds[0]}_${cleanName}_Attendance_${startDate}_to_${endDate}.xlsx`;
    }
    if (selectedEmpIds.length > 1) {
      return `${cleanComp}_Selected_${selectedEmpIds.length}_Employees_${startDate}_to_${endDate}.xlsx`;
    }
    if (selectedDept !== 'ALL') {
      return `${cleanComp}_${selectedDept}_Report_${startDate}_to_${endDate}.xlsx`;
    }
    return `${cleanComp}_Master_Payroll_Report_${startDate}_to_${endDate}.xlsx`;
  }, [config.companyName, selectedEmpIds, summaries, selectedDept, startDate, endDate]);

  // Master Export Action
  const handleExecuteExport = () => {
    if (targetRecordsForExport.length === 0 || targetEmployeesForExport.length === 0) {
      alert('No matching attendance records found to export for the selected date range.');
      return;
    }

    setIsExporting(true);
    try {
      if (reportType === 'MASTER') {
        exportMasterReportToExcel(
          targetRecordsForExport,
          targetEmployeesForExport,
          generatedFilename,
          { includePayroll: true, includeDailyLogs: true, includeOvertime: true }
        );
      } else if (reportType === 'PAYROLL') {
        exportPayrollSummaryToExcel(targetEmployeesForExport, generatedFilename);
      } else if (reportType === 'LOGS') {
        exportAttendanceToExcel(targetRecordsForExport, generatedFilename);
      } else if (reportType === 'OVERTIME') {
        exportOvertimeReportToExcel(targetEmployeesForExport, generatedFilename);
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
  const totalWorkforceSelected = targetEmployeesForExport.length;
  const totalDailyRecordsCount = targetRecordsForExport.length;
  const totalPayableDaysSum = Number(targetEmployeesForExport.reduce((acc, e) => acc + e.netPayableDays, 0).toFixed(1));
  const totalOtHoursSum = Number(targetEmployeesForExport.reduce((acc, e) => acc + e.totalOtHours, 0).toFixed(1));

  return (
    <div className="w-full space-y-4">
      {/* 1. MINIMAL SAAS PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            <span>Reports & Export</span>
            {selectedEmpIds.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-200">
                {selectedEmpIds.length} Selected
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter attendance by date, department, or staff and export multi-sheet logs to Excel.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleResetAll}
            title="Reset all filters, dates, and selections to default"
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset All</span>
          </button>

          <button
            onClick={handleExecuteExport}
            disabled={isExporting || totalDailyRecordsCount === 0}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>
              {isExporting 
                ? 'Exporting...' 
                : selectedEmpIds.length > 0 
                  ? `Download Selected (${selectedEmpIds.length})` 
                  : 'Download Full Report (.xlsx)'
              }
            </span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successBanner && (
        <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center space-x-2.5 shadow-2xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="flex-1 truncate">{successBanner}</div>
          <button 
            type="button" 
            onClick={() => setSuccessBanner(null)} 
            className="text-emerald-700 hover:text-emerald-900 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. COMPACT SUMMARY KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Workforce</span>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {selectedEmpIds.length > 0 ? `${selectedEmpIds.length} Staff` : `${summaries.length} Staff`}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date Span Logs</span>
            <div className="text-xl font-black text-blue-700 font-mono mt-0.5">
              {totalDailyRecordsCount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">rows</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Payable</span>
            <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
              {totalPayableDaysSum.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Days</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overtime Total</span>
            <div className="text-xl font-black text-purple-700 font-mono mt-0.5">
              +{totalOtHoursSum.toLocaleString()} <span className="text-xs text-slate-400 font-normal">hrs</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. STREAMLINED FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3">
        {/* Row 1: Date Range, Presets & Export Format */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
          {/* Date Range & Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 mr-1">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
              <span>Period:</span>
            </div>

            <button
              type="button"
              onClick={() => applyDatePreset('FULL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDatePreset === 'FULL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Full Month
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('H1')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDatePreset === 'H1'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              1st - 15th
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('H2')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDatePreset === 'H2'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              16th - 31st
            </button>

            {/* Date Pickers */}
            <div className="flex items-center space-x-1 ml-1 text-xs font-mono">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveDatePreset('CUSTOM');
                  setCurrentPage(1);
                }}
                className="px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold outline-none"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveDatePreset('CUSTOM');
                  setCurrentPage(1);
                }}
                className="px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold outline-none"
              />
            </div>
          </div>

          {/* Export Format Selector */}
          <div className="flex items-center space-x-1">
            <span className="text-xs font-bold text-slate-500 mr-1">Format:</span>
            {(['MASTER', 'PAYROLL', 'LOGS', 'OVERTIME'] as ReportType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setReportType(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportType === type
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type === 'MASTER' && '📦 Master (3-in-1)'}
                {type === 'PAYROLL' && '📊 Payroll'}
                {type === 'LOGS' && '📑 Logs'}
                {type === 'OVERTIME' && '⏱️ OT'}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Search, Multi-Search Action, Department, and Reset Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input with inline clear */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff (comma for multi: Siluvai, Dhanan)..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                  title="Clear search text"
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Action: Select All / Deselect All Found in Search */}
            {searchQuery.trim() && filteredAndSortedEmployees.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectSearchMatches}
                className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  areAllSearchMatchesSelected
                    ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                }`}
              >
                {areAllSearchMatchesSelected ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Deselect {filteredAndSortedEmployees.length} Found</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Select All {filteredAndSortedEmployees.length} Found</span>
                  </>
                )}
              </button>
            )}

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer font-medium"
            >
              <option value="ALL">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Right: Show Selected Toggle & Reset Action */}
          <div className="flex items-center space-x-2 shrink-0">
            {selectedEmpIds.length > 0 && (
              <button
                type="button"
                onClick={() => setShowOnlySelected(!showOnlySelected)}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer transition-all ${
                  showOnlySelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                {showOnlySelected ? 'Show All Table' : `Show Selected (${selectedEmpIds.length}) Only`}
              </button>
            )}

            {/* Table Search & Select Reset Button */}
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all"
              title="Reset all search, selections, and filters to default"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Selected Staff Tags (Crisp, only shown when >= 1 staff selected) */}
        {selectedEmpIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-600 mr-1">Selected Staff ({selectedEmpIds.length}):</span>
            {selectedEmpIds.slice(0, 8).map(id => {
              const emp = summaries.find(s => s.empId === id);
              return (
                <span key={id} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-bold text-slate-800">
                  <span className="font-mono text-slate-400 text-[10px]">{id}</span>
                  <span>{emp?.empName || id}</span>
                  <button 
                    type="button" 
                    onClick={() => toggleSelectEmp(id)} 
                    className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer font-black"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            {selectedEmpIds.length > 8 && (
              <span className="text-xs font-bold text-indigo-700 font-mono px-2 py-0.5 rounded-md bg-indigo-100">
                +{selectedEmpIds.length - 8} more
              </span>
            )}
            <button
              type="button"
              onClick={handleClearAllSelections}
              className="ml-auto text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
            >
              Clear Selected
            </button>
          </div>
        )}
      </div>

      {/* 4. LIVE INTERACTIVE DATA TABLE: Shows All Details by Default */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              Live Attendance & Timesheet Ledger
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-200">
                {filteredAndSortedEmployees.length} Employees in Table
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any row or checkbox to select employees. Date range: {startDate} to {endDate}.
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
                {/* Master Checkbox */}
                <th className="py-3 px-3 text-center w-12">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    title="Select/Deselect visible employees on this page"
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
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
                      onClick={(e) => {
                        // Don't toggle if clicking the individual row export button
                        if ((e.target as HTMLElement).closest('button')) return;
                        toggleSelectEmp(emp.empId);
                      }}
                      className={`transition-colors cursor-pointer select-none ${
                        isChecked 
                          ? 'bg-indigo-50/80 hover:bg-indigo-100/70' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectEmp(emp.empId);
                          }}
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
                      <td className={`py-3 px-4 sticky left-0 z-10 shadow-xs ${
                        isChecked ? 'bg-indigo-50/90 font-bold text-indigo-950' : 'bg-white'
                      }`}>
                        <div className="font-bold text-slate-900 group-hover:text-indigo-900 text-sm flex items-center gap-1.5">
                          {isChecked && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                          <span>{emp.empName}</span>
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

      {/* Floating Bottom Quick Bar when 2 or more employees are checked */}
      {selectedEmpIds.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-indigo-500/40 flex items-center space-x-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold font-mono">
              {selectedEmpIds.length} Employees Selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700"></div>

          <button
            onClick={handleExecuteExport}
            disabled={isExporting}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Selected ({selectedEmpIds.length}) Report</span>
          </button>

          <button
            type="button"
            onClick={handleClearAllSelections}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
