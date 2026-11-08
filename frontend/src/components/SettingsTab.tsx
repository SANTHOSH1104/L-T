import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  Sparkles,
  ShieldCheck,
  Building2,
  Sliders,
  Database,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { ShiftConfig, ShiftDefinition } from '../types/attendance';
import { DEFAULT_SHIFT_CONFIG, DEFAULT_SHIFTS } from '../utils/calculator';
import { clearAllLogsInDb } from '../services/api';

interface SettingsTabProps {
  config: ShiftConfig;
  onSaveConfig: (newConfig: ShiftConfig) => void;
  onRefreshData?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  config,
  onSaveConfig,
  onRefreshData,
}) => {
  const [formData, setFormData] = useState<ShiftConfig>(config);
  const [shifts, setShifts] = useState<ShiftDefinition[]>(() => {
    return (config.shifts && config.shifts.length > 0) ? config.shifts : DEFAULT_SHIFTS;
  });
  const [savedAlert, setSavedAlert] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({ ...formData, shifts });
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  const handleResetDefaults = () => {
    setFormData(DEFAULT_SHIFT_CONFIG);
    setShifts(DEFAULT_SHIFTS);
  };

  const handleUpdateShift = (index: number, field: keyof ShiftDefinition, value: any) => {
    setShifts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearAllLogsInDb();
      setShowClearConfirm(false);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to clear logs:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Shift & Calculation Policy Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure working hours, half-day thresholds, late arrival grace time, and overtime rules.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {savedAlert && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings saved! All attendance and overtime records have been automatically recalculated.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Company Profile */}
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm mb-3">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Organization Profile</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization Name</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-hidden font-medium"
            />
          </div>
        </div>

        {/* Shift Timings */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm mb-3">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Default Shift Timings (Fallback)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Shift Start Time (24h or HH:MM)</label>
              <input
                type="text"
                value={formData.shiftStart}
                onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800"
                placeholder="08:30"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default start time for general shift</p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Shift End Time (24h or HH:MM)</label>
              <input
                type="text"
                value={formData.shiftEnd}
                onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800"
                placeholder="17:30"
              />
              <p className="text-[11px] text-slate-400 mt-1">Punch out before this flags Early Exit</p>
            </div>
          </div>
        </div>

        {/* Multi-Shift Rules (KG, K1, K2, K3, K6) */}
        <div className="border-t border-slate-100 pt-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Multi-Shift Timing Rules (KG, K1, K2, K3, K6)</span>
            </div>
            <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
              Excel Shift code base panni In/Out automatic-ah verify aagum
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Shift Name</th>
                  <th className="py-2.5 px-3">Start (In)</th>
                  <th className="py-2.5 px-3">End (Out)</th>
                  <th className="py-2.5 px-3">Grace</th>
                  <th className="py-2.5 px-3 text-center">Overnight?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.map((s, idx) => (
                  <tr key={s.shiftCode} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {s.shiftCode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={s.shiftName}
                        onChange={(e) => handleUpdateShift(idx, 'shiftName', e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 text-slate-800 font-medium"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={s.shiftStart}
                        onChange={(e) => handleUpdateShift(idx, 'shiftStart', e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg border border-slate-200 font-mono font-bold text-slate-800"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={s.shiftEnd}
                        onChange={(e) => handleUpdateShift(idx, 'shiftEnd', e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg border border-slate-200 font-mono font-bold text-slate-800"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        value={s.graceMinutes}
                        onChange={(e) => handleUpdateShift(idx, 'graceMinutes', parseInt(e.target.value, 10) || 0)}
                        className="w-16 px-2 py-1 rounded-lg border border-slate-200 font-mono text-slate-800"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(s.isOvernight)}
                        onChange={(e) => handleUpdateShift(idx, 'isOvernight', e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance Thresholds */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm mb-3">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Work Duration Thresholds (Hours)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Day Minimum (hrs)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="16"
                value={formData.fullDayHours}
                onChange={(e) => setFormData({ ...formData, fullDayHours: parseFloat(e.target.value) || 8 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">Present status requires &gt;= this</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Half Day Minimum (hrs)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="12"
                value={formData.halfDayHours}
                onChange={(e) => setFormData({ ...formData, halfDayHours: parseFloat(e.target.value) || 4 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">Below this is marked Absent</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Late Grace Window (mins)</label>
              <input
                type="number"
                step="5"
                min="0"
                max="60"
                value={formData.graceMinutes}
                onChange={(e) => setFormData({ ...formData, graceMinutes: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">Allowed delay past shift start</p>
            </div>
          </div>
        </div>

        {/* Overtime Policies */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm mb-3">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Overtime (OT) Policy & Qualification</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">OT Shift Threshold (hrs)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="16"
                value={formData.otThresholdHours}
                onChange={(e) => setFormData({ ...formData, otThresholdHours: parseFloat(e.target.value) || 8 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">Working time exceeding this is considered extra</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Min. OT Qualifying Duration (hrs)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="8"
                value={formData.minOtQualifyHours ?? 2.0}
                onChange={(e) => setFormData({ ...formData, minOtQualifyHours: parseFloat(e.target.value) || 2.0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800 font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">Must complete at least 2 full hours for OT (strictly tracked in hours)</p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Save & Recalculate All Records</span>
          </button>
        </div>
      </form>

      {/* Database Connection & Maintenance Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
          <Database className="w-4 h-4 text-emerald-600" />
          <span>Active Database Connection</span>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Database Engine</span>
            <span className="font-bold text-slate-800">XAMPP MySQL (MariaDB)</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Host & Port</span>
            <span className="font-mono font-bold text-slate-800">localhost:3306</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Database Name</span>
            <span className="font-mono font-bold text-emerald-600">punchpulse_hr</span>
          </div>
        </div>

        {/* Danger Zone: Clear Attendance Logs */}
        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-rose-700">Clear Attendance Database Records</h4>
            <p className="text-[11px] text-slate-500">
              Permanently wipe all attendance logs from MySQL to start fresh for a new month.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Wipe All Logs</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Wipe All Attendance Records?</h3>
            <p className="text-xs text-slate-500">
              This will permanently delete all attendance logs from the XAMPP MySQL database (`punchpulse_hr`). This action cannot be undone.
            </p>

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClearAll}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 cursor-pointer disabled:opacity-50"
              >
                {isClearing ? 'Clearing Database...' : 'Yes, Wipe Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

