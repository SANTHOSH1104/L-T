import React, { useState, useMemo } from 'react';
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
  AlertTriangle,
  Moon,
  Sun,
  Flame,
  HelpCircle,
  Play,
  ArrowRight,
  Zap,
  Layers,
  CalendarCheck,
  Award
} from 'lucide-react';
import { ShiftConfig, ShiftDefinition } from '../types/attendance';
import { DEFAULT_SHIFT_CONFIG, DEFAULT_SHIFTS, processAttendanceRecord } from '../utils/calculator';
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

  // Live Rule Simulator State
  const [simInTime, setSimInTime] = useState('08:35');
  const [simOutTime, setSimOutTime] = useState('19:45');
  const [simShift, setSimShift] = useState('KG');

  // Preview simulation
  const simResult = useMemo(() => {
    const activeConfig: ShiftConfig = { ...formData, shifts };
    return processAttendanceRecord(
      'sim_1',
      'SIM101',
      'Test Employee',
      'Engineering',
      '2026-10-01',
      simInTime,
      simOutTime,
      activeConfig,
      { shift: simShift }
    );
  }, [formData, shifts, simInTime, simOutTime, simShift]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({ ...formData, shifts });
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3500);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all shift timings and calculation rules back to factory defaults?')) {
      setFormData(DEFAULT_SHIFT_CONFIG);
      setShifts(DEFAULT_SHIFTS);
    }
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

  // Shift badge color mapper
  const getShiftColor = (code: string) => {
    switch (code) {
      case 'KG': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'K1': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'K2': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'K3': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'K6': return 'bg-teal-50 text-teal-700 border-teal-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. TOP HEADER BANNER - Unified Enterprise Theme */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>ENTERPRISE SHIFT ENGINE & MUSTER POLICIES</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Shift Timings & Muster Rules
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Configure biometric rules for General and Rotational Shifts (KG, K1, K2, K3, K6), full-day thresholds, grace windows, and overtime qualification rules.
          </p>
        </div>

        {/* Action Buttons in Banner */}
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Save & Apply Rules</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {savedAlert && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center space-x-3 shadow-xs animate-in fade-in duration-200">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div>Settings successfully saved to MySQL database!</div>
            <div className="text-[11px] text-emerald-700 font-normal">All biometric attendance records and overtime totals have been automatically recalculated.</div>
          </div>
        </div>
      )}

      {/* 2. TOP 4 POLICY KPI CARDS: Quick Rules Reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Configured Shifts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Shifts</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {shifts.length} <span className="text-sm font-medium text-slate-500 font-sans">Profiles</span>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg w-fit font-medium">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>KG, K1, K2, K3, K6 mapped</span>
            </div>
          </div>
        </div>

        {/* Card 2: Full Day Threshold */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Day Standard</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight font-mono">
              {formData.fullDayHours} <span className="text-sm font-medium text-slate-500 font-sans">Hours</span>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg w-fit font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full Day (PP) muster requirement</span>
            </div>
          </div>
        </div>

        {/* Card 3: Late Grace Window */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Late Grace Window</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight font-mono">
              {formData.graceMinutes} <span className="text-sm font-medium text-slate-500 font-sans">Mins</span>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg w-fit font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Allowed post Shift Start time</span>
            </div>
          </div>
        </div>

        {/* Card 4: Min OT Qualification */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Min. OT Extra Duty</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight font-mono">
              {formData.minOtQualifyHours ?? 2.0} <span className="text-sm font-medium text-slate-500 font-sans">Hours</span>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg w-fit font-medium">
              <Award className="w-3.5 h-3.5 text-purple-600" />
              <span>Must log past {formData.otThresholdHours || 8}h shift</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* CARD 1: Organization & Primary Company Identity */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Organization & Policy Profile</h3>
              <p className="text-xs text-slate-400">Company identity used across Excel exports, reports, and muster sheets</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Company / Organization Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:border-indigo-500 outline-none font-semibold text-slate-800 transition-all"
                placeholder="e.g. Larsen & Toubro / TVC & CO"
              />
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default Shift Engine</div>
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Automatic Shift Matching</span>
              </div>
              <p className="text-[11px] text-slate-500">Auto-identifies shift code from Excel</p>
            </div>
          </div>
        </div>

        {/* CARD 2: Multi-Shift Policy Engine (KG, K1, K2, K3, K6) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Multi-Shift Timing Rules</h3>
                <p className="text-xs text-slate-400">Shift codes in biometric Excel are automatically matched against these timings</p>
              </div>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {shifts.length} Shifts Configured
            </span>
          </div>

          {/* Responsive Shift Configuration Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Shift Code</th>
                  <th className="py-3 px-3.5">Shift Name</th>
                  <th className="py-3 px-3">Punch In</th>
                  <th className="py-3 px-3">Punch Out</th>
                  <th className="py-3 px-3">Full Day</th>
                  <th className="py-3 px-3">Half Day</th>
                  <th className="py-3 px-3">Grace</th>
                  <th className="py-3 px-3 text-center">Overnight?</th>
                  <th className="py-3 px-3 text-right">Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.map((s, idx) => (
                  <tr key={s.shiftCode} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-800">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getShiftColor(s.shiftCode)}`}>
                        {s.shiftCode}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <input
                        type="text"
                        value={s.shiftName}
                        onChange={(e) => handleUpdateShift(idx, 'shiftName', e.target.value)}
                        className="w-full min-w-[140px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 font-semibold focus:border-indigo-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={s.shiftStart}
                        onChange={(e) => handleUpdateShift(idx, 'shiftStart', e.target.value)}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono font-bold text-slate-800 text-center focus:border-indigo-500 outline-none"
                        placeholder="08:30"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={s.shiftEnd}
                        onChange={(e) => handleUpdateShift(idx, 'shiftEnd', e.target.value)}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono font-bold text-slate-800 text-center focus:border-indigo-500 outline-none"
                        placeholder="17:00"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={s.fullDayHours || ''}
                          onChange={(e) => handleUpdateShift(idx, 'fullDayHours', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 font-mono font-bold text-slate-800 text-center focus:border-indigo-500 outline-none"
                        />
                        <span className="text-[11px] text-slate-400">h</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={s.halfDayHours || ''}
                          onChange={(e) => handleUpdateShift(idx, 'halfDayHours', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 font-mono font-bold text-slate-800 text-center focus:border-indigo-500 outline-none"
                        />
                        <span className="text-[11px] text-slate-400">h</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={s.graceMinutes}
                          onChange={(e) => handleUpdateShift(idx, 'graceMinutes', parseInt(e.target.value, 10) || 0)}
                          className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono font-bold text-slate-800 text-center focus:border-indigo-500 outline-none"
                        />
                        <span className="text-[11px] text-slate-400">min</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(s.isOvernight)}
                          onChange={(e) => handleUpdateShift(idx, 'isOvernight', e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                        {s.isOvernight && <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                      </label>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[11px] font-semibold text-slate-500">
                      {s.shiftStart} → {s.shiftEnd}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD 3: Work Duration & Overtime Calculation Thresholds */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Attendance & Overtime Qualification Thresholds</h3>
              <p className="text-xs text-slate-400">Rules applied to determine Full Day (PP), Half Day (PA/AP), and Overtime duty hours</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Threshold 1: Full Day */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 uppercase tracking-wider text-[11px]">Full Day Present (PP)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="24"
                  value={formData.fullDayHours}
                  onChange={(e) => setFormData({ ...formData, fullDayHours: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 rounded-xl border border-emerald-300 bg-white font-mono font-extrabold text-slate-900 text-sm focus:border-emerald-500 outline-none"
                />
                <span className="font-bold text-slate-600">Hours</span>
              </div>
              <p className="text-[11px] text-slate-500">Worked &gt;= this duration earns 1.0 day attendance credit</p>
            </div>

            {/* Threshold 2: Half Day */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-800 uppercase tracking-wider text-[11px]">Half Day (PA/AP)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="24"
                  value={formData.halfDayHours}
                  onChange={(e) => setFormData({ ...formData, halfDayHours: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono font-extrabold text-slate-900 text-sm focus:border-amber-500 outline-none"
                />
                <span className="font-bold text-slate-600">Hours</span>
              </div>
              <p className="text-[11px] text-slate-500">Less than this is automatically marked Absent (AA)</p>
            </div>

            {/* Threshold 3: Late Grace Window */}
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-800 uppercase tracking-wider text-[11px]">Late Grace Window</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="120"
                  value={formData.graceMinutes}
                  onChange={(e) => setFormData({ ...formData, graceMinutes: parseInt(e.target.value, 10) || 0 })}
                  className="w-24 px-3 py-2 rounded-xl border border-blue-300 bg-white font-mono font-extrabold text-slate-900 text-sm focus:border-blue-500 outline-none"
                />
                <span className="font-bold text-slate-600">Mins</span>
              </div>
              <p className="text-[11px] text-slate-500">Late Come is calculated past Shift Start + Grace</p>
            </div>

            {/* Threshold 4: Min OT Qualification */}
            <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-800 uppercase tracking-wider text-[11px]">Min. OT Qualification</span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="24"
                  value={formData.minOtQualifyHours ?? 2.0}
                  onChange={(e) => setFormData({ ...formData, minOtQualifyHours: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 rounded-xl border border-purple-300 bg-white font-mono font-extrabold text-purple-800 text-sm focus:border-purple-500 outline-none"
                />
                <span className="font-bold text-purple-900">Hours</span>
              </div>
              <p className="text-[11px] text-slate-500">Must log extra duty &gt;= 2.0h to qualify for OT column</p>
            </div>
          </div>
        </div>

        {/* CARD 4: 🧪 LIVE RULE SIMULATOR & TEST SANDBOX - Clean White SaaS Card Theme */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Live Calculation Sandbox & Rule Simulator</h3>
                <p className="text-xs text-slate-400">Test any punch in/out to instantly preview the exact calculated output</p>
              </div>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Instant Simulation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Input Controls */}
            <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">1. Test Punch Inputs</span>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Select Shift</label>
                <select
                  value={simShift}
                  onChange={(e) => setSimShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold outline-none cursor-pointer focus:border-indigo-500"
                >
                  {shifts.map(s => (
                    <option key={s.shiftCode} value={s.shiftCode}>{s.shiftCode} — {s.shiftName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">In Time</label>
                  <input
                    type="text"
                    value={simInTime}
                    onChange={(e) => setSimInTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono font-bold outline-none text-center focus:border-indigo-500"
                    placeholder="08:35"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Out Time</label>
                  <input
                    type="text"
                    value={simOutTime}
                    onChange={(e) => setSimOutTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono font-bold outline-none text-center focus:border-indigo-500"
                    placeholder="19:45"
                  />
                </div>
              </div>
            </div>

            {/* Calculated Output Preview */}
            <div className="md:col-span-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">2. Calculated Excel & Table Output</span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Muster Code</div>
                  <div className="text-xl font-extrabold text-emerald-600 font-mono mt-0.5">{simResult.muster || 'PP'}</div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Working Time</div>
                  <div className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">{simResult.worktime || '-'}</div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Overtime (ht)</div>
                  <div className="text-xl font-extrabold text-purple-700 font-mono mt-0.5">+{simResult.overtimeHours || 0} hrs</div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Day Total</div>
                  <div className="text-xl font-extrabold text-amber-600 font-mono mt-0.5">{simResult.dayTotal || 1} d</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between font-mono gap-2 shadow-2xs">
                <span>Extra Time: <strong className="text-indigo-700">{simResult.extraTime || '00:00'}</strong></span>
                <span>Late Come: <strong className="text-amber-700">{simResult.lateCome || '-'}</strong></span>
                <span>Early Go: <strong className="text-rose-700">{simResult.earlyGo || '-'}</strong></span>
                <span>Late Go: <strong className="text-blue-700">{simResult.lateGo || '-'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Action Bar */}
        <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500">
            Clicking Save will update policies in MySQL and trigger immediate automatic recalculation.
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Save & Recalculate All Records</span>
          </button>
        </div>
      </form>

      {/* CARD 5: Database Connection & Maintenance */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Database Engine Status</h3>
              <p className="text-xs text-slate-400">Persistence layer for biometric logs, policies, and company holidays</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>MySQL 3306 Active</span>
          </span>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Engine</span>
            <span className="font-bold text-slate-800 text-sm">XAMPP MySQL (MariaDB)</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Host & Port</span>
            <span className="font-mono font-bold text-slate-800 text-sm">localhost:3306</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Database Name</span>
            <span className="font-mono font-bold text-emerald-600 text-sm">punchpulse_hr</span>
          </div>
        </div>

        {/* Danger Zone: Wipe Attendance Logs */}
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
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Wipe All Logs</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-center animate-in zoom-in-95 duration-150">
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
