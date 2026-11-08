export interface ShiftDefinition {
  shiftCode: string; // e.g. "KG", "K1", "K2", "K3", "K6"
  shiftName: string; // e.g. "General Shift", "Morning Shift 1"
  shiftStart: string; // "08:30", "06:00", "14:30", "23:00"
  shiftEnd: string;   // "17:30", "14:30", "23:00", "07:30"
  fullDayHours: number; // 8.0
  halfDayHours: number; // 4.0
  graceMinutes: number; // 15
  isOvernight?: boolean;
}

export interface ShiftConfig {
  shiftStart: string; // e.g. "08:30"
  shiftEnd: string;   // e.g. "17:30"
  fullDayHours: number; // e.g. 8
  halfDayHours: number; // e.g. 4
  otThresholdHours: number; // e.g. 8
  graceMinutes: number; // e.g. 15 mins
  otHourlyRate: number; // e.g. 150
  companyName: string;
  minOtQualifyHours?: number; // e.g. 2.0 hrs (Must complete min 2 hrs for OT)
  enableLatePenalty?: boolean; // Deduct half day for every N late arrivals
  lateGraceCount?: number;     // e.g. 3 late arrivals = 1 half-day cut
  weekendOtMultiplier?: number; // e.g. 1.5x or 2.0x for Sundays
  shifts?: ShiftDefinition[];   // Multi-shift rules: KG, K1, K2, K3, K6
  holidays?: CompanyHoliday[];  // Configured company leaves & holidays
}

export type AttendanceStatus = 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'MISSED_PUNCH' | 'HOLIDAY' | 'WEEKLY_OFF';

export interface CompanyHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: 'PUBLIC_HOLIDAY' | 'FESTIVAL' | 'COMPANY_OFF' | 'OPTIONAL';
  isPaid: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  empId: string;
  empName: string;
  department: string;
  shift?: string;       // e.g. KG, K1, K2, K6
  date: string;         // YYYY-MM-DD
  inTime: string;       // HH:MM
  outTime: string;      // HH:MM
  muster?: string;      // PP, PA, AP, AA, WO
  worktime?: string;    // e.g. 08:30:00
  extraTime?: string;   // e.g. 04:18:00
  overtimeHours?: number; // Integer overtime hours: e.g. 1, 3, 4, 7
  lateCome?: string;    // e.g. 00:03:00
  earlyGo?: string;     // e.g. 01:29:00
  lateGo?: string;      // e.g. 01:06:00
  otDuty?: number;      // OT Present: 0.25, 0.5, 0.75, 1.0
  onDuty?: number;      // 1 or 0.5 or 0
  sunday?: number;      // 1 or 0
  holiday?: number;     // 1 or 0
  dayTotal?: number;    // 1 (full day), 0.5 (half day), 0 (absent)
  totalMinutes: number;
  totalHours: number;
  status: AttendanceStatus;
  isLate: boolean;
  isEarlyExit: boolean;
  otMinutes: number;
  otHours: number;
  notes?: string;
}

export interface EmployeeSummary {
  empId: string;
  empName: string;
  department: string;
  totalDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  missedPunches: number;
  totalLateMarks: number;
  latePenaltyDays: number;
  netPayableDays: number;
  totalOnDuty?: number;
  totalOtDuties?: number;
  totalSundays?: number;
  totalHolidays?: number;
  totalWorkHours: number;
  totalOtHours: number;
  estimatedOtPay: number;
}

export interface ColumnMapping {
  empId: string;
  empName: string;
  department?: string;
  shift?: string;
  date: string;
  inTime: string;
  outTime: string;
  muster?: string;
  worktime?: string;
  extra?: string;
  overtime?: string;
  lateCome?: string;
  earlyGo?: string;
  lateGo?: string;
  onDuty?: string;
  sunday?: string;
  holiday?: string;
}
