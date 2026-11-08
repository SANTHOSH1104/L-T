import { Request, Response } from 'express';
import { 
  parseExcelBuffer, 
  transformRowsToAttendance, 
  generateSampleExcelBuffer, 
  generateExportExcelBuffer 
} from '../services/excel.service';
import { 
  DEFAULT_SHIFT_CONFIG, 
  DEFAULT_SHIFTS,
  generateEmployeeSummaries, 
  calculateRecord 
} from '../services/calculator.service';
import { ShiftConfig, ShiftDefinition, ColumnMapping, AttendanceRecord } from '../types';
import { runQuery, getAllRows, getRow } from '../db/mysql';

// Fetch current shift config and multi-shift rules from MySQL DB
export async function getActiveConfig(): Promise<ShiftConfig> {
  const row = await getRow<any>('SELECT * FROM shift_config WHERE id = ?', ['default-policy']);
  const shiftRows = await getAllRows<any>('SELECT * FROM shifts ORDER BY shiftCode ASC');

  const shifts: ShiftDefinition[] = (shiftRows && shiftRows.length > 0)
    ? shiftRows.map(s => ({
        shiftCode: s.shiftCode,
        shiftName: s.shiftName,
        shiftStart: s.shiftStart,
        shiftEnd: s.shiftEnd,
        fullDayHours: Number(s.fullDayHours) || 8.0,
        halfDayHours: Number(s.halfDayHours) || 4.0,
        graceMinutes: Number(s.graceMinutes) || 15,
        isOvernight: Boolean(Number(s.isOvernight)),
      }))
    : DEFAULT_SHIFTS;

  const holidayRows = await getAllRows<any>('SELECT * FROM company_holidays ORDER BY date ASC');
  const holidays = holidayRows.map(h => ({
    id: h.id,
    date: h.date,
    name: h.name,
    type: h.type,
    isPaid: Boolean(Number(h.isPaid))
  }));

  if (row) {
    return {
      companyName: row.companyName,
      shiftStart: row.shiftStart,
      shiftEnd: row.shiftEnd,
      fullDayHours: Number(row.fullDayHours) || 8.0,
      halfDayHours: Number(row.halfDayHours) || 4.0,
      otThresholdHours: Number(row.otThresholdHours) || 8.0,
      graceMinutes: Number(row.graceMinutes) || 15,
      otHourlyRate: Number(row.otHourlyRate) || 150,
      minOtQualifyHours: 2.0,
      shifts,
      holidays,
    };
  }
  return { ...DEFAULT_SHIFT_CONFIG, shifts, holidays };
}

// 1. GET ALL ATTENDANCE LOGS FROM REAL DATABASE
export const getAttendanceLogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await getActiveConfig();
    const rows = await getAllRows<any>('SELECT * FROM attendance_logs ORDER BY date DESC, empId ASC');

    const records: AttendanceRecord[] = rows.map(r => ({
      id: r.id,
      empId: r.empId,
      empName: r.empName,
      department: r.department,
      shift: r.shift || 'KG',
      date: r.date,
      inTime: r.inTime,
      outTime: r.outTime,
      muster: r.muster || 'PP',
      worktime: r.worktime || '',
      extraTime: r.extraTime || '',
      overtimeHours: Number(r.overtimeHours) || 0,
      lateCome: r.lateCome || '',
      earlyGo: r.earlyGo || '',
      lateGo: r.lateGo || '',
      otDuty: Number(r.otDuty) || 0,
      totalMinutes: Number(r.totalMinutes) || 0,
      totalHours: Number(r.totalHours) || 0,
      status: r.status,
      isLate: Boolean(Number(r.isLate)),
      isEarlyExit: Boolean(Number(r.isEarlyExit)),
      otMinutes: Number(r.otMinutes) || 0,
      otHours: Number(r.otHours) || 0,
      onDuty: Number(r.onDuty) || 0,
      sunday: Number(r.sunday) || 0,
      holiday: Number(r.holiday) || 0,
      dayTotal: Number(r.dayTotal) !== undefined ? Number(r.dayTotal) : ((r.status === 'PRESENT' || Number(r.totalHours) >= 8 || r.muster === 'PP') ? 1 : (r.status === 'HALF_DAY' || Number(r.totalHours) >= 4) ? 0.5 : 0),
      notes: r.notes || undefined,
    }));

    const summaries = generateEmployeeSummaries(records, config);

    res.json({
      success: true,
      data: {
        records,
        summaries,
        config,
        total: records.length,
      },
    });
  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logs from database' });
  }
};

