import sqlite3 from 'sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.resolve(__dirname, '../../attendance.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Could not connect to SQLite database:', err);
  } else {
    console.log('✅ SQLite Database connected successfully at:', dbPath);
  }
});

export const runQuery = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

export const getRow = <T = any>(sql: string, params: any[] = []): Promise<T | null> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve((row as T) || null);
    });
  });
};

export const getAllRows = <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve((rows as T[]) || []);
    });
  });
};

export async function initDatabase() {
  // 1. Admins Table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
      createdAt TEXT NOT NULL
    )
  `);

  // 2. Employees Table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS employees (
      empId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  // 3. Attendance Logs Table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id TEXT PRIMARY KEY,
      empId TEXT NOT NULL,
      empName TEXT NOT NULL,
      department TEXT NOT NULL,
      date TEXT NOT NULL,
      inTime TEXT NOT NULL,
      outTime TEXT NOT NULL,
      totalMinutes INTEGER NOT NULL,
      totalHours REAL NOT NULL,
      status TEXT NOT NULL,
      isLate INTEGER NOT NULL DEFAULT 0,
      isEarlyExit INTEGER NOT NULL DEFAULT 0,
      otMinutes INTEGER NOT NULL DEFAULT 0,
      otHours REAL NOT NULL DEFAULT 0.0,
      notes TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  // 4. Shift Config Table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS shift_config (
      id TEXT PRIMARY KEY,
      companyName TEXT NOT NULL,
      shiftStart TEXT NOT NULL,
      shiftEnd TEXT NOT NULL,
      fullDayHours REAL NOT NULL,
      halfDayHours REAL NOT NULL,
      otThresholdHours REAL NOT NULL,
      graceMinutes INTEGER NOT NULL,
      otHourlyRate INTEGER NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Seed default Admin if not exists
  const existingAdmin = await getRow('SELECT id FROM admins WHERE email = ?', ['admin@punchpulse.com']);
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await runQuery(`
      INSERT INTO admins (id, email, password, name, role, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['admin-1', 'admin@punchpulse.com', passwordHash, 'Santhosh (HR Admin)', 'SUPER_ADMIN', new Date().toISOString()]);
    console.log('👤 Default Admin seeded: admin@punchpulse.com / admin123');
  }

  // Seed default Shift Policy if not exists
  const existingConfig = await getRow('SELECT id FROM shift_config WHERE id = ?', ['default-policy']);
  if (!existingConfig) {
    await runQuery(`
      INSERT INTO shift_config (id, companyName, shiftStart, shiftEnd, fullDayHours, halfDayHours, otThresholdHours, graceMinutes, otHourlyRate, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'default-policy',
      'Macha Enterprise Solutions',
      '09:00',
      '18:00',
      8.0,
      4.0,
      8.0,
      15,
      150,
      new Date().toISOString()
    ]);
  }

  // Seed initial real attendance records into SQLite DB if empty
  const countRes = await getRow<{ count: number }>('SELECT count(*) as count FROM attendance_logs');
  if (countRes && countRes.count === 0) {
    const initialRecords = [
      { id: 'rec-1', empId: 'EMP101', name: 'Santhosh Murugan', dept: 'Management', date: '2026-11-01', in: '08:50', out: '19:15', mins: 625, hrs: 10.42, status: 'PRESENT', late: 0, early: 0, otMins: 145, otHrs: 2.42, notes: '' },
      { id: 'rec-2', empId: 'EMP102', name: 'Priya Dharshini', dept: 'Design', date: '2026-11-01', in: '09:00', out: '18:05', mins: 545, hrs: 9.08, status: 'PRESENT', late: 0, early: 0, otMins: 65, otHrs: 1.08, notes: '' },
      { id: 'rec-3', empId: 'EMP103', name: 'Karthik Raja', dept: 'Engineering', date: '2026-11-01', in: '09:40', out: '18:10', mins: 510, hrs: 8.50, status: 'PRESENT', late: 1, early: 0, otMins: 30, otHrs: 0.50, notes: 'Late arrival' },
      { id: 'rec-4', empId: 'EMP104', name: 'Dinesh Kumar', dept: 'QA', date: '2026-11-01', in: '09:00', out: '13:30', mins: 270, hrs: 4.50, status: 'HALF_DAY', late: 0, early: 1, otMins: 0, otHrs: 0.0, notes: 'Half Day (< 8 hrs)' },
      { id: 'rec-5', empId: 'EMP105', name: 'Meena Kumari', dept: 'Human Resources', date: '2026-11-01', in: '--:--', out: '--:--', mins: 0, hrs: 0.0, status: 'ABSENT', late: 0, early: 0, otMins: 0, otHrs: 0.0, notes: 'No punch recorded (Absent)' },
      { id: 'rec-6', empId: 'EMP106', name: 'Vigneshwaran', dept: 'Operations', date: '2026-11-01', in: '08:30', out: '20:30', mins: 720, hrs: 12.00, status: 'PRESENT', late: 0, early: 0, otMins: 240, otHrs: 4.00, notes: 'Heavy OT' },
      { id: 'rec-7', empId: 'EMP101', name: 'Santhosh Murugan', dept: 'Management', date: '2026-11-02', in: '08:55', out: '20:00', mins: 665, hrs: 11.08, status: 'PRESENT', late: 0, early: 0, otMins: 185, otHrs: 3.08, notes: 'OT' },
      { id: 'rec-8', empId: 'EMP102', name: 'Priya Dharshini', dept: 'Design', date: '2026-11-02', in: '09:05', out: '14:00', mins: 295, hrs: 4.92, status: 'HALF_DAY', late: 0, early: 1, otMins: 0, otHrs: 0.0, notes: 'Half Day' },
      { id: 'rec-9', empId: 'EMP106', name: 'Vigneshwaran', dept: 'Operations', date: '2026-11-02', in: '09:00', out: '21:00', mins: 720, hrs: 12.00, status: 'PRESENT', late: 0, early: 0, otMins: 240, otHrs: 4.00, notes: 'Heavy OT' },
    ];

    for (const r of initialRecords) {
      await runQuery(`
        INSERT OR REPLACE INTO attendance_logs 
        (id, empId, empName, department, date, inTime, outTime, totalMinutes, totalHours, status, isLate, isEarlyExit, otMinutes, otHours, notes, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [r.id, r.empId, r.name, r.dept, r.date, r.in, r.out, r.mins, r.hrs, r.status, r.late, r.early, r.otMins, r.otHrs, r.notes, new Date().toISOString()]);
      
      await runQuery(`
        INSERT OR IGNORE INTO employees (empId, name, department, createdAt)
        VALUES (?, ?, ?, ?)
      `, [r.empId, r.name, r.dept, new Date().toISOString()]);
    }
    console.log('📊 Real attendance records seeded into SQLite DB');
  }
}

export default db;

