import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { CompanyHoliday, ShiftConfig } from '../types/attendance';
import { 
  fetchCompanyHolidays, 
  createCompanyHoliday, 
  deleteCompanyHoliday, 
  syncCompanyHolidays 
} from '../services/api';
import { Button, Input, Modal } from './common';

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
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Form State
  const [holidayDate, setHolidayDate] = useState<string>('');
  const [holidayName, setHolidayName] = useState<string>('');
  const [holidayType, setHolidayType] = useState<'PUBLIC_HOLIDAY' | 'FESTIVAL' | 'COMPANY_OFF' | 'OPTIONAL'>('PUBLIC_HOLIDAY');
  const [isPaid, setIsPaid] = useState<boolean>(true);

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

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayName.trim()) return;

    setIsSubmitting(true);
    try {
      await createCompanyHoliday({
        date: holidayDate,
        name: holidayName.trim(),
        type: holidayType,
        isPaid,
      });
      setBannerMessage(`Holiday '${holidayName.trim()}' added on ${holidayDate} and synced to attendance logs!`);
      setShowAddModal(false);
      setHolidayDate('');
      setHolidayName('');
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
      setBannerMessage(`Added preset holiday: ${preset.name} (${preset.date})`);
      await loadHolidays();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to add preset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove '${name}' from Company Holidays?`)) return;

    try {
      await deleteCompanyHoliday(id);
      setBannerMessage(`Deleted holiday '${name}' and reverted attendance.`);
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
      setBannerMessage(`All ${holidays.length} company holidays successfully synchronized to attendance logs & Excel sheets!`);
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

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <CalendarDays className="w-4 h-4" />
            <span>Company Leave & Holiday Calendar</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Company Holidays & Leaves</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Dates added here automatically show as <span className="font-semibold text-teal-700">Holiday (HL)</span> in Excel exports, mark payable holiday credit (<span className="font-mono text-emerald-600 font-bold">1.0</span>), and update employee status.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync to Attendance'}</span>
          </Button>

          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4" />
            <span>Add Company Leave</span>
          </Button>
        </div>
      </div>

      {/* 2. Success Banner */}
      {bannerMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{bannerMessage}</span>
          </div>
          <button 
            onClick={() => setBannerMessage(null)}
            className="text-xs text-emerald-600 hover:text-emerald-900 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{holidays.length}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Holidays</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">
              {holidays.filter(h => h.type === 'PUBLIC_HOLIDAY' || h.type === 'COMPANY_OFF').length}
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Public / Company Offs</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">
              {holidays.filter(h => h.type === 'FESTIVAL').length}
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Festival Leaves</div>
          </div>
        </div>
      </div>

      {/* 4. Common Presets Bar */}
      <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-amber-50 rounded-2xl border border-indigo-100/80 p-5">
        <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Quick Preset Suggestions (Click to Add Instantly)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {COMMON_PRESET_HOLIDAYS.map((preset) => {
            const isAlreadyAdded = holidays.some(h => h.date === preset.date);
            return (
              <button
                key={preset.date}
                onClick={() => !isAlreadyAdded && handleAddPreset(preset)}
                disabled={isAlreadyAdded || isSubmitting}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                  isAlreadyAdded
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-xs shadow-2xs'
                }`}
                title={isAlreadyAdded ? 'Already added to calendar' : `Add ${preset.name} on ${preset.date}`}
              >
                <span>{preset.name}</span>
                <span className="font-mono text-[11px] text-slate-400">({preset.date.slice(5)})</span>
                {isAlreadyAdded && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Holidays Grid & List View */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Scheduled Company Leave Dates</h3>
          <span className="text-xs text-slate-500 font-mono font-medium">{holidays.length} Dates Configured</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading holidays from database...
          </div>
        ) : holidays.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No company leaves configured yet.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click 'Add Company Leave' or pick from the preset suggestions above to schedule company holidays.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {holidays.map((h) => {
              const dInfo = formatDateDisplay(h.date);
              return (
                <div key={h.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center space-x-4">
                    {/* Date Block */}
                    <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{dInfo.month}</span>
                      <span className="text-lg font-black text-indigo-900 leading-tight">{dInfo.day}</span>
                    </div>

                    {/* Holiday Details */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-900 text-base">{h.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          h.type === 'FESTIVAL'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : h.type === 'COMPANY_OFF'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-teal-50 text-teal-800 border-teal-200'
                        }`}>
                          {h.type.replace('_', ' ')}
                        </span>
                        {h.isPaid && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Paid (1.0d)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center space-x-3 font-mono">
                        <span>{h.date}</span>
                        <span>•</span>
                        <span>{dInfo.weekday}</span>
                        <span>•</span>
                        <span className="text-slate-400">Excel Status: Muster 'HL' | Holiday: 1.0</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteHoliday(h.id, h.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* 6. Add Company Holiday Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Company Leave / Holiday"
      >
        <form onSubmit={handleAddHoliday} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Holiday Date (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Holiday Name / Reason
            </label>
            <Input
              type="text"
              placeholder="e.g. Gandhi Jayanti, Diwali, Annual Day"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Holiday Category
            </label>
            <select
              value={holidayType}
              onChange={(e) => setHolidayType(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="PUBLIC_HOLIDAY">Public Holiday (National / State)</option>
              <option value="FESTIVAL">Festival (Diwali, Pongal, Eid, Christmas)</option>
              <option value="COMPANY_OFF">Company Declared Off</option>
              <option value="OPTIONAL">Optional / Restricted Leave</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isPaid"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="isPaid" className="text-xs font-medium text-slate-700 cursor-pointer">
              Mark as Paid Holiday (Employees receive <span className="font-bold text-emerald-600">1.0 Day</span> payable credit)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? 'Saving...' : 'Add to Calendar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
