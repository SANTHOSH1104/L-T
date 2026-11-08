import { AttendanceRecord, ColumnMapping, EmployeeSummary, ShiftConfig } from '../types/attendance';
import { AdminUser } from '../types/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('punchpulse_auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('punchpulse_auth_token', token);
}

export function clearAuthSession() {
  localStorage.removeItem('punchpulse_auth_token');
  localStorage.removeItem('punchpulse_admin_user');
}

export function getStoredAdmin(): AdminUser | null {
  try {
    const raw = localStorage.getItem('punchpulse_admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAdmin(admin: AdminUser) {
  localStorage.setItem('punchpulse_admin_user', JSON.stringify(admin));
}

// 1. ADMIN LOGIN
export async function loginAdmin(email: string, password: string):Promise<{ token: string; admin: AdminUser }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Login failed');
  }

  setAuthToken(data.token);
  setStoredAdmin(data.admin);
  return { token: data.token, admin: data.admin };
}

// 2. FETCH REAL LOGS FROM SQLITE DATABASE
export async function fetchLogsFromDb(): Promise<{ records: AttendanceRecord[]; summaries: EmployeeSummary[]; config: ShiftConfig }> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/attendance/logs`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch logs from database');
  }

  return data.data;
}

// 3. FETCH POLICY FROM DATABASE
export async function fetchPolicyFromDb(): Promise<ShiftConfig> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/attendance/policy`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.data;
}

// 4. SAVE POLICY TO DATABASE
export async function savePolicyToDb(config: ShiftConfig): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/attendance/policy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to save policy');
  }
}

// 5. UPLOAD FILE DIRECTLY TO BACKEND DATABASE
export async function uploadAttendanceFile(
  file: File,
  _config: ShiftConfig,
  customMapping?: ColumnMapping
): Promise<{ records: AttendanceRecord[]; summaries: EmployeeSummary[]; config: ShiftConfig }> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);
  if (customMapping) {
    formData.append('mapping', JSON.stringify(customMapping));
  }

  const res = await fetch(`${API_BASE}/attendance/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to process file on backend');
  }

  return data.data;
}

// 6. UPDATE PUNCH IN DATABASE
export async function updatePunchInDb(id: string, inTime: string, outTime: string): Promise<AttendanceRecord> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/attendance/records/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ inTime, outTime }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to update punch in database');
  }

  return data.data;
}

// 7. CREATE MANUAL PUNCH ENTRY
export async function createManualPunchInDb(punch: {
  empId: string;
  empName: string;
  department: string;
  date: string;
  inTime: string;
  outTime: string;
  notes?: string;
}): Promise<AttendanceRecord> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/attendance/manual-punch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(punch),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to create manual punch');
  }

  return data.data;
}

// 8. CLEAR ALL LOGS IN DATABASE
export async function clearAllLogsInDb(): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/attendance/clear`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to clear logs');
  }
}

