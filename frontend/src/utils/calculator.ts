import { AttendanceRecord, AttendanceStatus, CompanyHoliday, EmployeeSummary, ShiftConfig, ShiftDefinition } from '../types/attendance';

export const DEFAULT_SHIFTS: ShiftDefinition[] = [
  { shiftCode: 'KG', shiftName: 'General Shift (KG)', shiftStart: '08:30', shiftEnd: '17:00', fullDayHours: 8.5, halfDayHours: 4, graceMinutes: 15, isOvernight: false },
  { shiftCode: 'K1', shiftName: 'Morning Shift 1 (K1)', shiftStart: '06:00', shiftEnd: '14:00', fullDayHours: 8, halfDayHours: 4, graceMinutes: 15, isOvernight: false },
  { shiftCode: 'K2', shiftName: 'Afternoon Shift 2 (K2)', shiftStart: '14:30', shiftEnd: '23:00', fullDayHours: 8.5, halfDayHours: 4, graceMinutes: 15, isOvernight: false },
  { shiftCode: 'K3', shiftName: 'Night Shift 3 (K3)', shiftStart: '23:00', shiftEnd: '06:00', fullDayHours: 7, halfDayHours: 3.5, graceMinutes: 15, isOvernight: true },
  { shiftCode: 'K6', shiftName: 'Extended Night Shift (K6)', shiftStart: '18:00', shiftEnd: '02:00', fullDayHours: 8, halfDayHours: 4, graceMinutes: 15, isOvernight: true },
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
    const status: AttendanceStatus = (isHoliday || isWeekOff) ? 'HOLIDAY' : isOnDuty ? 'PRESENT' : 'ABSENT';
    const musterCode = (isHoliday || isWeekOff) ? 'HL' : (rawMuster || 'AA');
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
      notes: isHoliday ? (companyHoliday ? `${companyHoliday.name} (Holiday)` : 'Holiday') : isWeekOff ? 'Sunday Holiday (HL)' : isOnDuty ? 'On Duty' : 'Absent (No Punch)',
    };
  }

  // Single punch missing
  if (inMinutes === null || outMinutes === null) {
    const musterCode = isDateSunday ? 'HL' : (rawMuster || 'MISSED');
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
      isLate: inMinutes !== null && inMinutes > shiftStartMin + graceMinutes,
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

  const standardShiftMin = Math.round(fullDayHours * 60);

  if (rawMuster === 'PP') {
    status = 'PRESENT';
  } else if (rawMuster === 'PA' || rawMuster === 'AP') {
    status = 'HALF_DAY';
  } else if (rawMuster === 'AA') {
    status = 'ABSENT';
  } else if (rawMuster === 'WO') {
    status = 'PRESENT';
  } else {
    // If no explicit muster in file, determine dynamically from hours & shift window
    // 1. Employee completed the shift within permitted grace (e.g. 08:31 to 17:00 when shift is 08:30 to 17:00)
    const completedShiftWithGrace = (inMinutes <= shiftStartMin + graceMinutes) && 
      (shiftRule.isOvernight 
        ? (outMinutes >= shiftEndMin || (outMinutes < shiftStartMin && outMinutes >= shiftEndMin - graceMinutes))
        : (outMinutes >= shiftEndMin - graceMinutes));

    // 2. Worked duration matches full day (allowing for grace window or late arrival within shift, e.g. >= standardShiftMin - graceMinutes or >= fullDayHours - 1.0)
    const workedFullDayDuration = workedMinutes >= (standardShiftMin - graceMinutes) || workedHours >= (fullDayHours - 1.0);

    if (completedShiftWithGrace || workedFullDayDuration || workedHours >= fullDayHours) {
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
  // Sunday has no late-coming deduction because Sunday is a holiday/off-day
  let lateComeDurationMinutes = 0;
  if (!isDateSunday && inMinutes !== null && inMinutes > shiftStartMin) {
    lateComeDurationMinutes = inMinutes - shiftStartMin;
  }
  const formattedLateCome = lateComeDurationMinutes > 0 ? formatMinutesToTime(lateComeDurationMinutes) : '';
  const isLate = !isDateSunday && lateComeDurationMinutes > graceMinutes;

  // 2. Early Go & Late Go Duration
  // Sunday has no early exit / late go because Sunday is not a standard scheduled shift
  let earlyGoDurationMinutes = 0;
  let lateGoDurationMinutes = 0;

  if (!isDateSunday && inMinutes !== null && outMinutes !== null) {
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
  // - Sunday Rule: "sunday la work pana extra time la show panu mama avalo naram work pani eurkaganu sunday la todyal ha show panu mama ....example screenshort extra hrs la 8.28 nu erukom"
  //   -> On Sunday, the total duration worked is shown in Extra Time (e.g. 06:01 to 14:29 = 8h 28m -> 08:28)
  // - Weekdays:
  //   - Early Comer (inMinutes <= shiftStartMin): (shiftStartMin - inMinutes) + LateGo
  //   - Late Comer (inMinutes > shiftStartMin): LateGo (late minutes are recorded in LateCome, NOT deducted from overtime past shift end)
  //   - User Rule: "9hr mela extra time erdha overtime la 8 tha varanum" -> Overtime is capped at maximum 8 hours!
  let extraDurationMinutes = 0;
  let overtimeHours = 0;
  let otDuty = 0;

  if (isDateSunday) {
    if (inMinutes !== null && outMinutes !== null && workedMinutes > 0) {
      extraDurationMinutes = workedMinutes;
    }
    overtimeHours = 0;
    otDuty = 0;
  } else if (inMinutes !== null && outMinutes !== null && status !== 'ABSENT') {
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
  // On Sunday, regular shift worktime is '00:00' because all worked duration is captured in Extra Time & Sunday duty
  let standardWorkMin = standardShiftMin;
  if (isDateSunday) {
    standardWorkMin = 0;
  } else if (status === 'PRESENT') {
    if (shiftRule.shiftCode === 'K6' && lateComeDurationMinutes > 0) {
      standardWorkMin = Math.max(0, standardShiftMin - lateComeDurationMinutes);
    }
  } else if (status === 'HALF_DAY') {
    if (shiftRule.shiftCode === 'K6') {
      standardWorkMin = Math.round(workedMinutes / 60) * 60;
    } else {
      standardWorkMin = Math.round(halfDayHours * 60);
    }
  } else if (status === 'ABSENT') {
    standardWorkMin = 0;
  }
  const formattedWorktime = (isDateSunday && (inMinutes === null || outMinutes === null || workedMinutes === 0))
    ? ''
    : formatMinutesToTime(standardWorkMin);

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
    // "Muster la WW sunday eruku adhuku HL nu chaneg paniko"
    muster = 'HL';
    if (workedHours >= fullDayHours || musterUpper === 'PP' || workedMinutes >= (standardShiftMin - graceMinutes) || workedHours >= 8.0) {
      sundayDuty = 1;
      status = 'PRESENT';
    } else if (workedHours >= halfDayHours || musterUpper === 'PA' || musterUpper === 'AP' || workedHours >= 4.0) {
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
    if (sundayDuty === 1) notes = 'Sunday Full Duty (HL)';
    else if (sundayDuty === 0.5) notes = 'Sunday Half Duty (HL)';
    else notes = 'Sunday Holiday (HL)';
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

  // Determine standard working dates for the dataset
  // A working date is any unique date in the records that is NOT Sunday and NOT a declared company holiday
  const distinctDates = Array.from(new Set(records.map(r => r.date).filter(Boolean)));
  const holidayDates = new Set((config.holidays || []).map(h => h.date));
  const standardWorkingDates = distinctDates.filter(d => !isSundayDate(d) && !holidayDates.has(d));
  const totalMonthWorkingDays = standardWorkingDates.length;

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
        monthWorkingDays: totalMonthWorkingDays,
        actualPresentDays: 0,
        monthAbsentDays: 0,
        compOffDays: 0,
        finalWorkDays: 0,
        compOffOtDuties: 0,
        paidOtDuties: 0,
      });
    }

    const summary = map.get(r.empId)!;
    summary.totalDays += 1;
    summary.totalOnDuty = Number(((summary.totalOnDuty || 0) + (r.onDuty !== undefined ? r.onDuty : (r.status === 'PRESENT' ? 1 : r.status === 'HALF_DAY' ? 0.5 : 0))).toFixed(3));
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

    summary.totalWorkHours = Number((Number(summary.totalWorkHours) + Number(r.totalHours || 0)).toFixed(2));
    summary.totalOtHours = Number((Number(summary.totalOtHours) + Number(r.otHours || 0)).toFixed(2));
  }

  // Second pass: Calculate Priority 1 (Sunday/Holiday equalize month working days) & Priority 2 (OT offset)
  for (const summary of map.values()) {
    // Late penalty deduction (e.g. 3 late marks = 0.5 day cut)
    if (config.enableLatePenalty) {
      const graceCount = config.lateGraceCount || 3;
      summary.latePenaltyDays = Number((Math.floor(summary.totalLateMarks / graceCount) * 0.5).toFixed(1));
    } else {
      summary.latePenaltyDays = 0;
    }

    const monthWorkingDays = summary.monthWorkingDays || totalMonthWorkingDays;
    const actualPresent = summary.totalOnDuty ?? summary.presentDays;
    summary.actualPresentDays = actualPresent;

    // Standard working day absent before adjustments:
    const initialShortfall = Math.max(0, Number((monthWorkingDays - actualPresent).toFixed(3)));

    // Total weekend / holiday duty available to equalize month working days:
    const totalSundays = summary.totalSundays || 0;
    const totalHolidays = summary.totalHolidays || 0;
    const weekendDuty = Number((totalSundays + totalHolidays).toFixed(3));

    // Priority 1: Use worked Sundays & Holidays to equalize month working days:
    // "present + sunday pakanum adhu 27 vadhichina apidya aduthukoma"
    const weekendUsedForWork = Number(Math.min(initialShortfall, weekendDuty).toFixed(3));

    const sundayUsed = Number(Math.min(initialShortfall, totalSundays).toFixed(3));
    const remainingShortfallForHoliday = Math.max(0, Number((initialShortfall - sundayUsed).toFixed(3)));
    const holidayUsed = Number(Math.min(remainingShortfallForHoliday, totalHolidays).toFixed(3));
    summary.sundayUsedForWork = sundayUsed;
    summary.holidayUsedForWork = holidayUsed;

    // Surplus weekend duty beyond month working days:
    // "presetn + sunday 27 vita mela pochina next month ku compo ha leave aduthukalam"
    const weekendSurplus = Math.max(0, Number((weekendDuty - weekendUsedForWork).toFixed(3)));
    summary.compOffNextMonth = weekendSurplus;

    // Remaining shortfall after using Sunday/Holiday:
    const remainingShortfall = Math.max(0, Number((initialShortfall - weekendUsedForWork).toFixed(3)));

    // Priority 2: If shortfall still remains, use OT duties:
    // "27 varalana ot la erdhu aduthukom"
    const totalOt = summary.totalOtDuties || 0;
    const otUsedForWork = Number(Math.min(remainingShortfall, totalOt).toFixed(3));
    summary.compOffDays = otUsedForWork;
    summary.compOffOtDuties = otUsedForWork;

    // Final absent days on working days (uncovered absent):
    summary.monthAbsentDays = Math.max(0, Number((remainingShortfall - otUsedForWork).toFixed(3)));

    // Final Work Days achieved:
    // actualPresent + weekendUsedForWork + otUsedForWork
    summary.finalWorkDays = Number((actualPresent + weekendUsedForWork + otUsedForWork).toFixed(3));

    // Remaining OT to be paid as Overtime:
    summary.paidOtDuties = Math.max(0, Number((totalOt - otUsedForWork).toFixed(3)));

    // Net Payable Days for this month:
    summary.netPayableDays = Math.max(0, Number((
      summary.finalWorkDays + 
      summary.paidOtDuties - 
      summary.latePenaltyDays
    ).toFixed(3)));

    summary.estimatedOtPay = Math.round((summary.paidOtDuties * 8) * (config.otHourlyRate || 0));
  }

  return Array.from(map.values()).sort((a, b) => a.empId.localeCompare(b.empId));
}

/**
 * Strict Holiday Sandwich Rule Evaluator:
 * "mama rendu naluma vadhu erukanum before and after must vadhu erukanum mama"
 * 1. Sunday Rule: If Sunday is in-between, skip Sunday and check the real working day before/after.
 * 2. Punch / Half Day Rule: "half day vadha kuda ok tha punch pani erukanum" -> Present or Half Day qualifies as worked.
 * 3. Paid Holiday:
 *    - Both Before AND After must be attended -> Paid Holiday: muster = 'HL', status = 'HOLIDAY', holiday = 1.0, dayTotal = 1.0.
 *    - If either Before or After was NOT attended -> Unpaid: muster = 'AA', status = 'ABSENT', holiday = 0.0, dayTotal = 0.0.
 *    - If employee actually worked on the holiday itself -> muster = 'HP', status = 'PRESENT', holiday = 1.0, dayTotal = 1.0 + otDuty.
 */
export function applyHolidaySandwichRule(
  records: AttendanceRecord[],
  holidays: CompanyHoliday[]
): AttendanceRecord[] {
  if (!records || records.length === 0 || !holidays || holidays.length === 0) {
    return records;
  }

  const holidayMap = new Map<string, CompanyHoliday>();
  for (const h of holidays) {
    if (h.date) {
      holidayMap.set(h.date, h);
    }
  }

  const allDates = Array.from(new Set(records.map(r => r.date))).filter(Boolean).sort();
  if (allDates.length === 0) return records;

  const isSunday = (dStr: string): boolean => {
    try {
      const dt = new Date(`${dStr}T00:00:00`);
      return dt.getDay() === 0;
    } catch {
      return false;
    }
  };

  // Find immediate preceding working day (skipping Sundays and other company holidays)
  const findPrevWorkingDate = (currentDate: string): string | null => {
    const curIdx = allDates.indexOf(currentDate);
    if (curIdx <= 0) return null;
    for (let i = curIdx - 1; i >= 0; i--) {
      const d = allDates[i];
      if (isSunday(d) || holidayMap.has(d)) {
        continue;
      }
      return d;
    }
    return null;
  };

  // Find immediate succeeding working day (skipping Sundays and other company holidays)
  const findNextWorkingDate = (currentDate: string): string | null => {
    const curIdx = allDates.indexOf(currentDate);
    if (curIdx === -1 || curIdx >= allDates.length - 1) return null;
    for (let i = curIdx + 1; i < allDates.length; i++) {
      const d = allDates[i];
      if (isSunday(d) || holidayMap.has(d)) {
        continue;
      }
      return d;
    }
    return null;
  };

  // Check if an employee attended / punched on a given date (Half Day is also accepted!)
  const isWorkedOrPunched = (r?: AttendanceRecord): boolean => {
    if (!r) return false;
    if (r.status === 'PRESENT' || r.status === 'HALF_DAY') return true;
    if (r.muster === 'PP' || r.muster === 'PA' || r.muster === 'AP' || r.muster === 'HP' || r.muster === 'OD') return true;
    if (r.onDuty && r.onDuty > 0) return true;
    const hasIn = Boolean(r.inTime && r.inTime !== '--:--' && r.inTime !== '' && r.inTime !== '-');
    const hasOut = Boolean(r.outTime && r.outTime !== '--:--' && r.outTime !== '' && r.outTime !== '-');
    return hasIn || hasOut;
  };

  // Group records by empId -> date -> record
  const empRecords = new Map<string, Map<string, AttendanceRecord>>();
  for (const r of records) {
    if (!empRecords.has(r.empId)) {
      empRecords.set(r.empId, new Map());
    }
    empRecords.get(r.empId)!.set(r.date, r);
  }

  // Evaluate records
  return records.map(record => {
    const holiday = holidayMap.get(record.date);
    if (!holiday) {
      return record; // Normal day, unadjusted
    }

    // Physical work on holiday itself
    const hasPhysicalPunch = Boolean(
      (record.inTime && record.inTime !== '--:--' && record.inTime !== '' && record.inTime !== '-') ||
      (record.outTime && record.outTime !== '--:--' && record.outTime !== '' && record.outTime !== '-')
    );

    if (hasPhysicalPunch) {
      return {
        ...record,
        muster: 'HP',
        status: 'PRESENT',
        holiday: holiday.isPaid !== false ? 1.0 : 0.0,
        dayTotal: Number(((holiday.isPaid !== false ? 1.0 : 0.0) + (record.otDuty || 0)).toFixed(3)),
        notes: `Worked on Holiday: ${holiday.name}`,
      };
    }

    // Did not punch on holiday -> evaluate Sandwich Rule
    const prevWorkingDate = findPrevWorkingDate(record.date);
    const nextWorkingDate = findNextWorkingDate(record.date);

    const empDateMap = empRecords.get(record.empId);
    const workedBefore = prevWorkingDate ? isWorkedOrPunched(empDateMap?.get(prevWorkingDate)) : false;
    const workedAfter = nextWorkingDate ? isWorkedOrPunched(empDateMap?.get(nextWorkingDate)) : false;

    // Strict Sandwich Rule: Both Before AND After MUST be attended
    const isEligible = workedBefore && workedAfter;

    if (isEligible && holiday.isPaid !== false) {
      // Eligible -> Paid Holiday (1.0 Duty)
      return {
        ...record,
        inTime: '--:--',
        outTime: '--:--',
        muster: 'HL',
        status: 'HOLIDAY',
        holiday: 1.0,
        onDuty: 0.0,
        sunday: 0.0,
        dayTotal: 1.0,
        totalMinutes: 0,
        totalHours: 0,
        overtimeHours: 0,
        otDuty: 0,
        notes: `${holiday.name} (Paid Holiday: Sandwich Rule Passed)`,
      };
    } else {
      // Not Eligible -> Absent (0.0 Duty, Unpaid)
      return {
        ...record,
        inTime: '--:--',
        outTime: '--:--',
        muster: 'AA',
        status: 'ABSENT',
        holiday: 0.0,
        onDuty: 0.0,
        sunday: 0.0,
        dayTotal: 0.0,
        totalMinutes: 0,
        totalHours: 0,
        overtimeHours: 0,
        otDuty: 0,
        notes: `${holiday.name} (Unpaid Holiday: Absent Before/After)`,
      };
    }
  });
}

