import * as XLSX from 'xlsx';
import { AttendanceRecord, ColumnMapping, EmployeeSummary, ShiftConfig } from '../types';
import { calculateRecord, formatMinutesToTime, parseTimeToMinutes } from './calculator.service';

export function detectColumns(headers: string[]): ColumnMapping {
  const normalized = headers.map(h => ({
    original: h,
    clean: h.toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));

  const findBest = (keywords: string[]): string => {
    for (const kw of keywords) {
      const match = normalized.find(n => n.clean.includes(kw));
      if (match) return match.original;
    }
    return '';
  };

  const empId = findBest(['empcode', 'empid', 'code', 'badgeid', 'userid', 'id']);
  const empName = findBest(['employeename', 'empname', 'staffname', 'name', 'worker']);
  const department = findBest(['category', 'department', 'dept', 'division', 'team']);
  const shift = findBest(['shift']);
  const date = findBest(['punchdate', 'date', 'attendancedate', 'day']);
  const inTime = findBest(['intime', 'punchin', 'checkin', 'firstin', 'arrival', 'in']);
  const outTime = findBest(['outtime', 'punchout', 'checkout', 'lastout', 'departure', 'out']);
  const muster = findBest(['muster', 'status', 'attendancestatus']);
  const worktime = findBest(['worktime', 'workedhours', 'workhours']);
  const extra = findBest(['extra', 'extratime']);
  const overtime = findBest(['overtime', 'ot']);
  const lateCome = findBest(['latecome', 'latearrival', 'late']);
  const earlyGo = findBest(['earlygo', 'earlyexit', 'earlydeparture']);
  const lateGo = findBest(['latego']);
  const onDuty = findBest(['onduty', 'duty', 'od']);
  const sunday = findBest(['sunday', 'sun', 'weeklyoff', 'weekoff', 'wo']);
  const holiday = findBest(['holiday', 'publicholiday', 'ph', 'hp', 'hl']);

  return {
    empId: empId || headers[0] || '',
    empName: empName || headers[1] || '',
    department: department || '',
    shift: shift || '',
    date: date || headers[2] || '',
    inTime: inTime || headers[3] || '',
    outTime: outTime || headers[4] || '',
    muster: muster || '',
    worktime: worktime || '',
    extra: extra || '',
    overtime: overtime || '',
    lateCome: lateCome || '',
    earlyGo: earlyGo || '',
    lateGo: lateGo || '',
    onDuty: onDuty || '',
    sunday: sunday || '',
    holiday: holiday || '',
  };
}

export function parseExcelBuffer(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Read all rows as 2D array of formatted strings
  const allRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: false, defval: '' });

  // 1. Dynamic Header Row Detection (skips report banners like Row 0 title)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = (allRows[i] || []).map(c => String(c).trim().toLowerCase());
    const hasEmp = row.some(c => c.includes('emp') || c.includes('code') || c.includes('id') || c.includes('name'));
    const hasTimeOrDate = row.some(c => c.includes('punch') || c.includes('time') || c.includes('date') || c.includes('in') || c.includes('muster'));
    if (hasEmp && hasTimeOrDate) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) headerIndex = 0;

  const rawHeaders = (allRows[headerIndex] || []).map(c => String(c).trim());
  const headers = rawHeaders.filter(h => h.length > 0 && !h.startsWith('__EMPTY'));

  // 2. Data rows extraction
  const rawRows: Record<string, unknown>[] = [];
  for (let i = headerIndex + 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (!row || !row.some(c => String(c).trim().length > 0)) continue;

    const rowObj: Record<string, unknown> = {};
    rawHeaders.forEach((h, colIdx) => {
      if (h) {
        rowObj[h] = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
      }
    });

    // Valid data row must have some identifiable value
    rawRows.push(rowObj);
  }

  const detectedMapping = detectColumns(headers);

  return {
    headers,
    rawRows,
    detectedMapping,
  };
}

export function transformRowsToAttendance(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
  config: ShiftConfig
): AttendanceRecord[] {
  return rows.map((row, idx) => {
    const id = `rec-${idx + 1}-${Date.now().toString(36)}`;
    const empId = String(row[mapping.empId] || `EMP-${idx + 1}`).trim();
    const empName = String(row[mapping.empName] || 'Unnamed Employee').trim();
    const department = mapping.department ? String(row[mapping.department] || 'TVC & CO').trim() : 'TVC & CO';
    const rawDate = row[mapping.date];
    const rawInTime = row[mapping.inTime];
    const rawOutTime = row[mapping.outTime];

    const extraData = {
      shift: mapping.shift ? String(row[mapping.shift] || 'KG').trim() : 'KG',
      muster: mapping.muster ? String(row[mapping.muster] || '').trim() : '',
      worktime: mapping.worktime ? String(row[mapping.worktime] || '').trim() : '',
      extraTime: mapping.extra ? String(row[mapping.extra] || '').trim() : '',
      overtime: mapping.overtime ? String(row[mapping.overtime] || '').trim() : '',
      lateCome: mapping.lateCome ? String(row[mapping.lateCome] || '').trim() : '',
      earlyGo: mapping.earlyGo ? String(row[mapping.earlyGo] || '').trim() : '',
      lateGo: mapping.lateGo ? String(row[mapping.lateGo] || '').trim() : '',
    };

    return calculateRecord(
      id,
      empId,
      empName,
      department,
      rawDate,
      rawInTime,
      rawOutTime,
      config,
      extraData
    );
  });
}

