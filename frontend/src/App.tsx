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
import { SkeletonBanner, SkeletonCardGrid, SkeletonTable } from './components/common/Skeleton';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
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
    <div className="flex min-h-screen bg-slate-50/50 text-slate-900 antialiased font-sans">
      {/* Sidebar with Desktop & Mobile Drawer capability */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        config={config}
        totalRecordsCount={records.length}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar
          config={config}
          admin={adminUser}
          onLogout={handleLogout}
          onOpenUpload={() => setCurrentTab('upload')}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <main className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto flex-1 space-y-6">
          {isLoadingData ? (
            <div className="space-y-6 py-2">
              {/* Shimmer Skeleton Dashboard during data fetch */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-6 w-48 bg-slate-200 rounded-md animate-pulse"></div>
                  <div className="h-3.5 w-64 bg-slate-100 rounded-md animate-pulse"></div>
                </div>
                <div className="h-9 w-32 bg-slate-200 rounded-xl animate-pulse"></div>
              </div>
              <SkeletonBanner />
              <SkeletonCardGrid count={4} />
              <SkeletonTable rows={6} columns={8} showSearchHeader={true} />
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
