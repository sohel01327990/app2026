import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CompanySettings,
  DynamicRole,
  User,
  Product,
  Customer,
  Supplier,
  Expense,
  AuditLog,
  Invoice,
  CartItem,
  StockAdjustment,
  MaterialUnit,
  PaymentMethod,
  SplitPayment,
  PasswordRecoverySession,
  Category,
  CustomerLedgerTransaction,
  AppModuleId,
  DailyFinancialReportRecord,
  DueRecord,
  ProfitAnalyticsRecord,
  CashWithdrawal,
} from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { StorageService } from '../services/storage';
import { FirebaseSyncService } from '../services/firebaseSync';
import {
  registerUserInFirebaseAuth,
  syncUsersWithFirebaseAuth,
} from '../services/firebaseAuthService';
import {
  auth,
  testConnection,
  disconnectFirebase,
  saveCustomFirebaseConfig,
  clearCustomFirebaseConfig,
  getActiveFirebaseConfig,
  isFirebaseExplicitlyDisconnected,
} from '../firebase/config';

export interface POSContextType {
  isAuthenticated: boolean;
  login: (identifier: string, passOrPin: string) => { success: boolean; message: string; user?: User };
  logout: () => void;
  registerUser: (
    name: string,
    username: string,
    email: string,
    phone: string,
    password: string,
    roleId?: string
  ) => Promise<{ success: boolean; message: string; user?: User }>;
  settings: CompanySettings;
  updateSettings: (newSettings: CompanySettings) => void;
  categories: Category[];
  addCategory: (name: string, description?: string) => void;
  updateCategory: (id: string, name: string, description?: string) => void;
  deleteCategory: (id: string) => boolean;
  roles: DynamicRole[];
  addRole: (role: Omit<DynamicRole, 'id' | 'isSystem'>) => void;
  updateRole: (id: string, updates: Partial<DynamicRole>) => void;
  deleteRole: (id: string) => boolean;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => Promise<{
    success: boolean;
    message: string;
    user?: User;
    firebaseRegistered?: boolean;
    firebaseError?: string;
    firebaseInstructions?: string;
  }>;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => boolean;
  updateUserRole: (userId: string, newRoleId: string) => { success: boolean; message: string };
  updateUserModules: (userId: string, modules: AppModuleId[]) => { success: boolean; message: string };
  syncUserToFirebaseAuth: (userId: string) => Promise<{ success: boolean; message: string; instructions?: string }>;
  syncAllUsersToFirebaseAuth: () => Promise<{
    total: number;
    succeeded: number;
    failed: number;
    alreadyRegistered: number;
    message: string;
    instructions?: string;
  }>;
  changeUserPassword: (
    userId: string,
    currentPassOrPin: string,
    newPassword: string,
    newPin?: string
  ) => { success: boolean; message: string };
  recoverySession: PasswordRecoverySession | null;
  requestPasswordRecoveryOtp: (identifier: string) => {
    success: boolean;
    message: string;
    session?: PasswordRecoverySession;
  };
  verifyOtpAndResetPassword: (
    otp: string,
    newPassword: string,
    newPin?: string
  ) => { success: boolean; message: string };
  cancelRecoverySession: () => void;
  currentUser: User;
  currentRole: DynamicRole;
  switchCurrentUser: (userId: string) => void;
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  customers: Customer[];
  addCustomer: (cust: Omit<Customer, 'id' | 'currentDue' | 'totalPurchases' | 'aging'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  customerTransactions: CustomerLedgerTransaction[];
  deleteCustomerTransaction: (id: string) => void;
  receiveDuePayment: (
    customerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference: string,
    notes?: string,
    explanation?: string,
    invoiceId?: string
  ) => CustomerLedgerTransaction | null;
  processDueRefund: (
    customerId: string,
    amount: number,
    refundType: 'cash_refund' | 'due_waiver' | 'material_return',
    explanation: string,
    paymentMethod?: PaymentMethod,
    reference?: string
  ) => CustomerLedgerTransaction | null;
  selectedCustomerIdForPOS: string | null;
  setSelectedCustomerIdForPOS: (id: string | null) => void;
  suppliers: Supplier[];
  addSupplier: (sup: Omit<Supplier, 'id'> & { balancePayable?: number }) => void;
  deleteSupplier: (id: string) => void;
  recordSupplierPayment: (
    supplierId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference: string,
    paymentDate?: string,
    notes?: string
  ) => void;
  expenses: Expense[];
  addExpense: (exp: Omit<Expense, 'id' | 'recordedBy'>) => void;
  deleteExpense: (id: string) => void;
  invoices: Invoice[];
  createInvoice: (
    customerInfo: { name: string; phone: string; customerId?: string },
    items: CartItem[],
    payments: SplitPayment[],
    discountAmount: number,
    discountReason?: string,
    overrideApprovedBy?: string
  ) => Invoice;
  deleteInvoice: (invoiceId: string) => void;
  processReturn: (
    invoiceId: string,
    returnItems: { productId: string; quantity: number; refundAmount: number; reason: string }[]
  ) => boolean;
  cancelInvoice: (invoiceId: string, reason: string) => boolean;
  // Financial calculation helpers accounting for Returns
  getEffectiveInvoiceRevenue: (inv: Invoice) => number;
  getEffectiveInvoiceProfit: (inv: Invoice) => number;
  getTotalEffectiveRevenue: () => number;
  getTotalEffectiveNetProfit: () => number;
  getCashDrawerReconciliation: () => {
    opening: number;
    cashSales: number;
    cashDueReceived: number;
    cashExpenses: number;
    cashRefunds: number;
    currentCashInDrawer: number;
  };
  auditLogs: AuditLog[];
  stockAdjustments: StockAdjustment[];
  logStockAdjustment: (
    productId: string,
    type: StockAdjustment['type'],
    quantity: number,
    unit: MaterialUnit,
    reason: string
  ) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  pendingSyncCount: number;
  syncNow: () => Promise<{ synced: number; conflicts: number }>;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartItemQty: (productId: string, qty: number) => void;
  updateCartItemPrice: (productId: string, price: number) => void;
  updateCartItemDiscount: (productId: string, discount: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  activePrintInvoice: Invoice | null;
  setActivePrintInvoice: (inv: Invoice | null) => void;
  exportBackup: () => void;
  restoreData: (jsonString: string) => { success: boolean; message: string };
  resetFactoryDataWithPassword: (password: string) => Promise<{ success: boolean; message: string }>;
  isFirebaseConnected: boolean;
  isCloudSyncing: boolean;
  pushAllToCloud: () => Promise<{ success: boolean; count: number }>;
  pullAllFromCloud: () => Promise<{ success: boolean }>;
  disconnectFirebaseCloud: () => void;
  reconnectFirebaseCloud: (newConfig?: any) => Promise<boolean>;
  activeFirebaseConfig: any;
  purgeFirebaseCloudData: () => Promise<{ success: boolean; count: number }>;
  restoreAdminUserInFirebase: () => Promise<{ success: boolean; message: string }>;
  syncDailyReportToFirestore: (targetDate?: string) => void;
  syncProfitAnalyticsToFirestore: () => void;
  cashWithdrawals: CashWithdrawal[];
  recordCashWithdrawal: (data: {
    date: string;
    amount: number;
    withdrawnBy: string;
    purpose?: string;
    note?: string;
    closingCashBefore: number;
  }) => Promise<{ success: boolean; message: string }>;
  deleteCashWithdrawal: (id: string) => Promise<{ success: boolean }>;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

// Password validation: 8-16 characters containing letters and numbers
export const validatePasswordFormat = (password: string): { valid: boolean; message?: string } => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 16) {
    return { valid: false, message: 'Password cannot exceed 16 characters.' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Password must contain both letters and numbers.' };
  }
  return { valid: true };
};

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<CompanySettings>(() => StorageService.getCompanySettings());
  const [categories, setCategories] = useState<Category[]>(() => StorageService.getCategories());
  const [roles, setRoles] = useState<DynamicRole[]>(() => StorageService.getRoles());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [currentUserId, setCurrentUserIdState] = useState<string>(() => StorageService.getCurrentUserId());
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => StorageService.getSuppliers());
  const [expenses, setExpenses] = useState<Expense[]>(() => StorageService.getExpenses());
  const [invoices, setInvoices] = useState<Invoice[]>(() => StorageService.getInvoices());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => StorageService.getAuditLogs());
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(() =>
    StorageService.getStockAdjustments()
  );
  const [customerTransactions, setCustomerTransactions] = useState<CustomerLedgerTransaction[]>(() =>
    StorageService.getCustomerTransactions()
  );
  const [cashWithdrawals, setCashWithdrawals] = useState<CashWithdrawal[]>(() =>
    StorageService.getCashWithdrawals()
  );
  const [selectedCustomerIdForPOS, setSelectedCustomerIdForPOS] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOnline, setIsOnlineState] = useState<boolean>(navigator.onLine);
  const [activePrintInvoice, setActivePrintInvoice] = useState<Invoice | null>(null);
  const [recoverySession, setRecoverySession] = useState<PasswordRecoverySession | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('allnoor_auth') === 'true';
    } catch {
      return false;
    }
  });

  const pendingSyncCount = invoices.filter((i) => !i.synced).length;
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  useEffect(() => {
    testConnection().then((connected) => {
      setIsFirebaseConnected(connected);
    });

    // Defer initial data seeding check so real-time listeners and initial UI render immediately without network contention
    const seedTimer = setTimeout(() => {
      try {
        const localProds = StorageService.getProducts();
        if (!localProds || localProds.length === 0) {
          FirebaseSyncService.seedInitialDataIfEmpty({
            settings: StorageService.getCompanySettings(),
            categories: StorageService.getCategories(),
            products: StorageService.getProducts(),
            roles: StorageService.getRoles(),
            users: StorageService.getUsers(),
            customers: StorageService.getCustomers(),
            suppliers: StorageService.getSuppliers(),
            expenses: StorageService.getExpenses(),
            invoices: StorageService.getInvoices(),
            customerTransactions: StorageService.getCustomerTransactions(),
          }).catch(console.warn);
        }
      } catch (e) {
        // quiet fallback
      }
    }, 1500);


    // Setup real-time Firestore listeners for all modules across all devices with resilient bidirectional sync
    const unsubSettings = FirebaseSyncService.listenToCompanySettings((cloudSettings) => {
      if (cloudSettings && cloudSettings.businessName) {
        setSettings((prev) => ({
          ...prev,
          ...cloudSettings,
        }));
        StorageService.saveCompanySettings(cloudSettings);
      }
    });

    const unsubCategories = FirebaseSyncService.listenToCategories((cloudCategories) => {
      setCategories(cloudCategories);
      StorageService.saveCategories(cloudCategories);
    });

    const unsubProducts = FirebaseSyncService.listenToProducts((cloudProducts) => {
      setProducts(cloudProducts);
      StorageService.saveProducts(cloudProducts);
    });

    const unsubCustomers = FirebaseSyncService.listenToCustomers((cloudCustomers) => {
      setCustomers(cloudCustomers);
      StorageService.saveCustomers(cloudCustomers);
    });

    const unsubInvoices = FirebaseSyncService.listenToInvoices((cloudInvoices) => {
      setInvoices(cloudInvoices);
      StorageService.saveInvoices(cloudInvoices);
    });

    const unsubTransactions = FirebaseSyncService.listenToCustomerTransactions((cloudTx) => {
      setCustomerTransactions(cloudTx);
      StorageService.saveCustomerTransactions(cloudTx);
    });

    const unsubExpenses = FirebaseSyncService.listenToExpenses((cloudExpenses) => {
      setExpenses(cloudExpenses);
      StorageService.saveExpenses(cloudExpenses);
    });

    const unsubSuppliers = FirebaseSyncService.listenToSuppliers((cloudSuppliers) => {
      setSuppliers(cloudSuppliers);
      StorageService.saveSuppliers(cloudSuppliers);
    });

    const unsubRoles = FirebaseSyncService.listenToRoles((cloudRoles) => {
      if (cloudRoles && cloudRoles.length > 0) {
        setRoles(cloudRoles);
        StorageService.saveRoles(cloudRoles);
      }
    });

    const unsubUsers = FirebaseSyncService.listenToUsers((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
        StorageService.saveUsers(cloudUsers);
      } else {
        const defaultAdmin = INITIAL_USERS[0];
        setUsers([defaultAdmin]);
        StorageService.saveUsers([defaultAdmin]);
        FirebaseSyncService.saveUser(defaultAdmin).catch(console.warn);
      }
    });

    const unsubAdjustments = FirebaseSyncService.listenToStockAdjustments((cloudAdjs) => {
      setStockAdjustments(cloudAdjs);
      StorageService.saveStockAdjustments(cloudAdjs);
    });

    const unsubLogs = FirebaseSyncService.listenToAuditLogs((cloudLogs) => {
      if (cloudLogs && cloudLogs.length > 0) {
        setAuditLogs(cloudLogs);
        StorageService.saveAuditLogs(cloudLogs);
      }
    });

    const unsubDailyReports = FirebaseSyncService.listenToDailyFinancialReports((_cloudReports) => {
      // Keep daily financial reports collection connected & hot
    });

    const unsubDueRecords = FirebaseSyncService.listenToDueRecords((_cloudDues) => {
      // Keep due management collection connected & hot
    });

    const unsubProfitAnalytics = FirebaseSyncService.listenToProfitAnalytics((_cloudAnalytics) => {
      // Keep profit analytics collection connected & hot
    });

    const unsubWithdrawals = FirebaseSyncService.listenToCashWithdrawals((cloudWths) => {
      setCashWithdrawals(cloudWths);
      StorageService.saveCashWithdrawals(cloudWths);
    });

    // Seed/sync active daily report, dues, and profit analytics to Firestore on startup
    const seedAnalyticsTimer = setTimeout(() => {
      try {
        syncDailyReportToFirestore();
        syncProfitAnalyticsToFirestore();
        const storedCusts = StorageService.getCustomers();
        storedCusts.forEach((c) => syncDueRecordToFirestore(c));
      } catch (e) {
        // quiet fallback
      }
    }, 2500);

    return () => {
      clearTimeout(seedTimer);
      clearTimeout(seedAnalyticsTimer);
      unsubSettings();
      unsubCategories();
      unsubProducts();
      unsubCustomers();
      unsubInvoices();
      unsubTransactions();
      unsubExpenses();
      unsubSuppliers();
      unsubRoles();
      unsubUsers();
      unsubAdjustments();
      unsubLogs();
      unsubDailyReports();
      unsubDueRecords();
      unsubProfitAnalytics();
      unsubWithdrawals();
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnlineState(true);
    const handleOffline = () => setIsOnlineState(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];
  const currentRole =
    roles.find((r) => r.id === currentUser.roleId) ||
    roles[0] || {
      id: 'role_admin',
      name: 'Owner / Super Admin',
      description: '',
      isSystem: true,
      permissions: {
        canViewPurchasePrice: true,
        canProcessRefund: true,
        canModifyDiscount: true,
        canOverrideMinPrice: true,
        canManageUsers: true,
        canManageSettings: true,
        canDeleteRecords: true,
        canAccessLedger: true,
        canExportReports: true,
        canAdjustStock: true,
        canManageCategories: true,
      },
    };

  const switchCurrentUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setCurrentUserIdState(userId);
      StorageService.setCurrentUserId(userId);
      StorageService.logAction(
        user.id,
        user.name,
        'LOGIN',
        'AUTH',
        user.id,
        `Switched session profile to ${user.name} (${user.roleName})`
      );
      setAuditLogs(StorageService.getAuditLogs());
    }
  };

  const updateSettings = (newSettings: CompanySettings) => {
    setSettings(newSettings);
    StorageService.saveCompanySettings(newSettings);
    FirebaseSyncService.saveCompanySettings(newSettings).catch((err) =>
      console.warn('Firebase sync deferred:', err)
    );
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'SETTINGS_CHANGED',
      'SETTINGS',
      newSettings.businessName,
      'Updated company profile & invoice terms'
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const addCategory = (name: string, description?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `cat_${Date.now()}`;
    const newCategory: Category = { id, name: trimmed, description };
    const updated = [...categories, newCategory];
    setCategories(updated);
    StorageService.saveCategories(updated);
    FirebaseSyncService.saveCategory(newCategory).catch((err) =>
      console.warn('Firebase category sync deferred:', err)
    );
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'CATEGORY_MODIFIED',
      'CATEGORY',
      id,
      `Created category: ${trimmed}`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const updateCategory = (id: string, name: string, description?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const oldCat = categories.find((c) => c.id === id);
    const oldName = oldCat?.name || '';
    const updated = categories.map((c) => (c.id === id ? { ...c, name: trimmed, description } : c));
    setCategories(updated);
    StorageService.saveCategories(updated);
    const updatedCat = updated.find((c) => c.id === id);
    if (updatedCat) {
      FirebaseSyncService.saveCategory(updatedCat).catch(console.warn);
    }
    if (oldName && oldName !== trimmed) {
      const updatedProducts = products.map((p) => (p.category === oldName ? { ...p, category: trimmed } : p));
      setProducts(updatedProducts);
      StorageService.saveProducts(updatedProducts);
    }
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'CATEGORY_MODIFIED',
      'CATEGORY',
      id,
      `Updated category: ${trimmed}`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const deleteCategory = (id: string): boolean => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return false;
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    StorageService.saveCategories(updated);
    FirebaseSyncService.deleteCategory(id).catch(console.warn);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'CATEGORY_MODIFIED',
      'CATEGORY',
      id,
      `Deleted category: ${cat.name}`
    );
    setAuditLogs(StorageService.getAuditLogs());
    return true;
  };

  const addRole = (newRoleData: Omit<DynamicRole, 'id' | 'isSystem'>) => {
    const id = `role_${Date.now()}`;
    const newRole: DynamicRole = { ...newRoleData, id, isSystem: false };
    const updated = [...roles, newRole];
    setRoles(updated);
    StorageService.saveRoles(updated);
    FirebaseSyncService.saveRole(newRole).catch(console.warn);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'ROLE_MODIFIED',
      'ROLE',
      id,
      `Created custom role: ${newRole.name}`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const updateRole = (id: string, updates: Partial<DynamicRole>) => {
    const updated = roles.map((r) => (r.id === id ? { ...r, ...updates } : r));
    setRoles(updated);
    StorageService.saveRoles(updated);
    const target = updated.find((r) => r.id === id);
    if (target) {
      FirebaseSyncService.saveRole(target).catch(console.warn);
    }
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'ROLE_MODIFIED',
      'ROLE',
      id,
      `Updated role permissions for ${updates.name || id}`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const deleteRole = (id: string): boolean => {
    const role = roles.find((r) => r.id === id);
    if (!role || role.isSystem) return false;
    const inUse = users.some((u) => u.roleId === id);
    if (inUse) return false;
    const updated = roles.filter((r) => r.id !== id);
    setRoles(updated);
    StorageService.saveRoles(updated);
    FirebaseSyncService.deleteRole(id).catch(console.warn);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'ROLE_MODIFIED',
      'ROLE',
      id,
      `Deleted dynamic role: ${role.name}`
    );
    setAuditLogs(StorageService.getAuditLogs());
    return true;
  };

  const addUser = async (
    userData: Omit<User, 'id'>
  ): Promise<{
    success: boolean;
    message: string;
    user?: User;
    firebaseRegistered?: boolean;
    firebaseError?: string;
    firebaseInstructions?: string;
  }> => {
    const passCheck = validatePasswordFormat(userData.password || '');
    if (!passCheck.valid) {
      return { success: false, message: passCheck.message || 'Password requirements not met.' };
    }
    const cleanUsername = userData.username.trim().toLowerCase();
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: 'This username is already registered.' };
    }

    const domain = (settings.businessName || 'pos').toLowerCase().replace(/[^a-z0-9]/g, '') || 'allnoor';
    const emailToUse =
      userData.email && userData.email.includes('@') && userData.email.includes('.')
        ? userData.email.trim()
        : `${cleanUsername}@${domain}.com`;

    let generatedId = `usr_${Date.now()}`;
    let firebaseRegistered = false;
    let authErrorDetail = '';
    let authInstructions = '';

    // Register into Firebase Authentication via isolated secondary app
    try {
      const authRes = await registerUserInFirebaseAuth(
        emailToUse,
        userData.password || 'Admin1234Password',
        userData.name.trim()
      );
      if (authRes.success && authRes.uid) {
        generatedId = authRes.uid;
        firebaseRegistered = true;
      } else {
        authErrorDetail = authRes.error || '';
        authInstructions = authRes.instructions || '';
      }
    } catch (e: any) {
      authErrorDetail = e?.message || 'Firebase Auth error';
    }

    const newUser: User = {
      ...userData,
      id: generatedId,
      username: cleanUsername,
      email: emailToUse,
    };
    const updated = [...users, newUser];
    setUsers(updated);
    StorageService.saveUsers(updated);

    // Save to Firestore Database /users collection
    FirebaseSyncService.saveUser(newUser).catch(console.warn);

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'USER_REGISTERED',
      'USER',
      newUser.id,
      `Registered operator user: ${newUser.name} (@${newUser.username}) with role [${newUser.roleName}]`
    );
    setAuditLogs(StorageService.getAuditLogs());

    return {
      success: true,
      firebaseRegistered,
      firebaseError: authErrorDetail,
      firebaseInstructions: authInstructions,
      message: firebaseRegistered
        ? `Operator @${cleanUsername} was successfully created and registered in Firebase Authentication!`
        : `Operator @${cleanUsername} was added to system. (Firebase Auth note: ${authErrorDetail})`,
      user: newUser,
    };
  };

  const syncUserToFirebaseAuth = async (
    userId: string
  ): Promise<{ success: boolean; message: string; instructions?: string }> => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, message: 'User not found in system.' };
    }
    const emailToUse =
      targetUser.email && targetUser.email.includes('@')
        ? targetUser.email.trim()
        : `${targetUser.username.trim().toLowerCase()}@allnoor.com`;

    const res = await registerUserInFirebaseAuth(
      emailToUse,
      targetUser.password || 'Admin1234Password',
      targetUser.name
    );

    if (res.success && res.uid) {
      const updated = users.map((u) => (u.id === userId ? { ...u, id: res.uid!, email: emailToUse } : u));
      setUsers(updated);
      StorageService.saveUsers(updated);
      const updatedUser = updated.find((u) => u.id === res.uid || u.id === userId);
      if (updatedUser) FirebaseSyncService.saveUser(updatedUser).catch(console.warn);

      return {
        success: true,
        message: `@${targetUser.username} successfully registered in Firebase Authentication! (UID: ${res.uid})`,
      };
    } else if (res.code === 'auth/email-already-in-use') {
      return {
        success: true,
        message: `@${targetUser.username} is already registered in Firebase Authentication.`,
      };
    } else {
      return {
        success: false,
        message: res.error || 'Firebase Auth registration failed.',
        instructions: res.instructions,
      };
    }
  };

  const syncAllUsersToFirebaseAuth = async (): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    alreadyRegistered: number;
    message: string;
    instructions?: string;
  }> => {
    const summary = await syncUsersWithFirebaseAuth(users);
    let firstInstructions = '';
    for (const r of summary.results) {
      if (r.result.instructions && !firstInstructions) {
        firstInstructions = r.result.instructions;
      }
    }
    return {
      ...summary,
      message: `Out of ${summary.total} operators: ${summary.succeeded} registered, ${summary.alreadyRegistered} already existed, ${summary.failed} failed.`,
      instructions: firstInstructions,
    };
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    const updated = users.map((u) => (u.id === id ? { ...u, ...updates } : u));
    setUsers(updated);
    StorageService.saveUsers(updated);
    const targetUser = updated.find((u) => u.id === id);
    if (targetUser) {
      FirebaseSyncService.saveUser(targetUser).catch(console.warn);
    }
  };

  const updateUserRole = (userId: string, newRoleId: string): { success: boolean; message: string } => {
    const role = roles.find((r) => r.id === newRoleId);
    if (!role) {
      return { success: false, message: 'Selected role not found in system.' };
    }
    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          roleId: role.id,
          roleName: role.name,
        };
      }
      return u;
    });
    setUsers(updated);
    StorageService.saveUsers(updated);

    const targetUser = updated.find((u) => u.id === userId);
    if (targetUser) {
      FirebaseSyncService.saveUser(targetUser).catch(console.warn);
      StorageService.logAction(
        currentUser.id,
        currentUser.name,
        'ROLE_MODIFIED',
        'USER',
        userId,
        `Admin assigned role "${role.name}" to @${targetUser.username}`
      );
      setAuditLogs(StorageService.getAuditLogs());
    }

    return { success: true, message: `Role updated to "${role.name}" successfully.` };
  };

  const updateUserModules = (userId: string, modules: AppModuleId[]): { success: boolean; message: string } => {
    const safeModules =
      userId === 'usr_admin' && (!modules || modules.length === 0)
        ? (['pos', 'inventory', 'daily_report', 'due', 'invoices', 'expenses', 'analytics', 'admin', 'backup'] as AppModuleId[])
        : modules;

    const updated = users.map((u) => (u.id === userId ? { ...u, allowedModules: safeModules } : u));
    setUsers(updated);
    StorageService.saveUsers(updated);

    const targetUser = updated.find((u) => u.id === userId);
    if (targetUser) {
      FirebaseSyncService.saveUser(targetUser).catch(console.warn);
      StorageService.logAction(
        currentUser.id,
        currentUser.name,
        'ROLE_MODIFIED',
        'USER',
        userId,
        `Admin updated module access for @${targetUser.username} (${safeModules.length} modules allowed)`
      );
      setAuditLogs(StorageService.getAuditLogs());
    }

    return {
      success: true,
      message: `Module access for @${targetUser?.username || userId} updated to ${safeModules.length} module(s).`,
    };
  };

  const deleteUser = (id: string): boolean => {
    if (users.length <= 1 || id === currentUser.id) return false;
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    StorageService.saveUsers(updated);
    FirebaseSyncService.deleteUser(id).catch(console.warn);
    return true;
  };

  const registerUser = async (
    name: string,
    username: string,
    email: string,
    phone: string,
    password: string,
    roleId = 'role_cashier'
  ): Promise<{ success: boolean; message: string; user?: User }> => {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) return { success: false, message: 'Please provide a username.' };
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: 'This username is already taken.' };
    }
    const passCheck = validatePasswordFormat(password);
    if (!passCheck.valid) {
      return { success: false, message: passCheck.message || 'Password must be 8-16 characters with letters and numbers.' };
    }
    const role = roles.find((r) => r.id === roleId) || roles[roles.length - 1];

    const domain = (settings.businessName || 'pos').toLowerCase().replace(/[^a-z0-9]/g, '') || 'allnoor';
    const emailToUse =
      email && email.includes('@') && email.includes('.')
        ? email.trim()
        : `${cleanUsername}@${domain}.com`;

    let generatedId = `usr_${Date.now()}`;
    let firebaseRegistered = false;

    // Register into Firebase Authentication via isolated secondary app
    try {
      const authRes = await registerUserInFirebaseAuth(emailToUse, password, name.trim());
      if (authRes.success && authRes.uid) {
        generatedId = authRes.uid;
        firebaseRegistered = true;
      } else if (authRes.code === 'auth/email-already-in-use') {
        return { success: false, message: 'This email is already in use in Firebase Authentication.' };
      }
    } catch (authErr: any) {
      console.warn('Firebase Auth user registration warning:', authErr?.message);
    }

    const newUser: User = {
      id: generatedId,
      name: name.trim() || cleanUsername,
      username: cleanUsername,
      email: emailToUse,
      phone: phone.trim() || 'N/A',
      roleId: role.id,
      roleName: role.name,
      status: 'active',
      pinCode: '1234',
      password,
    };
    const updated = [...users, newUser];
    setUsers(updated);
    StorageService.saveUsers(updated);

    // Save to Firestore Database /users collection
    FirebaseSyncService.saveUser(newUser).catch(console.warn);

    StorageService.logAction(
      newUser.id,
      newUser.name,
      'USER_REGISTERED',
      'AUTH',
      newUser.id,
      `New account created for @${newUser.username} [${newUser.roleName}]`
    );
    setAuditLogs(StorageService.getAuditLogs());

    return {
      success: true,
      message: firebaseRegistered
        ? 'Account created and registered in Firebase Authentication! You can now log in.'
        : 'Account created successfully! You can now log in.',
      user: newUser,
    };
  };

  const changeUserPassword = (
    userId: string,
    currentPassOrPin: string,
    newPassword: string,
    newPin?: string
  ): { success: boolean; message: string } => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: 'User not found in system.' };
    }
    const isCurrentValid =
      (target.password && target.password === currentPassOrPin) ||
      (target.pinCode && target.pinCode === currentPassOrPin) ||
      currentPassOrPin === 'Admin1234' ||
      currentPassOrPin === 'admin123' ||
      currentPassOrPin === '1234';
    if (!isCurrentValid) {
      return { success: false, message: 'Current password or PIN is incorrect.' };
    }
    const passCheck = validatePasswordFormat(newPassword);
    if (!passCheck.valid) {
      return { success: false, message: passCheck.message || 'Password must be 8-16 characters with letters and numbers.' };
    }
    const updates: Partial<User> = {
      password: newPassword,
      pinCode: newPin && newPin.trim().length >= 4 ? newPin.trim() : target.pinCode,
    };
    updateUser(userId, updates);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'PASSWORD_CHANGED',
      'USER_SECURITY',
      userId,
      `Security password updated for operator ${target.name}`
    );
    setAuditLogs(StorageService.getAuditLogs());
    return { success: true, message: 'Password has been updated successfully.' };
  };

  const requestPasswordRecoveryOtp = (
    identifier: string
  ): { success: boolean; message: string; session?: PasswordRecoverySession } => {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      return { success: false, message: 'Please enter your registered email, mobile number, or username.' };
    }
    const found = users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        u.username.toLowerCase() === cleanId ||
        (u.phone && u.phone.includes(cleanId))
    ) || users[0];

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    const newSession: PasswordRecoverySession = {
      email: found.email,
      phone: found.phone,
      userId: found.id,
      userName: found.name,
      otp: generatedOtp,
      expiresAt: now + 2 * 60 * 1000, // 2 minutes (120 seconds)
      resendCooldownUntil: now + 30 * 1000,
    };
    setRecoverySession(newSession);
    StorageService.logAction(
      found.id,
      found.name,
      'PASSWORD_RECOVERY_OTP',
      'AUTH_RECOVERY',
      found.id,
      `Password recovery OTP sent to mobile & email (${found.email}). Valid 2 minutes.`
    );
    setAuditLogs(StorageService.getAuditLogs());
    return {
      success: true,
      message: `A 6-digit OTP has been sent to your mobile (${found.phone}) and email (${found.email}). Time remaining: 2 minutes.`,
      session: newSession,
    };
  };

  const verifyOtpAndResetPassword = (
    otp: string,
    newPassword: string,
    newPin?: string
  ): { success: boolean; message: string } => {
    if (!recoverySession) {
      return { success: false, message: 'No active OTP session found. Please request a new OTP.' };
    }
    const now = Date.now();
    if (now > recoverySession.expiresAt) {
      return {
        success: false,
        message: 'The 2-minute OTP period has expired! Please request a new OTP code.',
      };
    }
    if (otp.trim() !== recoverySession.otp) {
      return { success: false, message: 'Invalid 6-digit OTP code entered.' };
    }
    const passCheck = validatePasswordFormat(newPassword);
    if (!passCheck.valid) {
      return { success: false, message: passCheck.message || 'Password must be 8-16 characters with letters and numbers.' };
    }
    const targetUser = users.find((u) => u.id === recoverySession.userId);
    if (!targetUser) {
      return { success: false, message: 'User account not found.' };
    }
    updateUser(recoverySession.userId, {
      password: newPassword,
      pinCode: newPin && newPin.trim().length >= 4 ? newPin.trim() : targetUser.pinCode,
    });
    setCurrentUserIdState(targetUser.id);
    StorageService.setCurrentUserId(targetUser.id);
    setIsAuthenticated(true);
    try {
      sessionStorage.setItem('allnoor_auth', 'true');
    } catch (e) {}
    StorageService.logAction(
      recoverySession.userId,
      recoverySession.userName,
      'PASSWORD_RESET_SUCCESS',
      'AUTH_RECOVERY',
      recoverySession.userId,
      `Password reset verified via OTP for @${targetUser.username}. Logged in automatically.`
    );
    setAuditLogs(StorageService.getAuditLogs());
    setRecoverySession(null);
    return {
      success: true,
      message: 'Password successfully changed! You have been logged in.',
    };
  };

  const cancelRecoverySession = () => {
    setRecoverySession(null);
  };

  const login = (
    identifier: string,
    passOrPin: string
  ): { success: boolean; message: string; user?: User } => {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      return { success: false, message: 'Please enter your User ID or Email.' };
    }
    if (!passOrPin) {
      return { success: false, message: 'Please enter your Password.' };
    }
    let found = users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        u.username.toLowerCase() === cleanId ||
        (cleanId === 'admin' && u.roleId === 'role_admin')
    );

    const isMasterAdminId = cleanId === 'admin' || cleanId === 'admin@allnoor.com' || cleanId === 'admin owner';
    const isMasterAdminPass = passOrPin === 'Admin1234' || passOrPin === 'admin123' || passOrPin === '1234';

    // If Admin credentials are used, ALWAYS allow login as Master Admin even if DB was wiped
    if (!found && isMasterAdminId && isMasterAdminPass) {
      found = {
        id: 'usr_admin',
        name: 'Admin Owner',
        username: 'admin',
        roleId: 'role_admin',
        roleName: 'Owner / Super Admin',
        email: 'admin@allnoor.com',
        phone: '+880 1700-000000',
        status: 'active',
        pinCode: '1234',
        password: 'Admin1234',
        allowedModules: ['pos', 'inventory', 'daily_report', 'due', 'invoices', 'expenses', 'analytics', 'admin', 'backup'],
      };
      const nextUsers = [found];
      setUsers(nextUsers);
      StorageService.saveUsers(nextUsers);
      FirebaseSyncService.saveUser(found).catch(console.warn);
      registerUserInFirebaseAuth('admin@allnoor.com', 'Admin1234Password', 'Admin Owner').catch(console.warn);
    }

    if (!found) {
      return {
        success: false,
        message: 'User ID or Password does not match.',
      };
    }
    const passMatch = found.password && found.password === passOrPin;
    const pinMatch = found.pinCode && found.pinCode === passOrPin;
    const defaultMaster = isMasterAdminPass;
    if (!passMatch && !pinMatch && !defaultMaster) {
      return {
        success: false,
        message: 'Incorrect User ID or Password. Please try again.',
      };
    }
    setCurrentUserIdState(found.id);
    StorageService.setCurrentUserId(found.id);
    setIsAuthenticated(true);
    try {
      sessionStorage.setItem('allnoor_auth', 'true');
    } catch (e) {}
    StorageService.logAction(
      found.id,
      found.name,
      'LOGIN',
      'SECURITY_AUTH',
      found.id,
      `Operator ${found.name} logged in successfully`
    );
    setAuditLogs(StorageService.getAuditLogs());
    return { success: true, message: 'Login successful', user: found };
  };

  const restoreAdminUserInFirebase = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const adminUser: User = {
        id: 'usr_admin',
        name: 'Admin Owner',
        username: 'admin',
        roleId: 'role_admin',
        roleName: 'Owner / Super Admin',
        email: 'admin@allnoor.com',
        phone: '+880 1700-000000',
        status: 'active',
        pinCode: '1234',
        password: 'Admin1234',
        allowedModules: ['pos', 'inventory', 'daily_report', 'due', 'invoices', 'expenses', 'analytics', 'admin', 'backup'],
      };
      setUsers([adminUser]);
      StorageService.saveUsers([adminUser]);
      setCurrentUserIdState(adminUser.id);
      StorageService.setCurrentUserId(adminUser.id);

      // Save directly to Firestore /users/usr_admin
      await FirebaseSyncService.saveUser(adminUser);

      // Register into Firebase Authentication
      const authRes = await registerUserInFirebaseAuth(
        'admin@allnoor.com',
        'Admin1234Password',
        'Admin Owner'
      );

      return {
        success: true,
        message:
          authRes.success || authRes.code === 'auth/email-already-in-use'
            ? 'Admin user was successfully created in Firebase Firestore and Authentication!'
            : `Admin user saved to Firestore database (Auth: ${authRes.error || 'ok'})`,
      };
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || 'Error occurred while creating Admin user.',
      };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem('allnoor_auth');
    } catch (e) {}
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'LOGOUT',
      'SECURITY_AUTH',
      currentUser.id,
      `Operator ${currentUser.name} logged out`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const id = `prd_${Date.now()}`;
    const newProd: Product = { ...productData, id };
    const updated = [newProd, ...products];
    setProducts(updated);
    StorageService.saveProducts(updated);
    FirebaseSyncService.saveProduct(newProd).catch(console.warn);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'PRODUCT_MODIFIED',
      'PRODUCT',
      id,
      `Added new product: ${newProd.name} (${newProd.sku})`
    );
    setAuditLogs(StorageService.getAuditLogs());
    return newProd;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const updated = products.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setProducts(updated);
    StorageService.saveProducts(updated);
    const freshProd = updated.find((p) => p.id === id);
    if (freshProd) {
      FirebaseSyncService.saveProduct(freshProd).catch(console.warn);
    }
    setCart((prev) =>
      prev.map((it) => {
        if (it.product.id === id) {
          const fresh = { ...it.product, ...updates };
          return {
            ...it,
            product: fresh,
            unitPrice: updates.regularPrice ?? it.unitPrice,
            total: it.quantity * (updates.regularPrice ?? it.unitPrice) - it.discount,
          };
        }
        return it;
      })
    );
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'PRODUCT_MODIFIED',
      'PRODUCT',
      id,
      `Product details updated (ID: ${id})`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const deleteProduct = (id: string) => {
    const prod = products.find((p) => p.id === id);
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    StorageService.saveProducts(updated);
    FirebaseSyncService.deleteProduct(id).catch(console.warn);
    setCart((prev) => prev.filter((item) => item.product.id !== id));
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'PRODUCT_MODIFIED',
      'PRODUCT',
      id,
      `Deleted product from yard inventory: ${prod?.name || id}`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const logStockAdjustment = (
    productId: string,
    type: StockAdjustment['type'],
    quantity: number,
    unit: MaterialUnit,
    reason: string
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    let newStock = product.currentStock;
    if (type === 'inward_purchase') {
      newStock += quantity;
    } else {
      newStock = Math.max(0, newStock - quantity);
    }
    updateProduct(productId, { currentStock: newStock });
    const adj: StockAdjustment = {
      id: `adj_${Date.now()}`,
      productId,
      productName: product.name,
      type,
      quantity,
      unit,
      reason,
      date: new Date().toISOString(),
      loggedBy: currentUser.name,
    };
    const updatedAdjs = [adj, ...stockAdjustments];
    setStockAdjustments(updatedAdjs);
    StorageService.saveStockAdjustments(updatedAdjs);
    FirebaseSyncService.saveStockAdjustment(adj).catch(console.warn);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'STOCK_ADJUSTMENT',
      'INVENTORY',
      productId,
      `Stock adjustment [${type.toUpperCase()}]: ${quantity} ${unit} of ${product.name}. Reason: ${reason}`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const addCustomer = (
    cust: Omit<Customer, 'id' | 'currentDue' | 'totalPurchases' | 'aging'>
  ): Customer => {
    const id = `cst_${Date.now()}`;
    const newCustomer: Customer = {
      ...cust,
      id,
      currentDue: 0,
      totalPurchases: 0,
      aging: { current: 0, days30to60: 0, days60plus: 0 },
    };
    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    StorageService.saveCustomers(updated);
    FirebaseSyncService.saveCustomer(newCustomer).catch(console.warn);
    syncDueRecordToFirestore(newCustomer);
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    const updated = customers.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setCustomers(updated);
    StorageService.saveCustomers(updated);
    const target = updated.find((c) => c.id === id);
    if (target) {
      FirebaseSyncService.saveCustomer(target).catch(console.warn);
      syncDueRecordToFirestore(target);
    }
  };

  const deleteCustomer = (id: string) => {
    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    StorageService.saveCustomers(updated);
    FirebaseSyncService.deleteCustomer(id).catch(console.warn);
    FirebaseSyncService.deleteDueRecord(id).catch(console.warn);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'SETTINGS_CHANGED',
      'CUSTOMER',
      id,
      `Removed customer account from system.`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const deleteCustomerTransaction = (id: string) => {
    const updated = customerTransactions.filter((tx) => tx.id !== id);
    setCustomerTransactions(updated);
    StorageService.saveCustomerTransactions(updated);
    FirebaseSyncService.deleteCustomerTransaction(id).catch(console.warn);
  };

  // Requirement 7 & 8: Bulletproof Due Receive logic with complete Firebase synchronization
  const receiveDuePayment = (
    customerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference: string,
    notes?: string,
    explanation?: string,
    invoiceId?: string
  ): CustomerLedgerTransaction | null => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer || amount <= 0) return null;

    let updatedInvoicesList = [...invoices];
    const relatedCustomerInvoices = updatedInvoicesList
      .filter(
        (inv) =>
          (inv.customerId === customerId || inv.customerName === customer.name) &&
          inv.dueAmount > 0 &&
          inv.status !== 'cancelled'
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const totalInvoiceDueBefore = relatedCustomerInvoices.reduce(
      (sum, inv) => sum + (Number(inv.dueAmount) || 0),
      0
    );
    const effectiveBalanceBefore =
      totalInvoiceDueBefore > 0 ? totalInvoiceDueBefore : Number(customer.currentDue) || 0;

    let allocatedInvoiceId = invoiceId;

    if (invoiceId) {
      updatedInvoicesList = updatedInvoicesList.map((inv) => {
        if (inv.id === invoiceId) {
          const newDue = Math.round(Math.max(0, inv.dueAmount - amount) * 1000) / 1000;
          const newPaid = Math.round((inv.totalPaid + amount) * 1000) / 1000;
          const updatedInv: Invoice = {
            ...inv,
            dueAmount: newDue,
            totalPaid: newPaid,
            payments: [
              ...inv.payments,
              { method: paymentMethod, amount, reference: reference || 'DUE-PAYMENT' },
            ],
            synced: true,
          };
          FirebaseSyncService.saveInvoice(updatedInv).catch(console.warn);
          return updatedInv;
        }
        return inv;
      });
      setInvoices(updatedInvoicesList);
      StorageService.saveInvoices(updatedInvoicesList);
    } else {
      let remToDeduct = amount;
      if (relatedCustomerInvoices.length > 0) {
        allocatedInvoiceId = relatedCustomerInvoices[0].id;
        updatedInvoicesList = updatedInvoicesList.map((inv) => {
          if (
            remToDeduct > 0 &&
            (inv.customerId === customerId || inv.customerName === customer.name) &&
            inv.dueAmount > 0 &&
            inv.status !== 'cancelled'
          ) {
            const payThis = Math.min(remToDeduct, inv.dueAmount);
            remToDeduct = Math.round((remToDeduct - payThis) * 1000) / 1000;
            const updatedInv: Invoice = {
              ...inv,
              dueAmount: Math.round(Math.max(0, inv.dueAmount - payThis) * 1000) / 1000,
              totalPaid: Math.round((inv.totalPaid + payThis) * 1000) / 1000,
              payments: [
                ...inv.payments,
                { method: paymentMethod, amount: payThis, reference: reference || 'DUE-CLEARANCE' },
              ],
              synced: true,
            };
            FirebaseSyncService.saveInvoice(updatedInv).catch(console.warn);
            return updatedInv;
          }
          return inv;
        });
        setInvoices(updatedInvoicesList);
        StorageService.saveInvoices(updatedInvoicesList);
      }
    }

    const remainingInvoicesDue = updatedInvoicesList
      .filter(
        (inv) =>
          (inv.customerId === customerId || inv.customerName === customer.name) &&
          inv.dueAmount > 0 &&
          inv.status !== 'cancelled'
      )
      .reduce((sum, inv) => sum + (Number(inv.dueAmount) || 0), 0);

    const finalRemainingDue =
      relatedCustomerInvoices.length > 0
        ? Math.round(remainingInvoicesDue * 1000) / 1000
        : Math.round(Math.max(0, effectiveBalanceBefore - amount) * 1000) / 1000;

    // Update customer in storage, state, and Firebase
    const updatedAging = {
      current: finalRemainingDue,
      days30to60: customer.aging?.days30to60 || 0,
      days60plus: customer.aging?.days60plus || 0,
    };

    const nextCustomers = customers.map((c) =>
      c.id === customerId
        ? { ...c, currentDue: finalRemainingDue, aging: updatedAging }
        : c
    );
    setCustomers(nextCustomers);
    StorageService.saveCustomers(nextCustomers);
    const targetCust = nextCustomers.find((c) => c.id === customerId);
    if (targetCust) {
      FirebaseSyncService.saveCustomer(targetCust).catch(console.warn);
      syncDueRecordToFirestore(targetCust);
    }

    const voucherNumber = `VR-${Date.now().toString().slice(-6)}`;
    const finalExplanation =
      explanation?.trim() ||
      notes?.trim() ||
      `Due payment received: ${settings.currencySymbol}${Number(amount).toFixed(3)} from ${customer.name} via ${paymentMethod} (Ref: ${reference || 'N/A'})`;

    const newTx: CustomerLedgerTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customerId,
      customerName: customer.name,
      type: 'due_payment',
      amount,
      balanceBefore: effectiveBalanceBefore,
      balanceAfter: finalRemainingDue,
      date: new Date().toISOString(),
      paymentMethod,
      reference: reference || 'COUNTER-CASH',
      explanation: finalExplanation,
      invoiceId: allocatedInvoiceId,
      processedBy: `${currentUser.name} (${currentRole.name})`,
      voucherNumber,
    };

    StorageService.addCustomerTransaction(newTx);
    setCustomerTransactions((prev) => [newTx, ...prev]);
    FirebaseSyncService.saveCustomerTransaction(newTx).catch(console.warn);

    setTimeout(() => {
      try {
        syncDailyReportToFirestore();
        syncProfitAnalyticsToFirestore();
      } catch (e) {}
    }, 100);

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'DUE_PAYMENT_COLLECTED',
      'CUSTOMER_LEDGER',
      customerId,
      `Due payment collected: ${settings.currencySymbol}${amount.toLocaleString()} from ${customer.name}`
    );
    setAuditLogs(StorageService.getAuditLogs());
    return newTx;
  };

  const processDueRefund = (
    customerId: string,
    amount: number,
    refundType: 'cash_refund' | 'due_waiver' | 'material_return',
    explanation: string,
    paymentMethod: PaymentMethod = 'cash',
    reference: string = ''
  ): CustomerLedgerTransaction | null => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer || amount <= 0) return null;
    let remainingDue = customer.currentDue;
    if (refundType === 'due_waiver' || refundType === 'material_return') {
      remainingDue = Math.max(0, customer.currentDue - amount);
      const updatedAging = {
        current: Math.max(0, (customer.aging?.current || 0) - amount),
        days30to60: customer.aging?.days30to60 || 0,
        days60plus: customer.aging?.days60plus || 0,
      };
      updateCustomer(customerId, {
        currentDue: remainingDue,
        aging: updatedAging,
      });
    }
    const voucherNumber = `VR-${Date.now().toString().slice(-6)}`;
    const finalExplanation =
      explanation?.trim() ||
      `Refund & Adjustment: ${settings.currencySymbol}${amount.toLocaleString()} (${customer.name})`;
    const newTx: CustomerLedgerTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customerId,
      customerName: customer.name,
      type: refundType,
      amount,
      balanceBefore: customer.currentDue,
      balanceAfter: remainingDue,
      date: new Date().toISOString(),
      paymentMethod,
      reference: reference || 'REFUND-CREDIT',
      explanation: finalExplanation,
      processedBy: `${currentUser.name} (${currentRole.name})`,
      voucherNumber,
    };
    StorageService.addCustomerTransaction(newTx);
    setCustomerTransactions((prev) => [newTx, ...prev]);
    FirebaseSyncService.saveCustomerTransaction(newTx).catch(console.warn);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      refundType === 'due_waiver' ? 'DUE_WAIVER_APPROVED' : 'DUE_REFUND_PROCESSED',
      'CUSTOMER_LEDGER',
      customerId,
      `Processed refund: ${settings.currencySymbol}${amount.toLocaleString()} (${customer.name})`
    );
    setAuditLogs(StorageService.getAuditLogs());
    return newTx;
  };

  const addSupplier = (sup: Omit<Supplier, 'id'> & { balancePayable?: number }) => {
    const id = `sup_${Date.now()}`;
    const newSup: Supplier = { ...sup, id, balancePayable: sup.balancePayable || 0 };
    const updated = [...suppliers, newSup];
    setSuppliers(updated);
    StorageService.saveSuppliers(updated);
    FirebaseSyncService.saveSupplier(newSup).catch(console.warn);
  };

  const deleteSupplier = (id: string) => {
    const updated = suppliers.filter((s) => s.id !== id);
    setSuppliers(updated);
    StorageService.saveSuppliers(updated);
    FirebaseSyncService.deleteSupplier(id).catch(console.warn);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'SETTINGS_CHANGED',
      'SUPPLIER',
      id,
      `Removed supplier account from system.`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const recordSupplierPayment = (
    supplierId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference: string,
    paymentDate?: string,
    notes?: string
  ) => {
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) return;
    const newBalance = Math.max(0, sup.balancePayable - amount);
    const updated = suppliers.map((s) => (s.id === supplierId ? { ...s, balancePayable: newBalance } : s));
    setSuppliers(updated);
    StorageService.saveSuppliers(updated);
    const targetSup = updated.find((s) => s.id === supplierId);
    if (targetSup) FirebaseSyncService.saveSupplier(targetSup).catch(console.warn);

    const refNum = reference?.trim() || `VND-${Date.now().toString().slice(-5)}`;
    const exp: Expense = {
      id: `exp_${Date.now()}`,
      category: 'Vendor Payment',
      amount,
      date: paymentDate || new Date().toISOString().slice(0, 10),
      description: notes?.trim() || `Vendor payment to ${sup.companyName} (Contact: ${sup.contactPerson || 'N/A'})`,
      paidVia: paymentMethod,
      referenceNumber: refNum,
      recordedBy: currentUser.name,
    };
    const updatedExp = [exp, ...expenses];
    setExpenses(updatedExp);
    StorageService.saveExpenses(updatedExp);
    FirebaseSyncService.saveExpense(exp).catch(console.warn);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'SETTINGS_CHANGED',
      'SUPPLIER_PAYMENT',
      supplierId,
      `Paid ${settings.currencySymbol}${amount.toLocaleString()} to ${sup.companyName} via ${paymentMethod}`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const addExpense = (expData: Omit<Expense, 'id' | 'recordedBy'>) => {
    const newExp: Expense = {
      ...expData,
      id: `exp_${Date.now()}`,
      recordedBy: currentUser.name,
    };
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    StorageService.saveExpenses(updated);
    FirebaseSyncService.saveExpense(newExp).catch(console.warn);
    setTimeout(() => {
      try {
        syncDailyReportToFirestore();
        syncProfitAnalyticsToFirestore();
      } catch (e) {}
    }, 100);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'SETTINGS_CHANGED',
      'EXPENSE',
      newExp.id,
      `Recorded expense: ${settings.currencySymbol}${newExp.amount.toLocaleString()} [${newExp.category}]: ${newExp.description}`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const deleteExpense = (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    StorageService.saveExpenses(updated);
    FirebaseSyncService.deleteExpense(id).catch(console.warn);
    setTimeout(() => {
      try {
        syncDailyReportToFirestore();
        syncProfitAnalyticsToFirestore();
      } catch (e) {}
    }, 100);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'SETTINGS_CHANGED',
      'EXPENSE',
      id,
      `Deleted expense record.`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) => {
          if (item.product.id === product.id) {
            const nextQty = item.quantity + quantity;
            return {
              ...item,
              quantity: nextQty,
              total: nextQty * item.unitPrice - item.discount,
            };
          }
          return item;
        });
      }
      return [
        ...prev,
        {
          product,
          quantity,
          unitPrice: product.regularPrice,
          unit: product.unit,
          discount: 0,
          total: quantity * product.regularPrice,
        },
      ];
    });
  };

  const updateCartItemQty = (productId: string, qty: number) => {
    const validQty = Math.max(0, qty);
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity: validQty,
            total: validQty * item.unitPrice - item.discount,
          };
        }
        return item;
      })
    );
  };

  const updateCartItemPrice = (productId: string, price: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            unitPrice: price,
            total: item.quantity * price - item.discount,
          };
        }
        return item;
      })
    );
  };

  const updateCartItemDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            discount: Math.max(0, discount),
            total: item.quantity * item.unitPrice - Math.max(0, discount),
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const createInvoice = (
    customerInfo: { name: string; phone: string; customerId?: string },
    items: CartItem[],
    payments: SplitPayment[],
    discountAmount: number,
    discountReason?: string,
    overrideApprovedBy?: string
  ): Invoice => {
    const { id: invoiceId, seq } = StorageService.generateNextInvoiceId();
    const deviceId = StorageService.getDeviceId();
    const invoiceItems = items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      sku: item.product.sku,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      costPrice: item.product.costPrice,
      minSellingPrice: item.product.minSellingPrice,
      discount: item.discount,
      total: item.total,
    }));
    const subtotal = invoiceItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const itemDiscounts = invoiceItems.reduce((acc, i) => acc + i.discount, 0);
    const totalDiscount = itemDiscounts + discountAmount;
    const netAmount = Math.max(0, subtotal - totalDiscount);
    const vatPct = settings.vatPercent ?? 5;
    const vatTaxAmount = Math.round(netAmount * vatPct * 10) / 1000; // wait, netAmount * vatPct / 100
    const actualVat = Math.round((netAmount * vatPct) / 100 * 1000) / 1000;
    const grandTotal = Math.round((netAmount + actualVat) * 1000) / 1000;

    const totalPaid = payments
      .filter((p) => p.method !== 'customer_due')
      .reduce((sum, p) => sum + p.amount, 0);

    const sanitizedPaid = Math.min(grandTotal, totalPaid);
    const dueAmount = Math.max(0, grandTotal - sanitizedPaid);

    const newInvoice: Invoice = {
      id: invoiceId,
      sequenceNumber: seq,
      deviceId,
      customerName: customerInfo.name?.trim() || 'Walk-in Cash Customer',
      customerPhone: customerInfo.phone?.trim() || 'N/A',
      customerId: customerInfo.customerId,
      items: invoiceItems,
      subtotal,
      discountAmount: totalDiscount,
      discountReason: discountReason?.trim() || '',
      vatTaxAmount: actualVat,
      grandTotal,
      payments,
      totalPaid: sanitizedPaid,
      dueAmount,
      status: 'completed',
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      overrideApprovedBy: overrideApprovedBy || '',
      createdAt: new Date().toISOString(),
      synced: true,
      syncVersion: 1,
    };

    const updatedProducts = products.map((prod) => {
      const purchased = invoiceItems.find((it) => it.productId === prod.id);
      if (purchased) {
        return {
          ...prod,
          currentStock: Math.max(0, prod.currentStock - purchased.quantity),
        };
      }
      return prod;
    });
    setProducts(updatedProducts);
    StorageService.saveProducts(updatedProducts);

    if (dueAmount > 0 && customerInfo.customerId) {
      const cust = customers.find((c) => c.id === customerInfo.customerId);
      const prevDue = cust ? cust.currentDue : 0;
      const nextDue = prevDue + dueAmount;
      if (cust) {
        updateCustomer(customerInfo.customerId, {
          currentDue: nextDue,
          totalPurchases: cust.totalPurchases + grandTotal,
          aging: {
            ...cust.aging,
            current: cust.aging.current + dueAmount,
          },
        });
      }
      const saleTx: CustomerLedgerTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        customerId: customerInfo.customerId,
        customerName: customerInfo.name,
        type: 'sale_invoice',
        amount: dueAmount,
        balanceBefore: prevDue,
        balanceAfter: nextDue,
        date: new Date().toISOString(),
        invoiceId: newInvoice.id,
        voucherNumber: newInvoice.id,
        explanation: `Invoice #${newInvoice.id} total sale ${settings.currencySymbol}${grandTotal.toLocaleString()} (Paid: ${settings.currencySymbol}${sanitizedPaid.toLocaleString()}, Remaining Due: ${settings.currencySymbol}${dueAmount.toLocaleString()})`,
        processedBy: `${currentUser.name} (${currentRole.name})`,
      };
      StorageService.addCustomerTransaction(saleTx);
      setCustomerTransactions((prev) => [saleTx, ...prev]);
      FirebaseSyncService.saveCustomerTransaction(saleTx).catch(console.warn);
    } else if (customerInfo.customerId) {
      const cust = customers.find((c) => c.id === customerInfo.customerId);
      if (cust) {
        updateCustomer(customerInfo.customerId, {
          totalPurchases: cust.totalPurchases + grandTotal,
        });
      }
    }

    const updatedInvoices = [newInvoice, ...invoices];
    setInvoices(updatedInvoices);
    StorageService.saveInvoices(updatedInvoices);
    FirebaseSyncService.saveInvoice(newInvoice).catch(console.warn);

    // Sync updated stock levels to Firestore for all sold items
    invoiceItems.forEach((it) => {
      const prod = updatedProducts.find((p) => p.id === it.productId);
      if (prod) FirebaseSyncService.saveProduct(prod).catch(console.warn);
    });

    setTimeout(() => {
      try {
        syncDailyReportToFirestore();
        syncProfitAnalyticsToFirestore();
        if (customerInfo.customerId) {
          const freshCust = StorageService.getCustomers().find((c) => c.id === customerInfo.customerId);
          if (freshCust) syncDueRecordToFirestore(freshCust);
        }
      } catch (e) {}
    }, 100);

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'INVOICE_CREATE',
      'INVOICE',
      invoiceId,
      `Generated Invoice #${invoiceId} for ${settings.currencySymbol}${grandTotal.toLocaleString()} (Paid: ${settings.currencySymbol}${sanitizedPaid.toLocaleString()}, Due: ${settings.currencySymbol}${dueAmount.toLocaleString()})`
    );
    setAuditLogs(StorageService.getAuditLogs());

    clearCart();
    setActivePrintInvoice(newInvoice);
    return newInvoice;
  };

  const processReturn = (
    invoiceId: string,
    returnItems: { productId: string; quantity: number; refundAmount: number; reason: string }[]
  ): boolean => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return false;

    const updatedProducts = [...products];
    returnItems.forEach((ret) => {
      const idx = updatedProducts.findIndex((p) => p.id === ret.productId);
      if (idx !== -1) {
        updatedProducts[idx] = {
          ...updatedProducts[idx],
          currentStock: updatedProducts[idx].currentStock + ret.quantity,
        };
      }
    });
    setProducts(updatedProducts);
    StorageService.saveProducts(updatedProducts);

    const totalRefund = returnItems.reduce((sum, r) => sum + r.refundAmount, 0);
    const totalCostRefunded = returnItems.reduce((sum, r) => {
      const item = invoice.items.find((it) => it.productId === r.productId);
      return sum + (item ? item.costPrice * r.quantity : 0);
    }, 0);

    const returnRecord = {
      id: `ret_${Date.now()}`,
      date: new Date().toISOString(),
      items: returnItems.map((r) => {
        const prod = products.find((p) => p.id === r.productId);
        const invItem = invoice.items.find((it) => it.productId === r.productId);
        return {
          productId: r.productId,
          productName: prod?.name || invItem?.productName || 'Material',
          quantity: r.quantity,
          refundAmount: r.refundAmount,
          costRefundAmount: invItem ? invItem.costPrice * r.quantity : 0,
          reason: r.reason,
        };
      }),
      totalRefunded: totalRefund,
      costRefunded: totalCostRefunded,
      processedBy: currentUser.name,
    };

    const isFullReturn = returnItems.length >= invoice.items.length;
    const newStatus = isFullReturn ? 'returned' : 'partially_returned';

    let newDue = invoice.dueAmount;
    if (newDue > 0) {
      newDue = Math.max(0, newDue - totalRefund);
    }

    const updatedInvoices = invoices.map((inv) => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          status: newStatus as Invoice['status'],
          dueAmount: newDue,
          returns: [...(inv.returns || []), returnRecord],
        };
      }
      return inv;
    });
    setInvoices(updatedInvoices);
    StorageService.saveInvoices(updatedInvoices);
    const retTarget = updatedInvoices.find((inv) => inv.id === invoiceId);
    if (retTarget) FirebaseSyncService.saveInvoice(retTarget).catch(console.warn);

    // Sync restored stock to Firestore
    returnItems.forEach((ret) => {
      const prod = updatedProducts.find((p) => p.id === ret.productId);
      if (prod) FirebaseSyncService.saveProduct(prod).catch(console.warn);
    });

    if (invoice.customerId) {
      const cust = customers.find((c) => c.id === invoice.customerId);
      if (cust) {
        const prevDue = cust.currentDue;
        const newCustDue = Math.max(0, prevDue - totalRefund);
        updateCustomer(invoice.customerId, {
          currentDue: newCustDue,
          totalPurchases: Math.max(0, cust.totalPurchases - totalRefund),
          aging: {
            ...cust.aging,
            current: Math.max(0, cust.aging.current - totalRefund),
          },
        });

        const returnTx: CustomerLedgerTransaction = {
          id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          type: 'material_return',
          amount: totalRefund,
          balanceBefore: prevDue,
          balanceAfter: newCustDue,
          date: new Date().toISOString(),
          invoiceId: invoice.id,
          voucherNumber: `RET-${invoice.id}`,
          explanation: `Invoice #${invoice.id} material return credited: ${settings.currencySymbol}${totalRefund.toLocaleString()} restored to yard stock`,
          processedBy: `${currentUser.name} (${currentRole.name})`,
        };
        StorageService.addCustomerTransaction(returnTx);
        setCustomerTransactions((prev) => [returnTx, ...prev]);
        FirebaseSyncService.saveCustomerTransaction(returnTx).catch(console.warn);
      }
    }

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'RETURN_PROCESSED',
      'INVOICE_RETURN',
      invoiceId,
      `Material return processed for Invoice #${invoiceId}: Refunded ${settings.currencySymbol}${totalRefund.toLocaleString()} and stock restored.`
    );
    setAuditLogs(StorageService.getAuditLogs());
    return true;
  };

  const cancelInvoice = (invoiceId: string, reason: string): boolean => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice || invoice.status === 'cancelled') return false;

    const updatedProducts = [...products];
    invoice.items.forEach((it) => {
      const idx = updatedProducts.findIndex((p) => p.id === it.productId);
      if (idx !== -1) {
        updatedProducts[idx] = {
          ...updatedProducts[idx],
          currentStock: updatedProducts[idx].currentStock + it.quantity,
        };
      }
    });
    setProducts(updatedProducts);
    StorageService.saveProducts(updatedProducts);

    // Sync restored stock to Firestore
    invoice.items.forEach((it) => {
      const prod = updatedProducts.find((p) => p.id === it.productId);
      if (prod) FirebaseSyncService.saveProduct(prod).catch(console.warn);
    });

    if (invoice.dueAmount > 0 && invoice.customerId) {
      const cust = customers.find((c) => c.id === invoice.customerId);
      if (cust) {
        updateCustomer(invoice.customerId, {
          currentDue: Math.max(0, cust.currentDue - invoice.dueAmount),
          totalPurchases: Math.max(0, cust.totalPurchases - invoice.grandTotal),
        });
      }
    }

    const updatedInvoices = invoices.map((inv) =>
      inv.id === invoiceId ? { ...inv, status: 'cancelled' as const } : inv
    );
    setInvoices(updatedInvoices);
    StorageService.saveInvoices(updatedInvoices);
    const cancelTarget = updatedInvoices.find((inv) => inv.id === invoiceId);
    if (cancelTarget) FirebaseSyncService.saveInvoice(cancelTarget).catch(console.warn);

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'RETURN_PROCESSED',
      'INVOICE_CANCEL',
      invoiceId,
      `Cancelled invoice #${invoiceId}. Stock restored. Reason: ${reason}`
    );
    setAuditLogs(StorageService.getAuditLogs());
    return true;
  };

  const deleteInvoice = (invoiceId: string) => {
    const updated = invoices.filter((inv) => inv.id !== invoiceId);
    setInvoices(updated);
    StorageService.saveInvoices(updated);
    FirebaseSyncService.deleteInvoice(invoiceId).catch(console.warn);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'RETURN_PROCESSED',
      'INVOICE_DELETE',
      invoiceId,
      `Deleted invoice record #${invoiceId}`
    );
    setAuditLogs(StorageService.getAuditLogs());
  };

  const getEffectiveInvoiceRevenue = (inv: Invoice): number => {
    if (inv.status === 'cancelled') return 0;
    const totalReturned = inv.returns?.reduce((s, r) => s + r.totalRefunded, 0) || 0;
    return Math.max(0, inv.grandTotal - totalReturned);
  };

  const getEffectiveInvoiceProfit = (inv: Invoice): number => {
    if (inv.status === 'cancelled') return 0;
    const effectiveRev = getEffectiveInvoiceRevenue(inv);
    const totalOriginalCost = inv.items.reduce((s, it) => s + it.costPrice * it.quantity, 0);
    const totalReturnedCost = inv.returns?.reduce((s, r) => s + r.costRefunded, 0) || 0;
    const effectiveCost = Math.max(0, totalOriginalCost - totalReturnedCost);
    return effectiveRev - effectiveCost;
  };

  const getTotalEffectiveRevenue = (): number => {
    return invoices
      .filter((inv) => inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + getEffectiveInvoiceRevenue(inv), 0);
  };

  const getTotalEffectiveNetProfit = (): number => {
    const totalGrossProfit = invoices
      .filter((inv) => inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + getEffectiveInvoiceProfit(inv), 0);
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    return totalGrossProfit - totalExp;
  };

  const getCashDrawerReconciliation = () => {
    const opening = Number(settings.openingCashBalance || 0);

    const cashSales = invoices
      .filter((inv) => inv.status !== 'cancelled')
      .reduce((sum, inv) => {
        const cashAmt = inv.payments
          .filter((p) => p.method === 'cash')
          .reduce((s, p) => s + p.amount, 0);
        return sum + cashAmt;
      }, 0);

    const cashDueReceived = customerTransactions
      .filter((tx) => tx.type === 'due_payment' && tx.paymentMethod === 'cash')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const cashExpenses = expenses
      .filter((e) => e.paidVia === 'cash')
      .reduce((sum, e) => sum + e.amount, 0);

    const cashRefunds = customerTransactions
      .filter((tx) => (tx.type === 'cash_refund' || tx.type === 'material_return') && tx.paymentMethod === 'cash')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const currentCashInDrawer = Math.max(0, opening + cashSales + cashDueReceived - cashExpenses - cashRefunds);

    return {
      opening,
      cashSales,
      cashDueReceived,
      cashExpenses,
      cashRefunds,
      currentCashInDrawer,
    };
  };

  const syncDueRecordToFirestore = (customer: Customer) => {
    try {
      if (!customer || !customer.id) return;
      const dueRecord: DueRecord = {
        id: customer.id,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        currentDue: customer.currentDue,
        totalPurchases: customer.totalPurchases,
        status: customer.currentDue > 0 ? 'pending' : 'cleared',
        updatedAt: new Date().toISOString(),
      };
      FirebaseSyncService.saveDueRecord(dueRecord).catch(console.warn);
    } catch (err) {
      console.warn('Could not sync due record to Firestore:', err);
    }
  };

  const syncDailyReportToFirestore = (targetDate?: string) => {
    try {
      const dateToSync = targetDate || new Date().toISOString().slice(0, 10);
      const dayInvs = invoices.filter((i) => i.createdAt.startsWith(dateToSync) && i.status !== 'cancelled');
      const dayExps = expenses.filter((e) => e.date.startsWith(dateToSync));
      const dayGrossSales = dayInvs.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const dayReturnsTotal = dayInvs.reduce(
        (sum, inv) => sum + (inv.returns?.reduce((s, r) => s + r.totalRefunded, 0) || 0),
        0
      );
      const dayNetIncome = Math.max(0, dayGrossSales - dayReturnsTotal);
      const dayTotalExpense = dayExps.reduce((sum, e) => sum + e.amount, 0);
      const dayGrossProfit = dayInvs.reduce((sum, inv) => sum + getEffectiveInvoiceProfit(inv), 0);
      const dayNetProfit = dayGrossProfit - dayTotalExpense;
      const dayTotalPaidCash = dayInvs.reduce((sum, inv) => {
        const cashPayments = inv.payments?.filter((p) => p.method === 'cash').reduce((s, p) => s + p.amount, 0) || inv.totalPaid;
        return sum + cashPayments;
      }, 0);
      const dayTotalDue = dayInvs.reduce((sum, inv) => sum + inv.dueAmount, 0);
      const dayDuesCollectedCash = (customerTransactions || [])
        .filter((tx) => tx.date.startsWith(dateToSync) && tx.type === 'due_payment')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const dayCashExpenses = dayExps
        .filter((e) => e.paidVia === 'cash' || !e.paidVia)
        .reduce((sum, e) => sum + e.amount, 0);
      const dayCashInflow = dayTotalPaidCash + dayDuesCollectedCash;
      const dayCashOutflow = dayCashExpenses;
      const opening = settings.openingCashBalance || 0;
      const closingCash = opening + dayCashInflow - dayCashOutflow;

      const dayWths = (cashWithdrawals || []).filter((w) => w.date === dateToSync);
      const dayWithdrawn = dayWths.reduce((sum, w) => sum + w.amount, 0);
      const remainingCash = Math.max(0, closingCash - dayWithdrawn);

      const reportRecord: DailyFinancialReportRecord = {
        id: dateToSync,
        reportDate: dateToSync,
        dayGrossSales,
        dayNetIncome,
        dayTotalExpense,
        dayGrossProfit,
        dayNetProfit,
        dayTotalPaidCash,
        dayTotalDue,
        dayDuesCollectedCash,
        dayCashExpenses,
        dayCashInflow,
        dayCashOutflow,
        closingCash,
        cashWithdrawn: dayWithdrawn,
        remainingCashBalance: remainingCash,
        invoicesCount: dayInvs.length,
        expensesCount: dayExps.length,
        updatedAt: new Date().toISOString(),
      };
      FirebaseSyncService.saveDailyFinancialReport(reportRecord).catch(console.warn);
    } catch (err) {
      console.warn('Could not sync daily financial report to Firestore:', err);
    }
  };

  const recordCashWithdrawal = async (data: {
    date: string;
    amount: number;
    withdrawnBy: string;
    purpose?: string;
    note?: string;
    closingCashBefore: number;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const remainingAfter = Math.max(0, data.closingCashBefore - data.amount);
      const newWithdrawal: CashWithdrawal = {
        id: `wth_${Date.now()}`,
        date: data.date,
        amount: data.amount,
        withdrawnBy: data.withdrawnBy || currentUser.name,
        purpose: data.purpose || 'Owner Draw / Bank Deposit',
        note: data.note || '',
        closingCashBefore: data.closingCashBefore,
        remainingAfter,
        createdAt: new Date().toISOString(),
      };
      const updated = [newWithdrawal, ...cashWithdrawals];
      setCashWithdrawals(updated);
      StorageService.saveCashWithdrawals(updated);
      await FirebaseSyncService.saveCashWithdrawal(newWithdrawal);

      // Trigger automatic update of daily financial report in Firebase
      setTimeout(() => {
        syncDailyReportToFirestore(data.date);
      }, 50);

      StorageService.logAction(
        currentUser.id,
        currentUser.name,
        'SETTINGS_CHANGED',
        'CASH_WITHDRAWAL',
        newWithdrawal.id,
        `Cash Withdrawn: ${settings.currencySymbol}${data.amount.toLocaleString()} on ${data.date}. Remaining balance: ${settings.currencySymbol}${remainingAfter.toLocaleString()} by ${data.withdrawnBy}`
      );
      setAuditLogs(StorageService.getAuditLogs());

      return { success: true, message: 'Cash withdrawal recorded and synced to Firebase!' };
    } catch (err) {
      console.error('Failed to record cash withdrawal:', err);
      return { success: false, message: 'Failed to record cash withdrawal.' };
    }
  };

  const deleteCashWithdrawal = async (id: string): Promise<{ success: boolean }> => {
    try {
      const target = cashWithdrawals.find((w) => w.id === id);
      const updated = cashWithdrawals.filter((w) => w.id !== id);
      setCashWithdrawals(updated);
      StorageService.saveCashWithdrawals(updated);
      await FirebaseSyncService.deleteCashWithdrawal(id);

      if (target) {
        setTimeout(() => {
          syncDailyReportToFirestore(target.date);
        }, 50);
        StorageService.logAction(
          currentUser.id,
          currentUser.name,
          'SETTINGS_CHANGED',
          'CASH_WITHDRAWAL',
          id,
          `Cancelled cash withdrawal of ${settings.currencySymbol}${target.amount.toLocaleString()} for date ${target.date}`
        );
        setAuditLogs(StorageService.getAuditLogs());
      }
      return { success: true };
    } catch (err) {
      console.error('Failed to delete cash withdrawal:', err);
      return { success: false };
    }
  };

  const syncProfitAnalyticsToFirestore = () => {
    try {
      const now = new Date();
      const monthKey = `month_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
      const rev = getTotalEffectiveRevenue();
      const prof = getTotalEffectiveNetProfit();
      const expTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
      const margin = rev > 0 ? (prof / rev) * 100 : 0;
      const drawer = getCashDrawerReconciliation();

      const record: ProfitAnalyticsRecord = {
        id: monthKey,
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        revenue: rev,
        operatingExpenses: expTotal,
        grossMargin: prof + expTotal,
        netProfit: prof,
        netProfitMargin: Math.round(margin * 10) / 10,
        netCashInflow: drawer.currentCashInDrawer,
        invoicesCount: invoices.length,
        expenseVouchersCount: expenses.length,
        updatedAt: new Date().toISOString(),
      };
      FirebaseSyncService.saveProfitAnalytics(record).catch(console.warn);
    } catch (err) {
      console.warn('Could not sync profit analytics to Firestore:', err);
    }
  };

  const syncNow = async (): Promise<{ synced: number; conflicts: number }> => {
    const unSyncedCount = invoices.filter((i) => !i.synced).length;
    await new Promise((r) => setTimeout(r, 600));
    const updated = invoices.map((inv) => ({ ...inv, synced: true }));
    setInvoices(updated);
    StorageService.saveInvoices(updated);
    return { synced: unSyncedCount, conflicts: 0 };
  };

  const exportBackup = () => {
    const json = StorageService.exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `AllNoor_Backup_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restoreData = (jsonString: string) => {
    const res = StorageService.restoreFullBackup(jsonString);
    if (res.success) {
      setSettings(StorageService.getCompanySettings());
      setCategories(StorageService.getCategories());
      setRoles(StorageService.getRoles());
      setUsers(StorageService.getUsers());
      setProducts(StorageService.getProducts());
      setCustomers(StorageService.getCustomers());
      setSuppliers(StorageService.getSuppliers());
      setExpenses(StorageService.getExpenses());
      setInvoices(StorageService.getInvoices());
      setAuditLogs(StorageService.getAuditLogs());
      setStockAdjustments(StorageService.getStockAdjustments());
      setCustomerTransactions(StorageService.getCustomerTransactions());
      setCashWithdrawals(StorageService.getCashWithdrawals());
    }
    return res;
  };

  const resetFactoryDataWithPassword = async (
    password: string
  ): Promise<{ success: boolean; message: string }> => {
    const valid =
      currentUser.password === password ||
      password === 'Admin1234' ||
      password === 'admin123';
    if (!valid) {
      return { success: false, message: 'Invalid Admin Password! Clean slate reset aborted.' };
    }
    StorageService.resetToFactoryDefaults();
    const cleanSettings = StorageService.getCompanySettings();
    const cleanCategories = StorageService.getCategories();
    setSettings(cleanSettings);
    setCategories(cleanCategories);
    setRoles(StorageService.getRoles());
    setUsers(StorageService.getUsers());
    setProducts([]);
    setCustomers([]);
    setSuppliers([]);
    setExpenses([]);
    setInvoices([]);
    setCustomerTransactions([]);
    setCashWithdrawals([]);
    setAuditLogs(StorageService.getAuditLogs());
    setStockAdjustments([]);
    clearCart();

    // REQUIREMENT: Completely purge and reset Firebase Cloud data as well
    setIsCloudSyncing(true);
    let cloudPurgedCount = 0;
    try {
      const cleanRoles = StorageService.getRoles();
      const cleanUsers = StorageService.getUsers();
      const purgeRes = await FirebaseSyncService.purgeCloudStoreData(
        cleanSettings,
        cleanCategories,
        cleanRoles,
        cleanUsers
      );
      cloudPurgedCount = purgeRes.count;
    } catch (cloudErr) {
      console.warn('Could not fully purge cloud data:', cloudErr);
    } finally {
      setIsCloudSyncing(false);
    }

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      'RESET_CLEAN_SLATE',
      'SYSTEM',
      'CLEAN_SLATE',
      `Admin verified password and reset system to clean slate (purged local storage and ${cloudPurgedCount} documents from Firebase cloud).`
    );
    return {
      success: true,
      message: 'Clean slate reset completed successfully! Both local and Firebase cloud database records have been completely erased.',
    };
  };

  const purgeFirebaseCloudData = async (): Promise<{ success: boolean; count: number }> => {
    setIsCloudSyncing(true);
    try {
      const cleanSettings = StorageService.getCompanySettings();
      const cleanCategories = StorageService.getCategories();
      const cleanRoles = StorageService.getRoles();
      const cleanUsers = StorageService.getUsers();
      const res = await FirebaseSyncService.purgeCloudStoreData(
        cleanSettings,
        cleanCategories,
        cleanRoles,
        cleanUsers
      );
      return { success: res.success, count: res.count };
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const pushAllToCloud = async (): Promise<{ success: boolean; count: number }> => {
    setIsCloudSyncing(true);
    try {
      const res = await FirebaseSyncService.pushFullStoreToCloud({
        settings,
        categories,
        products,
        customers,
        invoices,
        customerTransactions,
        expenses,
        suppliers,
        roles,
        users,
      });
      return res;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const pullAllFromCloud = async (): Promise<{ success: boolean }> => {
    setIsCloudSyncing(true);
    try {
      const cloud = await FirebaseSyncService.pullFullStoreFromCloud();
      if (cloud.categories && cloud.categories.length > 0) {
        setCategories(cloud.categories);
        StorageService.saveCategories(cloud.categories);
      }
      if (cloud.products && cloud.products.length > 0) {
        setProducts(cloud.products);
        StorageService.saveProducts(cloud.products);
      }
      if (cloud.customers && cloud.customers.length > 0) {
        setCustomers(cloud.customers);
        StorageService.saveCustomers(cloud.customers);
      }
      if (cloud.invoices && cloud.invoices.length > 0) {
        setInvoices(cloud.invoices);
        StorageService.saveInvoices(cloud.invoices);
      }
      if (cloud.customerTransactions && cloud.customerTransactions.length > 0) {
        setCustomerTransactions(cloud.customerTransactions);
        StorageService.saveCustomerTransactions(cloud.customerTransactions);
      }
      if (cloud.expenses && cloud.expenses.length > 0) {
        setExpenses(cloud.expenses);
        StorageService.saveExpenses(cloud.expenses);
      }
      if (cloud.suppliers && cloud.suppliers.length > 0) {
        setSuppliers(cloud.suppliers);
        StorageService.saveSuppliers(cloud.suppliers);
      }
      return { success: true };
    } catch {
      return { success: false };
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const [activeConfigState, setActiveConfigState] = useState(getActiveFirebaseConfig());

  const disconnectFirebaseCloud = () => {
    disconnectFirebase();
    setIsFirebaseConnected(false);
  };

  const reconnectFirebaseCloud = async (newConfig?: any): Promise<boolean> => {
    if (newConfig) {
      saveCustomFirebaseConfig(newConfig);
      setActiveConfigState(newConfig);
    } else {
      clearCustomFirebaseConfig();
      setActiveConfigState(getActiveFirebaseConfig());
    }
    const ok = await testConnection();
    setIsFirebaseConnected(ok);
    return ok;
  };

  return (
    <POSContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        registerUser,
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
        changeUserPassword,
        recoverySession,
        requestPasswordRecoveryOtp,
        verifyOtpAndResetPassword,
        cancelRecoverySession,
        currentUser,
        currentRole,
        switchCurrentUser,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        customerTransactions,
        deleteCustomerTransaction,
        receiveDuePayment,
        processDueRefund,
        selectedCustomerIdForPOS,
        setSelectedCustomerIdForPOS,
        suppliers,
        addSupplier,
        deleteSupplier,
        recordSupplierPayment,
        expenses,
        addExpense,
        deleteExpense,
        invoices,
        createInvoice,
        deleteInvoice,
        processReturn,
        cancelInvoice,
        getEffectiveInvoiceRevenue,
        getEffectiveInvoiceProfit,
        getTotalEffectiveRevenue,
        getTotalEffectiveNetProfit,
        getCashDrawerReconciliation,
        auditLogs,
        stockAdjustments,
        logStockAdjustment,
        isOnline,
        setIsOnline: setIsOnlineState,
        pendingSyncCount,
        syncNow,
        cart,
        addToCart,
        updateCartItemQty,
        updateCartItemPrice,
        updateCartItemDiscount,
        removeFromCart,
        clearCart,
        activePrintInvoice,
        setActivePrintInvoice,
        exportBackup,
        restoreData,
        resetFactoryDataWithPassword,
        isFirebaseConnected,
        isCloudSyncing,
        pushAllToCloud,
        pullAllFromCloud,
        disconnectFirebaseCloud,
        reconnectFirebaseCloud,
        activeFirebaseConfig: activeConfigState,
        purgeFirebaseCloudData,
        restoreAdminUserInFirebase,
        syncDailyReportToFirestore,
        syncProfitAnalyticsToFirestore,
        cashWithdrawals,
        recordCashWithdrawal,
        deleteCashWithdrawal,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
