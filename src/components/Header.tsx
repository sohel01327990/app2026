import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Building2,
  Lock,
  LogOut,
  UserCheck,
  Menu,
  Cloud,
  CloudOff,
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  onOpenChangePassword: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onOpenChangePassword }) => {
  const {
    settings,
    currentUser,
    currentRole,
    users,
    switchCurrentUser,
    logout,
    isOnline,
    setIsOnline,
    pendingSyncCount,
    syncNow,
    isFirebaseConnected,
  } = usePOS();

  const [isSyncing, setIsSyncing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncNow();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#EADBCE] text-slate-900 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Mobile Menu Toggle & Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-[#FEFAF3] cursor-pointer"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-[#C49A45]/15 border border-[#C49A45]/30 flex items-center justify-center text-[#C49A45] font-bold overflow-hidden shrink-0">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-5 h-5 text-[#C49A45]" />
            )}
          </div>

          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight">
              {settings.businessName}
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block truncate max-w-xs md:max-w-md">
              {settings.tagline}
            </p>
          </div>
        </div>

        {/* Right Actions: Sync, Status, User */}
        <div className="flex items-center gap-2">
          {/* Realtime Database status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all ${
              isFirebaseConnected
                ? 'bg-sky-50 text-sky-800 border-sky-200'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}
            title={
              isFirebaseConnected
                ? 'Firebase Firestore realtime multi-device sync active'
                : 'Firebase offline / using local cache'
            }
          >
            {isFirebaseConnected ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
                <span className="hidden sm:inline">Database Live</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Local Cache</span>
              </>
            )}
          </div>

          {/* Online/Offline status */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}
            title={isOnline ? 'Online mode active' : 'Offline mode active'}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </button>

          {/* Sync */}
          <button
            onClick={handleSync}
            disabled={isSyncing || (!isOnline && pendingSyncCount === 0)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all cursor-pointer ${
              pendingSyncCount > 0
                ? 'bg-[#C49A45] text-white border-[#b58c38] shadow-xs'
                : 'bg-[#FEFAF3] text-slate-700 border-[#EADBCE] hover:bg-[#ebd5ad]/30'
            }`}
            title="Sync with cloud database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Sync</span>
            {pendingSyncCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-900 text-white font-mono font-bold">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-[#FEFAF3] border border-[#EADBCE] hover:bg-[#ebd5ad]/30 transition-colors cursor-pointer text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-[#C49A45]/20 text-[#856324] flex items-center justify-center font-bold text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[100px]">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {currentRole.name}
                </p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#EADBCE] shadow-xl py-2 z-50 text-xs text-slate-800 animate-in fade-in">
                <div className="px-3.5 py-2.5 border-b border-slate-100 bg-[#FEFAF3] rounded-t-xl">
                  <p className="font-bold text-slate-900">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">@{currentUser.username}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C49A45]/20 text-[#856324]">
                    {currentRole.name}
                  </span>
                </div>

                <div className="py-1">
                  {/* Requirement: To change user, operator must enter User ID and Password */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2 hover:bg-[#FEFAF3] text-slate-800 font-semibold cursor-pointer transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#C49A45]" />
                    <span>Switch User (Login with Password)</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenChangePassword();
                    }}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2 hover:bg-[#FEFAF3] text-slate-700 cursor-pointer transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Change Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-rose-600 hover:bg-rose-50 cursor-pointer font-bold border-t border-slate-100 mt-1 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
