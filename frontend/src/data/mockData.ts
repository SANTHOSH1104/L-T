import { AttendanceRecord } from '../types/attendance';
import { processAttendanceRecord, DEFAULT_SHIFT_CONFIG } from '../utils/calculator';

export const INITIAL_MOCK_RECORDS: AttendanceRecord[] = [
  processAttendanceRecord('m1', 'EMP101', 'Santhosh Murugan', 'Engineering', '2026-11-01', '08:50', '19:15', DEFAULT_SHIFT_CONFIG),
  processAttendanceRecord('m2', 'EMP102', 'Priya Dharshini', 'Design', '2026-11-01', '09:00', '18:05', DEFAULT_SHIFT_CONFIG),
  processAttendanceRecord('m3', 'EMP103', 'Karthik Raja', 'Engineering', '2026-11-01', '09:40', '18:10', DEFAULT_SHIFT_CONFIG), // Late
  processAttendanceRecord('m4', 'EMP104', 'Dinesh Kumar', 'Quality Assurance', '2026-11-01', '09:00', '13:30', DEFAULT_SHIFT_CONFIG), // Half Day
  processAttendanceRecord('m5', 'EMP105', 'Meena Kumari', 'Human Resources', '2026-11-01', '', '', DEFAULT_SHIFT_CONFIG), // Absent
  processAttendanceRecord('m6', 'EMP106', 'Vigneshwaran', 'Operations', '2026-11-01', '08:30', '20:30', DEFAULT_SHIFT_CONFIG), // Heavy OT (12 hrs total, 4 hrs OT)
  processAttendanceRecord('m7', 'EMP107', 'Sneha Ramesh', 'Marketing', '2026-11-01', '09:12', '18:15', DEFAULT_SHIFT_CONFIG),
  processAttendanceRecord('m8', 'EMP108', 'Arun Prasath', 'Finance', '2026-11-01', '09:05', '18:00', DEFAULT_SHIFT_CONFIG),

  // Day 2
  processAttendanceRecord('m9', 'EMP101', 'Santhosh Murugan', 'Engineering', '2026-11-02', '08:55', '20:00', DEFAULT_SHIFT_CONFIG), // OT
  processAttendanceRecord('m10', 'EMP102', 'Priya Dharshini', 'Design', '2026-11-02', '09:05', '14:00', DEFAULT_SHIFT_CONFIG), // Half Day
  processAttendanceRecord('m11', 'EMP103', 'Karthik Raja', 'Engineering', '2026-11-02', '08:45', '18:15', DEFAULT_SHIFT_CONFIG),
  processAttendanceRecord('m12', 'EMP104', 'Dinesh Kumar', 'Quality Assurance', '2026-11-02', '', '', DEFAULT_SHIFT_CONFIG), // Absent
  processAttendanceRecord('m13', 'EMP105', 'Meena Kumari', 'Human Resources', '2026-11-02', '09:00', '18:00', DEFAULT_SHIFT_CONFIG),
  processAttendanceRecord('m14', 'EMP106', 'Vigneshwaran', 'Operations', '2026-11-02', '09:00', '21:00', DEFAULT_SHIFT_CONFIG), // Heavy OT
  processAttendanceRecord('m15', 'EMP107', 'Sneha Ramesh', 'Marketing', '2026-11-02', '09:50', '19:00', DEFAULT_SHIFT_CONFIG), // Late + OT
  processAttendanceRecord('m16', 'EMP108', 'Arun Prasath', 'Finance', '2026-11-02', '09:10', '18:10', DEFAULT_SHIFT_CONFIG),
];

