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
  openingCashBalance: 150.000,
  loginBgUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1920&q=80',
  estimatedCashInDrawer: 150.000,
  vatPercent: 5.0,
};

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_cement', name: 'Cement', description: 'Portland composite & special cement bags' },
  { id: 'cat_steel', name: 'TMT Steel Rebar', description: '500W Grade 60 & 72.5G rebar' },
  { id: 'cat_sand', name: 'Sand & Aggregate', description: 'Sylhet coarse sand & boulder stones' },
  { id: 'cat_bricks', name: 'Bricks & Blocks', description: '1st class machine auto bricks & concrete blocks' },
  { id: 'cat_pipes', name: 'Pipes & Sanitary', description: 'uPVC pressure pipes & fittings' },
  { id: 'cat_paints', name: 'Paints & Chemicals', description: 'Wall putty & waterproofing admixtures' },
  { id: 'cat_hardware', name: 'Hardware & Wire', description: 'GI binding wire, nails & safety items' },
];

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

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prd_1',
    name: 'Shah Cement Special Composite',
    sku: 'CMT-SHAH-01',
    barcode: '890123450001',
    category: 'Cement',
    unit: 'Bag',
    costPrice: 510,
    regularPrice: 560,
    minSellingPrice: 535,
    currentStock: 450,
    minStockThreshold: 50,
    warehouse: 'Main Yard (Demra)',
    brand: 'Shah Cement',
    description: '50kg Original Factory Sealed Bag',
  },
  {
    id: 'prd_2',
    name: 'BSRM TMT Steel Rebar 16mm (500W)',
    sku: 'STL-BSRM-16',
    barcode: '890123450002',
    category: 'TMT Steel Rebar',
    unit: 'Kg',
    costPrice: 88,
    regularPrice: 96,
    minSellingPrice: 91,
    currentStock: 3500,
    minStockThreshold: 500,
    warehouse: 'Main Yard (Demra)',
    brand: 'BSRM Steels',
    description: 'High-strength thermo-mechanically treated bar',
  },
  {
    id: 'prd_3',
    name: 'Sylhet Coarse Sand (Red)',
    sku: 'SND-SYL-01',
    barcode: '890123450003',
    category: 'Sand & Aggregate',
    unit: 'CFT',
    costPrice: 42,
    regularPrice: 52,
    minSellingPrice: 46,
    currentStock: 1800,
    minStockThreshold: 200,
    warehouse: 'Main Yard (Demra)',
    brand: 'Local Quarry',
    description: 'FM 2.5 Plaster & Concrete Casting Grade',
  },
  {
    id: 'prd_4',
    name: 'Auto Machine Bricks 1st Class',
    sku: 'BRK-AUTO-01',
    barcode: '890123450004',
    category: 'Bricks & Blocks',
    unit: 'Pcs',
    costPrice: 11,
    regularPrice: 13.5,
    minSellingPrice: 12,
    currentStock: 8000,
    minStockThreshold: 1000,
    warehouse: 'Main Yard (Demra)',
    brand: 'Mir Bricks',
    description: 'High density kiln-fired structural bricks',
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cst_1',
    name: 'Alamgir Hossain (Contractor)',
    phone: '01711223344',
    address: 'House #12, Road #4, Demra, Dhaka',
    creditLimit: 500000,
    currentDue: 15000,
    totalPurchases: 185000,
    aging: { current: 15000, days30to60: 0, days60plus: 0 },
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_1',
    companyName: 'BSRM Steels Mills Ltd.',
    contactPerson: 'Engr. Rafiqul Islam',
    phone: '01819998877',
    category: 'TMT Steel Rebar',
    balancePayable: 45000,
    paymentTerms: '15 Days Credit Period',
  },
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp_1',
    category: 'Labor & Unloading',
    amount: 1800,
    date: new Date().toISOString().slice(0, 10),
    description: 'Labor charges for unloading cement trailer',
    paidVia: 'cash',
    referenceNumber: 'VCH-01',
    recordedBy: 'Admin Owner',
  },
];

export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_CUSTOMER_TRANSACTIONS: CustomerLedgerTransaction[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud_init_01',
    timestamp: new Date().toISOString(),
    userId: 'usr_admin',
    userName: 'Admin Owner',
    action: 'LOGIN',
    entityType: 'AUTH',
    entityId: 'usr_admin',
    details: 'System initialized clean for Administrator (admin / Admin1234)',
    ipAddress: '127.0.0.1 (Local)',
    deviceId: 'POS-01',
    status: 'SUCCESS',
  },
];
