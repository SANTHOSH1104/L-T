import React, { useState, useEffect, useMemo } from 'react';
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  Calendar,
  Gift,
  Building,
  AlertCircle,
  Clock,
  Check,
  Search,
  Filter,
  X,
  PartyPopper,
  Tag,
  ChevronRight,
  Sun
} from 'lucide-react';
import { CompanyHoliday, ShiftConfig } from '../types/attendance';
import { 
  fetchCompanyHolidays, 
  createCompanyHoliday, 
  deleteCompanyHoliday, 
  syncCompanyHolidays 
} from '../services/api';
import { Modal, Button, Input } from './common';

interface CompanyLeaveTabProps {
  config: ShiftConfig;
  onRefreshData?: () => void;
}

const COMMON_PRESET_HOLIDAYS = [
  { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'PUBLIC_HOLIDAY', isPaid: true },
  { date: '2026-10-19', name: 'Ayudha Pooja / Vijaya Dashami', type: 'FESTIVAL', isPaid: true },
  { date: '2026-11-08', name: 'Diwali / Deepavali', type: 'FESTIVAL', isPaid: true },
  { date: '2026-12-25', name: 'Christmas Day', type: 'PUBLIC_HOLIDAY', isPaid: true },
  { date: '2027-01-01', name: 'New Year Day', type: 'COMPANY_OFF', isPaid: true },
  { date: '2027-01-14', name: 'Pongal / Makar Sankranti', type: 'FESTIVAL', isPaid: true },
  { date: '2027-01-26', name: 'Republic Day', type: 'PUBLIC_HOLIDAY', isPaid: true },
  { date: '2027-05-01', name: 'May Day (Workers Day)', type: 'PUBLIC_HOLIDAY', isPaid: true },
  { date: '2027-08-15', name: 'Independence Day', type: 'PUBLIC_HOLIDAY', isPaid: true },
];

