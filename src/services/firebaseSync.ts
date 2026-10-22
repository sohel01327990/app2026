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
} from '../types';

export interface CloudSyncStatus {
  isConnected: boolean;
  lastSyncedAt: string | null;
  pendingSyncCount: number;
  freeTierStatus: 'Lifetime Free Active' | 'Offline Cache Mode' | 'Syncing';
}

export const FirebaseSyncService = {
  async saveCompanySettings(settings: CompanySettings): Promise<void> {
    const path = 'settings';
    try {
      await setDoc(doc(db, path, 'store_config'), {
        ...settings,
        updatedAt: new Date().toISOString(),
      });
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

  async saveCategory(category: Category): Promise<void> {
    const path = 'categories';
    try {
      await setDoc(doc(db, path, category.id), category);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${category.id}`);
    }
  },

  async deleteCategory(categoryId: string): Promise<void> {
    const path = 'categories';
    try {
      await deleteDoc(doc(db, path, categoryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${categoryId}`);
    }
  },

  async saveProduct(product: Product): Promise<void> {
    const path = 'products';
    try {
      await setDoc(doc(db, path, product.id), product);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${product.id}`);
    }
  },

  async deleteProduct(productId: string): Promise<void> {
    const path = 'products';
    try {
      await deleteDoc(doc(db, path, productId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${productId}`);
    }
  },

  async saveCustomer(customer: Customer): Promise<void> {
    const path = 'customers';
    try {
      await setDoc(doc(db, path, customer.id), customer);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${customer.id}`);
    }
  },

  async saveInvoice(invoice: Invoice): Promise<void> {
    const path = 'invoices';
    try {
      await setDoc(doc(db, path, invoice.id), invoice);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${invoice.id}`);
    }
  },

  async saveCustomerTransaction(tx: CustomerLedgerTransaction): Promise<void> {
    const path = 'customer_transactions';
    try {
      await setDoc(doc(db, path, tx.id), tx);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${tx.id}`);
    }
  },

  async saveExpense(expense: Expense): Promise<void> {
    const path = 'expenses';
    try {
      await setDoc(doc(db, path, expense.id), expense);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${expense.id}`);
    }
  },

  async saveSupplier(supplier: Supplier): Promise<void> {
    const path = 'suppliers';
    try {
      await setDoc(doc(db, path, supplier.id), supplier);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${supplier.id}`);
    }
  },

  async saveRole(role: DynamicRole): Promise<void> {
    const path = 'roles';
    try {
      await setDoc(doc(db, path, role.id), role);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${role.id}`);
    }
  },

  async saveUser(user: User): Promise<void> {
    const path = 'users';
    try {
      await setDoc(doc(db, path, user.id), user);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${user.id}`);
    }
  },

  async saveStockAdjustment(adj: StockAdjustment): Promise<void> {
    const path = 'stock_adjustments';
    try {
      await setDoc(doc(db, path, adj.id), adj);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${adj.id}`);
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
    } catch (err) {
      console.warn('Error pulling full store from cloud:', err);
    }

    return result;
  },

  async purgeCloudStoreData(defaultSettings?: CompanySettings, defaultCategories?: Category[]): Promise<{
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