// 2. GET CURRENT SHIFT CONFIG
export const getShiftPolicy = async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await getActiveConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch policy' });
  }
};

// 3. SAVE SHIFT CONFIG & AUTO RECALCULATE DATABASE RECORDS
export const saveShiftPolicy = async (req: Request, res: Response): Promise<void> => {
  try {
    const cfg: ShiftConfig = req.body;
    await runQuery(`
      REPLACE INTO shift_config 
      (id, companyName, shiftStart, shiftEnd, fullDayHours, halfDayHours, otThresholdHours, graceMinutes, otHourlyRate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'default-policy',
      cfg.companyName || 'Macha Enterprise Solutions',
      cfg.shiftStart || '08:30',
      cfg.shiftEnd || '17:30',
      cfg.fullDayHours || 8.0,
      cfg.halfDayHours || 4.0,
      cfg.otThresholdHours || 8.0,
      cfg.graceMinutes ?? 15,
      cfg.otHourlyRate ?? 150
    ]);

    // Save Multi-Shifts if provided
    if (cfg.shifts && Array.isArray(cfg.shifts)) {
      for (const s of cfg.shifts) {
        await runQuery(`
          INSERT INTO shifts (shiftCode, shiftName, shiftStart, shiftEnd, fullDayHours, halfDayHours, graceMinutes, isOvernight)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            shiftName = VALUES(shiftName),
            shiftStart = VALUES(shiftStart),
            shiftEnd = VALUES(shiftEnd),
            fullDayHours = VALUES(fullDayHours),
            halfDayHours = VALUES(halfDayHours),
            graceMinutes = VALUES(graceMinutes),
            isOvernight = VALUES(isOvernight)
        `, [
          s.shiftCode.toUpperCase(),
          s.shiftName,
          s.shiftStart,
          s.shiftEnd,
          s.fullDayHours || 8.0,
          s.halfDayHours || 4.0,
          s.graceMinutes !== undefined ? s.graceMinutes : 15,
          s.isOvernight ? 1 : 0
        ]);
      }
    }

    const updatedConfig = await getActiveConfig();

    // Recalculate all records in DB under new shift policies
    const rows = await getAllRows<any>('SELECT * FROM attendance_logs');
    for (const r of rows) {
      const recalculated = calculateRecord(
        r.id,
        r.empId,
        r.empName,
        r.department,
        r.date,
        r.inTime === '--:--' ? '' : r.inTime,
        r.outTime === '--:--' ? '' : r.outTime,
        updatedConfig,
        {
          shift: r.shift,
          muster: r.muster,
          worktime: r.worktime,
          extraTime: r.extraTime,
          lateCome: r.lateCome,
          earlyGo: r.earlyGo,
          lateGo: r.lateGo,
        }
      );

      await runQuery(`
        UPDATE attendance_logs SET
          shift = ?,
          muster = ?,
          worktime = ?,
          extraTime = ?,
          overtimeHours = ?,
          lateCome = ?,
          earlyGo = ?,
          lateGo = ?,
          otDuty = ?,
          totalMinutes = ?,
          totalHours = ?,
          status = ?,
          isLate = ?,
          isEarlyExit = ?,
          otMinutes = ?,
          otHours = ?,
          onDuty = ?,
          sunday = ?,
          holiday = ?,
          dayTotal = ?,
          notes = ?
        WHERE id = ?
      `, [
        recalculated.shift || 'KG',
        recalculated.muster || 'PP',
        recalculated.worktime || '',
        recalculated.extraTime || '',
        recalculated.overtimeHours || 0,
        recalculated.lateCome || '',
        recalculated.earlyGo || '',
        recalculated.lateGo || '',
        recalculated.otDuty || 0,
        recalculated.totalMinutes,
        recalculated.totalHours,
        recalculated.status,
        recalculated.isLate ? 1 : 0,
        recalculated.isEarlyExit ? 1 : 0,
        recalculated.otMinutes,
        recalculated.otHours,
        recalculated.onDuty || 0,
        recalculated.sunday || 0,
        recalculated.holiday || 0,
        recalculated.dayTotal !== undefined ? recalculated.dayTotal : (recalculated.totalHours >= 8 ? 1 : 0),
        recalculated.notes || null,
        r.id
      ]);
    }

    res.json({ success: true, message: 'Shift policy updated and all database records recalculated!' });
  } catch (error) {
    console.error('Save policy error:', error);
    res.status(500).json({ success: false, message: 'Failed to update policy' });
  }
};

// 4. UPLOAD EXCEL FILE & SAVE TO DATABASE
export const uploadAndProcess = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
      return;
    }

    const { headers, rawRows, detectedMapping } = parseExcelBuffer(req.file.buffer);
    const config = await getActiveConfig();

    let mapping: ColumnMapping = detectedMapping;
    if (req.body.mapping) {
      try {
        mapping = typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping;
      } catch (e) {
        mapping = detectedMapping;
      }
    }

    // Transform into structured records
    const records = transformRowsToAttendance(rawRows, mapping, config);

    // Save into MySQL Database
    for (const r of records) {
      await runQuery(`
        REPLACE INTO attendance_logs
        (id, empId, empName, department, shift, date, inTime, outTime, muster, worktime, extraTime, overtimeHours, lateCome, earlyGo, lateGo, otDuty, onDuty, sunday, holiday, dayTotal, totalMinutes, totalHours, status, isLate, isEarlyExit, otMinutes, otHours, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        r.id,
        r.empId,
        r.empName,
        r.department,
        r.shift || 'KG',
        r.date,
        r.inTime,
        r.outTime,
        r.muster || 'PP',
        r.worktime || '',
        r.extraTime || '',
        r.overtimeHours || 0,
        r.lateCome || '',
        r.earlyGo || '',
        r.lateGo || '',
        r.otDuty || 0,
        r.onDuty || 0,
        r.sunday || 0,
        r.holiday || 0,
        r.dayTotal !== undefined ? r.dayTotal : (r.totalHours >= 8 ? 1 : 0),
        r.totalMinutes,
        r.totalHours,
        r.status,
        r.isLate ? 1 : 0,
        r.isEarlyExit ? 1 : 0,
        r.otMinutes,
        r.otHours,
        r.notes || null
      ]);

      await runQuery(`
        INSERT IGNORE INTO employees (empId, name, department)
        VALUES (?, ?, ?)
      `, [r.empId, r.empName, r.department]);
    }

    // Fetch refreshed complete list from DB
    const allRows = await getAllRows<any>('SELECT * FROM attendance_logs ORDER BY date DESC, empId ASC');
    const allRecords: AttendanceRecord[] = allRows.map(r => ({
      id: r.id,
      empId: r.empId,
      empName: r.empName,
      department: r.department,
      shift: r.shift || 'KG',
      date: r.date,
      inTime: r.inTime,
      outTime: r.outTime,
      muster: r.muster || 'PP',
      worktime: r.worktime || '',
      extraTime: r.extraTime || '',
      overtimeHours: Number(r.overtimeHours) || 0,
      lateCome: r.lateCome || '',
      earlyGo: r.earlyGo || '',
      lateGo: r.lateGo || '',
      otDuty: Number(r.otDuty) || 0,
      totalMinutes: Number(r.totalMinutes) || 0,
      totalHours: Number(r.totalHours) || 0,
      status: r.status,
      isLate: Boolean(Number(r.isLate)),
      isEarlyExit: Boolean(Number(r.isEarlyExit)),
      otMinutes: Number(r.otMinutes) || 0,
      otHours: Number(r.otHours) || 0,
      onDuty: Number(r.onDuty) || 0,
      sunday: Number(r.sunday) || 0,
      holiday: Number(r.holiday) || 0,
      dayTotal: Number(r.dayTotal) !== undefined ? Number(r.dayTotal) : ((r.status === 'PRESENT' || Number(r.totalHours) >= 8 || r.muster === 'PP') ? 1 : (r.status === 'HALF_DAY' || Number(r.totalHours) >= 4) ? 0.5 : 0),
      notes: r.notes || undefined,
    }));

    const summaries = generateEmployeeSummaries(allRecords, config);

    res.json({
      success: true,
      message: `Successfully processed & saved ${records.length} records into the Database!`,
      data: {
        records: allRecords,
        summaries,
        config,
      },
    });
  } catch (error) {
    console.error('Upload process error:', error);
    res.status(500).json({ success: false, message: 'Failed to process file', error: String(error) });
  }
};

