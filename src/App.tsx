import React, { useState } from 'react';
import { POSProvider, usePOS, validatePasswordFormat } from './context/POSContext';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { LoginPortal } from './components/auth/LoginPortal';
import { Lock, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getUserEffectiveModules } from './types';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Lazy load modules for ultra-fast initial page load on Vercel
const POSModule = React.lazy(() =>
  import('./components/pos/POSModule').then((m) => ({ default: m.POSModule }))
);
const InvoicesListModule = React.lazy(() =>
  import('./components/pos/InvoicesListModule').then((m) => ({ default: m.InvoicesListModule }))
);
const InvoicePrintModal = React.lazy(() =>
  import('./components/pos/InvoicePrintModal').then((m) => ({ default: m.InvoicePrintModal }))
);
const InventoryModule = React.lazy(() =>
  import('./components/inventory/InventoryModule').then((m) => ({ default: m.InventoryModule }))
);
const DailyReportModule = React.lazy(() =>
  import('./components/reports/DailyReportModule').then((m) => ({ default: m.DailyReportModule }))
);
const DueManagementModule = React.lazy(() =>
  import('./components/due/DueManagementModule').then((m) => ({ default: m.DueManagementModule }))
);
const ExpenseModule = React.lazy(() =>
  import('./components/expenses/ExpenseModule').then((m) => ({ default: m.ExpenseModule }))
);
const AnalyticsModule = React.lazy(() =>
  import('./components/analytics/AnalyticsModule').then((m) => ({ default: m.AnalyticsModule }))
);
const AdminSettingsModule = React.lazy(() =>
  import('./components/admin/AdminSettingsModule').then((m) => ({ default: m.AdminSettingsModule }))
);
const BackupSyncModule = React.lazy(() =>
  import('./components/sync/BackupSyncModule').then((m) => ({ default: m.BackupSyncModule }))
);

const ModuleLoader: React.FC = () => (
  <div className="flex-1 h-full min-h-[350px] flex flex-col items-center justify-center p-8 text-slate-400 animate-in fade-in">
    <div className="w-9 h-9 border-3 border-[#C49A45]/20 border-t-[#C49A45] rounded-full animate-spin mb-3 shadow-xs" />
    <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Loading Module...</span>
  </div>
);

const POSAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pos');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Password change modal state
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  const {
    activePrintInvoice,
    setActivePrintInvoice,
    isAuthenticated,
    currentUser,
    currentRole,
    changeUserPassword,
  } = usePOS();

  // Enforce module access: If user does not have permission for activeTab, auto-switch to their first allowed module
  React.useEffect(() => {
    if (isAuthenticated && currentUser) {
      const allowed = getUserEffectiveModules(currentUser, currentRole);
      if (allowed.length > 0 && !allowed.includes(activeTab)) {
        setActiveTab(allowed[0]);
      }
    }
  }, [isAuthenticated, currentUser, currentRole, activeTab]);

  // If not authenticated: show store entrance screen with Store Name, Corner Logo, and Login
  if (!isAuthenticated) {
    return <LoginPortal />;
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPass !== confirmPass) {
      setPassError('New password and confirmation password do not match.');
      return;
    }

    const check = validatePasswordFormat(newPass);
    if (!check.valid) {
      setPassError(check.message || 'Password must be 8-16 characters containing letters and numbers.');
      return;
    }

    const res = changeUserPassword(currentUser.id, curPass, newPass);
    if (res.success) {
      setPassSuccess(res.message);
      setCurPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPassSuccess('');
      }, 1500);
    } else {
      setPassError(res.message);
    }
  };

  return (
    <div className="bg-[#FEFAF3] text-slate-900 flex flex-col font-sans antialiased selection:bg-[#C49A45]/20 selection:text-[#C49A45] h-screen overflow-hidden">
      {/* Top Header */}
      <Header
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onOpenChangePassword={() => {
          setPassError('');
          setPassSuccess('');
          setShowPasswordModal(true);
        }}
      />

      {/* Main Responsive Body: Sidebar + Main Content Viewport */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Active Content Module: POS is fixed height inside, all other modules are fully scrollable to the bottom */}
        <main className={`flex-1 bg-[#FEFAF3] min-h-0 ${activeTab === 'pos' ? 'overflow-hidden flex flex-col h-full' : 'overflow-y-auto'}`}>
          <React.Suspense fallback={<ModuleLoader />}>
            {activeTab === 'pos' && <POSModule />}
            {activeTab === 'inventory' && <InventoryModule />}
            {activeTab === 'daily_report' && <DailyReportModule />}
            {activeTab === 'due' && (
              <DueManagementModule onNavigateToPOS={() => setActiveTab('pos')} />
            )}
            {activeTab === 'invoices' && <InvoicesListModule />}
            {activeTab === 'expenses' && <ExpenseModule />}
            {activeTab === 'analytics' && <AnalyticsModule />}
            {activeTab === 'admin' && <AdminSettingsModule />}
            {activeTab === 'backup' && <BackupSyncModule />}
          </React.Suspense>
        </main>
      </div>

      {/* Intelligent Invoice Print Modal */}
      {activePrintInvoice && (
        <React.Suspense fallback={null}>
          <InvoicePrintModal
            invoice={activePrintInvoice}
            onClose={() => setActivePrintInvoice(null)}
          />
        </React.Suspense>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#C49A45]" />
                <span>Change User Password</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passError}</span>
              </div>
            )}
            {passSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password..."
                  value={curPass}
                  onChange={(e) => setCurPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                Password must be <strong>8 to 16 characters</strong> long and contain both <strong>letters and numbers</strong>.
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="8-16 letters and numbers"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password..."
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <POSProvider>
      <POSAppContent />
      <SpeedInsights />
    </POSProvider>
  );
}
