import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'punchpulse_hr',
  password: process.env.DB_PASSWORD || '3iO9MgyXPrcZal_i',
  database: process.env.DB_NAME || 'punchpulse_hr',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
});

export async function runQuery(sql: string, params: any[] = []): Promise<any> {
  const [result] = await pool.execute(sql, params);
  return result;
}

export async function getRow<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const [rows] = await pool.execute(sql, params);
  const arr = rows as T[];
  return arr.length > 0 ? arr[0] : null;
}

export async function getAllRows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function initDatabase() {
  console.log('🔄 Connecting to XAMPP MySQL database (punchpulse_hr)...');

  // Test connection
  const conn = await pool.getConnection();
  console.log('✅ XAMPP MySQL connected successfully on port 3306!');
  conn.release();

  // 1. Admins Table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS admins (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(191) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(191) NOT NULL,
      role VARCHAR(64) NOT NULL DEFAULT 'SUPER_ADMIN',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 2. Employees Table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS employees (
      empId VARCHAR(64) PRIMARY KEY,
      name VARCHAR(191) NOT NULL,
      department VARCHAR(191) NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 3. Attendance Logs Table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id VARCHAR(64) PRIMARY KEY,
      empId VARCHAR(64) NOT NULL,
      empName VARCHAR(191) NOT NULL,
      department VARCHAR(191) NOT NULL,
      shift VARCHAR(32) NOT NULL DEFAULT 'KG',
      date VARCHAR(32) NOT NULL,
      inTime VARCHAR(32) NOT NULL,
      outTime VARCHAR(32) NOT NULL,
      muster VARCHAR(16) NOT NULL DEFAULT 'PP',
      worktime VARCHAR(32) NOT NULL DEFAULT '',
      extraTime VARCHAR(32) NOT NULL DEFAULT '',
      lateCome VARCHAR(32) NOT NULL DEFAULT '',
      earlyGo VARCHAR(32) NOT NULL DEFAULT '',
      lateGo VARCHAR(32) NOT NULL DEFAULT '',
      totalMinutes INT NOT NULL,
      totalHours DECIMAL(6,2) NOT NULL,
      status VARCHAR(32) NOT NULL,
      isLate TINYINT(1) NOT NULL DEFAULT 0,
      isEarlyExit TINYINT(1) NOT NULL DEFAULT 0,
      otMinutes INT NOT NULL DEFAULT 0,
      otHours DECIMAL(6,2) NOT NULL DEFAULT 0.0,
      notes TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (empId),
      INDEX (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Migration: Alter table to add biometric columns if table was created previously without them
  const columnsToAdd = [
    { name: 'shift', type: "VARCHAR(32) NOT NULL DEFAULT 'KG'" },
    { name: 'muster', type: "VARCHAR(16) NOT NULL DEFAULT 'PP'" },
    { name: 'worktime', type: "VARCHAR(32) NOT NULL DEFAULT ''" },
    { name: 'extraTime', type: "VARCHAR(32) NOT NULL DEFAULT ''" },
    { name: 'lateCome', type: "VARCHAR(32) NOT NULL DEFAULT ''" },
    { name: 'earlyGo', type: "VARCHAR(32) NOT NULL DEFAULT ''" },
    { name: 'lateGo', type: "VARCHAR(32) NOT NULL DEFAULT ''" },
    { name: 'onDuty', type: "DECIMAL(4,2) NOT NULL DEFAULT 0.00" },
    { name: 'sunday', type: "DECIMAL(4,2) NOT NULL DEFAULT 0.00" },
    { name: 'holiday', type: "DECIMAL(4,2) NOT NULL DEFAULT 0.00" },
    { name: 'dayTotal', type: "DECIMAL(6,3) NOT NULL DEFAULT 0.000" },
    { name: 'overtimeHours', type: "INT NOT NULL DEFAULT 0" },
    { name: 'otDuty', type: "DECIMAL(6,3) NOT NULL DEFAULT 0.000" },
  ];

  for (const col of columnsToAdd) {
    try {
      await runQuery(`ALTER TABLE attendance_logs ADD COLUMN ${col.name} ${col.type}`);
    } catch {
      // Ignored if column already exists
    }
  }

  // 4. Shift Config Table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS shift_config (
      id VARCHAR(64) PRIMARY KEY,
      companyName VARCHAR(191) NOT NULL,
      shiftStart VARCHAR(32) NOT NULL,
      shiftEnd VARCHAR(32) NOT NULL,
      fullDayHours DECIMAL(4,2) NOT NULL,
      halfDayHours DECIMAL(4,2) NOT NULL,
      otThresholdHours DECIMAL(4,2) NOT NULL,
      graceMinutes INT NOT NULL,
      otHourlyRate INT NOT NULL,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 5. Shift Definitions Table (Multi-Shifts: KG, K1, K2, K3, K6)
  await runQuery(`
    CREATE TABLE IF NOT EXISTS shifts (
      shiftCode VARCHAR(32) PRIMARY KEY,
      shiftName VARCHAR(128) NOT NULL,
      shiftStart VARCHAR(16) NOT NULL,
      shiftEnd VARCHAR(16) NOT NULL,
      fullDayHours DECIMAL(4,2) NOT NULL DEFAULT 8.0,
      halfDayHours DECIMAL(4,2) NOT NULL DEFAULT 4.0,
      graceMinutes INT NOT NULL DEFAULT 15,
      isOvernight TINYINT(1) NOT NULL DEFAULT 0,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Seed default Multi-Shifts if not already present
  const defaultShifts = [
    { code: 'KG', name: 'General Shift (KG)', start: '08:30', end: '17:30', full: 8.0, half: 4.0, grace: 15, overnight: 0 },
    { code: 'K1', name: 'Morning Shift 1 (K1)', start: '06:00', end: '14:30', full: 8.0, half: 4.0, grace: 15, overnight: 0 },
    { code: 'K2', name: 'Afternoon Shift 2 (K2)', start: '14:30', end: '23:00', full: 8.0, half: 4.0, grace: 15, overnight: 0 },
    { code: 'K3', name: 'Night Shift 3 (K3)', start: '23:00', end: '07:30', full: 8.0, half: 4.0, grace: 15, overnight: 1 },
    { code: 'K6', name: 'Extended Night Shift (K6)', start: '18:00', end: '06:00', full: 11.0, half: 5.0, grace: 15, overnight: 1 },
  ];

  for (const s of defaultShifts) {
    await runQuery(`
      INSERT INTO shifts (shiftCode, shiftName, shiftStart, shiftEnd, fullDayHours, halfDayHours, graceMinutes, isOvernight)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE shiftName = VALUES(shiftName)
    `, [s.code, s.name, s.start, s.end, s.full, s.half, s.grace, s.overnight]);
  }

  // Seed default Admin if not exists
  const existingAdmin = await getRow('SELECT id FROM admins WHERE email = ?', ['admin@punchpulse.com']);
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await runQuery(`
      INSERT INTO admins (id, email, password, name, role)
      VALUES (?, ?, ?, ?, ?)
    `, ['admin-1', 'admin@punchpulse.com', passwordHash, 'Santhosh (HR Admin)', 'SUPER_ADMIN']);
    console.log('👤 Default Admin seeded in MySQL: admin@punchpulse.com / admin123');
  }

  // Seed default Shift Policy if not exists
  const existingConfig = await getRow('SELECT id FROM shift_config WHERE id = ?', ['default-policy']);
  if (!existingConfig) {
    await runQuery(`
      INSERT INTO shift_config (id, companyName, shiftStart, shiftEnd, fullDayHours, halfDayHours, otThresholdHours, graceMinutes, otHourlyRate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'default-policy',
      'Macha Enterprise Solutions',
      '08:30',
      '17:30',
      8.0,
      4.0,
      8.0,
      15,
      150
    ]);
  }

  // 6. Company Holidays & Leaves Table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS company_holidays (
      id VARCHAR(64) PRIMARY KEY,
      date VARCHAR(32) NOT NULL UNIQUE,
      name VARCHAR(191) NOT NULL,
      type VARCHAR(64) NOT NULL DEFAULT 'PUBLIC_HOLIDAY',
      isPaid TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Seed default company leaves if not present
  const defaultHolidays = [
    { id: 'hol-1', date: '2026-10-02', name: 'Gandhi Jayanti', type: 'PUBLIC_HOLIDAY', isPaid: 1 },
    { id: 'hol-2', date: '2026-10-19', name: 'Ayudha Pooja / Vijaya Dashami', type: 'FESTIVAL', isPaid: 1 },
    { id: 'hol-3', date: '2026-11-08', name: 'Diwali / Deepavali', type: 'FESTIVAL', isPaid: 1 },
    { id: 'hol-4', date: '2026-12-25', name: 'Christmas Day', type: 'PUBLIC_HOLIDAY', isPaid: 1 },
    { id: 'hol-5', date: '2027-01-01', name: 'New Year Day', type: 'COMPANY_OFF', isPaid: 1 },
    { id: 'hol-6', date: '2027-01-14', name: 'Pongal / Makar Sankranti', type: 'FESTIVAL', isPaid: 1 },
    { id: 'hol-7', date: '2027-01-26', name: 'Republic Day', type: 'PUBLIC_HOLIDAY', isPaid: 1 },
  ];

  for (const h of defaultHolidays) {
    await runQuery(`
      INSERT IGNORE INTO company_holidays (id, date, name, type, isPaid)
      VALUES (?, ?, ?, ?, ?)
    `, [h.id, h.date, h.name, h.type, h.isPaid]);
  }

  // Database initialized cleanly. Sample re-seeding removed so user can maintain clean custom records.
}

export default pool;