export const CompanyLeaveTab: React.FC<CompanyLeaveTabProps> = ({ config, onRefreshData }) => {
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Modal State for Add New Holiday
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [holidayDate, setHolidayDate] = useState<string>('');
  const [holidayName, setHolidayName] = useState<string>('');
  const [holidayType, setHolidayType] = useState<'PUBLIC_HOLIDAY' | 'FESTIVAL' | 'COMPANY_OFF' | 'OPTIONAL'>('PUBLIC_HOLIDAY');
  const [isPaid, setIsPaid] = useState<boolean>(true);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [paidFilter, setPaidFilter] = useState<string>('ALL');

  const loadHolidays = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCompanyHolidays();
      setHolidays(data);
    } catch (err) {
      console.error('Failed to load holidays:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const handleCreateNewHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayName.trim()) {
      alert('Please enter both Holiday Date and Holiday Name!');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCompanyHoliday({
        date: holidayDate.trim(),
        name: holidayName.trim(),
        type: holidayType,
        isPaid,
      });

      setBannerMessage(`New Holiday '${holidayName.trim()}' successfully created for ${holidayDate}! Attendance logs & Excel exports auto-calculated.`);
      setHolidayDate('');
      setHolidayName('');
      setIsAddModalOpen(false);
      await loadHolidays();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to add holiday');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPreset = async (preset: typeof COMMON_PRESET_HOLIDAYS[0]) => {
    setIsSubmitting(true);
    try {
      await createCompanyHoliday(preset);
      setBannerMessage(`Added holiday: ${preset.name} (${preset.date}) and applied to logs!`);
      await loadHolidays();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to add preset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove '${name}' from Company Holidays? Attendance logs will revert.`)) return;

    try {
      await deleteCompanyHoliday(id);
      setBannerMessage(`Deleted holiday '${name}' and reverted attendance status.`);
      await loadHolidays();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete holiday');
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await syncCompanyHolidays();
      setBannerMessage(`All ${holidays.length} company holidays successfully synchronized to attendance logs & Excel export!`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to sync holidays');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const parts = dateStr.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return {
        month: d.toLocaleString('en-US', { month: 'short' }),
        day: parts[2],
        weekday: d.toLocaleString('en-US', { weekday: 'long' }),
        year: parts[0]
      };
    } catch {
      return { month: '---', day: 0, weekday: '', year: 2026 };
    }
  };

  // Extract unique years from configured holidays
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    holidays.forEach(h => {
      const y = h.date.split('-')[0];
      if (y) years.add(y);
    });
    return Array.from(years).sort();
  }, [holidays]);

  // Filtered Holidays
  const filteredHolidays = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return holidays
      .filter(h => {
        const matchSearch = 
          !cleanSearch || 
          h.name.toLowerCase().includes(cleanSearch) || 
          h.date.includes(cleanSearch) ||
          h.type.toLowerCase().includes(cleanSearch);

        let matchCategory = true;
        if (categoryFilter !== 'ALL') {
          matchCategory = h.type === categoryFilter;
        }

        let matchYear = true;
        if (yearFilter !== 'ALL') {
          matchYear = h.date.startsWith(yearFilter);
        }

        let matchPaid = true;
        if (paidFilter === 'PAID') matchPaid = Boolean(h.isPaid);
        else if (paidFilter === 'UNPAID') matchPaid = !h.isPaid;

        return matchSearch && matchCategory && matchYear && matchPaid;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, searchTerm, categoryFilter, yearFilter, paidFilter]);

  // Next Upcoming Holiday Calculation
  const nextUpcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const future = holidays.filter(h => h.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    return future.length > 0 ? future[0] : (holidays.length > 0 ? holidays[0] : null);
  }, [holidays]);

  const totalPaidHolidays = holidays.filter(h => h.isPaid).length;

  return (
    <div className="w-full space-y-6">
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
            <span>ANNUAL HOLIDAY & LEAVE CALENDAR</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Company Leave & Holiday Management
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Configure annual gazetted holidays and festival days. Dates configured here auto-credit <strong className="text-emerald-400 font-bold">1.0 Day</strong> (Muster <span className="font-mono text-amber-300 font-bold">HL</span>) and automatically apply during Excel uploads.
          </p>
        </div>

        {/* Action Buttons in Banner */}
        <div className="flex items-center gap-3 shrink-0 relative z-10 flex-wrap">
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer shadow-xs disabled:opacity-50"
            title="Sync holidays to database attendance logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync to Attendance'}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Company Holiday</span>
          </button>
        </div>
      </div>

      {/* 2. SUCCESS NOTIFICATION BANNER */}
      {bannerMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span>{bannerMessage}</span>
          </div>
          <button 
            onClick={() => setBannerMessage(null)}
            className="p-1 text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. THREE SLEEK KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Holidays */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Holidays</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{holidays.length}</span>
              <span className="text-xs font-semibold text-slate-500">Days</span>
            </div>
            <p className="text-xs font-medium text-indigo-600 mt-1">
              Active in MySQL Calendar
            </p>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">
            Auto-detected during file upload
          </p>
        </div>

        {/* Card 2: Paid Leave Credits */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paid Leave Credit</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{totalPaidHolidays}</span>
              <span className="text-xs font-semibold text-emerald-600">Paid Days</span>
            </div>
            <p className="text-xs font-medium text-slate-600 mt-1">
              1.0 Day Credit per employee
            </p>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">
            Muster marked as 'HL' (Holiday)
          </p>
        </div>

        {/* Card 3: Next Upcoming Holiday */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Next Holiday</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <PartyPopper className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">
              {nextUpcoming ? nextUpcoming.name : 'No Upcoming'}
            </div>
            <p className="text-xs font-bold text-amber-700 mt-1 font-mono">
              {nextUpcoming ? nextUpcoming.date : 'All Passed'}
            </p>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Auto-marked on biometric logs
          </p>
        </div>
      </div>

      {/* 4. SEARCH & FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] sm:min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search holiday name, date (e.g. Diwali, 2026-10)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-indigo-500 outline-none font-medium transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="PUBLIC_HOLIDAY">Public Holiday</option>
            <option value="FESTIVAL">Festival</option>
            <option value="COMPANY_OFF">Company Declared Off</option>
            <option value="OPTIONAL">Optional Leave</option>
          </select>

          {/* Year Filter */}
          {availableYears.length > 1 && (
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Years</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          {/* Paid Status Filter */}
          <select
            value={paidFilter}
            onChange={(e) => setPaidFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Credits</option>
            <option value="PAID">Paid Only (1.0d)</option>
            <option value="UNPAID">Unpaid Offs</option>
          </select>

          {(searchTerm || categoryFilter !== 'ALL' || yearFilter !== 'ALL' || paidFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('ALL');
                setYearFilter('ALL');
                setPaidFilter('ALL');
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 5. QUICK COMMON PRESETS STRIP (Compact Shortcuts) */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-2">
        <div className="flex items-center space-x-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick 1-Click Preset Shortcuts</span>
          <span className="text-[11px] font-normal text-slate-400 lowercase">(click to add directly)</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {COMMON_PRESET_HOLIDAYS.map((preset) => {
            const isAlreadyAdded = holidays.some(h => h.date === preset.date);
            return (
              <button
                key={preset.date}
                onClick={() => !isAlreadyAdded && handleAddPreset(preset)}
                disabled={isAlreadyAdded || isSubmitting}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 ${
                  isAlreadyAdded
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default opacity-85'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-xs shadow-2xs cursor-pointer active:scale-98'
                }`}
                title={isAlreadyAdded ? 'Already added to calendar' : `Add ${preset.name} on ${preset.date}`}
              >
                <span>{preset.name}</span>
                <span className="font-mono text-[10px] text-slate-400">({preset.date.slice(5)})</span>
                {isAlreadyAdded && <Check className="w-3.5 h-3.5 text-emerald-600 ml-1 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. HOLIDAYS LIST VIEW */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Scheduled Company Leave Calendar</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredHolidays.length} / {holidays.length} Dates
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Active in Database
          </span>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-200"></div>
                  <div className="space-y-2">
                    <div className="w-44 h-4 bg-slate-200 rounded-md"></div>
                    <div className="w-64 h-3 bg-slate-100 rounded-md"></div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-200"></div>
              </div>
            ))}
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No matching company holidays found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search keywords, or click "+ Add Company Holiday" to create a new one.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700 cursor-pointer"
            >
              + Create Holiday
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredHolidays.map((h) => {
              const dInfo = formatDateDisplay(h.date);
              return (
                <div key={h.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors group">
                  <div className="flex items-center space-x-4">
                    {/* Date Block */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/60 border border-indigo-200/60 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                      <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">{dInfo.month}</span>
                      <span className="text-xl font-black text-indigo-950 leading-tight">{dInfo.day}</span>
                    </div>

                    {/* Holiday Details */}
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">{h.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          h.type === 'FESTIVAL'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : h.type === 'COMPANY_OFF'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-teal-50 text-teal-800 border-teal-200'
                        }`}>
                          {h.type.replace('_', ' ')}
                        </span>
                        {h.isPaid ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Paid (1.0d)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Unpaid
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex items-center space-x-3 font-mono flex-wrap gap-y-1">
                        <span className="font-bold text-slate-700">{h.date}</span>
                        <span>•</span>
                        <span>{dInfo.weekday}</span>
                        <span>•</span>
                        <span className="text-teal-700 font-semibold">Muster: 'HL' | Holiday Credit: 1.0</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteHoliday(h.id, h.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete Holiday"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. MODAL DIALOG: ADD NEW CUSTOM COMPANY HOLIDAY */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Company Holiday"
        subtitle="Configured dates auto-apply during Excel biometric uploads and daily calculations"
        maxWidth="md"
      >
        <form onSubmit={handleCreateNewHoliday} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Holiday Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Holiday Name / Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Diwali, Pongal, Annual Day, Rain Holiday"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={holidayType}
              onChange={(e) => setHolidayType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="PUBLIC_HOLIDAY">Public Holiday (National / State Gazetted)</option>
              <option value="FESTIVAL">Festival (Diwali, Pongal, Christmas, Eid)</option>
              <option value="COMPANY_OFF">Company Declared Off / Foundation Day</option>
              <option value="OPTIONAL">Optional / Restricted Leave</option>
            </select>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center space-x-2.5">
            <input
              type="checkbox"
              id="modalIsPaid"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="modalIsPaid" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
              Mark as <strong className="text-emerald-800">Paid Holiday (1.0 Day Credit)</strong>. Non-punched employees receive full day pay credit.
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              icon={<Sparkles className="w-4 h-4 text-amber-300" />}
            >
              Create & Apply Holiday
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