export function generateSampleExcelBuffer(): Buffer {
  const sampleData = [
    { 'Employee ID': 'EMP001', 'Employee Name': 'Santhosh Murugan', 'Department': 'Management', 'Date': '2026-11-01', 'In Time': '08:50 AM', 'Out Time': '07:15 PM' },
    { 'Employee ID': 'EMP002', 'Employee Name': 'Priya Dharshini', 'Department': 'Design', 'Date': '2026-11-01', 'In Time': '09:00 AM', 'Out Time': '06:05 PM' },
    { 'Employee ID': 'EMP003', 'Employee Name': 'Karthik Raja', 'Department': 'Engineering', 'Date': '2026-11-01', 'In Time': '09:40 AM', 'Out Time': '06:10 PM' },
    { 'Employee ID': 'EMP004', 'Employee Name': 'Dinesh Kumar', 'Department': 'QA', 'Date': '2026-11-01', 'In Time': '09:00 AM', 'Out Time': '01:30 PM' },
    { 'Employee ID': 'EMP005', 'Employee Name': 'Meena Kumari', 'Department': 'HR', 'Date': '2026-11-01', 'In Time': '-', 'Out Time': '-' },
    { 'Employee ID': 'EMP006', 'Employee Name': 'Vigneshwaran', 'Department': 'Operations', 'Date': '2026-11-01', 'In Time': '08:30 AM', 'Out Time': '08:30 PM' },
    { 'Employee ID': 'EMP001', 'Employee Name': 'Santhosh Murugan', 'Department': 'Management', 'Date': '2026-11-02', 'In Time': '08:55 AM', 'Out Time': '08:00 PM' },
    { 'Employee ID': 'EMP002', 'Employee Name': 'Priya Dharshini', 'Department': 'Design', 'Date': '2026-11-02', 'In Time': '09:05 AM', 'Out Time': '02:00 PM' },
    { 'Employee ID': 'EMP003', 'Employee Name': 'Karthik Raja', 'Department': 'Engineering', 'Date': '2026-11-02', 'In Time': '08:45 AM', 'Out Time': '06:15 PM' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Sheet');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
}

export function generateExportExcelBuffer(records: AttendanceRecord[], summaries: EmployeeSummary[]): Buffer {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Monthly Payroll Summary
  const payrollRows = summaries.map((s, i) => ({
    'S.No': i + 1,
    'Emp Code': s.empId,
    'Employee Name': s.empName,
    'Department': s.department,
    'Total Logged Days': s.totalDays,
    'Full Days (1.0)': s.presentDays,
    'Half Days (0.5)': s.halfDays,
    'Absent Days (0.0)': s.absentDays,
    'On Duty (OD)': s.totalOnDuty || 0,
    'Sunday / Off': s.totalSundays || 0,
    'Holiday': s.totalHolidays || 0,
    'Total Work Hours': s.totalWorkHours,
    'Total OT Hours': s.totalOtHours,
    'Net Payable Total Days': s.netPayableDays,
  }));
  const payrollSheet = XLSX.utils.json_to_sheet(payrollRows);
  XLSX.utils.book_append_sheet(workbook, payrollSheet, 'Payroll Summary');

  // Sheet 2: Daily Punch Log - Exact Client Order:
  // Working time, extra, late come, early go, late go, OT, on duty, sunday, holiday, total
  const dailyRows = records.map((r, i) => {
    const overtimeHours = r.overtimeHours !== undefined ? r.overtimeHours : (
      (() => {
        const extraMin = parseTimeToMinutes(r.extraTime) || 0;
        return extraMin >= 116 ? Math.floor((extraMin + 4) / 60) : 0;
      })()
    );
    const otDuty = r.otDuty !== undefined ? r.otDuty : (
      overtimeHours >= 2.0 ? Number(Math.min(1.0, overtimeHours / 8).toFixed(3)) : 0
    );
    const onDuty = r.onDuty !== undefined ? r.onDuty : (r.status === 'PRESENT' ? 1 : r.status === 'HALF_DAY' ? 0.5 : 0);
    const sunday = r.sunday !== undefined ? r.sunday : 0;
    const holiday = r.holiday !== undefined ? r.holiday : 0;
    const total = r.dayTotal !== undefined ? r.dayTotal : Number((onDuty + otDuty + sunday + holiday).toFixed(3));

    return {
      'S.No': i + 1,
      'Emp Code': r.empId,
      'Employee Name': r.empName,
      'Category': r.department,
      'Shift': r.shift || 'KG',
      'Punch Date': r.date,
      'IN Time': r.inTime,
      'OUT Time': r.outTime,
      'Muster': r.muster || (r.status === 'PRESENT' ? 'PP' : r.status === 'HALF_DAY' ? 'PA' : 'AA'),
      'Working time': r.worktime || (r.totalMinutes > 0 ? formatMinutesToTime(r.totalMinutes) : '-'),
      'extra': r.extraTime || '-',
      'Overtime': overtimeHours,
      'late come': r.lateCome || '-',
      'early go': r.earlyGo || '-',
      'late go': r.lateGo || '-',
      'OT': otDuty,
      'on duty': onDuty,
      'sunday': sunday,
      'holiday': holiday,
      'total': total,
      'Status': r.status,
      'Remarks': r.notes || (otDuty > 0 ? `OT Qualified (${overtimeHours}h)` : ''),
    };
  });
  const dailySheet = XLSX.utils.json_to_sheet(dailyRows);
  XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Logs');

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
}

