import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { OverviewTab } from './components/OverviewTab';
import { UploadTab } from './components/UploadTab';
import { DailyLogsTab } from './components/DailyLogsTab';
import { PayrollTimesheetTab } from './components/PayrollTimesheetTab';
import { OvertimeAnalyticsTab } from './components/OvertimeAnalyticsTab';
import { SettingsTab } from './components/SettingsTab';
import { CompanyLeaveTab } from './components/CompanyLeaveTab';
import { AttendanceRecord, ShiftConfig, EmployeeSummary } from './types/attendance';
import { AdminUser } from './types/auth';
import { DEFAULT_SHIFT_CONFIG } from './utils/calculator';
import { 
  getAuthToken, 
  getStoredAdmin, 
  clearAuthSession, 
  fetchLogsFromDb, 
  savePolicyToDb,
  updatePunchInDb 
} from './services/api';

export function App() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const token = getAuthToken();
    return token ? getStoredAdmin() : null;
  });

  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summaries, setSummaries] = useState<EmployeeSummary[]>([]);
  const [config, setConfig] = useState<ShiftConfig>(DEFAULT_SHIFT_CONFIG);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Fetch real data from backend when admin logs in
  const loadBackendData = async () => {
    if (!adminUser) return;
    setIsLoadingData(true);
    try {
      const data = await fetchLogsFromDb();
      setRecords(data.records);
      setSummaries(data.summaries);
      if (data.config) setConfig(data.config);
    } catch (err) {
      console.error('Failed to load data from backend:', err);
      // If token expired, log out
      clearAuthSession();
      setAdminUser(null);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (adminUser) {
      loadBackendData();
    }
  }, [adminUser]);

  // Handler for file upload completion
  const handleDataProcessed = (newRecords: AttendanceRecord[], newSummaries: EmployeeSummary[]) => {
    setRecords(newRecords);
    setSummaries(newSummaries);
    setCurrentTab('logs');
  };

  // Handler for single record inline adjustment
  const handleUpdateRecord = async (updated: AttendanceRecord) => {
    try {
      const saved = await updatePunchInDb(updated.id, updated.inTime, updated.outTime);
      setRecords(prev => prev.map(r => (r.id === saved.id ? saved : r)));
      // Refresh summaries
      loadBackendData();
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  // Handler for saving config
  const handleSaveConfig = async (newConfig: ShiftConfig) => {
    try {
      await savePolicyToDb(newConfig);
      setConfig(newConfig);
      // Re-fetch all recalculated records from backend
      await loadBackendData();
    } catch (err) {
      console.error('Failed to save config to backend:', err);
    }
  };

  // Handler for logout
  const handleLogout = () => {
    clearAuthSession();
    setAdminUser(null);
  };

  // 1. GATEKEEPER: If not authenticated, render Admin Login screen
  if (!adminUser) {
    return <LoginPage onLoginSuccess={(admin) => setAdminUser(admin)} />;
  }

  // 2. DASHBOARD: Authenticated Admin Portal with REAL Backend Data
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Fixed Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        config={config}
        totalRecordsCount={records.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar
          config={config}
          admin={adminUser}
          onLogout={handleLogout}
          onOpenUpload={() => setCurrentTab('upload')}
        />

        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto flex-1">
          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-500">Loading real attendance data from Backend Database...</p>
            </div>
          ) : (
            <>
              {currentTab === 'overview' && (
                <OverviewTab
                  records={records}
                  summaries={summaries}
                  config={config}
                  onNavigate={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'upload' && (
                <UploadTab
                  config={config}
                  onDataProcessed={handleDataProcessed}
                  onNavigateToLogs={() => setCurrentTab('logs')}
                />
              )}

              {currentTab === 'logs' && (
                <DailyLogsTab
                  records={records}
                  config={config}
                  onUpdateRecord={handleUpdateRecord}
                  onRefreshData={loadBackendData}
                />
              )}

              {currentTab === 'payroll' && (
                <PayrollTimesheetTab
                  summaries={summaries}
                  config={config}
                />
              )}

              {currentTab === 'overtime' && (
                <OvertimeAnalyticsTab
                  summaries={summaries}
                  config={config}
                />
              )}

              {currentTab === 'holidays' && (
                <CompanyLeaveTab
                  config={config}
                  onRefreshData={loadBackendData}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsTab
                  config={config}
                  onSaveConfig={handleSaveConfig}
                  onRefreshData={loadBackendData}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