// 5. UPDATE SINGLE PUNCH IN DATABASE
export const updatePunchRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { inTime, outTime } = req.body;
    const existing = await getRow<any>('SELECT * FROM attendance_logs WHERE id = ?', [id]);

    if (!existing) {
      res.status(404).json({ success: false, message: 'Record not found' });
      return;
    }

    const config = await getActiveConfig();
    const updated = calculateRecord(
      existing.id,
      existing.empId,
      existing.empName,
      existing.department,
      existing.date,
      inTime,
      outTime,
      config
    );

    await runQuery(`
      UPDATE attendance_logs SET
        inTime = ?,
        outTime = ?,
        worktime = ?,
        extraTime = ?,
        overtimeHours = ?,
        lateCome = ?,
        earlyGo = ?,
        lateGo = ?,
        otDuty = ?,
        onDuty = ?,
        sunday = ?,
        holiday = ?,
        dayTotal = ?,
        totalMinutes = ?,
        totalHours = ?,
        status = ?,
        isLate = ?,
        isEarlyExit = ?,
        otMinutes = ?,
        otHours = ?,
        notes = ?
      WHERE id = ?
    `, [
      updated.inTime,
      updated.outTime,
      updated.worktime || '',
      updated.extraTime || '',
      updated.overtimeHours || 0,
      updated.lateCome || '',
      updated.earlyGo || '',
      updated.lateGo || '',
      updated.otDuty || 0,
      updated.onDuty || 0,
      updated.sunday || 0,
      updated.holiday || 0,
      updated.dayTotal !== undefined ? updated.dayTotal : 0,
      updated.totalMinutes,
      updated.totalHours,
      updated.status,
      updated.isLate ? 1 : 0,
      updated.isEarlyExit ? 1 : 0,
      updated.otMinutes,
      updated.otHours,
      updated.notes || null,
      id
    ]);

    res.json({ success: true, message: 'Punch updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update record' });
  }
};

