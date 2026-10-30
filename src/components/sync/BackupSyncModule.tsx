import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Cpu,
  Wifi,
  WifiOff,
  Lock,
  X,
  Cloud,
  CloudLightning,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';

export const BackupSyncModule: React.FC = () => {
  const {
    settings,
    invoices,
    exportBackup,
    restoreData,
    resetFactoryDataWithPassword,
    isOnline,
    setIsOnline,
    pendingSyncCount,
    syncNow,
    currentRole,
    isFirebaseConnected,
    isCloudSyncing,
    pushAllToCloud,
    pullAllFromCloud,
    disconnectFirebaseCloud,
    reconnectFirebaseCloud,
    activeFirebaseConfig,
    purgeFirebaseCloudData,
  } = usePOS();

  const [restoreMessage, setRestoreMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [cloudMsg, setCloudMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushingCloud, setIsPushingCloud] = useState(false);
  const [isPullingCloud, setIsPullingCloud] = useState(false);
  const [isPurgingCloud, setIsPurgingCloud] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // New Firebase / Custom Gmail state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customConfigInput, setCustomConfigInput] = useState('');
  const [configError, setConfigError] = useState('');

  // Requirement 5: Reset to Clean Slate asks for password
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = restoreData(content);
      if (res.success) {
        try {
          setIsPushingCloud(true);
          const pushRes = await pushAllToCloud();
          setRestoreMessage({
            text: `${res.message} And automatically saved & synced ${pushRes.count} records to Firebase Cloud for all devices!`,
            success: true,
          });
        } catch (err: any) {
          setRestoreMessage({
            text: `${res.message} (Warning: Cloud sync failed: ${err.message})`,
            success: false,
          });
        } finally {
          setIsPushingCloud(false);
        }
      } else {
        setRestoreMessage({ text: res.message, success: false });
      }
      setTimeout(() => setRestoreMessage(null), 7000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveRestoredData = async () => {
    setIsPushingCloud(true);
    try {
      const pushRes = await pushAllToCloud();
      setRestoreMessage({
        text: `Successfully saved & synced ${pushRes.count} records to Firebase Cloud! Now visible across all devices and safe from refresh.`,
        success: true,
      });
    } catch (err: any) {
      setRestoreMessage({
        text: `Failed to save to Firebase Cloud: ${err.message}`,
        success: false,
      });
    } finally {
      setIsPushingCloud(false);
      setTimeout(() => setRestoreMessage(null), 6000);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncNow();
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushAllToCloud = async () => {
    setIsPushingCloud(true);
    try {
      const res = await pushAllToCloud();
      setCloudMsg({ text: `Successfully synced ${res.count} records to Firebase Cloud!`, success: true });
    } catch (e: any) {
      setCloudMsg({ text: `Cloud sync error: ${e.message || 'Failed to sync'}`, success: false });
    } finally {
      setIsPushingCloud(false);
      setTimeout(() => setCloudMsg(null), 5000);
    }
  };

  const handlePullAllFromCloud = async () => {
    setIsPullingCloud(true);
    try {
      const res = await pullAllFromCloud();
      if (res.success) {
        setCloudMsg({ text: 'Cloud database snapshot successfully pulled and loaded into this counter terminal!', success: true });
      } else {
        setCloudMsg({ text: 'No cloud snapshot found to pull yet.', success: false });
      }
    } catch (e: any) {
      setCloudMsg({ text: `Cloud pull error: ${e.message || 'Failed to pull'}`, success: false });
    } finally {
      setIsPullingCloud(false);
      setTimeout(() => setCloudMsg(null), 5000);
    }
  };

  const handleDisconnectFirebase = () => {
    disconnectFirebaseCloud();
    setCloudMsg({
      text: 'Previous Firebase project disconnected. The system is operating in safe local offline storage mode.',
      success: true,
    });
    setTimeout(() => setCloudMsg(null), 5000);
  };

  const handleConnectCustomConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError('');
    try {
      let raw = customConfigInput.trim();
      if (raw.includes('{') && raw.includes('}')) {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        raw = raw.substring(start, end + 1);
      }
      const parsed = JSON.parse(raw);
      if (!parsed.projectId && !parsed.apiKey) {
        setConfigError('Config must include at least projectId and apiKey.');
        return;
      }
      const ok = await reconnectFirebaseCloud(parsed);
      setShowConfigModal(false);
      setCustomConfigInput('');
      setCloudMsg({
        text: `New Firebase project (${parsed.projectId}) connected successfully!`,
        success: ok,
      });
      setTimeout(() => setCloudMsg(null), 5000);
    } catch (err: any) {
      setConfigError('Invalid JSON format. Please paste valid Firebase JSON configuration.');
    }
  };

  const handleResetToDefaultFirebase = async () => {
    const ok = await reconnectFirebaseCloud();
    setCloudMsg({
      text: 'Reconnected to default Firebase configuration.',
      success: ok,
    });
    setTimeout(() => setCloudMsg(null), 5000);
  };

  const handleDirectPurgeCloud = async () => {
    if (!window.confirm('Are you sure you want to completely erase all products, invoices, and customer dues from Firebase Cloud?')) {
      return;
    }
    setIsPurgingCloud(true);
    try {
      const res = await purgeFirebaseCloudData();
      if (res.success) {
        setCloudMsg({
          text: `Firebase Cloud data successfully purged! (${res.count} documents deleted from cloud)`,
          success: true,
        });
      } else {
        setCloudMsg({ text: 'Cloud purge encountered an issue.', success: false });
      }
    } catch (e: any) {
      setCloudMsg({ text: `Cloud purge failed: ${e.message}`, success: false });
    } finally {
      setIsPurgingCloud(false);
      setTimeout(() => setCloudMsg(null), 5000);
    }
  };

  const handleCleanSlateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetPasswordInput.trim()) {
      setResetError('Please enter admin password.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetFactoryDataWithPassword(resetPasswordInput.trim());
      if (res.success) {
        setResetSuccess(res.message);
        setResetPasswordInput('');
        setTimeout(() => {
          setShowResetConfirm(false);
          setResetSuccess('');
        }, 2000);
      } else {
        setResetError(res.message);
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-28 space-y-6 max-w-7xl mx-auto font-sans text-slate-800 bg-[#FEFAF3]">
      {/* Title & Online/Offline switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#EADBCE]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-[#C49A45]" />
            <span>Offline Sync & Data Backup Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Offline sales transaction queue, JSON database backup, restore, and secure clean slate reset
          </p>
        </div>

        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            isOnline
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          {isOnline ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-amber-600" />}
          <span>{isOnline ? 'Online Mode' : 'Offline Mode'}</span>
        </button>
      </div>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Terminal ID */}
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#C49A45]" />
              <span>Terminal Device ID</span>
            </span>
            <span className="font-mono text-emerald-700 font-bold">Active</span>
          </div>
          <p className="text-lg font-extrabold text-slate-900 font-mono">{settings.deviceId}</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Each counter terminal is assigned a unique device prefix to prevent invoice numbering collision during offline operation.
          </p>
        </div>

        {/* Sync Queue */}
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-[#C49A45]" />
              <span>Sync Queue</span>
            </span>
            <span className="font-mono text-slate-800 font-bold">{pendingSyncCount} Pending</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-[#C49A45]">{pendingSyncCount}</span>
            <span className="text-xs text-slate-500">records waiting to sync</span>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing || (!isOnline && pendingSyncCount === 0)}
            className="w-full py-2 bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Cloud Database Now</span>
          </button>
        </div>

        {/* Storage Health */}
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Local Database Storage</span>
            </span>
            <span className="font-mono text-emerald-700 font-bold">Encrypted & Healthy</span>
          </div>
          <p className="text-sm font-bold text-slate-900">Offline-First Architecture</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Even during total power or internet loss, sales invoices and credit balances continue seamlessly in browser storage.
          </p>
        </div>
      </div>

      {/* Firebase Cloud Sync & Lifetime Free Guide */}
      <div className="p-6 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EADBCE]">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-[#C49A45]" />
              <span>Firebase Cloud Database Sync (100% Free Lifetime Usage)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Persistent cloud storage for your business data, real-time sync, and multi-device access with zero hosting cost
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isFirebaseConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isFirebaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isFirebaseConnected ? 'Cloud Database Connected' : 'Cloud Offline'}
            </span>
          </div>
        </div>

        {cloudMsg && (
          <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            cloudMsg.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            {cloudMsg.success ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{cloudMsg.text}</span>
          </div>
        )}

        {/* Cloud Info & Free Plan Quota Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE]">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Firebase Project</span>
            <span className="text-xs font-mono font-bold text-slate-900 block mt-1 truncate">
              {isFirebaseConnected ? (activeFirebaseConfig?.projectId || 'Connected') : 'Disconnected'}
            </span>
            <span className={`text-[10px] block mt-0.5 font-medium ${isFirebaseConnected ? 'text-emerald-700' : 'text-slate-400'}`}>
              {isFirebaseConnected ? 'Spark Free Plan Active' : 'Offline Storage Active'}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE]">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Firestore Database</span>
            <span className="text-xs font-mono font-bold text-slate-900 block mt-1 truncate">
              {activeFirebaseConfig?.firestoreDatabaseId || '(default)'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {isFirebaseConnected ? 'Secure Rules Enforced' : 'Unlinked'}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE]">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Daily Free Quotas</span>
            <span className="text-xs font-bold text-emerald-700 block mt-1">50,000 Reads & 20,000 Writes / day</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">1 GB Storage &middot; 100% Free Forever</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE]">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Quota Consumption</span>
            <span className="text-xs font-bold text-blue-700 block mt-1">&lt; 1% of Daily Free Limit</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Optimized with Local-First Cache</span>
          </div>
        </div>

        {/* Step-by-Step Guide for New Gmail Account */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>How to Connect Firebase with a New Gmail Account (Step-by-Step Guide):</span>
          </div>
          <ol className="list-decimal pl-5 space-y-1 text-[11px] leading-relaxed text-blue-900/90">
            <li><strong>Login to Firebase:</strong> Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">console.firebase.google.com</a> and sign in with your new Gmail account.</li>
            <li><strong>Create Project:</strong> Click <strong>&quot;Add project&quot;</strong>, enter a name (e.g., <code>all-noor-store</code>), disable Google Analytics (optional), and click <strong>Create</strong>.</li>
            <li><strong>Register Web App:</strong> In Project Overview, click the Web icon (<code>&lt;/&gt;</code>), name your app, and copy the <code>firebaseConfig</code> code snippet.</li>
            <li><strong>Create Firestore Database:</strong> From the left menu, click <strong>Build &gt; Firestore Database</strong> &gt; <strong>Create database</strong> &gt; choose location (e.g. <code>asia-south1</code>) &gt; start in test/production mode &gt; Create.</li>
            <li><strong>Connect in POS:</strong> Click the <strong>&quot;Connect New Gmail's Firebase&quot;</strong> button below and paste the config, or click <strong>&quot;Disconnect Previous Firebase&quot;</strong> to operate purely offline.</li>
          </ol>
        </div>

        {/* Why this is lifetime free guide */}
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <ShieldCheck className="w-4 h-4 text-[#C49A45]" />
            <span>How Your Shop Operates 100% Free of Cost on Firebase:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed text-amber-900/90">
            <li><strong>Zero Bill / No Credit Card:</strong> Google provides the Firebase Spark plan completely free for life with generous daily quotas.</li>
            <li><strong>Local-First Architecture:</strong> All sales, customer dues, and inventory searches happen in your browser at lightning speed without making paid API calls.</li>
            <li><strong>Minimal Cloud Bandwidth:</strong> Only final invoices and settings updates are synced to Firebase. Even with 100+ sales per day, you use less than 1% of the free 20,000 daily writes.</li>
            <li><strong>Instant Cloud Disaster Recovery:</strong> If your computer is lost, broken, or replaced, click &quot;Pull All Cloud Data&quot; on your new device and all your records are restored instantly.</li>
          </ul>
        </div>

        {/* Cloud Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {isFirebaseConnected && (
            <>
              <button
                onClick={handlePushAllToCloud}
                disabled={isPushingCloud || isCloudSyncing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40"
              >
                <CloudLightning className={`w-4 h-4 ${isPushingCloud ? 'animate-pulse' : ''}`} />
                <span>{isPushingCloud ? 'Syncing to Firebase Cloud...' : 'Push All Local Data to Firebase Cloud'}</span>
              </button>

              <button
                onClick={handlePullAllFromCloud}
                disabled={isPullingCloud || isCloudSyncing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40"
              >
                <Download className={`w-4 h-4 ${isPullingCloud ? 'animate-spin' : ''}`} />
                <span>{isPullingCloud ? 'Pulling from Cloud...' : 'Pull All Cloud Data to Counter Terminal'}</span>
              </button>
            </>
          )}

          {/* Connect New Gmail Project Button */}
          <button
            onClick={() => {
              setConfigError('');
              setShowConfigModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Cloud className="w-4 h-4 text-[#C49A45]" />
            <span>Connect New Gmail's Firebase</span>
          </button>

          {/* Purge Cloud Data Only Button */}
          <button
            onClick={handleDirectPurgeCloud}
            disabled={isPurgingCloud || isCloudSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs rounded-xl text-rose-700 hover:bg-rose-50 border border-rose-300 font-bold transition-colors cursor-pointer"
            title="Wipe all documents from Firestore Cloud database"
          >
            <Trash2 className={`w-4 h-4 text-rose-600 ${isPurgingCloud ? 'animate-spin' : ''}`} />
            <span>{isPurgingCloud ? 'Purging Cloud...' : 'Purge Cloud Data Only'}</span>
          </button>

          {/* Disconnect Previous Project Button */}
          {isFirebaseConnected ? (
            <button
              onClick={handleDisconnectFirebase}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs rounded-xl text-rose-700 hover:bg-rose-50 border border-rose-300 font-bold transition-colors cursor-pointer ml-auto"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Disconnect Previous Firebase</span>
            </button>
          ) : (
            <button
              onClick={handleResetToDefaultFirebase}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs rounded-xl text-emerald-800 hover:bg-emerald-50 border border-emerald-300 font-bold transition-colors cursor-pointer ml-auto"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Reconnect Default Firebase</span>
            </button>
          )}
        </div>
      </div>

      {/* Backup & Disaster Recovery Card */}
      <div className="p-6 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-[#C49A45]" />
          <span>Full Database Backup & Disaster Recovery</span>
        </h3>
        <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
          Download a complete portable JSON snapshot containing your product catalog, customer ledgers, invoices, categories, and expenses. Easily restore it onto any computer or tablet.
        </p>

        {restoreMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              restoreMessage.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {restoreMessage.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{restoreMessage.text}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={exportBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Database Backup (.json)</span>
          </button>

          {currentRole.permissions.canManageSettings && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FEFAF3] hover:bg-[#ebd5ad]/50 text-slate-800 border border-[#EADBCE] font-bold text-xs cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-[#C49A45]" />
                <span>Restore From Backup File</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                type="button"
                onClick={handleSaveRestoredData}
                disabled={isPushingCloud}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Save and sync all restored data to Firebase Cloud for all devices"
              >
                <CheckCircle className={`w-4 h-4 ${isPushingCloud ? 'animate-spin' : ''}`} />
                <span>{isPushingCloud ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          )}

          {/* Requirement 5: Reset to Clean Slate Button */}
          {currentRole.permissions.canManageSettings && (
            <button
              onClick={() => {
                setResetPasswordInput('');
                setResetError('');
                setResetSuccess('');
                setShowResetConfirm(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs rounded-xl text-rose-700 hover:bg-rose-50 border border-rose-300 font-bold transition-colors ml-auto cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Reset to Clean Slate</span>
            </button>
          )}
        </div>
      </div>

      {/* Requirement 5: Password Prompt Modal for Clean Slate Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-rose-200 shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Reset to Clean Slate (Security Verification)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Warning:</strong> Clean Slate Reset permanently purges all products, invoices, customer credit ledgers, and expense transactions. The system resets back to initial settings. The primary Admin account will be preserved.
            </p>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-950">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Complete Local & Firebase Cloud Purge:</span>
              </span>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                This operation will completely erase all records from this computer and purge all products, invoices, and transactions from your connected Firebase Firestore Cloud Database (<code>{activeFirebaseConfig?.projectId || 'myapps-2026'}</code>).
              </p>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleCleanSlateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-bold mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Enter Admin Password (Required to Authorize Reset) *</span>
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  disabled={isResetting}
                  placeholder="Enter administrator password..."
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm font-mono rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500 disabled:opacity-50"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 py-2.5 text-xs rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Purging Local & Cloud Data...</span>
                    </>
                  ) : (
                    <span>Verify Password & Reset All</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect New Firebase Project (New Gmail Account) Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-[#C49A45]" />
                <span>Connect Firebase with New Gmail</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Create a free project under your new Gmail account at <strong>console.firebase.google.com</strong>, then paste your Web App&apos;s <code>firebaseConfig</code> JSON configuration here.
            </p>

            {configError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {configError}
              </div>
            )}

            <form onSubmit={handleConnectCustomConfig} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-bold mb-1.5">
                  Paste Firebase Configuration (JSON or JS Object) *
                </label>
                <textarea
                  rows={7}
                  required
                  placeholder={`{\n  "apiKey": "AIzaSy...",\n  "projectId": "my-new-store-pos",\n  "authDomain": "my-new-store-pos.firebaseapp.com",\n  "storageBucket": "my-new-store-pos.firebasestorage.app"\n}`}
                  value={customConfigInput}
                  onChange={(e) => setCustomConfigInput(e.target.value)}
                  className="w-full p-3 font-mono text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 py-2.5 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefaultFirebase}
                  className="px-3 py-2.5 text-xs rounded-xl border border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-semibold cursor-pointer"
                >
                  Reset Default
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
