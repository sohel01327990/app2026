import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  CompanySettings,
  Category,
  Product,
  Customer,
  Invoice,
  CustomerLedgerTransaction,
  Expense,
  Supplier,
  DynamicRole,
  User,
  StockAdjustment,
  AuditLog,
  DailyFinancialReportRecord,
  DueRecord,
  ProfitAnalyticsRecord,
} from '../types';

export interface CloudSyncStatus {
  isConnected: boolean;
  lastSyncedAt: string | null;
  pendingSyncCount: number;
  freeTierStatus: 'Lifetime Free Active' | 'Offline Cache Mode' | 'Syncing';
}

const recentlyDeletedIds = new Set<string>();

export function markAsRecentlyDeleted(id: string) {
  if (!id) return;
  recentlyDeletedIds.add(id);
  setTimeout(() => {
    recentlyDeletedIds.delete(id);
  }, 20000);
}

export function isRecentlyDeleted(id: string): boolean {
  return recentlyDeletedIds.has(id);
}

export function cleanForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item));
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) {
      continue; // completely drop undefined fields!
    }
    cleanObj[key] = cleanForFirestore(val);
  }
  return cleanObj;
}

function sanitizeId(id: string): string {
  if (!id) return `id_${Date.now()}`;
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

export const FirebaseSyncService = {
  // ==================== SETTINGS ====================
  async saveCompanySettings(settings: CompanySettings): Promise<void> {
    const path = 'settings';
    try {
      const payload = cleanForFirestore({
        ...settings,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, path, 'store_config'), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/store_config`);
    }
  },

  listenToCompanySettings(callback: (settings: CompanySettings) => void): () => void {
    const path = 'settings';
    return onSnapshot(
      doc(db, path, 'store_config'),
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as CompanySettings);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${path}/store_config`);
      }
    );
  },

  // ==================== CATEGORIES ====================
  async saveCategory(category: Category): Promise<void> {
    const path = 'categories';
    const cleanId = sanitizeId(category.id);
    try {
      const payload = cleanForFirestore({ ...category, id: cleanId });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  async deleteCategory(categoryId: string): Promise<void> {
    const path = 'categories';
    const cleanId = sanitizeId(categoryId);
    markAsRecentlyDeleted(cleanId);
    markAsRecentlyDeleted(categoryId);
    try {
      await deleteDoc(doc(db, path, cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${cleanId}`);
    }
  },

  listenToCategories(callback: (categories: Category[]) => void): () => void {
    const path = 'categories';
    const legacyCatIds = ['cat_cement', 'cat_steel', 'cat_sand', 'cat_bricks', 'cat_pipes', 'cat_paints', 'cat_hardware'];
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        snapshot.docs.forEach((d) => {
          if (legacyCatIds.includes(d.id)) {
            deleteDoc(d.ref).catch(() => {});
          }
        });
        const items = snapshot.docs
          .map((d) => d.data() as Category)
          .filter((c) => !legacyCatIds.includes(c.id) && !isRecentlyDeleted(c.id));
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== PRODUCTS ====================
  async saveProduct(product: Product): Promise<void> {
    const path = 'products';
    const cleanId = sanitizeId(product.id);
    try {
      const payload = cleanForFirestore({ ...product, id: cleanId });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  async deleteProduct(productId: string): Promise<void> {
    const path = 'products';
    const cleanId = sanitizeId(productId);
    markAsRecentlyDeleted(cleanId);
    markAsRecentlyDeleted(productId);
    try {
      await deleteDoc(doc(db, path, cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${cleanId}`);
    }
  },

  listenToProducts(callback: (products: Product[]) => void): () => void {
    const path = 'products';
    const legacyProdIds = ['prd_1', 'prd_2', 'prd_3', 'prd_4'];
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        snapshot.docs.forEach((d) => {
          if (legacyProdIds.includes(d.id)) {
            deleteDoc(d.ref).catch(() => {});
          }
        });
        const items = snapshot.docs
          .map((d) => d.data() as Product)
          .filter((p) => !legacyProdIds.includes(p.id) && !isRecentlyDeleted(p.id));
        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== CUSTOMERS ====================
  async saveCustomer(customer: Customer): Promise<void> {
    const path = 'customers';
    const cleanId = sanitizeId(customer.id);
    try {
      const payload = cleanForFirestore({ ...customer, id: cleanId });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  async deleteCustomer(customerId: string): Promise<void> {
    const path = 'customers';
    const cleanId = sanitizeId(customerId);
    markAsRecentlyDeleted(cleanId);
    markAsRecentlyDeleted(customerId);
    try {
      await deleteDoc(doc(db, path, cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${cleanId}`);
    }
  },

  listenToCustomers(callback: (customers: Customer[]) => void): () => void {
    const path = 'customers';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        snapshot.docs.forEach((d) => {
          if (d.id === 'cst_1') {
            deleteDoc(d.ref).catch(() => {});
          }
        });
        const items = snapshot.docs
          .map((d) => d.data() as Customer)
          .filter((c) => c.id !== 'cst_1' && !isRecentlyDeleted(c.id));
        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== INVOICES ====================
  async saveInvoice(invoice: Invoice): Promise<void> {
    const path = 'invoices';
    const cleanId = sanitizeId(invoice.id);
    try {
      const payload = cleanForFirestore({ ...invoice, id: cleanId, synced: true });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  async deleteInvoice(invoiceId: string): Promise<void> {
    const path = 'invoices';
    const cleanId = sanitizeId(invoiceId);
    markAsRecentlyDeleted(cleanId);
    markAsRecentlyDeleted(invoiceId);
    try {
      await deleteDoc(doc(db, path, cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${cleanId}`);
    }
  },

  listenToInvoices(callback: (invoices: Invoice[]) => void): () => void {
    const path = 'invoices';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs
          .map((d) => d.data() as Invoice)
          .filter((i) => !isRecentlyDeleted(i.id));
        // Sort descending by sequenceNumber or createdAt
        items.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== CUSTOMER TRANSACTIONS ====================
  async saveCustomerTransaction(tx: CustomerLedgerTransaction): Promise<void> {
    const path = 'customer_transactions';
    const cleanId = sanitizeId(tx.id);
    try {
      const payload = cleanForFirestore({ ...tx, id: cleanId });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  async deleteCustomerTransaction(txId: string): Promise<void> {
    const path = 'customer_transactions';
    const cleanId = sanitizeId(txId);
    markAsRecentlyDeleted(cleanId);
    markAsRecentlyDeleted(txId);
    try {
      await deleteDoc(doc(db, path, cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${cleanId}`);
    }
  },

  listenToCustomerTransactions(callback: (txs: CustomerLedgerTransaction[]) => void): () => void {
    const path = 'customer_transactions';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs
          .map((d) => d.data() as CustomerLedgerTransaction)
          .filter((t) => !isRecentlyDeleted(t.id));
        items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== EXPENSES ====================
  async saveExpense(expense: Expense): Promise<void> {
    const path = 'expenses';
    const cleanId = sanitizeId(expense.id);
    try {
      const payload = cleanForFirestore({ ...expense, id: cleanId });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  async deleteExpense(expenseId: string): Promise<void> {
    const path = 'expenses';
    const cleanId = sanitizeId(expenseId);
    markAsRecentlyDeleted(cleanId);
    markAsRecentlyDeleted(expenseId);
    try {
      await deleteDoc(doc(db, path, cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${cleanId}`);
    }
  },

  listenToExpenses(callback: (expenses: Expense[]) => void): () => void {
    const path = 'expenses';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        snapshot.docs.forEach((d) => {
          if (d.id === 'exp_1') {
            deleteDoc(d.ref).catch(() => {});
          }
        });
        const items = snapshot.docs
          .map((d) => d.data() as Expense)
          .filter((e) => e.id !== 'exp_1' && !isRecentlyDeleted(e.id));
        items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== SUPPLIERS ====================
  async saveSupplier(supplier: Supplier): Promise<void> {
    const path = 'suppliers';
    const cleanId = sanitizeId(supplier.id);
    try {
      const payload = cleanForFirestore({ ...supplier, id: cleanId });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  async deleteSupplier(supplierId: string): Promise<void> {
    const path = 'suppliers';
    const cleanId = sanitizeId(supplierId);
    markAsRecentlyDeleted(cleanId);
    markAsRecentlyDeleted(supplierId);
    try {
      await deleteDoc(doc(db, path, cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${cleanId}`);
    }
  },

  listenToSuppliers(callback: (suppliers: Supplier[]) => void): () => void {
    const path = 'suppliers';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        snapshot.docs.forEach((d) => {
          if (d.id === 'sup_1') {
            deleteDoc(d.ref).catch(() => {});
          }
        });
        const items = snapshot.docs
          .map((d) => d.data() as Supplier)
          .filter((s) => s.id !== 'sup_1' && !isRecentlyDeleted(s.id));
        items.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== ROLES ====================
  async saveRole(role: DynamicRole): Promise<void> {
    const path = 'roles';
    const cleanId = sanitizeId(role.id);
    try {
      const payload = cleanForFirestore({ ...role, id: cleanId });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  async deleteRole(roleId: string): Promise<void> {
    const path = 'roles';
    const cleanId = sanitizeId(roleId);
    markAsRecentlyDeleted(cleanId);
    markAsRecentlyDeleted(roleId);
    try {
      await deleteDoc(doc(db, path, cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${cleanId}`);
    }
  },

  listenToRoles(callback: (roles: DynamicRole[]) => void): () => void {
    const path = 'roles';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs
          .map((d) => d.data() as DynamicRole)
          .filter((r) => !isRecentlyDeleted(r.id));
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== USERS ====================
  async saveUser(user: User): Promise<void> {
    const path = 'users';
    const cleanId = sanitizeId(user.id);
    try {
      const payload = cleanForFirestore({ ...user, id: cleanId });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  async deleteUser(userId: string): Promise<void> {
    const path = 'users';
    const cleanId = sanitizeId(userId);
    markAsRecentlyDeleted(cleanId);
    markAsRecentlyDeleted(userId);
    try {
      await deleteDoc(doc(db, path, cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${cleanId}`);
    }
  },

  async ensureMasterAdminUser(adminUser: User): Promise<void> {
    const path = 'users';
    try {
      const snap = await getDocs(collection(db, path));
      const hasAdmin = snap.docs.some((d) => {
        const u = d.data() as User;
        return u.id === 'usr_admin' || u.username === 'admin' || u.roleId === 'role_admin';
      });
      if (!hasAdmin) {
        console.info('[FirebaseSync] Master Admin missing in Firestore, creating /users/usr_admin...');
        const payload = cleanForFirestore({
          ...adminUser,
          id: 'usr_admin',
          username: 'admin',
          roleId: 'role_admin',
          roleName: 'Owner / Super Admin',
          email: adminUser.email || 'admin@allnoor.com',
          password: 'Admin1234',
          pinCode: '1234',
          status: 'active',
        });
        await setDoc(doc(db, path, 'usr_admin'), payload);
      }
    } catch (e) {
      console.warn('[FirebaseSync] Could not ensure master admin user:', e);
    }
  },

  listenToUsers(callback: (users: User[]) => void): () => void {
    const path = 'users';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs
          .map((d) => d.data() as User)
          .filter((u) => !isRecentlyDeleted(u.id));
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== STOCK ADJUSTMENTS ====================
  async saveStockAdjustment(adj: StockAdjustment): Promise<void> {
    const path = 'stock_adjustments';
    const cleanId = sanitizeId(adj.id);
    try {
      const payload = cleanForFirestore({ ...adj, id: cleanId });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  async deleteStockAdjustment(adjId: string): Promise<void> {
    const path = 'stock_adjustments';
    const cleanId = sanitizeId(adjId);
    markAsRecentlyDeleted(cleanId);
    markAsRecentlyDeleted(adjId);
    try {
      await deleteDoc(doc(db, path, cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${cleanId}`);
    }
  },

  listenToStockAdjustments(callback: (adjs: StockAdjustment[]) => void): () => void {
    const path = 'stock_adjustments';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs
          .map((d) => d.data() as StockAdjustment)
          .filter((a) => !isRecentlyDeleted(a.id));
        items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== AUDIT LOGS ====================
  async saveAuditLog(log: AuditLog): Promise<void> {
    const path = 'audit_logs';
    const cleanId = sanitizeId(log.id);
    try {
      const payload = cleanForFirestore({ ...log, id: cleanId });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  listenToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
    const path = 'audit_logs';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as AuditLog);
        items.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        callback(items.slice(0, 500));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== DAILY FINANCIAL REPORTS ====================
  async saveDailyFinancialReport(report: DailyFinancialReportRecord): Promise<void> {
    const path = 'daily_financial_reports';
    const cleanId = sanitizeId(report.id || report.reportDate);
    try {
      const payload = cleanForFirestore({
        ...report,
        id: cleanId,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  listenToDailyFinancialReports(callback: (reports: DailyFinancialReportRecord[]) => void): () => void {
    const path = 'daily_financial_reports';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as DailyFinancialReportRecord);
        items.sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || ''));
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== DUE MANAGEMENT (DEDICATED COLLECTION) ====================
  async saveDueRecord(due: DueRecord): Promise<void> {
    const path = 'due_management';
    const cleanId = sanitizeId(due.id || due.customerId);
    try {
      const payload = cleanForFirestore({
        ...due,
        id: cleanId,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  async deleteDueRecord(dueId: string): Promise<void> {
    const path = 'due_management';
    const cleanId = sanitizeId(dueId);
    markAsRecentlyDeleted(cleanId);
    markAsRecentlyDeleted(dueId);
    try {
      await deleteDoc(doc(db, path, cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${cleanId}`);
    }
  },

  listenToDueRecords(callback: (dues: DueRecord[]) => void): () => void {
    const path = 'due_management';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs
          .map((d) => d.data() as DueRecord)
          .filter((d) => !isRecentlyDeleted(d.id));
        items.sort((a, b) => b.currentDue - a.currentDue);
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== PROFIT & ANALYTICS ====================
  async saveProfitAnalytics(analytics: ProfitAnalyticsRecord): Promise<void> {
    const path = 'profit_analytics';
    const cleanId = sanitizeId(analytics.id || analytics.period);
    try {
      const payload = cleanForFirestore({
        ...analytics,
        id: cleanId,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, path, cleanId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    }
  },

  listenToProfitAnalytics(callback: (analyticsList: ProfitAnalyticsRecord[]) => void): () => void {
    const path = 'profit_analytics';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as ProfitAnalyticsRecord);
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // ==================== BULK SEED & SYNC ====================
  async seedInitialDataIfEmpty(data: {
    settings: CompanySettings;
    categories?: Category[];
    products?: Product[];
    roles: DynamicRole[];
    users: User[];
    customers?: Customer[];
    suppliers?: Supplier[];
    expenses?: Expense[];
    invoices?: Invoice[];
    customerTransactions?: CustomerLedgerTransaction[];
  }): Promise<boolean> {
    try {
      const snapUsers = await getDocs(collection(db, 'users'));
      if (snapUsers.empty) {
        console.info('Seeding admin account and default roles to clean database...');
        await this.saveCompanySettings(data.settings);
        for (const role of data.roles) {
          await this.saveRole(role);
        }
        for (const user of data.users) {
          await this.saveUser(user);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Initial admin seed check (offline/cached):', err);
      return false;
    }
  },

  async pushFullStoreToCloud(data: {
    settings: CompanySettings;
    categories: Category[];
    products: Product[];
    customers: Customer[];
    invoices: Invoice[];
    customerTransactions: CustomerLedgerTransaction[];
    expenses: Expense[];
    suppliers: Supplier[];
    roles: DynamicRole[];
    users: User[];
  }): Promise<{ success: boolean; count: number }> {
    let count = 0;
    try {
      await this.saveCompanySettings(data.settings);
      count++;

      for (const cat of data.categories) {
        await this.saveCategory(cat);
        count++;
      }
      for (const prod of data.products) {
        await this.saveProduct(prod);
        count++;
      }
      for (const cust of data.customers) {
        await this.saveCustomer(cust);
        count++;
      }
      for (const inv of data.invoices) {
        await this.saveInvoice(inv);
        count++;
      }
      for (const tx of data.customerTransactions) {
        await this.saveCustomerTransaction(tx);
        count++;
      }
      for (const exp of data.expenses) {
        await this.saveExpense(exp);
        count++;
      }
      for (const sup of data.suppliers) {
        await this.saveSupplier(sup);
        count++;
      }
      for (const rol of data.roles) {
        await this.saveRole(rol);
        count++;
      }
      for (const usr of data.users) {
        await this.saveUser(usr);
        count++;
      }

      return { success: true, count };
    } catch (err) {
      console.error('Error during pushFullStoreToCloud:', err);
      return { success: false, count };
    }
  },

  async pullFullStoreFromCloud(): Promise<{
    settings?: CompanySettings;
    categories?: Category[];
    products?: Product[];
    customers?: Customer[];
    invoices?: Invoice[];
    customerTransactions?: CustomerLedgerTransaction[];
    expenses?: Expense[];
    suppliers?: Supplier[];
    roles?: DynamicRole[];
    users?: User[];
    stockAdjustments?: StockAdjustment[];
  }> {
    const result: {
      settings?: CompanySettings;
      categories?: Category[];
      products?: Product[];
      customers?: Customer[];
      invoices?: Invoice[];
      customerTransactions?: CustomerLedgerTransaction[];
      expenses?: Expense[];
      suppliers?: Supplier[];
      roles?: DynamicRole[];
      users?: User[];
      stockAdjustments?: StockAdjustment[];
    } = {};

    try {
      const snapCategories = await getDocs(collection(db, 'categories'));
      if (!snapCategories.empty) {
        result.categories = snapCategories.docs.map((d) => d.data() as Category);
      }

      const snapProducts = await getDocs(collection(db, 'products'));
      if (!snapProducts.empty) {
        result.products = snapProducts.docs.map((d) => d.data() as Product);
      }

      const snapCustomers = await getDocs(collection(db, 'customers'));
      if (!snapCustomers.empty) {
        result.customers = snapCustomers.docs.map((d) => d.data() as Customer);
      }

      const snapInvoices = await getDocs(collection(db, 'invoices'));
      if (!snapInvoices.empty) {
        result.invoices = snapInvoices.docs.map((d) => d.data() as Invoice);
      }

      const snapTx = await getDocs(collection(db, 'customer_transactions'));
      if (!snapTx.empty) {
        result.customerTransactions = snapTx.docs.map(
          (d) => d.data() as CustomerLedgerTransaction
        );
      }

      const snapExpenses = await getDocs(collection(db, 'expenses'));
      if (!snapExpenses.empty) {
        result.expenses = snapExpenses.docs.map((d) => d.data() as Expense);
      }

      const snapSuppliers = await getDocs(collection(db, 'suppliers'));
      if (!snapSuppliers.empty) {
        result.suppliers = snapSuppliers.docs.map((d) => d.data() as Supplier);
      }

      const snapRoles = await getDocs(collection(db, 'roles'));
      if (!snapRoles.empty) {
        result.roles = snapRoles.docs.map((d) => d.data() as DynamicRole);
      }

      const snapUsers = await getDocs(collection(db, 'users'));
      if (!snapUsers.empty) {
        result.users = snapUsers.docs.map((d) => d.data() as User);
      }
    } catch (err) {
      console.warn('Error pulling full store from cloud:', err);
    }

    return result;
  },

  async purgeCloudStoreData(
    defaultSettings?: CompanySettings,
    defaultCategories?: Category[],
    defaultRoles?: DynamicRole[],
    defaultUsers?: User[]
  ): Promise<{
    success: boolean;
    purgedCollections: string[];
    count: number;
  }> {
    const collectionsToPurge = [
      'products',
      'customers',
      'invoices',
      'customer_transactions',
      'expenses',
      'suppliers',
      'categories',
      'stock_adjustments',
      'audit_logs',
      'daily_financial_reports',
      'due_management',
      'profit_analytics',
      'users',
      'roles',
      'settings',
    ];
    let totalDeleted = 0;
    const purged: string[] = [];

    try {
      for (const colName of collectionsToPurge) {
        try {
          const snap = await getDocs(collection(db, colName));
          if (!snap.empty) {
            const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
            await Promise.all(deletePromises);
            totalDeleted += snap.size;
            purged.push(colName);
          }
        } catch (colErr) {
          console.warn(`Could not purge collection ${colName}:`, colErr);
        }
      }

      // Re-seed default categories if provided
      if (defaultCategories && defaultCategories.length > 0) {
        for (const cat of defaultCategories) {
          await this.saveCategory(cat);
        }
      }

      // Re-seed default roles
      if (defaultRoles && defaultRoles.length > 0) {
        for (const role of defaultRoles) {
          await this.saveRole(role);
        }
      }

      // Re-seed default users (admin)
      if (defaultUsers && defaultUsers.length > 0) {
        for (const user of defaultUsers) {
          await this.saveUser(user);
        }
      }

      // Update store settings to default in cloud
      if (defaultSettings) {
        await this.saveCompanySettings(defaultSettings);
      }

      return { success: true, purgedCollections: purged, count: totalDeleted };
    } catch (err) {
      console.error('Error purging cloud store data:', err);
      return { success: false, purgedCollections: purged, count: totalDeleted };
    }
  },
};
