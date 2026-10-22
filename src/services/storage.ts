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
  StockAdjustment,
  CustomerLedgerTransaction,
  Category,
} from '../types';
import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_EXPENSES,
  INITIAL_AUDIT_LOGS,
  INITIAL_INVOICES,
  INITIAL_CUSTOMER_TRANSACTIONS,
} from '../data/initialData';

const KEYS = {
  SETTINGS: 'allnoor_settings_v3',
  ROLES: 'allnoor_roles_v3',
  USERS: 'allnoor_users_v3',
  CATEGORIES: 'allnoor_categories_v3',
  CURRENT_USER_ID: 'allnoor_current_user_v3',
  PRODUCTS: 'allnoor_products_v3',
  CUSTOMERS: 'allnoor_customers_v3',
  SUPPLIERS: 'allnoor_suppliers_v3',
  EXPENSES: 'allnoor_expenses_v3',
  INVOICES: 'allnoor_invoices_v3',
  AUDIT_LOGS: 'allnoor_audit_logs_v3',
  STOCK_ADJUSTMENTS: 'allnoor_stock_adjustments_v3',
  CUSTOMER_TRANSACTIONS: 'allnoor_customer_tx_v3',
  DEVICE_ID: 'allnoor_device_id_v3',
  INVOICE_SEQ: 'allnoor_invoice_seq_v3',
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) return fallback;
    return JSON.parse(val) as T;
  } catch (err) {
    console.error(`Error loading key ${key}:`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error storing key ${key}:`, err);
  }
}

export const StorageService = {
  getDeviceId(): string {
    let id = localStorage.getItem(KEYS.DEVICE_ID);
    if (!id) {
      id = 'POS-01';
      localStorage.setItem(KEYS.DEVICE_ID, id);
    }
    return id;
  },
  setDeviceId(id: string): void {
    localStorage.setItem(KEYS.DEVICE_ID, id);
  },

  getCompanySettings(): CompanySettings {
    const settings = safeGet<CompanySettings>(KEYS.SETTINGS, INITIAL_COMPANY_SETTINGS);
    const deviceId = this.getDeviceId();
    return {
      ...INITIAL_COMPANY_SETTINGS,
      ...settings,
      footerTerms: settings.footerTerms?.trim() ? settings.footerTerms : INITIAL_COMPANY_SETTINGS.footerTerms,
      deviceId,
    };
  },
  saveCompanySettings(settings: CompanySettings): void {
    safeSet(KEYS.SETTINGS, settings);
  },

  getCategories(): Category[] {
    return safeGet<Category[]>(KEYS.CATEGORIES, INITIAL_CATEGORIES);
  },
  saveCategories(categories: Category[]): void {
    safeSet(KEYS.CATEGORIES, categories);
  },

  getRoles(): DynamicRole[] {
    return safeGet<DynamicRole[]>(KEYS.ROLES, INITIAL_ROLES);
  },
  saveRoles(roles: DynamicRole[]): void {
    safeSet(KEYS.ROLES, roles);
  },

  getUsers(): User[] {
    const users = safeGet<User[]>(KEYS.USERS, INITIAL_USERS);
    if (!users || users.length === 0) {
      return INITIAL_USERS;
    }
    return users.map((u) => ({
      ...u,
      password: u.password || 'Admin1234',
      pinCode: u.pinCode || '1234',
    }));
  },
  saveUsers(users: User[]): void {
    safeSet(KEYS.USERS, users);
  },

  getCurrentUserId(): string {
    const stored = localStorage.getItem(KEYS.CURRENT_USER_ID);
    const users = this.getUsers();
    if (stored && users.some((u) => u.id === stored)) {
      return stored;
    }
    return users[0]?.id || INITIAL_USERS[0].id;
  },
  setCurrentUserId(id: string): void {
    localStorage.setItem(KEYS.CURRENT_USER_ID, id);
  },

  getProducts(): Product[] {
    return safeGet<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },
  saveProducts(products: Product[]): void {
    safeSet(KEYS.PRODUCTS, products);
  },

  getCustomers(): Customer[] {
    return safeGet<Customer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  },
  saveCustomers(customers: Customer[]): void {
    safeSet(KEYS.CUSTOMERS, customers);
  },

  getSuppliers(): Supplier[] {
    return safeGet<Supplier[]>(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  },
  saveSuppliers(suppliers: Supplier[]): void {
    safeSet(KEYS.SUPPLIERS, suppliers);
  },

  getExpenses(): Expense[] {
    return safeGet<Expense[]>(KEYS.EXPENSES, INITIAL_EXPENSES);
  },
  saveExpenses(expenses: Expense[]): void {
    safeSet(KEYS.EXPENSES, expenses);
  },

  getInvoices(): Invoice[] {
    return safeGet<Invoice[]>(KEYS.INVOICES, INITIAL_INVOICES);
  },
  saveInvoices(invoices: Invoice[]): void {
    safeSet(KEYS.INVOICES, invoices);
  },

  getAuditLogs(): AuditLog[] {
    return safeGet<AuditLog[]>(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },
  saveAuditLogs(logs: AuditLog[]): void {
    safeSet(KEYS.AUDIT_LOGS, logs);
  },

  logAction(
    userId: string,
    userName: string,
    action: AuditLog['action'],
    entityType: string,
    entityId: string,
    details: string,
    status: AuditLog['status'] = 'SUCCESS'
  ): AuditLog {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      entityType,
      entityId,
      details,
      ipAddress: '127.0.0.1 (Local)',
      deviceId: this.getDeviceId(),
      status,
    };
    const updated = [newLog, ...logs].slice(0, 500);
    this.saveAuditLogs(updated);
    return newLog;
  },

  getStockAdjustments(): StockAdjustment[] {
    return safeGet<StockAdjustment[]>(KEYS.STOCK_ADJUSTMENTS, []);
  },
  saveStockAdjustments(adjs: StockAdjustment[]): void {
    safeSet(KEYS.STOCK_ADJUSTMENTS, adjs);
  },

  getCustomerTransactions(): CustomerLedgerTransaction[] {
    return safeGet<CustomerLedgerTransaction[]>(KEYS.CUSTOMER_TRANSACTIONS, INITIAL_CUSTOMER_TRANSACTIONS);
  },
  saveCustomerTransactions(txs: CustomerLedgerTransaction[]): void {
    safeSet(KEYS.CUSTOMER_TRANSACTIONS, txs);
  },
  addCustomerTransaction(tx: CustomerLedgerTransaction): void {
    const existing = this.getCustomerTransactions();
    const updated = [tx, ...existing];
    this.saveCustomerTransactions(updated);
  },

  // Ensure every Invoice ID is strictly unique and at most 10 characters (e.g. INV-100001)
  generateNextInvoiceId(): { id: string; seq: number } {
    const existingInvoices = this.getInvoices();
    let highestSeq = 100000;
    for (const inv of existingInvoices) {
      const match = inv.id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > highestSeq) {
          highestSeq = num;
        }
      }
    }
    const storedSeq = parseInt(localStorage.getItem(KEYS.INVOICE_SEQ) || '0', 10);
    let nextSeq = Math.max(highestSeq, storedSeq) + 1;
    let candidateId = `INV-${String(nextSeq).padStart(6, '0')}`;

    while (existingInvoices.some((inv) => inv.id === candidateId)) {
      nextSeq += 1;
      candidateId = `INV-${String(nextSeq).padStart(6, '0')}`;
    }

    localStorage.setItem(KEYS.INVOICE_SEQ, nextSeq.toString());
    return { id: candidateId, seq: nextSeq };
  },

  exportFullBackup(): string {
    const snapshot = {
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      system: 'Smart Building Materials POS & ERP',
      data: {
        settings: this.getCompanySettings(),
        categories: this.getCategories(),
        roles: this.getRoles(),
        users: this.getUsers(),
        products: this.getProducts(),
        customers: this.getCustomers(),
        suppliers: this.getSuppliers(),
        expenses: this.getExpenses(),
        invoices: this.getInvoices(),
        auditLogs: this.getAuditLogs(),
        stockAdjustments: this.getStockAdjustments(),
        customerTransactions: this.getCustomerTransactions(),
      },
    };
    return JSON.stringify(snapshot, null, 2);
  },

  restoreFullBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) {
        return { success: false, message: 'Invalid backup file format: missing data signature.' };
      }
      const { data } = parsed;
      if (data.settings) safeSet(KEYS.SETTINGS, data.settings);
      if (data.categories) safeSet(KEYS.CATEGORIES, data.categories);
      if (data.roles) safeSet(KEYS.ROLES, data.roles);
      if (data.users) safeSet(KEYS.USERS, data.users);
      if (data.products) safeSet(KEYS.PRODUCTS, data.products);
      if (data.customers) safeSet(KEYS.CUSTOMERS, data.customers);
      if (data.suppliers) safeSet(KEYS.SUPPLIERS, data.suppliers);
      if (data.expenses) safeSet(KEYS.EXPENSES, data.expenses);
      if (data.invoices) safeSet(KEYS.INVOICES, data.invoices);
      if (data.auditLogs) safeSet(KEYS.AUDIT_LOGS, data.auditLogs);
      if (data.stockAdjustments) safeSet(KEYS.STOCK_ADJUSTMENTS, data.stockAdjustments);
      if (data.customerTransactions) safeSet(KEYS.CUSTOMER_TRANSACTIONS, data.customerTransactions);
      return { success: true, message: `Successfully restored database snapshot from ${parsed.exportedAt || 'backup'}.` };
    } catch (err: unknown) {
      return { success: false, message: `Failed to restore: ${err instanceof Error ? err.message : String(err)}` };
    }
  },

  // Reset to clean slate (Only Admin remains, all data cleared)
  resetToFactoryDefaults(): void {
    safeSet(KEYS.SETTINGS, INITIAL_COMPANY_SETTINGS);
    safeSet(KEYS.CATEGORIES, INITIAL_CATEGORIES);
    safeSet(KEYS.ROLES, INITIAL_ROLES);
    safeSet(KEYS.USERS, INITIAL_USERS);
    safeSet(KEYS.PRODUCTS, []);
    safeSet(KEYS.CUSTOMERS, []);
    safeSet(KEYS.SUPPLIERS, []);
    safeSet(KEYS.EXPENSES, []);
    safeSet(KEYS.INVOICES, []);
    safeSet(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    safeSet(KEYS.STOCK_ADJUSTMENTS, []);
    safeSet(KEYS.CUSTOMER_TRANSACTIONS, []);
    safeSet(KEYS.INVOICE_SEQ, '100000');
    localStorage.setItem(KEYS.CURRENT_USER_ID, INITIAL_USERS[0].id);
  },
};
