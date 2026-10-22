import React from 'react';
import {
  ShoppingCart,
  Boxes,
  Calendar,
  Wallet,
  Receipt,
  TrendingDown,
  BarChart3,
  ShieldCheck,
  Database,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { AppModuleId, getUserEffectiveModules } from '../types';

export type TabType = AppModuleId;

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentUser, currentRole, cart, customers } = usePOS();
  const dueCustomersCount = customers.filter((c) => c.currentDue > 0).length;
  const effectiveModules = getUserEffectiveModules(currentUser, currentRole);

  const navItems: {
    id: TabType;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    requiresPerm?: keyof typeof currentRole.permissions;
  }[] = [
    {
      id: 'pos',
      label: 'POS Counter',
      icon: ShoppingCart,
      badge: cart.length > 0 ? cart.length : undefined,
    },
    {
      id: 'inventory',
      label: 'Inventory & Yard',
      icon: Boxes,
    },
    {
      id: 'daily_report',
      label: 'Daily Financial Report',
      icon: Calendar,
    },
    {
      id: 'due',
      label: 'Due Management',
      icon: Wallet,
      badge: dueCustomersCount > 0 ? `${dueCustomersCount}` : undefined,
    },
    {
      id: 'invoices',
      label: 'Sales Invoices',
      icon: Receipt,
    },
    {
      id: 'expenses',
      label: 'Operational Expenses',
      icon: TrendingDown,
    },
    {
      id: 'analytics',
      label: 'Profit & Analytics',
      icon: BarChart3,
    },
    {
      id: 'admin',
      label: 'Admin Settings',
      icon: ShieldCheck,
      requiresPerm: 'canManageSettings',
    },
    {
      id: 'backup',
      label: 'Backup & Cloud Sync',
      icon: Database,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      {/* Sidebar container: fixed on mobile, relative on desktop */}
      <aside
        className={`fixed md:relative top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#EADBCE] flex flex-col shrink-0 transition-transform duration-200 md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Header in Drawer */}
        <div className="p-4 border-b border-[#EADBCE] flex items-center justify-between md:hidden bg-[#FEFAF3]">
          <span className="font-bold text-slate-900 text-sm">Navigation Menu</span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Navigation items */}
        <nav className="p-3 flex flex-col gap-1 w-full flex-1 overflow-y-auto">
          {navItems.map((item) => {
            if (!effectiveModules.includes(item.id)) return null;
            const isRestricted = item.requiresPerm && !currentRole.permissions[item.requiresPerm];
            if (isRestricted) return null;
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#C49A45] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#FEFAF3]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white text-[#856324]' : 'bg-[#C49A45]/20 text-[#856324]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Operator Status Strip */}
        <div className="p-3 border-t border-[#EADBCE] bg-[#FEFAF3] text-[11px] text-slate-500">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 truncate">{currentUser.name}</span>
            <span className="text-[10px] font-bold text-[#856324] bg-[#C49A45]/20 px-2 py-0.5 rounded-full font-mono">
              {effectiveModules.length} Modules
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