// 5b. CREATE MANUAL PUNCH DIRECTLY
export const createManualPunch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { empId, empName, department, date, inTime, outTime, notes } = req.body;

    if (!empId || !empName || !date) {
      res.status(400).json({ success: false, message: 'Employee ID, Name, and Date are required' });
      return;
    }

    const config = await getActiveConfig();
    const id = `manual-${Date.now().toString(36)}`;
    const record = calculateRecord(
      id,
      empId.trim(),
      empName.trim(),
      department?.trim() || 'General',
      date,
      inTime || '',
      outTime || '',
      config
    );

    if (notes) {
      record.notes = notes;
    }

    await runQuery(`
      REPLACE INTO attendance_logs
      (id, empId, empName, department, shift, date, inTime, outTime, muster, worktime, extraTime, overtimeHours, lateCome, earlyGo, lateGo, otDuty, onDuty, sunday, holiday, dayTotal, totalMinutes, totalHours, status, isLate, isEarlyExit, otMinutes, otHours, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      record.id,
      record.empId,
      record.empName,
      record.department,
      record.shift || 'KG',
      record.date,
      record.inTime,
      record.outTime,
      record.muster || 'PP',
      record.worktime || '',
      record.extraTime || '',
      record.overtimeHours || 0,
      record.lateCome || '',
      record.earlyGo || '',
      record.lateGo || '',
      record.otDuty || 0,
      record.onDuty || 0,
      record.sunday || 0,
      record.holiday || 0,
      record.dayTotal !== undefined ? record.dayTotal : (record.totalHours >= 8 ? 1 : 0),
      record.totalMinutes,
      record.totalHours,
      record.status,
      record.isLate ? 1 : 0,
      record.isEarlyExit ? 1 : 0,
      record.otMinutes,
      record.otHours,
      record.notes || null
    ]);

    await runQuery(`
      INSERT IGNORE INTO employees (empId, name, department)
      VALUES (?, ?, ?)
    `, [record.empId, record.empName, record.department]);

    res.json({ success: true, message: 'Manual punch added to database', data: record });
  } catch (error) {
    console.error('Manual punch error:', error);
    res.status(500).json({ success: false, message: 'Failed to add manual punch' });
  }
};

// 6. CLEAR ALL LOGS
export const clearAllLogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    await runQuery('DELETE FROM attendance_logs');
    await runQuery('DELETE FROM employees');
    res.json({ success: true, message: 'All attendance records cleared from Database' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clear logs' });
  }
};

export const downloadTemplate = (_req: Request, res: Response): void => {
  try {
    const buffer = generateSampleExcelBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Sample_Attendance_Biometric.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
};

export const exportProcessedExcel = (req: Request, res: Response): void => {
  try {
    const { records, summaries } = req.body;
    const buffer = generateExportExcelBuffer(records || [], summaries || []);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Payroll_Attendance_Report.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export excel' });
  }
};

// 7. COMPANY HOLIDAY & LEAVE CALENDAR CONTROLLERS
export const getCompanyHolidays = async (_req: Request, res: Response): Promise<void> => {
  try {
    const holidays = await getAllRows<any>('SELECT * FROM company_holidays ORDER BY date ASC');
    res.json({
      success: true,
      data: holidays.map(h => ({
        id: h.id,
        date: h.date,
        name: h.name,
        type: h.type,
        isPaid: Boolean(Number(h.isPaid)),
        createdAt: h.createdAt,
        updatedAt: h.updatedAt,
      }))
    });
  } catch (err) {
    console.error('Error fetching company holidays:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch company holidays' });
  }
};

export const applyHolidayToAttendance = async (date: string, name: string, isPaid: number): Promise<void> => {
  // 1. Non-punched records on this holiday date
  await runQuery(`
    UPDATE attendance_logs
    SET 
      muster = 'HL',
      status = 'HOLIDAY',
      holiday = ?,
      onDuty = 0.00,
      sunday = 0.00,
      dayTotal = ?,
      notes = ?
    WHERE date = ? AND (inTime = '--:--' OR inTime = '' OR inTime = '-')
  `, [isPaid ? 1.00 : 0.00, isPaid ? 1.00 : 0.00, `${name} (Company Holiday)`, date]);

  // 2. Punched records (worked on holiday)
  await runQuery(`
    UPDATE attendance_logs
    SET 
      muster = 'HP',
      status = 'PRESENT',
      holiday = ?,
      onDuty = 0.00,
      dayTotal = ? + otDuty,
      notes = CONCAT('Worked on Holiday: ', ?)
    WHERE date = ? AND inTime != '--:--' AND inTime != '' AND inTime != '-'
  `, [isPaid ? 1.00 : 0.00, isPaid ? 1.00 : 0.00, name, date]);
};

export const revertHolidayFromAttendance = async (date: string): Promise<void> => {
  // Revert non-punched back to absent
  await runQuery(`
    UPDATE attendance_logs
    SET 
      muster = 'AA',
      status = 'ABSENT',
      holiday = 0.00,
      dayTotal = 0.00,
      notes = 'Absent (No Punch)'
    WHERE date = ? AND (inTime = '--:--' OR inTime = '' OR inTime = '-')
  `, [date]);

  // Revert punched back to regular present
  await runQuery(`
    UPDATE attendance_logs
    SET 
      muster = 'PP',
      status = 'PRESENT',
      holiday = 0.00,
      onDuty = 1.00,
      dayTotal = 1.00 + otDuty,
      notes = NULL
    WHERE date = ? AND inTime != '--:--' AND inTime != '' AND inTime != '-'
  `, [date]);
};

export const createCompanyHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, name, type, isPaid } = req.body;
    if (!date || !name) {
      res.status(400).json({ success: false, message: 'Date and holiday name are required' });
      return;
    }
    const id = `hol-${Date.now()}`;
    const holidayType = type || 'PUBLIC_HOLIDAY';
    const paidVal = isPaid !== false ? 1 : 0;

    await runQuery(`
      REPLACE INTO company_holidays (id, date, name, type, isPaid)
      VALUES (?, ?, ?, ?, ?)
    `, [id, date.trim(), name.trim(), holidayType, paidVal]);

    await applyHolidayToAttendance(date.trim(), name.trim(), paidVal);

    res.json({ 
      success: true, 
      message: `Company holiday '${name}' added for date ${date} and applied to attendance logs` 
    });
  } catch (err) {
    console.error('Error creating holiday:', err);
    res.status(500).json({ success: false, message: 'Failed to create company holiday' });
  }
};

export const deleteCompanyHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await getRow<any>('SELECT * FROM company_holidays WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Holiday not found' });
      return;
    }
    await runQuery('DELETE FROM company_holidays WHERE id = ?', [id]);
    await revertHolidayFromAttendance(existing.date);

    res.json({ success: true, message: `Company holiday '${existing.name}' deleted and attendance reverted` });
  } catch (err) {
    console.error('Error deleting holiday:', err);
    res.status(500).json({ success: false, message: 'Failed to delete company holiday' });
  }
};

export const syncAllHolidays = async (_req: Request, res: Response): Promise<void> => {
  try {
    const holidays = await getAllRows<any>('SELECT * FROM company_holidays');
    for (const h of holidays) {
      await applyHolidayToAttendance(h.date, h.name, Number(h.isPaid));
    }
    res.json({ 
      success: true, 
      message: `Successfully synchronized ${holidays.length} company holidays to attendance database!` 
    });
  } catch (err) {
    console.error('Error syncing holidays:', err);
    res.status(500).json({ success: false, message: 'Failed to sync company holidays' });
  }
};
