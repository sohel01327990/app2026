import React, { useState } from 'react';
import { POSProvider, usePOS, validatePasswordFormat } from './context/POSContext';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { POSModule } from './components/pos/POSModule';
import { InvoicesListModule } from './components/pos/InvoicesListModule';
import { InvoicePrintModal } from './components/pos/InvoicePrintModal';
import { InventoryModule } from './components/inventory/InventoryModule';
import { DailyReportModule } from './components/reports/DailyReportModule';
import { DueManagementModule } from './components/due/DueManagementModule';
import { ExpenseModule } from './components/expenses/ExpenseModule';
import { AnalyticsModule } from './components/analytics/AnalyticsModule';
import { AdminSettingsModule } from './components/admin/AdminSettingsModule';
import { BackupSyncModule } from './components/sync/BackupSyncModule';
import { LoginPortal } from './components/auth/LoginPortal';
import { Lock, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getUserEffectiveModules } from './types';
import { SpeedInsights } from '@vercel/speed-insights/react';

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
    <div className="min-h-screen bg-[#FEFAF3] text-slate-900 flex flex-col font-sans antialiased selection:bg-[#C49A45]/20 selection:text-[#C49A45]">
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
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Active Content Module with #FEFAF3 background and smooth scroll */}
        <main className="flex-1 overflow-y-auto bg-[#FEFAF3]">
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
        </main>
      </div>

      {/* Intelligent Invoice Print Modal */}
      {activePrintInvoice && (
        <InvoicePrintModal
          invoice={activePrintInvoice}
          onClose={() => setActivePrintInvoice(null)}
        />
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
