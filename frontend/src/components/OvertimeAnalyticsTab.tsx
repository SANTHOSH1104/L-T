import React, { useMemo, useState } from 'react';
import { 
  Clock, 
  Users, 
  TrendingUp, 
  Building2, 
  Award,
  Zap,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarCheck
} from 'lucide-react';
import { EmployeeSummary, ShiftConfig } from '../types/attendance';
import { exportOvertimeReportToExcel } from '../utils/excelParser';

interface OvertimeAnalyticsTabProps {
  summaries: EmployeeSummary[];
  config: ShiftConfig;
}

type OtTier = 'ALL' | 'HEAVY' | 'MODERATE' | 'LOW' | 'ZERO';
type SortOption = 'OT_DESC' | 'OT_ASC' | 'PAYABLE_DESC' | 'PRESENT_DESC' | 'NAME_ASC' | 'ID_ASC';

export const OvertimeAnalyticsTab: React.FC<OvertimeAnalyticsTabProps> = ({
  summaries,
  config,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<OtTier>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('OT_DESC');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Normalize department name to eliminate casing duplicate bugs like "TVC & CO" vs "TVC & Co"
  const normalizedSummaries = useMemo(() => {
    return summaries.map(s => ({
      ...s,
      cleanDept: (s.department || 'GENERAL').trim().toUpperCase()
    }));
  }, [summaries]);

  // Unique departments for filter dropdown
  const departmentOptions = useMemo(() => {
    const depts = new Set<string>();
    normalizedSummaries.forEach(s => depts.add(s.cleanDept));
    return Array.from(depts).sort();
  }, [normalizedSummaries]);

  // Aggregated Department OT metrics
  const deptOtMap = useMemo(() => {
    const map = new Map<string, { totalOtHours: number; totalOtDuties: number; employeeCount: number; otStaffCount: number }>();
    normalizedSummaries.forEach(s => {
      const existing = map.get(s.cleanDept) || { totalOtHours: 0, totalOtDuties: 0, employeeCount: 0, otStaffCount: 0 };
      existing.totalOtHours = Number((existing.totalOtHours + s.totalOtHours).toFixed(2));
      existing.totalOtDuties = Number((existing.totalOtDuties + (s.totalOtDuties || 0)).toFixed(2));
      existing.employeeCount += 1;
      if (s.totalOtHours > 0) existing.otStaffCount += 1;
      map.set(s.cleanDept, existing);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].totalOtHours - a[1].totalOtHours);
  }, [normalizedSummaries]);

  // Overall Company Attendance & OT Totals
  const totalOtHours = useMemo(() => {
    return Number(normalizedSummaries.reduce((acc, s) => acc + s.totalOtHours, 0).toFixed(1));
  }, [normalizedSummaries]);

  const totalOtDuties = useMemo(() => {
    return Number(normalizedSummaries.reduce((acc, s) => acc + (s.totalOtDuties || 0), 0).toFixed(1));
  }, [normalizedSummaries]);

  const otQualifiedStaff = useMemo(() => {
    return normalizedSummaries.filter(s => s.totalOtHours > 0).length;
  }, [normalizedSummaries]);

  const avgOtPerWorker = useMemo(() => {
    return otQualifiedStaff > 0 ? (totalOtHours / otQualifiedStaff).toFixed(1) : '0.0';
  }, [totalOtHours, otQualifiedStaff]);

  // Tier counts
  const tierCounts = useMemo(() => {
    return {
      all: normalizedSummaries.length,
      heavy: normalizedSummaries.filter(s => s.totalOtHours >= 50).length,
      moderate: normalizedSummaries.filter(s => s.totalOtHours >= 20 && s.totalOtHours < 50).length,
      low: normalizedSummaries.filter(s => s.totalOtHours > 0 && s.totalOtHours < 20).length,
      zero: normalizedSummaries.filter(s => s.totalOtHours === 0).length,
    };
  }, [normalizedSummaries]);

  // Filtered and sorted employee list
  const filteredEmployees = useMemo(() => {
    return normalizedSummaries
      .filter(s => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = s.empName.toLowerCase().includes(q);
          const matchId = s.empId.toLowerCase().includes(q);
          const matchDept = s.cleanDept.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchDept) return false;
        }

        // Department filter
        if (selectedDept !== 'ALL' && s.cleanDept !== selectedDept) {
          return false;
        }

        // Tier filter
        if (selectedTier === 'HEAVY' && s.totalOtHours < 50) return false;
        if (selectedTier === 'MODERATE' && (s.totalOtHours < 20 || s.totalOtHours >= 50)) return false;
        if (selectedTier === 'LOW' && (s.totalOtHours <= 0 || s.totalOtHours >= 20)) return false;
        if (selectedTier === 'ZERO' && s.totalOtHours > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'OT_DESC') return b.totalOtHours - a.totalOtHours;
        if (sortBy === 'OT_ASC') return a.totalOtHours - b.totalOtHours;
        if (sortBy === 'PAYABLE_DESC') return b.netPayableDays - a.netPayableDays;
        if (sortBy === 'PRESENT_DESC') return b.presentDays - a.presentDays;
        if (sortBy === 'NAME_ASC') return a.empName.localeCompare(b.empName);
        if (sortBy === 'ID_ASC') return a.empId.localeCompare(b.empId);
        return 0;
      });
  }, [normalizedSummaries, searchQuery, selectedDept, selectedTier, sortBy]);

  // Pagination calculation
  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredEmployees.length / pageSize);
  const paginatedEmployees = useMemo(() => {
    if (pageSize === -1) return filteredEmployees;
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Handle Export (Attendance and Overtime Duty Report)
  const handleExport = () => {
    exportOvertimeReportToExcel(filteredEmployees, 'October_2026_Overtime_Duty_Audit.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER: Executive OT Intelligence Summary */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-6 sm:p-7 text-white shadow-xl border border-purple-900/40">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
              <Calendar className="w-3.5 h-3.5" />
              <span>Audit Period: October 2026 (01 Oct - 31 Oct)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              <span>100% Real MySQL Data</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Overtime (OT) Intelligence & Duty Audit
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/80 max-w-2xl leading-relaxed">
              Biometric-verified overtime hours, accumulated OT duty days, and department workload breakdown.
              Provides verified present days and overtime totals for internal payroll calculation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleExport}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export OT Duty Audit (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOP 4 KPI CARDS: Key Overtime & Duty Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Overtime Hours */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Overtime Logged</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {totalOtHours.toLocaleString()} <span className="text-sm font-medium text-slate-500 font-sans">hrs</span>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-purple-700 bg-purple-50/80 px-2.5 py-1 rounded-lg w-fit font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
              <span>Daily duty past {config.otThresholdHours || 8}h threshold</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Overtime Duty Days */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total OT Duty Days</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight font-mono">
              {totalOtDuties.toLocaleString()} <span className="text-sm font-medium text-slate-500 font-sans">days</span>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg w-fit font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Accumulated OT shifts earned</span>
            </div>
          </div>
        </div>

        {/* Card 3: Overtime Eligible Workforce */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">OT Qualified Workforce</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-indigo-700 tracking-tight font-mono">
              {otQualifiedStaff} <span className="text-sm font-medium text-slate-500 font-sans">/ {normalizedSummaries.length} staff</span>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg w-fit font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>{((otQualifiedStaff / (normalizedSummaries.length || 1)) * 100).toFixed(1)}% of total workforce</span>
            </div>
          </div>
        </div>

        {/* Card 4: Overtime Intensity / Average */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. OT per Worker</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight font-mono">
              {avgOtPerWorker} <span className="text-sm font-medium text-slate-500 font-sans">hrs / person</span>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg w-fit font-medium">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Min. {config.minOtQualifyHours ?? 2.0}h threshold rule</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DEPARTMENT BREAKDOWN & TOP TIERS PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Breakdown (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">Department Overtime & Duty Breakdown</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {deptOtMap.length} Department{deptOtMap.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3">
            {deptOtMap.map(([dept, data]) => {
              const pct = totalOtHours > 0 ? Math.round((data.totalOtHours / totalOtHours) * 100) : 0;
              const avgDeptOt = data.otStaffCount > 0 ? (data.totalOtHours / data.otStaffCount).toFixed(1) : '0.0';

              return (
                <div key={dept} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{dept}</span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">
                        {data.otStaffCount} / {data.employeeCount} Staff Logged OT
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-extrabold text-purple-700 text-sm">
                        {data.totalOtHours} hrs
                      </span>
                      <span className="text-slate-400 text-xs ml-1.5 font-medium">({pct}%)</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span className="font-mono font-medium">Avg: {avgDeptOt} hrs / OT worker</span>
                    <span className="font-mono font-bold text-emerald-700">Accumulated OT: {data.totalOtDuties} Duty Days</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier Distribution Cards (1 col on lg) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-800 text-sm">OT Intensity Classification</h3>
            </div>
            <span className="text-[11px] text-slate-400">Monthly breakdown</span>
          </div>

          <div className="space-y-2.5">
            {/* Heavy OT */}
            <button
              type="button"
              onClick={() => { setSelectedTier('HEAVY'); setCurrentPage(1); }}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                selectedTier === 'HEAVY'
                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20'
                  : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-rose-800">Heavy Overtime (&gt; 50 hrs)</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-rose-100 text-rose-700">
                  {tierCounts.heavy} Staff
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">High workload • Priority duty verification</p>
            </button>

            {/* Moderate OT */}
            <button
              type="button"
              onClick={() => { setSelectedTier('MODERATE'); setCurrentPage(1); }}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                selectedTier === 'MODERATE'
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
                  : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-amber-800">Moderate OT (20 - 50 hrs)</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-amber-100 text-amber-700">
                  {tierCounts.moderate} Staff
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Regular overtime contribution</p>
            </button>

            {/* Low OT */}
            <button
              type="button"
              onClick={() => { setSelectedTier('LOW'); setCurrentPage(1); }}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                selectedTier === 'LOW'
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/20'
                  : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-blue-800">Low Overtime (1 - 20 hrs)</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-blue-100 text-blue-700">
                  {tierCounts.low} Staff
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Occasional extra shifts</p>
            </button>

            {/* Zero OT */}
            <button
              type="button"
              onClick={() => { setSelectedTier('ZERO'); setCurrentPage(1); }}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                selectedTier === 'ZERO'
                  ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20'
                  : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-slate-700">Zero Overtime (0 hrs)</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-slate-200 text-slate-700">
                  {tierCounts.zero} Staff
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Standard shift duty only</p>
            </button>
          </div>
        </div>
      </div>

      {/* 4. AUDIT DATA TABLE: Filters, Search, and Employee Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                Detailed Employee Overtime & Attendance Ledger
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-mono font-bold">
                  {filteredEmployees.length} Results
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified ledger of Present Days, Net Payable Days, and Overtime Hours ready for internal salary processing.
              </p>
            </div>

            {/* Tier Filters Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => { setSelectedTier('ALL'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedTier === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({tierCounts.all})
              </button>
              <button
                type="button"
                onClick={() => { setSelectedTier('HEAVY'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedTier === 'HEAVY'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Heavy &gt;50h ({tierCounts.heavy})
              </button>
              <button
                type="button"
                onClick={() => { setSelectedTier('MODERATE'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedTier === 'MODERATE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Moderate ({tierCounts.moderate})
              </button>
              <button
                type="button"
                onClick={() => { setSelectedTier('LOW'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedTier === 'LOW'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Low ({tierCounts.low})
              </button>
              <button
                type="button"
                onClick={() => { setSelectedTier('ZERO'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedTier === 'ZERO'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Zero ({tierCounts.zero})
              </button>
            </div>
          </div>

          {/* Search, Dept Filter, Sort & Page Size Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Name or Emp ID..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 outline-none transition-all"
              />
            </div>

            {/* Department Filter */}
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {departmentOptions.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="OT_DESC">Sort: Overtime (High to Low)</option>
                <option value="OT_ASC">Sort: Overtime (Low to High)</option>
                <option value="PAYABLE_DESC">Sort: Net Payable Days (High to Low)</option>
                <option value="PRESENT_DESC">Sort: Present Days (High to Low)</option>
                <option value="NAME_ASC">Sort: Employee Name (A-Z)</option>
                <option value="ID_ASC">Sort: Employee ID (A-Z)</option>
              </select>
            </div>

            {/* Page Size */}
            <div className="flex items-center space-x-2 justify-end">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 outline-none cursor-pointer font-bold"
              >
                <option value={15}>15 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
                <option value={-1}>All records</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12"># Rank</th>
                <th className="py-3 px-4 sticky left-0 bg-slate-50 z-10 shadow-xs">Employee Details</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3 text-center font-bold text-slate-800">Present Days</th>
                <th className="py-3 px-3 text-right">Work Hours</th>
                <th className="py-3 px-3 text-right font-black text-purple-900">Total OT Hours</th>
                <th className="py-3 px-3 text-center">OT Duty Days</th>
                <th className="py-3 px-3 text-right font-black text-emerald-800">Net Payable Days</th>
                <th className="py-3 px-3 text-center">Status Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Clock className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">No matching employees found</p>
                      <p className="text-xs text-slate-400">Try adjusting your search query or tier filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp, idx) => {
                  const globalRank = (pageSize === -1 ? 0 : (currentPage - 1) * pageSize) + idx + 1;

                  // Tier badge styling
                  let tierBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                      Zero OT
                    </span>
                  );
                  if (emp.totalOtHours >= 50) {
                    tierBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                        Heavy &gt;50h
                      </span>
                    );
                  } else if (emp.totalOtHours >= 20) {
                    tierBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        Moderate
                      </span>
                    );
                  } else if (emp.totalOtHours > 0) {
                    tierBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                        Low OT
                      </span>
                    );
                  }

                  return (
                    <tr key={emp.empId} className="hover:bg-purple-50/30 transition-colors group">
                      {/* Rank */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                        {globalRank <= 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                            {globalRank}
                          </span>
                        ) : (
                          globalRank
                        )}
                      </td>

                      {/* Employee (Sticky Left Column) */}
                      <td className="py-3 px-4 sticky left-0 bg-white group-hover:bg-purple-50/50 z-10 shadow-xs">
                        <div className="font-bold text-slate-900 group-hover:text-purple-900 text-sm">
                          {emp.empName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {emp.empId}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {emp.cleanDept}
                      </td>

                      {/* Present Days */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {emp.presentDays}
                      </td>

                      {/* Regular Work Hours */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {emp.totalWorkHours.toFixed(1)}h
                      </td>

                      {/* Total OT Hours */}
                      <td className="py-3 px-3 text-right">
                        {emp.totalOtHours > 0 ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-purple-100/80 text-purple-900 font-mono font-black text-xs">
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
                            {Number(emp.totalOtDuties.toFixed(3))} days
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Net Payable Days (Ready for internal salary calculation!) */}
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-emerald-800">
                        {emp.netPayableDays.toFixed(1)} Days
                      </td>

                      {/* Status Tier */}
                      <td className="py-3 px-3 text-center">
                        {tierBadge}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pageSize !== -1 && totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-800">
                {Math.min(currentPage * pageSize, filteredEmployees.length)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{filteredEmployees.length}</span> employees
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
                          ? 'bg-purple-600 text-white shadow-xs'
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
