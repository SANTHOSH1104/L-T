import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Plus,
  Edit2,
  Calendar,
  User,
  Clock,
  Sparkles
} from 'lucide-react';
import * as yup from 'yup';
import { AttendanceRecord, ShiftConfig } from '../types/attendance';
import { exportAttendanceToExcel } from '../utils/excelParser';
import { calculateRecord, parseTimeToMinutes } from '../utils/calculator';
import { createManualPunchInDb } from '../services/api';
import { Button, Input, Badge, Modal } from './common';
import { formatHours } from '../utils/formatters';

const manualPunchSchema = yup.object({
  empId: yup.string().trim().required('Employee ID is required'),
  empName: yup.string().trim().required('Employee Name is required'),
  department: yup.string().trim().default('General'),
  date: yup.string().trim().required('Date is required'),
  inTime: yup.string().trim().required('In Time is required'),
  outTime: yup.string().trim().required('Out Time is required'),
  notes: yup.string().trim().optional(),
});

interface DailyLogsTabProps {
  records: AttendanceRecord[];
  config: ShiftConfig;
  onUpdateRecord: (updated: AttendanceRecord) => void;
  onRefreshData?: () => void;
}

export const DailyLogsTab: React.FC<DailyLogsTabProps> = ({
  records,
  config,
  onUpdateRecord,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Manual Punch modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newDept, setNewDept] = useState('Engineering');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newInTime, setNewInTime] = useState('09:00');
  const [newOutTime, setNewOutTime] = useState('18:00');
  const [newNotes, setNewNotes] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Edit modal state
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => set.add(r.department));
    return Array.from(set);
  }, [records]);

  // Trimmed search filter
  const filteredRecords = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return records.filter(r => {
      const matchSearch = 
        r.empName.toLowerCase().includes(cleanSearch) ||
        r.empId.toLowerCase().includes(cleanSearch) ||
        r.date.includes(cleanSearch);

      let matchStatus = true;
      if (statusFilter === 'PRESENT') matchStatus = r.status === 'PRESENT';
      else if (statusFilter === 'HALF_DAY') matchStatus = r.status === 'HALF_DAY';
      else if (statusFilter === 'ABSENT') matchStatus = r.status === 'ABSENT';
      else if (statusFilter === 'OT') matchStatus = r.otHours > 0;
      else if (statusFilter === 'LATE') matchStatus = r.isLate;

      let matchDept = true;
      if (deptFilter !== 'ALL') matchDept = r.department === deptFilter;

      return matchSearch && matchStatus && matchDept;
    });
  }, [records, searchTerm, statusFilter, deptFilter]);

  const handleStartEdit = (r: AttendanceRecord) => {
    setEditingRecord(r);
    setEditInTime(r.inTime === '--:--' ? '' : r.inTime);
    setEditOutTime(r.outTime === '--:--' ? '' : r.outTime);
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    const recalculated = calculateRecord(
      editingRecord.id,
      editingRecord.empId,
      editingRecord.empName,
      editingRecord.department,
      editingRecord.date,
      editInTime.trim(),
      editOutTime.trim(),
      config
    );
    onUpdateRecord(recalculated);
    setEditingRecord(null);
  };

  const handleSaveManualPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const payload = {
      empId: newEmpId.trim(),
      empName: newEmpName.trim(),
      department: newDept.trim(),
      date: newDate.trim(),
      inTime: newInTime.trim(),
      outTime: newOutTime.trim(),
      notes: newNotes.trim() || undefined,
    };

    try {
      await manualPunchSchema.validate(payload, { abortEarly: false });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const errors: Record<string, string> = {};
        err.inner.forEach((e) => {
          if (e.path) errors[e.path] = e.message;
        });
        setFormErrors(errors);
        return;
      }
    }

    setIsSubmittingManual(true);
    try {
      await createManualPunchInDb(payload);
      setIsAddModalOpen(false);
      setNewEmpId('');
      setNewEmpName('');
      setNewNotes('');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Daily Attendance Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {filteredRecords.length} of {records.length} total punch entries
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="success"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Manual Punch
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Download className="w-4 h-4" />}
            disabled={filteredRecords.length === 0}
            onClick={() => exportAttendanceToExcel(filteredRecords)}
          >
            Export Daily Logs (.xlsx)
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input with Auto-Trim */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Employee Name, ID or Date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-hidden font-medium"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PRESENT', label: '🟢 Full Day' },
            { id: 'HALF_DAY', label: '🟡 Half Day' },
            { id: 'ABSENT', label: '🔴 Absent' },
            { id: 'OT', label: '🟣 Overtime' },
            { id: 'LATE', label: '⚠️ Late In' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dept filter */}
        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 outline-hidden cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-2">Shift</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">In / Out</th>
                <th className="py-3 px-3">Muster</th>
                <th className="py-3 px-3 font-bold text-slate-700">Working Time</th>
                <th className="py-3 px-2 font-mono">Extra</th>
                <th className="py-3 px-2 font-mono text-center text-purple-700">Overtime</th>
                <th className="py-3 px-2">Late Come</th>
                <th className="py-3 px-2">Early Go</th>
                <th className="py-3 px-2">Late Go</th>
                <th className="py-3 px-2 text-center text-purple-700">OT</th>
                <th className="py-3 px-2 text-center">On Duty</th>
                <th className="py-3 px-2 text-center">Sunday</th>
                <th className="py-3 px-2 text-center">Holiday</th>
                <th className="py-3 px-2 text-center font-bold text-emerald-800 bg-emerald-50/50">Total</th>
                <th className="py-3 px-3">Remarks</th>
                <th className="py-3 px-3 text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={18} className="text-center py-8 text-slate-400">
                    No matching attendance logs found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const overtimeHours = r.overtimeHours !== undefined ? r.overtimeHours : Math.floor((parseTimeToMinutes(r.extraTime) || 0) / 60);
                  const otPresent = r.otDuty !== undefined ? r.otDuty : (
                    overtimeHours >= (config.minOtQualifyHours ?? 2.0)
                      ? (overtimeHours >= 8 ? 1.0 : overtimeHours >= 6 ? 0.75 : overtimeHours >= 4 ? 0.5 : 0.25)
                      : 0
                  );
                  const onDuty = r.onDuty !== undefined ? r.onDuty : (r.status === 'PRESENT' ? 1 : r.status === 'HALF_DAY' ? 0.5 : 0);
                  const sunday = r.sunday !== undefined ? r.sunday : 0;
                  const holiday = r.holiday !== undefined ? r.holiday : 0;
                  const dayTotal = r.dayTotal !== undefined ? r.dayTotal : Number((onDuty + otPresent + sunday + holiday).toFixed(2));

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{r.empName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {r.empId} • {r.department}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {r.shift || 'KG'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{r.date}</td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-800 font-medium whitespace-nowrap">
                          {r.inTime} → {r.outTime}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge 
                          status={r.muster === 'PP' ? 'PP' : r.muster === 'PA' ? 'PA' : r.muster === 'AP' ? 'AP' : r.muster === 'AA' ? 'AA' : (r.muster === 'WO' || r.muster === 'WW') ? 'WW' : r.status} 
                          label={r.muster ? `${r.muster}` : undefined}
                        />
                      </td>

                      {/* 1. Working Time */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {r.worktime || (r.totalHours > 0 ? formatHours(r.totalHours) : '-')}
                      </td>

                      {/* 2. Extra */}
                      <td className="py-3 px-2 font-mono">
                        {r.extraTime ? (
                          <span className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {r.extraTime}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 2b. Overtime (Integer Hours: 1, 3, 4, etc.) */}
                      <td className="py-3 px-2 font-mono text-center">
                        {overtimeHours > 0 ? (
                          <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {overtimeHours}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-[11px]">0</span>
                        )}
                      </td>

                      {/* 3. Late Come */}
                      <td className="py-3 px-2 font-mono">
                        {r.lateCome ? (
                          <span className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {r.lateCome}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 4. Early Go */}
                      <td className="py-3 px-2 font-mono">
                        {r.earlyGo ? (
                          <span className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {r.earlyGo}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 5. Late Go */}
                      <td className="py-3 px-2 font-mono">
                        {r.lateGo ? (
                          <span className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {r.lateGo}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 6. OT Present (0.25, 0.5, 0.75, 1.0) */}
                      <td className="py-3 px-2 text-center font-mono">
                        {otPresent > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title={`Qualified OT: ${r.otHours}h (${otPresent} duty)`}>
                            {otPresent}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-[11px]">0</span>
                        )}
                      </td>

                      {/* 7. On Duty (Present = 1, Half = 0.5, Absent = 0) */}
                      <td className="py-3 px-2 text-center font-mono">
                        {onDuty === 1 ? (
                          <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-blue-100 text-blue-800 border border-blue-200">1</span>
                        ) : onDuty === 0.5 ? (
                          <span className="px-1.5 py-0.5 rounded font-bold text-[11px] bg-amber-100 text-amber-800 border border-amber-200">0.5</span>
                        ) : (
                          <span className="text-slate-300 font-mono">0</span>
                        )}
                      </td>

                      {/* 8. Sunday */}
                      <td className="py-3 px-2 text-center font-mono">
                        {sunday === 1 ? (
                          <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-indigo-100 text-indigo-800 border border-indigo-200">1</span>
                        ) : sunday === 0.5 ? (
                          <span className="px-1.5 py-0.5 rounded font-bold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200">0.5</span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* 9. Holiday */}
                      <td className="py-3 px-2 text-center font-mono">
                        {holiday === 1 ? (
                          <span className="px-1.5 py-0.5 rounded font-bold text-[11px] bg-emerald-100 text-emerald-700">1</span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* 10. Total (On Duty + OT + Sunday + Holiday => e.g. 1 + 1 = 2) */}
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center justify-center font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border ${
                          dayTotal >= 2
                            ? 'bg-purple-600 text-white border-purple-700 font-extrabold shadow-sm scale-105'
                            : dayTotal === 1
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs font-bold'
                            : dayTotal === 0.5
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {dayTotal}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {r.notes || '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleStartEdit(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Manually adjust punch times"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reusable Edit Modal */}
      <Modal
        isOpen={Boolean(editingRecord)}
        onClose={() => setEditingRecord(null)}
        title="Adjust Attendance Punch"
        subtitle={editingRecord ? `Editing for ${editingRecord.empName} on ${editingRecord.date}` : ''}
        maxWidth="sm"
      >
        <div className="space-y-3">
          <Input
            label="In Time (e.g. 09:00 AM or 09:00)"
            value={editInTime}
            onChange={(e) => setEditInTime(e.target.value)}
            placeholder="09:00"
          />
          <Input
            label="Out Time (e.g. 06:00 PM or 18:00)"
            value={editOutTime}
            onChange={(e) => setEditOutTime(e.target.value)}
            placeholder="18:00"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setEditingRecord(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>
              Save & Recalculate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reusable Manual Punch Modal with Yup Validation */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Manual Punch Log"
        subtitle="Writes directly to XAMPP MySQL database"
        maxWidth="md"
      >
        <form onSubmit={handleSaveManualPunch} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Employee ID *"
              required
              value={newEmpId}
              onChange={(e) => setNewEmpId(e.target.value)}
              placeholder="EMP109"
              error={formErrors.empId}
              icon={<User className="w-3.5 h-3.5" />}
            />
            <Input
              label="Employee Name *"
              required
              value={newEmpName}
              onChange={(e) => setNewEmpName(e.target.value)}
              placeholder="Vijay Kumar"
              error={formErrors.empName}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Department</label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Management">Management</option>
                <option value="Operations">Operations</option>
                <option value="QA">QA</option>
                <option value="Human Resources">Human Resources</option>
              </select>
            </div>
            <Input
              label="Date *"
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              error={formErrors.date}
              icon={<Calendar className="w-3.5 h-3.5" />}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="In Time (e.g. 09:00)"
              value={newInTime}
              onChange={(e) => setNewInTime(e.target.value)}
              placeholder="09:00"
              error={formErrors.inTime}
              icon={<Clock className="w-3.5 h-3.5" />}
            />
            <Input
              label="Out Time (e.g. 19:30)"
              value={newOutTime}
              onChange={(e) => setNewOutTime(e.target.value)}
              placeholder="19:30"
              error={formErrors.outTime}
              icon={<Clock className="w-3.5 h-3.5" />}
            />
          </div>

          <Input
            label="Notes (Optional)"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="e.g. Client site visit, Approved OT"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
              variant="success"
              size="md"
              isLoading={isSubmittingManual}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Save Punch to MySQL
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
