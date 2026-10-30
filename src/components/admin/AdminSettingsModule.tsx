import React, { useState } from 'react';
import { usePOS, validatePasswordFormat } from '../../context/POSContext';
import { ALL_SYSTEM_MODULES, getUserEffectiveModules, AppModuleId, User } from '../../types';
import {
  ShieldCheck,
  Building2,
  Users,
  Plus,
  Trash2,
  Edit2,
  Tag,
  Upload,
  Camera,
  Lock,
  AlertTriangle,
  Image as ImageIcon,
  DollarSign,
  Sparkles,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  UserCheck,
  Settings2,
  Shield,
  Receipt,
} from 'lucide-react';

const STORE_BG_PRESETS = [
  {
    id: 'hardware_materials',
    name: 'Hardware & Materials Store',
    url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'supermarket_counter',
    name: 'Retail Counter & Grocery',
    url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'modern_showroom',
    name: 'Modern Tool & Showroom',
    url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'industrial_warehouse',
    name: 'Building Supply Yard',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1920&q=80',
  },
];

export const AdminSettingsModule: React.FC = () => {
  const {
    settings,
    updateSettings,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    roles,
    addRole,
    updateRole,
    deleteRole,
    users,
    addUser,
    updateUser,
    deleteUser,
    updateUserRole,
    updateUserModules,
    syncUserToFirebaseAuth,
    syncAllUsersToFirebaseAuth,
    resetFactoryDataWithPassword,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<'branding' | 'categories' | 'users' | 'reset'>('branding');

  // Company Settings
  const [formSettings, setFormSettings] = useState(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // User Form & Role Management
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState(roles[0]?.id || '');
  const [userError, setUserError] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    instructions?: string;
  } | null>(null);
  const [syncingUserId, setSyncingUserId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [roleChangeFeedback, setRoleChangeFeedback] = useState<string | null>(null);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Module Access Configuration State
  const [configuringUser, setConfiguringUser] = useState<User | null>(null);
  const [selectedUserModules, setSelectedUserModules] = useState<AppModuleId[]>([]);
  const [moduleSaveFeedback, setModuleSaveFeedback] = useState<string | null>(null);

  const handleOpenModuleConfig = (u: User) => {
    setConfiguringUser(u);
    const eff = getUserEffectiveModules(u, roles.find((r) => r.id === u.roleId));
    setSelectedUserModules(eff);
  };

  const handleSaveUserModules = () => {
    if (!configuringUser) return;
    const res = updateUserModules(configuringUser.id, selectedUserModules);
    if (res.success) {
      setModuleSaveFeedback(`@${configuringUser.username}-এর মডিউল এক্সেস পারমিশন সফলভাবে আপডেট করা হয়েছে।`);
      setTimeout(() => setModuleSaveFeedback(null), 4000);
      setConfiguringUser(null);
    }
  };

  // Reset to clean slate state
  const [resetPassInput, setResetPassInput] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      setFormSettings((prev) => ({ ...prev, logoUrl: res }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      setFormSettings((prev) => ({ ...prev, loginBgUrl: res }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCreateOrUpdateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (editingCatId) {
      updateCategory(editingCatId, newCatName.trim(), newCatDesc.trim());
      setEditingCatId(null);
    } else {
      addCategory(newCatName.trim(), newCatDesc.trim());
    }
    setNewCatName('');
    setNewCatDesc('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    if (!newUserName.trim() || !newUserUsername.trim()) return;

    const check = validatePasswordFormat(newUserPassword);
    if (!check.valid) {
      setUserError(check.message || 'Password must be 8-16 characters containing letters and numbers.');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const selectedRole = roles.find((r) => r.id === newUserRoleId);
      const res = await addUser({
        name: newUserName.trim(),
        username: newUserUsername.trim(),
        roleId: newUserRoleId,
        roleName: selectedRole ? selectedRole.name : 'Operator',
        email: newUserEmail.trim() || `${newUserUsername.trim()}@allnoor.com`,
        phone: newUserPhone.trim() || 'N/A',
        status: 'active',
        pinCode: '1234',
        password: newUserPassword,
      });

      if (res.success) {
        setShowUserModal(false);
        setNewUserName('');
        setNewUserUsername('');
        setNewUserPassword('');
        setNewUserEmail('');
        setNewUserPhone('');
        if (res.firebaseRegistered) {
          setUserFeedback({
            type: 'success',
            message: `Operator @${newUserUsername.trim()} তৈরি হয়েছে এবং Firebase Authentication-এ সফলভাবে রেজিস্টার হয়েছে!`,
          });
        } else if (res.firebaseError) {
          setUserFeedback({
            type: 'warning',
            message: `Operator @${newUserUsername.trim()} সিস্টেমে তৈরি হয়েছে, তবে Firebase Authentication-এ রেজিস্টার ব্যর্থ হয়েছে: ${res.firebaseError}`,
            instructions: res.firebaseInstructions,
          });
        } else {
          setUserFeedback({
            type: 'success',
            message: `Operator @${newUserUsername.trim()} তৈরি হয়েছে।`,
          });
        }
      } else {
        setUserError(res.message);
      }
    } catch (err: any) {
      setUserError(err?.message || 'Error creating operator');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleRoleChange = (userId: string, newRoleId: string) => {
    const res = updateUserRole(userId, newRoleId);
    if (res.success) {
      const targetUser = users.find((u) => u.id === userId);
      const targetRole = roles.find((r) => r.id === newRoleId);
      setRoleChangeFeedback(`অপারেটর @${targetUser?.username || userId}-এর জন্য "${targetRole?.name}" রোল সফলভাবে সেট করা হয়েছে।`);
      setTimeout(() => setRoleChangeFeedback(null), 4000);
    }
  };

  const handleSyncUserToAuth = async (userId: string) => {
    setSyncingUserId(userId);
    try {
      const res = await syncUserToFirebaseAuth(userId);
      if (res.success) {
        setUserFeedback({ type: 'success', message: res.message });
      } else {
        setUserFeedback({
          type: 'warning',
          message: res.message,
          instructions: res.instructions,
        });
      }
    } finally {
      setSyncingUserId(null);
    }
  };

  const handleSyncAllToAuth = async () => {
    setIsSyncingAll(true);
    try {
      const res = await syncAllUsersToFirebaseAuth();
      if (res.failed === 0) {
        setUserFeedback({ type: 'success', message: res.message });
      } else {
        setUserFeedback({
          type: 'warning',
          message: res.message,
          instructions: res.instructions,
        });
      }
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleCreateCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    addRole({
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || 'Custom operational role',
      permissions: {
        canViewPurchasePrice: false,
        canProcessRefund: false,
        canModifyDiscount: true,
        canOverrideMinPrice: false,
        canManageUsers: false,
        canManageSettings: false,
        canDeleteRecords: false,
        canAccessLedger: true,
        canExportReports: true,
        canAdjustStock: false,
        canManageCategories: false,
      },
    });
    setNewRoleName('');
    setNewRoleDesc('');
    setRoleChangeFeedback(`নতুন রোল "${newRoleName.trim()}" তৈরি করা হয়েছে।`);
    setTimeout(() => setRoleChangeFeedback(null), 3000);
  };

  const handleCleanSlateReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetPassInput.trim()) {
      setResetError('Admin password is required.');
      return;
    }

    const res = await resetFactoryDataWithPassword(resetPassInput.trim());
    if (res.success) {
      setResetSuccess(res.message);
      setResetPassInput('');
    } else {
      setResetError(res.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-28 space-y-6 max-w-7xl mx-auto font-sans text-slate-800 bg-[#FEFAF3]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#EADBCE]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#C49A45]" />
            <span>Admin Control & System Settings</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Store identity, logo, dynamic categories, operator users, and secure clean slate reset
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#FEFAF3] p-1 rounded-2xl border border-[#EADBCE] text-xs">
          <button
            onClick={() => setActiveTab('branding')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'branding' ? 'bg-[#C49A45] text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Store Profile & Logo
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'categories' ? 'bg-[#C49A45] text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'users' ? 'bg-[#C49A45] text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Team & Operators
          </button>
          <button
            onClick={() => setActiveTab('reset')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'reset' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            Clean Slate Reset
          </button>
        </div>
      </div>

      {/* TAB 1: Company Profile & Logo */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveSettings} className="space-y-4 max-w-4xl">
          <div className="p-6 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#C49A45]" />
              <span>Store Profile, Contact Details & Invoice Letterhead</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Store / Enterprise Name *
                </label>
                <input
                  type="text"
                  required
                  value={formSettings.businessName}
                  onChange={(e) => setFormSettings({ ...formSettings, businessName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-[#C49A45]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={formSettings.tagline}
                  onChange={(e) => setFormSettings({ ...formSettings, tagline: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                />
              </div>

              {/* Logo Upload */}
              <div className="p-3.5 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE] space-y-2 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#C49A45]" />
                  <span>Store Logo Image</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                    {formSettings.logoUrl ? (
                      <img src={formSettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Store Logo</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {formSettings.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormSettings({ ...formSettings, logoUrl: undefined })}
                        className="text-[11px] text-rose-600 hover:underline ml-3 cursor-pointer"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Contact Phone *
                </label>
                <input
                  type="text"
                  required
                  value={formSettings.phone}
                  onChange={(e) => setFormSettings({ ...formSettings, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Trade License / VAT BIN #
                </label>
                <input
                  type="text"
                  value={formSettings.taxId}
                  onChange={(e) => setFormSettings({ ...formSettings, taxId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Default VAT Percentage (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    required
                    value={formSettings.vatPercent ?? 5}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        vatPercent: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono pr-8"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 font-bold text-xs">
                    %
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Yard / Warehouse Physical Address *
                </label>
                <input
                  type="text"
                  required
                  value={formSettings.address}
                  onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                />
              </div>

              {/* Requirement: Initial Opening Cash Balance */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#C49A45]" />
                    <span>Initial Opening Cash Balance *</span>
                  </label>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Accounts & Cash Drawer
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  The shopkeeper starts daily accounts with this initial cash. This amount is automatically accounted for in cash drawer reconciliation, financial overview, and daily report calculations.
                </p>
                <div className="relative max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#C49A45] font-bold text-sm">
                    {formSettings.currencySymbol || 'BDT'}
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={formSettings.openingCashBalance ?? 0}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        openingCashBalance: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-full pl-8 pr-3 py-2 text-sm font-extrabold font-mono rounded-xl bg-white border border-amber-300 text-slate-900 focus:outline-none focus:border-[#C49A45] focus:ring-1 focus:ring-[#C49A45]"
                  />
                </div>
              </div>

              {/* Requirement: Sign-in Portal Store Background Image */}
              <div className="p-4 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE] space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#C49A45]" />
                    <span>Sign-in Portal Store Background Image</span>
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Admin Controlled
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Upload your shop photo, select a curated store interior preset, or provide an image link. This photo will be displayed as the backdrop on the user login portal.
                </p>

                {/* Current Image Preview & Action */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-xl bg-white border border-slate-200">
                  <div className="w-28 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative shadow-xs">
                    {formSettings.loginBgUrl ? (
                      <img
                        src={formSettings.loginBgUrl}
                        alt="Sign-in background"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold cursor-pointer transition-colors shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Shop Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBgUpload}
                          className="hidden"
                        />
                      </label>
                      {formSettings.loginBgUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormSettings({
                              ...formSettings,
                              loginBgUrl:
                                'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1920&q=80',
                            })
                          }
                          className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                        >
                          Reset Default Store Photo
                        </button>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Or enter direct image URL (https://...)"
                        value={formSettings.loginBgUrl || ''}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, loginBgUrl: e.target.value })
                        }
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-[#FEFAF3] border border-slate-300 text-slate-800 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 4 Store Interior Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Curated Shop Interior Presets:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {STORE_BG_PRESETS.map((p) => {
                      const isSelected = formSettings.loginBgUrl === p.url;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setFormSettings({ ...formSettings, loginBgUrl: p.url })
                          }
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1.5 ${
                            isSelected
                              ? 'border-[#C49A45] bg-[#C49A45]/10 ring-1 ring-[#C49A45]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="w-full h-12 rounded-lg overflow-hidden bg-slate-100">
                            <img
                              src={p.url}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-[10px] font-bold text-slate-800 truncate">
                            {p.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Custom Invoice Footer & Legal Terms
                </label>
                <textarea
                  rows={3}
                  value={formSettings.footerTerms}
                  onChange={(e) => setFormSettings({ ...formSettings, footerTerms: e.target.value })}
                  className="w-full p-3 text-xs font-sans rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Save Store Settings
              </button>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-700">
                  Settings saved successfully!
                </span>
              )}
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: Categories (Requirement 8) */}
      {activeTab === 'categories' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-6 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#C49A45]" />
              <span>Admin Custom Categories Management (Requirement 8)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Create and manage categories. New categories immediately appear in POS Counter and Inventory.
            </p>

            <form onSubmit={handleCreateOrUpdateCategory} className="space-y-3 p-4 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Glass & Aluminum"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#C49A45]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Brief description..."
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#C49A45]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                {editingCatId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatId(null);
                      setNewCatName('');
                      setNewCatDesc('');
                    }}
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white shadow-xs cursor-pointer"
                >
                  {editingCatId ? 'Update Category' : '+ Add Category'}
                </button>
              </div>
            </form>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 block">Existing Categories ({categories.length}):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categories.map((c) => (
                  <div key={c.id} className="p-3 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">{c.name}</span>
                      {c.description && <span className="text-[11px] text-slate-500">{c.description}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(c.id);
                          setNewCatName(c.name);
                          setNewCatDesc(c.description || '');
                        }}
                        className="p-1 rounded text-slate-600 hover:text-slate-900 cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory(c.id)}
                        className="p-1 rounded text-rose-500 hover:text-rose-700 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Team Users & Role Management */}
      {activeTab === 'users' && (
        <div className="space-y-4 max-w-5xl">
          {/* Toast / Notification Banners */}
          {roleChangeFeedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{roleChangeFeedback}</span>
              </span>
              <button
                onClick={() => setRoleChangeFeedback(null)}
                className="text-emerald-600 hover:text-emerald-900 text-xs font-semibold"
              >
                ✕
              </button>
            </div>
          )}

          {userFeedback && (
            <div
              className={`p-4 rounded-2xl border text-xs shadow-xs space-y-2 ${
                userFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {userFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block text-sm">{userFeedback.message}</strong>
                    {userFeedback.instructions && (
                      <p className="mt-1 leading-relaxed text-[11px] opacity-90">
                        {userFeedback.instructions}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setUserFeedback(null)}
                  className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer font-bold px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Firebase Authentication Status & Explanation Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 border border-amber-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C49A45]/20 flex items-center justify-center text-[#C49A45]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <span>Firebase Authentication Users Integration</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                      Project: myapps-2026
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Firebase Console-এর Authentication &gt; Users-এ ইউজার দেখতে হলে Email/Password provider সক্রিয় থাকতে হবে।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href="https://console.firebase.google.com/project/myapps-2026/authentication/providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-xs"
                >
                  <span>Firebase Console</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>

                <button
                  onClick={handleSyncAllToAuth}
                  disabled={isSyncingAll}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                  <span>{isSyncingAll ? 'Syncing...' : 'Sync All to Firebase Auth'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/80 border border-amber-200/60 text-[11px] text-slate-600 leading-relaxed space-y-1">
              <strong className="text-slate-800 block">কেন Firebase Authentication-এ ইউজার দেখা যায় না এবং সমাধান:</strong>
              <p>
                ১. <strong>Email/Password Provider বন্ধ থাকা:</strong> নতুন Firebase প্রজেক্টে Email/Password সাইন-ইন বন্ধ থাকে।{' '}
                <a
                  href="https://console.firebase.google.com/project/myapps-2026/authentication/providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#C49A45] underline font-bold"
                >
                  Firebase Console &gt; Authentication &gt; Sign-in method
                </a>{' '}
                এ গিয়ে <strong>Email/Password</strong> &ldquo;Enable&rdquo; করে দিন।
              </p>
              <p>
                ২. <strong>পূর্ববর্তী ইউজারদের সিঙ্ক:</strong> সাইন-ইন এনাবল করার পর উপরের &ldquo;Sync All to Firebase Auth&rdquo; বাটনে ক্লিক করলেই পূর্বে তৈরিকৃত সকল অপারেটর Firebase Authentication &gt; Users-এ যুক্ত হয়ে যাবে।
              </p>
            </div>
          </div>

          {/* Operators List & Role Setting Card */}
          <div className="p-6 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#C49A45]" />
                  <span>Team Operators & Role Assignment ({users.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  অ্যাডমিন এখান থেকে যেকোনো ইউজারের রোল পরিবর্তন করতে পারেন এবং পারমিশন নির্ধারণ করতে পারেন।
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowRolesModal(!showRolesModal)}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Settings2 className="w-3.5 h-3.5 text-[#C49A45]" />
                  <span>{showRolesModal ? 'Hide Roles' : 'Manage Roles'}</span>
                </button>
                <button
                  onClick={() => setShowUserModal(true)}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Operator</span>
                </button>
              </div>
            </div>

            {/* Custom Roles Manager Panel (Optional expandable) */}
            {showRolesModal && (
              <div className="p-4 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#C49A45]" />
                    <span>System & Custom Roles ({roles.length})</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {roles.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-slate-900">{r.name}</strong>
                        {r.isSystem && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{r.description}</p>
                    </div>
                  ))}
                </div>

                {/* Create Custom Role Inline Form */}
                <form onSubmit={handleCreateCustomRole} className="pt-2 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    placeholder="New Role Name (e.g. Accountant, Store In-charge)..."
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Brief description..."
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white cursor-pointer shrink-0"
                  >
                    + Add Role
                  </button>
                </form>
              </div>
            )}

            {/* Users Table / List with Interactive Role Selector */}
            <div className="divide-y divide-slate-100">
              {users.map((u) => {
                const isSyncedToFirebase = !u.id.startsWith('usr_');
                return (
                  <div
                    key={u.id}
                    className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    {/* User Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          Active
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <span>@{u.username}</span>
                        <span>&middot;</span>
                        <span>{u.email}</span>
                        {u.phone && u.phone !== 'N/A' && (
                          <>
                            <span>&middot;</span>
                            <span>{u.phone}</span>
                          </>
                        )}
                      </div>

                      {/* Firebase Auth Sync Status Badge */}
                      <div className="flex items-center gap-2 pt-0.5">
                        {isSyncedToFirebase ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Firebase Auth Synced (UID: {u.id.slice(0, 8)}...)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Local / DB (Not yet in Firebase Auth)</span>
                          </span>
                        )}

                        {!isSyncedToFirebase && (
                          <button
                            onClick={() => handleSyncUserToAuth(u.id)}
                            disabled={syncingUserId === u.id}
                            className="text-[10px] text-[#C49A45] hover:text-[#b58c38] font-bold underline cursor-pointer disabled:opacity-50"
                          >
                            {syncingUserId === u.id ? 'Syncing...' : 'Sync to Firebase Auth'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Role Selector & Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                      <button
                        onClick={() => handleOpenModuleConfig(u)}
                        className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
                        title="Configure Module Access (যে যে আইটেম বা মডিউল ব্যবহার করতে পারবে)"
                      >
                        <Shield className="w-3.5 h-3.5 text-[#C49A45]" />
                        <span>Access ({getUserEffectiveModules(u, roles.find((r) => r.id === u.roleId)).length})</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap hidden sm:inline">
                          Role:
                        </label>
                        <select
                          value={u.roleId}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#FEFAF3] border border-[#C49A45]/40 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] cursor-pointer"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {users.length > 1 && u.id !== 'usr_admin' && (
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Delete Operator"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Module Access Configuration Modal */}
      {configuringUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#C49A45]" />
                  <span>Configure Access for @{configuringUser.username} ({configuringUser.name})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  অ্যাডমিন এখান থেকে নির্ধারণ করুন এই ইউজার কোন কোন আইটেম বা মডিউল দেখতে এবং ব্যবহার করতে পারবে।
                </p>
              </div>
              <button
                onClick={() => setConfiguringUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {ALL_SYSTEM_MODULES.map((mod) => {
                const isChecked = selectedUserModules.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-colors cursor-pointer ${
                      isChecked ? 'bg-amber-50/60 border-amber-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserModules([...selectedUserModules, mod.id]);
                        } else {
                          setSelectedUserModules(selectedUserModules.filter((id) => id !== mod.id));
                        }
                      }}
                      className="mt-0.5 w-4 h-4 text-[#C49A45] rounded border-slate-300 focus:ring-[#C49A45]"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 block">{mod.label}</span>
                      <span className="text-[11px] text-slate-500 block leading-relaxed">{mod.description}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfiguringUser(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUserModules}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white cursor-pointer shadow-xs"
              >
                Save Module Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Reset Clean Slate (Requirement 5) */}
      {activeTab === 'reset' && (
        <div className="max-w-xl">
          <div className="p-6 rounded-3xl bg-white border-2 border-rose-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold">Reset to Clean Slate (Password Required)</h3>
                <p className="text-xs text-slate-500">Requires Admin password verification (Requirement 5)</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Resetting to clean slate will clear all transaction invoices, customer credit dues, products, and expenses, leaving only the primary Admin account for fresh operation.
            </p>

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

            <form onSubmit={handleCleanSlateReset} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-800 font-bold mb-1.5 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Verify Admin Password *</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your admin password..."
                  value={resetPassInput}
                  onChange={(e) => setResetPassInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Verify Password & Reset to Clean Slate
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C49A45]" />
              <span>Register New System Operator</span>
            </h3>

            {userError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {userError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username / User ID *</label>
                <input
                  type="text"
                  required
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-mono"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-[#FEFAF3] border border-[#C49A45]/30 text-slate-700 text-[11px]">
                Password must be <strong>8 to 16 characters</strong> containing both <strong>letters and numbers</strong>.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="8-16 letters & digits"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Role *</label>
                <select
                  value={newUserRoleId}
                  onChange={(e) => setNewUserRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingUser}
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 py-2 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="flex-1 py-2 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {isSubmittingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingUser ? 'Registering in Firebase...' : 'Save & Register Operator'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
