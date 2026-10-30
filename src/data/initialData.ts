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
  CustomerLedgerTransaction,
  Category,
} from '../types';

export const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  businessName: 'All-Noor Building Materials',
  tagline: 'Construction Materials, Steel Rebar, Cement & Wholesale Supply',
  taxId: 'TRAD-BIN-908124',
  address: 'Demra Highway, Main Market, Dhaka',
  phone: '+880 1700-000000',
  email: 'admin@allnoor.com',
  currencySymbol: 'OMR',
  footerTerms:
    '1. Sold goods in sound condition can be returned subject to presentation of delivery slip.\n2. Cement & dry mortars must be stored in moisture-free conditions.\n3. Please settle credit dues within the agreed credit term period.\n4. Preserve this computerized invoice for warranty and accounting verification.',
  minMarginPercent: 4.5,
  maxCashierDiscountPercent: 5.0,
  managerOverridePin: '1234',
  defaultWarehouse: 'Main Yard (Demra)',
  deviceId: 'POS-01',
  openingCashBalance: 0,
  loginBgUrl: '',
  estimatedCashInDrawer: 0,
  vatPercent: 0,
};

export const INITIAL_CATEGORIES: Category[] = [];

export const INITIAL_ROLES: DynamicRole[] = [
  {
    id: 'role_admin',
    name: 'Owner / Super Admin',
    description: 'Unrestricted enterprise access to all financial, system, and user controls',
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
  },
  {
    id: 'role_manager',
    name: 'Branch Manager',
    description: 'Daily sales, pricing approvals, inventory, and due ledger authority',
    isSystem: true,
    permissions: {
      canViewPurchasePrice: true,
      canProcessRefund: true,
      canModifyDiscount: true,
      canOverrideMinPrice: true,
      canManageUsers: false,
      canManageSettings: false,
      canDeleteRecords: false,
      canAccessLedger: true,
      canExportReports: true,
      canAdjustStock: true,
      canManageCategories: false,
    },
  },
  {
    id: 'role_cashier',
    name: 'Counter Cashier',
    description: 'Front-desk point of sale counter and receipt billing',
    isSystem: true,
    permissions: {
      canViewPurchasePrice: false,
      canProcessRefund: false,
      canModifyDiscount: true,
      canOverrideMinPrice: false,
      canManageUsers: false,
      canManageSettings: false,
      canDeleteRecords: false,
      canAccessLedger: false,
      canExportReports: false,
      canAdjustStock: false,
      canManageCategories: false,
    },
  },
];

export const INITIAL_USERS: User[] = [
  {
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
  },
];

export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_1',
    companyName: 'BSRM Steel Mills Ltd',
    contactPerson: 'Engr. Rafiqul Islam',
    phone: '+880 1819-100200',
    category: 'Steel & Rebar Manufacturer',
    balancePayable: 1250,
    paymentTerms: '15 Days Credit',
  },
  {
    id: 'sup_2',
    companyName: 'Crown Cement Industries',
    contactPerson: 'Md. Delwar Hossain',
    phone: '+880 1711-300400',
    category: 'Cement Supplier',
    balancePayable: 850,
    paymentTerms: '10 Days Credit',
  },
];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_CUSTOMER_TRANSACTIONS: CustomerLedgerTransaction[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
