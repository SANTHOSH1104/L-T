import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Plus, 
  Edit2, 
  Calendar, 
  User, 
  Clock, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  CheckCircle2,
  X
} from 'lucide-react';
import * as yup from 'yup';
import { AttendanceRecord, ShiftConfig } from '../types/attendance';
import { exportAttendanceToExcel } from '../utils/excelParser';
import { processAttendanceRecord, parseTimeToMinutes } from '../utils/calculator';
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

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
    records.forEach(r => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set);
  }, [records]);

  // Trimmed search filter
  const filteredRecords = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return records.filter(r => {
      const matchSearch = 
        !cleanSearch ||
        r.empName.toLowerCase().includes(cleanSearch) ||
        r.empId.toLowerCase().includes(cleanSearch) ||
        r.date.includes(cleanSearch);

      let matchStatus = true;
      if (statusFilter === 'PRESENT') matchStatus = r.status === 'PRESENT';
      else if (statusFilter === 'HALF_DAY') matchStatus = r.status === 'HALF_DAY';
      else if (statusFilter === 'ABSENT') matchStatus = r.status === 'ABSENT';
      else if (statusFilter === 'HOLIDAY') matchStatus = (r.holiday || 0) > 0 || r.muster === 'HL' || r.muster === 'HP';
      else if (statusFilter === 'SUNDAY') matchStatus = (r.sunday || 0) > 0 || r.muster === 'WW';
      else if (statusFilter === 'OT') matchStatus = (r.overtimeHours || 0) > 0 || r.otHours > 0;
      else if (statusFilter === 'LATE') matchStatus = r.isLate;

      let matchDept = true;
      if (deptFilter !== 'ALL') matchDept = r.department === deptFilter;

      return matchSearch && matchStatus && matchDept;
    });
  }, [records, searchTerm, statusFilter, deptFilter]);

  // Pagination Slicing
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  
  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, deptFilter, pageSize]);

  const displayedRecords = useMemo(() => {
    if (pageSize === -1) return filteredRecords;
    const startIdx = (currentPage - 1) * pageSize;
    return filteredRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleStartEdit = (r: AttendanceRecord) => {
    setEditingRecord(r);
    setEditInTime(r.inTime === '--:--' ? '' : r.inTime);
    setEditOutTime(r.outTime === '--:--' ? '' : r.outTime);
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    const reCalc = processAttendanceRecord(
      editingRecord.id,
      editingRecord.empId,
      editingRecord.empName,
      editingRecord.department,
      editingRecord.date,
      editInTime.trim() || '--:--',
      editOutTime.trim() || '--:--',
      config,
      {
        shift: editingRecord.shift,
        muster: editingRecord.muster,
        worktime: editingRecord.worktime,
        extraTime: editingRecord.extraTime,
        lateCome: editingRecord.lateCome,
        earlyGo: editingRecord.earlyGo,
        lateGo: editingRecord.lateGo,
      }
    );
    if (editingRecord.notes) reCalc.notes = editingRecord.notes;
    onUpdateRecord(reCalc);
    setEditingRecord(null);
  };

  const handleSaveManualPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      await manualPunchSchema.validate(
        {
          empId: newEmpId,
          empName: newEmpName,
          department: newDept,
          date: newDate,
          inTime: newInTime,
          outTime: newOutTime,
          notes: newNotes,
        },
        { abortEarly: false }
      );
    } catch (err: any) {
      if (err.inner) {
        const errors: Record<string, string> = {};
        err.inner.forEach((validationError: any) => {
          if (validationError.path) {
            errors[validationError.path] = validationError.message;
          }
        });
        setFormErrors(errors);
        return;
      }
    }

    setIsSubmittingManual(true);
    try {
      await createManualPunchInDb({
        empId: newEmpId.trim(),
        empName: newEmpName.trim(),
        department: newDept.trim(),
        date: newDate.trim(),
        inTime: newInTime.trim(),
        outTime: newOutTime.trim(),
        notes: newNotes.trim() || undefined,
      });

      if (onRefreshData) onRefreshData();

      // Reset form
      setNewEmpId('');
      setNewEmpName('');
      setNewNotes('');
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create manual punch:', err);
      alert(err.message || 'Error saving punch to backend database');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Daily Biometric Attendance Logs</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredRecords.length} / {records.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Exact 18-column enterprise calculation: Working Time, Extra, Overtime (ht), Late In/Out, Sunday, and Holiday credit.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-4 h-4 text-indigo-600" />}
          >
            Add Manual Punch
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={filteredRecords.length === 0}
            onClick={() => exportAttendanceToExcel(filteredRecords)}
            icon={<Download className="w-4 h-4" />}
          >
            Export Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] sm:min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Employee Name, ID, or Date (YYYY-MM-DD)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-indigo-500 outline-none font-medium transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs scrollbar-none">
          {[
            { id: 'ALL', label: 'All Logs' },
            { id: 'PRESENT', label: '🟢 Present' },
            { id: 'HALF_DAY', label: '🟡 Half Day' },
            { id: 'ABSENT', label: '🔴 Absent' },
            { id: 'HOLIDAY', label: '🎉 Holiday (HL/HP)' },
            { id: 'SUNDAY', label: '☀️ Sunday (WW)' },
            { id: 'OT', label: '🟣 Overtime' },
            { id: 'LATE', label: '⚠️ Late In' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dept filter & Per Page selector */}
        <div className="flex items-center gap-2">
          {departments.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 font-medium text-slate-700 outline-none cursor-pointer"
            title="Rows per page"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={200}>200 / page</option>
            <option value={-1}>All ({filteredRecords.length})</option>
          </select>
        </div>
      </div>

      {/* Main Responsive Table with Sticky First Column */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-20">
              <tr>
                {/* Sticky Left Column: Employee */}
                <th className="py-3.5 px-4 sticky left-0 bg-slate-50 z-30 shadow-xs border-r border-slate-200/80 min-w-[180px]">
                  Employee
                </th>
                <th className="py-3.5 px-2.5">Shift</th>
                <th className="py-3.5 px-3">Date</th>
                <th className="py-3.5 px-3">In / Out</th>
                <th className="py-3.5 px-3">Muster</th>
                <th className="py-3.5 px-3 font-bold text-slate-800">Working Time</th>
                <th className="py-3.5 px-2.5 font-mono">Extra</th>
                <th className="py-3.5 px-2.5 font-mono text-center text-purple-700 bg-purple-50/30">Overtime</th>
                <th className="py-3.5 px-2.5">Late Come</th>
                <th className="py-3.5 px-2.5">Early Go</th>
                <th className="py-3.5 px-2.5">Late Go</th>
                <th className="py-3.5 px-2.5 text-center text-purple-700 bg-purple-50/30">OT Duty</th>
                <th className="py-3.5 px-2.5 text-center">On Duty</th>
                <th className="py-3.5 px-2.5 text-center">Sunday</th>
                <th className="py-3.5 px-2.5 text-center">Holiday</th>
                <th className="py-3.5 px-3 text-center font-bold text-emerald-800 bg-emerald-50/60">Day Total</th>
                <th className="py-3.5 px-3">Remarks / Reason</th>
                <th className="py-3.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={18} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">No matching attendance logs found</p>
                      <p className="text-xs text-slate-400">Try adjusting your search keywords or status filter.</p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="mt-2 px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedRecords.map((r) => {
                  const overtimeHours = r.overtimeHours !== undefined 
                    ? r.overtimeHours 
                    : Math.floor((parseTimeToMinutes(r.extraTime) || 0) / 60);

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
                    <tr key={r.id} className="group hover:bg-slate-50/80 transition-colors">
                      {/* Sticky Left Column */}
                      <td className="py-3 px-4 sticky left-0 bg-white group-hover:bg-slate-50/90 z-10 shadow-xs border-r border-slate-100 min-w-[180px]">
                        <div className="font-bold text-slate-800 truncate max-w-[160px]">{r.empName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.empId} • {r.department}
                        </div>
                      </td>

                      <td className="py-3 px-2.5">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {r.shift || 'KG'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">{r.date}</td>

                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-800 font-medium whitespace-nowrap text-[11px]">
                          {r.inTime} → {r.outTime}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <Badge 
                          status={r.muster === 'PP' ? 'PP' : r.muster === 'PA' ? 'PA' : r.muster === 'AP' ? 'AP' : r.muster === 'AA' ? 'AA' : (r.muster === 'WO' || r.muster === 'WW') ? 'WW' : (r.muster === 'HL' || r.status === 'HOLIDAY') ? 'HL' : r.muster === 'HP' ? 'HP' : r.status} 
                          label={r.muster ? `${r.muster}` : undefined}
                        />
                      </td>

                      {/* 1. Working Time */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {r.worktime || (r.totalHours > 0 ? formatHours(r.totalHours) : '-')}
                      </td>

                      {/* 2. Extra */}
                      <td className="py-3 px-2.5 font-mono whitespace-nowrap">
                        {r.extraTime ? (
                          <span className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {r.extraTime}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 2b. Overtime (Integer Hours: 1, 3, etc.) */}
                      <td className="py-3 px-2.5 font-mono text-center bg-purple-50/20">
                        {overtimeHours > 0 ? (
                          <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                            {overtimeHours}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-[11px]">0</span>
                        )}
                      </td>

                      {/* 3. Late Come */}
                      <td className="py-3 px-2.5 font-mono whitespace-nowrap">
                        {r.lateCome ? (
                          <span className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {r.lateCome}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 4. Early Go */}
                      <td className="py-3 px-2.5 font-mono whitespace-nowrap">
                        {r.earlyGo ? (
                          <span className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {r.earlyGo}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 5. Late Go */}
                      <td className="py-3 px-2.5 font-mono whitespace-nowrap">
                        {r.lateGo ? (
                          <span className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {r.lateGo}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 6. OT Duty (0.25, 0.5, 0.75, 1.0) */}
                      <td className="py-3 px-2.5 text-center font-mono bg-purple-50/20">
                        {otPresent > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title={`Qualified OT: ${r.otHours}h (${otPresent} duty)`}>
                            {otPresent}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-[11px]">0</span>
                        )}
                      </td>

                      {/* 7. On Duty */}
                      <td className="py-3 px-2.5 text-center font-mono">
                        {onDuty === 1 ? (
                          <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-blue-100 text-blue-800 border border-blue-200">1</span>
                        ) : onDuty === 0.5 ? (
                          <span className="px-1.5 py-0.5 rounded font-bold text-[11px] bg-amber-100 text-amber-800 border border-amber-200">0.5</span>
                        ) : (
                          <span className="text-slate-300 font-mono">0</span>
                        )}
                      </td>

                      {/* 8. Sunday */}
                      <td className="py-3 px-2.5 text-center font-mono">
                        {sunday === 1 ? (
                          <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-indigo-100 text-indigo-800 border border-indigo-200">1</span>
                        ) : sunday === 0.5 ? (
                          <span className="px-1.5 py-0.5 rounded font-bold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200">0.5</span>
                        ) : (
                          <span className="text-slate-300 font-mono">0</span>
                        )}
                      </td>

                      {/* 9. Holiday */}
                      <td className="py-3 px-2.5 text-center font-mono">
                        {holiday === 1 ? (
                          <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-teal-100 text-teal-800 border border-teal-200">1</span>
                        ) : (
                          <span className="text-slate-300 font-mono">0</span>
                        )}
                      </td>

                      {/* 10. Total */}
                      <td className="py-3 px-3 text-center bg-emerald-50/40">
                        <span className={`inline-flex items-center justify-center font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border ${
                          dayTotal >= 2
                            ? 'bg-purple-600 text-white border-purple-700 shadow-xs scale-105'
                            : dayTotal === 1
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                            : dayTotal === 0.5
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {dayTotal}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-3 text-slate-500 text-[11px] truncate max-w-[150px]" title={r.notes}>
                        {r.notes || '-'}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
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

        {/* Responsive Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-900">
                {Math.min(currentPage * pageSize, filteredRecords.length)}
              </span>{' '}
              of <span className="font-bold text-slate-900">{filteredRecords.length}</span> logs
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-semibold text-slate-800">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
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
