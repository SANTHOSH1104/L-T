import { AttendanceRecord, AttendanceStatus, EmployeeSummary, ShiftConfig, ShiftDefinition } from '../types/attendance';

export const DEFAULT_SHIFTS: ShiftDefinition[] = [
  { shiftCode: 'KG', shiftName: 'General Shift (KG)', shiftStart: '08:30', shiftEnd: '17:00', fullDayHours: 8.5, halfDayHours: 4, graceMinutes: 15, isOvernight: false },
  { shiftCode: 'K1', shiftName: 'Morning Shift 1 (K1)', shiftStart: '06:00', shiftEnd: '14:00', fullDayHours: 8, halfDayHours: 4, graceMinutes: 15, isOvernight: false },
  { shiftCode: 'K2', shiftName: 'Afternoon Shift 2 (K2)', shiftStart: '14:30', shiftEnd: '23:00', fullDayHours: 8.5, halfDayHours: 4, graceMinutes: 15, isOvernight: false },
  { shiftCode: 'K3', shiftName: 'Night Shift 3 (K3)', shiftStart: '23:00', shiftEnd: '07:30', fullDayHours: 8.5, halfDayHours: 4, graceMinutes: 15, isOvernight: true },
  { shiftCode: 'K6', shiftName: 'Extended Night Shift (K6)', shiftStart: '18:00', shiftEnd: '06:00', fullDayHours: 11, halfDayHours: 5, graceMinutes: 15, isOvernight: true },
];

export const DEFAULT_SHIFT_CONFIG: ShiftConfig = {
  shiftStart: '08:30',
  shiftEnd: '17:00',
  fullDayHours: 8.5,
  halfDayHours: 4,
  otThresholdHours: 8,
  graceMinutes: 15,
  otHourlyRate: 150,
  companyName: 'Macha Enterprise Solutions',
  minOtQualifyHours: 2.0,
  shifts: DEFAULT_SHIFTS,
};

/**
 * Parse time string or Excel decimal number into minutes from midnight
 */
export function parseTimeToMinutes(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;

  // If it's a number from Excel (fraction of day, e.g. 0.375 = 9:00 AM)
  if (typeof raw === 'number') {
    // If it's a fraction < 1, it's fraction of day
    if (raw >= 0 && raw < 1) {
      return Math.round(raw * 24 * 60);
    }
    // If it's larger (e.g. excel date+time serial)
    const frac = raw - Math.floor(raw);
    if (frac > 0) {
      return Math.round(frac * 24 * 60);
    }
  }

  const str = String(raw).trim().toLowerCase();
  if (!str || str === '-' || str === 'nil' || str === 'absent' || str === 'na') {
    return null;
  }

  // Handle stringified numbers / Excel fraction of day (e.g. '0.04583333333333333' or '0.0020833')
  const numVal = Number(str);
  if (!isNaN(numVal) && isFinite(numVal)) {
    if (numVal >= 0 && numVal < 1) {
      return Math.round(numVal * 24 * 60);
    }
    const frac = numVal - Math.floor(numVal);
    if (frac > 0) {
      return Math.round(frac * 24 * 60);
    }
  }

  // Check 12-hour AM/PM format (e.g. "09:30 AM", "6:15 pm", "6:15pm")
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const modifier = ampmMatch[3];

    if (modifier === 'pm' && hours < 12) hours += 12;
    if (modifier === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Check 24-hour format or duration (e.g. "09:30", "18:45", "01:06", "1:06", "4:18")
  const h24Match = str.match(/^(\d{1,3}):(\d{2})(?::\d{2})?$/);
  if (h24Match) {
    const hours = parseInt(h24Match[1], 10);
    const minutes = parseInt(h24Match[2], 10);
    if (hours >= 0 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  // Check simple 4-digit number like "0930" or "1845"
  if (/^\d{4}$/.test(str)) {
    const hours = parseInt(str.slice(0, 2), 10);
    const minutes = parseInt(str.slice(2, 4), 10);
    if (hours < 24 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  return null;
}

/**
 * Format minutes from midnight to readable "HH:MM"
 */
export function formatMinutesToTime(minutes: number | null): string {
  if (minutes === null || isNaN(minutes) || minutes < 0) return '--:--';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Parse date string or excel serial date to YYYY-MM-DD
 */
export function parseDateString(raw: unknown): string {
  if (!raw) {
    return new Date().toISOString().slice(0, 10);
  }

  // Excel serial date number
  if (typeof raw === 'number' && raw > 30000 && raw < 70000) {
    const utcDays = Math.floor(raw - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return date.toISOString().slice(0, 10);
  }

  const str = String(raw).trim();
  // Standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Fallback try standard Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return str;
}

export function isSundayDate(dateStr: string): boolean {
  if (!dateStr) return false;
  let d: Date | null = null;
  const str = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, day] = str.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(str)) {
    const parts = str.split(/[/-]/).map(Number);
    d = new Date(parts[2], parts[1] - 1, parts[0]);
  } else {
    const testD = new Date(str);
    if (!isNaN(testD.getTime())) d = testD;
  }
  return d !== null && !isNaN(d.getTime()) && d.getDay() === 0;
}

/**
 * Calculate single attendance record
 */
export function processAttendanceRecord(
  id: string,
  empId: string,
  empName: string,
  department: string,
  rawDate: unknown,
  rawInTime: unknown,
  rawOutTime: unknown,
  config: ShiftConfig,
  extraData?: {
    shift?: string;
    muster?: string;
    worktime?: string;
    extraTime?: string;
    lateCome?: string;
    earlyGo?: string;
    lateGo?: string;
    overtime?: string;
  }
): AttendanceRecord {
  const inMinutes = parseTimeToMinutes(rawInTime);
  const outMinutes = parseTimeToMinutes(rawOutTime);
  const date = parseDateString(rawDate);

  const formattedIn = formatMinutesToTime(inMinutes);
  const formattedOut = formatMinutesToTime(outMinutes);

  const shiftCode = String(extraData?.shift || 'KG').trim().toUpperCase();
  const shiftsPool = config.shifts && config.shifts.length > 0 ? config.shifts : DEFAULT_SHIFTS;
  const shiftRule = shiftsPool.find(s => s.shiftCode.toUpperCase() === shiftCode) ||
                    shiftsPool.find(s => s.shiftCode.toUpperCase() === 'KG') || {
                      shiftCode: 'KG',
                      shiftName: 'General Shift',
                      shiftStart: config.shiftStart || '08:30',
                      shiftEnd: config.shiftEnd || '17:30',
                      fullDayHours: config.fullDayHours || 8,
                      halfDayHours: config.halfDayHours || 4,
                      graceMinutes: config.graceMinutes || 15,
                      isOvernight: false,
                    };

  const shift = shiftRule.shiftCode;
  const rawMuster = String(extraData?.muster || '').trim().toUpperCase();

  const shiftStartMin = parseTimeToMinutes(shiftRule.shiftStart) ?? (8 * 60 + 30);
  const shiftEndMin = parseTimeToMinutes(shiftRule.shiftEnd) ?? (17 * 60 + 30);
  const fullDayHours = shiftRule.fullDayHours || config.fullDayHours || 8;
  const halfDayHours = shiftRule.halfDayHours || config.halfDayHours || 4;
  const graceMinutes = shiftRule.graceMinutes !== undefined ? shiftRule.graceMinutes : (config.graceMinutes || 15);

  const isDateSunday = isSundayDate(date);
  const companyHoliday = config.holidays?.find(h => h.date === date);
  const isConfiguredHoliday = Boolean(companyHoliday);

  // Both missing
  if (inMinutes === null && outMinutes === null) {
    const isHolidayMuster = rawMuster === 'HP' || rawMuster === 'HL' || rawMuster === 'PH';
    const isHoliday = isConfiguredHoliday || isHolidayMuster;
    const isExplicitWeekOff = rawMuster === 'WO' || rawMuster === 'WW' || rawMuster === 'SUN';
    const isWeekOff = isDateSunday || isExplicitWeekOff;
    const isOnDuty = rawMuster === 'OD';
    const holidayPaid = isHoliday && (companyHoliday ? companyHoliday.isPaid !== false : true);
    const status: AttendanceStatus = isHoliday ? 'HOLIDAY' : isOnDuty ? 'PRESENT' : 'ABSENT';
    const musterCode = isHoliday ? 'HL' : isWeekOff ? 'WW' : (rawMuster || 'AA');
    const dayTotal = isHoliday ? (holidayPaid ? 1 : 0) : isOnDuty ? 1 : 0;

    return {
      id,
      empId,
      empName,
      department: department || 'General',
      shift,
      date,
      inTime: '--:--',
      outTime: '--:--',
      muster: musterCode,
      worktime: extraData?.worktime || '',
      extraTime: extraData?.extraTime || '',
      overtimeHours: 0,
      lateCome: extraData?.lateCome || '',
      earlyGo: extraData?.earlyGo || '',
      lateGo: extraData?.lateGo || '',
      otDuty: 0,
      onDuty: isOnDuty ? 1 : 0,
      sunday: 0,
      holiday: holidayPaid ? 1 : 0,
      dayTotal,
      totalMinutes: 0,
      totalHours: 0,
      status,
      isLate: false,
      isEarlyExit: false,
      otMinutes: 0,
      otHours: 0,
      notes: isHoliday ? (companyHoliday ? `${companyHoliday.name} (Holiday)` : 'Holiday') : isWeekOff ? 'Weekly Off (WW)' : isOnDuty ? 'On Duty' : 'Absent (No Punch)',
    };
  }

  // Single punch missing
  if (inMinutes === null || outMinutes === null) {
    const musterCode = isDateSunday ? 'WW' : (rawMuster || 'MISSED');
    return {
      id,
      empId,
      empName,
      department: department || 'General',
      shift,
      date,
      inTime: formattedIn,
      outTime: formattedOut,
      muster: musterCode,
      worktime: extraData?.worktime || '',
      extraTime: extraData?.extraTime || '',
      lateCome: extraData?.lateCome || '',
      earlyGo: extraData?.earlyGo || '',
      lateGo: extraData?.lateGo || '',
      onDuty: 0,
      sunday: 0,
      holiday: 0,
      dayTotal: 0,
      totalMinutes: 0,
      totalHours: 0,
      status: 'MISSED_PUNCH',
      isLate: inMinutes !== null && inMinutes > shiftStartMin + config.graceMinutes,
      isEarlyExit: false,
      otMinutes: 0,
      otHours: 0,
      notes: inMinutes === null ? 'Missing In Punch' : 'Missing Out Punch',
    };
  }

  // Calculate worked minutes
  let workedMinutes = outMinutes - inMinutes;
  if (workedMinutes < 0) {
    workedMinutes += 24 * 60;
  }

  if (extraData?.worktime) {
    const parsedWorkMin = parseTimeToMinutes(extraData.worktime);
    if (parsedWorkMin !== null && parsedWorkMin > 0) {
      workedMinutes = parsedWorkMin;
    }
  }

  const workedHours = Number((workedMinutes / 60).toFixed(2));

  // Determine status from Muster
  let status: AttendanceStatus = 'PRESENT';
  let muster = rawMuster;

  if (rawMuster === 'PP') {
    status = 'PRESENT';
  } else if (rawMuster === 'PA' || rawMuster === 'AP') {
    status = 'HALF_DAY';
  } else if (rawMuster === 'AA') {
    status = 'ABSENT';
  } else if (rawMuster === 'WO') {
    status = 'PRESENT';
  } else {
    if (workedHours >= fullDayHours) {
      status = 'PRESENT';
      muster = 'PP';
    } else if (workedHours >= halfDayHours) {
      status = 'HALF_DAY';
      muster = 'PA';
    } else {
      status = 'ABSENT';
      muster = 'AA';
    }
  }

  // 1. Late Come Duration (how much duration employee arrived late: HH:MM)
  let lateComeDurationMinutes = 0;
  if (inMinutes !== null && inMinutes > shiftStartMin) {
    lateComeDurationMinutes = inMinutes - shiftStartMin;
  }
  const formattedLateCome = lateComeDurationMinutes > 0 ? formatMinutesToTime(lateComeDurationMinutes) : '';
  const isLate = lateComeDurationMinutes > graceMinutes;

  // 2. Early Go & Late Go Duration
  let earlyGoDurationMinutes = 0;
  let lateGoDurationMinutes = 0;

  if (inMinutes !== null && outMinutes !== null) {
    if (shiftRule.isOvernight) {
      // OVERNIGHT SHIFT LOGIC (e.g. K6 18:00 to 06:00, K3 23:00 to 07:30)
      if (outMinutes >= shiftStartMin) {
        // Employee left on the SAME NIGHT before midnight (Day 0) - this is an early exit, NOT a late go!
        lateGoDurationMinutes = 0;
        if (status !== 'ABSENT') {
          earlyGoDurationMinutes = (24 * 60 - outMinutes) + shiftEndMin;
        }
      } else {
        // Employee left on the NEXT MORNING after midnight (Day 1)
        if (outMinutes > shiftEndMin) {
          lateGoDurationMinutes = outMinutes - shiftEndMin;
        } else if (outMinutes < shiftEndMin && status !== 'ABSENT') {
          earlyGoDurationMinutes = shiftEndMin - outMinutes;
        }
      }
    } else {
      // REGULAR DAY SHIFT LOGIC (e.g. KG 08:30 to 17:00, K1 06:00 to 14:00)
      if (outMinutes < inMinutes) {
        // Stayed past midnight into next day
        const outNormalized = outMinutes + 24 * 60;
        if (outNormalized > shiftEndMin) {
          lateGoDurationMinutes = outNormalized - shiftEndMin;
        }
      } else {
        if (outMinutes > shiftEndMin) {
          lateGoDurationMinutes = outMinutes - shiftEndMin;
        } else if (outMinutes < shiftEndMin && status !== 'ABSENT') {
          earlyGoDurationMinutes = shiftEndMin - outMinutes;
        }
      }
    }
  }

  const formattedEarlyGo = earlyGoDurationMinutes > 0 ? formatMinutesToTime(earlyGoDurationMinutes) : '';
  const isEarlyExit = earlyGoDurationMinutes > 0;
  const formattedLateGo = lateGoDurationMinutes > 0 ? formatMinutesToTime(lateGoDurationMinutes) : '';

  // 3. Extra Time Duration & Overtime:
  // Mathematical Rule verified against ground-truth HR standard:
  // - Early Comer (inMinutes <= shiftStartMin): (shiftStartMin - inMinutes) + LateGo
  // - Late Comer (inMinutes > shiftStartMin): LateGo (late minutes are recorded in LateCome, NOT deducted from overtime past shift end)
  // - Sunday Rule: "Sunday work time OT la add aaguthu" -> Sunday work time is credited to Sunday duty, NOT OT!
  // - User Rule: "9hr mela extra time erdha overtime la 8 tha varanum" -> Overtime is capped at maximum 8 hours!
  let extraDurationMinutes = 0;
  let overtimeHours = 0;
  let otDuty = 0;

  if (!isDateSunday && inMinutes !== null && outMinutes !== null && status !== 'ABSENT') {
    if (shiftRule.isOvernight && outMinutes >= shiftStartMin) {
      // Overnight shift: left early on same night -> no extra time!
      extraDurationMinutes = 0;
    } else {
      if (inMinutes <= shiftStartMin) {
        extraDurationMinutes = (shiftStartMin - inMinutes) + lateGoDurationMinutes;
      } else {
        extraDurationMinutes = lateGoDurationMinutes;
      }
    }

    // Overtime Hours (OT) with Strict 1:56 Cutoff & 4-minute grace & 8-hour maximum cap:
    // - If extra time <= 1:55 (115 mins) -> 0 OT!
    // - If extra time >= 1:56 (116 mins) -> Math.min(8, Math.floor((extraDurationMinutes + 4) / 60))
    // - User Rule: "9hr mela extra time erdha overtime la 8 tha varanum"
    if (extraDurationMinutes >= 116) {
      overtimeHours = Math.min(8, Math.floor((extraDurationMinutes + 4) / 60));
    } else {
      overtimeHours = 0;
    }

    // OT Duty Resolution: "like ot time divide by 8 ... ipo 5 erdha div by 8 pana 0.625 nu varanum mama"
    // - Formula: overtimeHours / 8, capped at maximum 1.0 duty per day.
    if (overtimeHours >= 2) {
      otDuty = Number(Math.min(1.0, overtimeHours / 8).toFixed(3));
    }
  }

  const formattedExtraTime = extraDurationMinutes > 0 ? formatMinutesToTime(extraDurationMinutes) : '';
  const otMinutes = overtimeHours * 60;
  const otHours = overtimeHours;

  // 7. Worktime Duration formatting:
  // In standard HR practice, Worktime displays the standard shift duration for full day present
  // (e.g. 08:30 for KG, 08:00 for K1/K2/K3), while extra time worked is captured in Extra Time & OT.
  const standardShiftMin = Math.round(fullDayHours * 60);
  let formattedWorktime = formatMinutesToTime(standardShiftMin);
  if (status === 'HALF_DAY') {
    formattedWorktime = formatMinutesToTime(Math.round(halfDayHours * 60));
  } else if (status === 'ABSENT') {
    formattedWorktime = '00:00';
  }

  const musterUpper = String(muster || '').toUpperCase();

  let onDuty = 0;
  let sundayDuty = 0;
  let holidayDuty = 0;

  if (isConfiguredHoliday || musterUpper === 'HP' || musterUpper === 'HL' || musterUpper === 'PH') {
    // COMPANY HOLIDAY WORK RULE:
    // Employee worked on a company holiday
    muster = 'HP';
    status = 'PRESENT';
    holidayDuty = (companyHoliday ? companyHoliday.isPaid !== false : true) ? 1.0 : 0.0;
    onDuty = 0;
    sundayDuty = 0;
  } else if (isDateSunday) {
    // SUNDAY RULE:
    // "Na kudukura date la sunday erdha muster la ww podu.... suppose sunday work pana sundat column la varanum mama"
    muster = 'WW';
    if (workedHours >= fullDayHours || musterUpper === 'PP') {
      sundayDuty = 1;
      status = 'PRESENT';
    } else if (workedHours >= halfDayHours || musterUpper === 'PA' || musterUpper === 'AP') {
      sundayDuty = 0.5;
      status = 'HALF_DAY';
    } else {
      sundayDuty = 0;
      status = 'ABSENT';
    }
    // For Sunday work, duty is credited to sunday column, onDuty is 0
    onDuty = 0;
    holidayDuty = 0;
  } else {
    // WEEKDAY (Mon - Sat) RULE:
    // "Then on duty column la full day work pana tha varuthu ahduva half day present erdha 0.5 varanaum mama"
    sundayDuty = 0;
    holidayDuty = 0;
    if (status === 'PRESENT' || workedHours >= fullDayHours || musterUpper === 'PP' || musterUpper === 'OD') {
      onDuty = 1;
    } else if (status === 'HALF_DAY' || workedHours >= halfDayHours || musterUpper === 'PA' || musterUpper === 'AP') {
      onDuty = 0.5;
    } else {
      onDuty = 0;
    }
  }

  // 3. Total = On Duty + OT Present + Sunday + Holiday
  // Rule: On Duty (1) + OT (0.625) => Total 1.625! On Duty (1) + OT (1) => Total 2!
  const dayTotal = Number((onDuty + otDuty + sundayDuty + holidayDuty).toFixed(3));

  let notes = '';
  if (isConfiguredHoliday || musterUpper === 'HP' || musterUpper === 'HL') {
    notes = companyHoliday ? `Worked on Holiday: ${companyHoliday.name}` : 'Worked on Holiday';
    if (otDuty > 0) notes += ` + OT (${overtimeHours}h)`;
  } else if (isDateSunday) {
    if (sundayDuty === 1) notes = otDuty > 0 ? `Sunday Full Duty + OT (${overtimeHours}h)` : 'Sunday Full Duty (1d)';
    else if (sundayDuty === 0.5) notes = 'Sunday Half Duty (0.5d)';
    else notes = 'Weekly Off (WW)';
  } else {
    if (status === 'HALF_DAY') notes = 'Half Day (0.5d)';
    else if (status === 'ABSENT') notes = 'Absent';
    else if (otDuty > 0) notes = `OT Qualified: ${overtimeHours}h (OT Duty ${otDuty})`;
    else if (isLate) notes = `Late by ${formattedLateCome}`;
  }

  return {
    id,
    empId,
    empName,
    department: department || 'General',
    shift,
    date,
    inTime: formattedIn,
    outTime: formattedOut,
    muster: muster || 'PP',
    worktime: formattedWorktime,
    extraTime: formattedExtraTime,
    overtimeHours,
    lateCome: formattedLateCome,
    earlyGo: formattedEarlyGo,
    lateGo: formattedLateGo,
    otDuty,
    onDuty,
    sunday: sundayDuty,
    holiday: holidayDuty,
    dayTotal,
    totalMinutes: workedMinutes,
    totalHours: workedHours,
    status,
    isLate,
    isEarlyExit,
    otMinutes: overtimeHours * 60,
    otHours: overtimeHours,
    notes: notes || undefined,
  };
}

export const calculateRecord = processAttendanceRecord;

/**
 * Generate monthly consolidated summary grouped by Employee
 */
export function generateEmployeeSummaries(
  records: AttendanceRecord[],
  config: ShiftConfig
): EmployeeSummary[] {
  const map = new Map<string, EmployeeSummary>();

  for (const r of records) {
    if (!map.has(r.empId)) {
      map.set(r.empId, {
        empId: r.empId,
        empName: r.empName,
        department: r.department,
        totalDays: 0,
        presentDays: 0,
        halfDays: 0,
        absentDays: 0,
        missedPunches: 0,
        totalLateMarks: 0,
        latePenaltyDays: 0,
        netPayableDays: 0,
        totalOnDuty: 0,
        totalOtDuties: 0,
        totalSundays: 0,
        totalHolidays: 0,
        totalWorkHours: 0,
        totalOtHours: 0,
        estimatedOtPay: 0,
      });
    }

    const summary = map.get(r.empId)!;
    summary.totalDays += 1;
    summary.totalOnDuty = Number(((summary.totalOnDuty || 0) + (r.onDuty !== undefined ? r.onDuty : (r.status === 'PRESENT' ? 1 : r.status === 'HALF_DAY' ? 0.5 : 0))).toFixed(1));
    const otDutyUnit = r.otDuty !== undefined ? r.otDuty : ((r.otHours >= (config.minOtQualifyHours ?? 2.0)) ? Math.min(1.0, Number((r.otHours / 8).toFixed(3))) : 0);
    summary.totalOtDuties = Number(((summary.totalOtDuties || 0) + otDutyUnit).toFixed(3));
    summary.totalSundays = (summary.totalSundays || 0) + (r.sunday || 0);
    summary.totalHolidays = (summary.totalHolidays || 0) + (r.holiday || 0);

    if (r.status === 'PRESENT') {
      summary.presentDays += 1;
    } else if (r.status === 'HALF_DAY') {
      summary.halfDays += 1;
    } else if (r.status === 'ABSENT') {
      summary.absentDays += 1;
    } else if (r.status === 'MISSED_PUNCH') {
      summary.missedPunches += 1;
    }

    if (r.isLate) {
      summary.totalLateMarks += 1;
    }

    if (config.enableLatePenalty) {
      const graceCount = config.lateGraceCount || 3;
      summary.latePenaltyDays = Number((Math.floor(summary.totalLateMarks / graceCount) * 0.5).toFixed(1));
    } else {
      summary.latePenaltyDays = 0;
    }

    summary.totalWorkHours = Number((Number(summary.totalWorkHours) + Number(r.totalHours || 0)).toFixed(2));
    summary.totalOtHours = Number((Number(summary.totalOtHours) + Number(r.otHours || 0)).toFixed(2));
    // Net Payable Days = On Duty Days + OT Duties + Sundays + Holidays - Late Penalties
    summary.netPayableDays = Math.max(0, Number(((summary.totalOnDuty || summary.presentDays) + (summary.totalOtDuties || 0) + (summary.totalSundays || 0) + (summary.totalHolidays || 0) - summary.latePenaltyDays).toFixed(3)));
    summary.estimatedOtPay = Math.round(summary.totalOtHours * (config.otHourlyRate || 0));
  }

  return Array.from(map.values()).sort((a, b) => a.empId.localeCompare(b.empId));
}

