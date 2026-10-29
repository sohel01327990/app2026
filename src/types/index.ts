export type UserRoleType = 'admin' | 'manager' | 'cashier' | 'stock_manager' | string;

export type AppModuleId =
  | 'pos'
  | 'inventory'
  | 'daily_report'
  | 'due'
  | 'invoices'
  | 'expenses'
  | 'analytics'
  | 'admin'
  | 'backup';

export interface SystemModuleInfo {
  id: AppModuleId;
  label: string;
  description: string;
}

export const ALL_SYSTEM_MODULES: SystemModuleInfo[] = [
  { id: 'pos', label: 'POS Counter', description: 'Point of sale billing, checkout, and receipt issuance' },
  { id: 'inventory', label: 'Inventory & Yard', description: 'Products, stock levels, yard rebar, and purchases' },
  { id: 'daily_report', label: 'Daily Financial Report', description: 'Daily sales, cash drawer, and financial summaries' },
  { id: 'due', label: 'Due Management', description: 'Customer credit ledger, dues collection, and vouchers' },
  { id: 'invoices', label: 'Sales Invoices', description: 'Historical sales invoices, reprinting, and returns' },
  { id: 'expenses', label: 'Operational Expenses', description: 'Daily shop expenditures, logistics, and petty cash' },
  { id: 'analytics', label: 'Profit & Analytics', description: 'Revenue graphs, gross margin, and business health' },
  { id: 'admin', label: 'Admin Settings', description: 'Store identity, operators, roles, and clean slate reset' },
  { id: 'backup', label: 'Backup & Cloud Sync', description: 'Firebase cloud sync and JSON data backup' },
];

export interface RolePermissions {
  canViewPurchasePrice: boolean;
  canProcessRefund: boolean;
  canModifyDiscount: boolean;
  canOverrideMinPrice: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canDeleteRecords: boolean;
  canAccessLedger: boolean;
  canExportReports: boolean;
  canAdjustStock: boolean;
  canManageCategories: boolean;
}

export interface DynamicRole {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: RolePermissions;
  allowedModules?: AppModuleId[];
}

export interface User {
  id: string;
  name: string;
  username: string;
  roleId: string;
  roleName: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended';
  avatar?: string;
  pinCode?: string;
  password?: string;
  allowedModules?: AppModuleId[];
}

export function getUserEffectiveModules(user: User, role?: DynamicRole): AppModuleId[] {
  // If Super Admin owner account, give full access
  if (user.id === 'usr_admin' || user.roleId === 'role_admin') {
    return user.allowedModules && user.allowedModules.length > 0
      ? user.allowedModules
      : ALL_SYSTEM_MODULES.map((m) => m.id);
  }

  // If user has customized allowed modules explicitly set by Admin
  if (user.allowedModules && user.allowedModules.length > 0) {
    return user.allowedModules;
  }

  // Fallback to role-level allowed modules
  if (role && role.allowedModules && role.allowedModules.length > 0) {
    return role.allowedModules;
  }

  // Default fallbacks based on role ID
  if (user.roleId === 'role_manager') {
    return ['pos', 'inventory', 'daily_report', 'due', 'invoices', 'expenses', 'analytics'];
  }
  if (user.roleId === 'role_cashier') {
    return ['pos', 'invoices'];
  }

  return ['pos'];
}

export interface PasswordRecoverySession {
  email: string;
  phone?: string;
  userId: string;
  userName: string;
  otp: string;
  expiresAt: number; // 2 minutes (120,000 ms from generation)
  resendCooldownUntil: number;
}

export interface CompanySettings {
  businessName: string;
  tagline: string;
  taxId: string; // Trade License & BIN / VAT
  address: string;
  phone: string;
  email: string;
  currencySymbol: string;
  footerTerms: string;
  minMarginPercent: number;
  maxCashierDiscountPercent: number;
  managerOverridePin: string;
  defaultWarehouse: string;
  deviceId: string;
  logoUrl?: string;
  loginBgUrl?: string;
  openingCashBalance: number;
  estimatedCashInDrawer?: number;
  vatPercent?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export type MaterialCategory = string;

export type MaterialUnit =
  | 'Bag'
  | 'Ton'
  | 'CFT'
  | 'Pcs'
  | 'Kg'
  | 'Bundle'
  | 'SqFt'
  | 'Drum'
  | 'Box'
  | 'Ltr'
  | string;

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: MaterialUnit;
  costPrice: number;
  regularPrice: number;
  minSellingPrice: number; // Guardrail threshold
  currentStock: number;
  minStockThreshold: number;
  warehouse: string;
  brand: string;
  description?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  unit: MaterialUnit;
  discount: number; // per item discount
  total: number;
}

export type PaymentMethod =
  | 'cash'
  | 'bkash'
  | 'nagad'
  | 'bank_transfer'
  | 'customer_due';

export interface SplitPayment {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  sku: string;
  unit: MaterialUnit;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  minSellingPrice: number;
  discount: number;
  total: number;
}

export interface InvoiceReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  refundAmount: number;
  costRefundAmount: number;
  reason: string;
}

export interface InvoiceReturnRecord {
  id: string;
  date: string;
  items: InvoiceReturnItem[];
  totalRefunded: number;
  costRefunded: number;
  processedBy: string;
}

export interface Invoice {
  id: string; // Must be at most 10 characters (e.g. INV-100001)
  sequenceNumber: number;
  deviceId: string;
  customerName: string;
  customerPhone: string;
  customerId?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  vatTaxAmount: number;
  grandTotal: number;
  payments: SplitPayment[];
  totalPaid: number;
  dueAmount: number;
  status: 'completed' | 'returned' | 'partially_returned' | 'cancelled';
  returns?: InvoiceReturnRecord[];
  cashierId: string;
  cashierName: string;
  overrideApprovedBy?: string;
  createdAt: string;
  synced: boolean;
  syncVersion: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  creditLimit: number;
  currentDue: number;
  totalPurchases: number;
  aging: {
    current: number; // 0-30 days
    days30to60: number; // 31-60 days
    days60plus: number; // >60 days
  };
}

export type CustomerLedgerType =
  | 'sale_invoice'
  | 'due_payment'
  | 'cash_refund'
  | 'due_waiver'
  | 'material_return';

export interface CustomerLedgerTransaction {
  id: string;
  customerId: string;
  customerName: string;
  type: CustomerLedgerType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  date: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  explanation: string; // Mandatory transaction narration
  invoiceId?: string;
  processedBy: string;
  voucherNumber: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  category: string;
  balancePayable: number;
  paymentTerms: string;
}

export interface Expense {
  id: string;
  category:
    | 'Rent'
    | 'Staff Salary'
    | 'Transport & Freight'
    | 'Labor & Unloading'
    | 'Electricity & Utilities'
    | 'Maintenance'
    | 'Miscellaneous'
    | string;
  amount: number;
  date: string;
  description: string;
  paidVia: PaymentMethod;
  referenceNumber: string;
  recordedBy: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  type: 'damage' | 'breakage' | 'waste' | 'yard_audit_loss' | 'inward_purchase' | 'manual_correction';
  quantity: number;
  unit: MaterialUnit;
  reason: string;
  date: string;
  loggedBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action:
    | 'LOGIN'
    | 'INVOICE_CREATE'
    | 'PRICE_OVERRIDE_APPROVED'
    | 'DISCOUNT_OVERRIDE'
    | 'RETURN_PROCESSED'
    | 'STOCK_ADJUSTMENT'
    | 'SETTINGS_CHANGED'
    | 'ROLE_MODIFIED'
    | 'CATEGORY_MODIFIED'
    | 'PRODUCT_MODIFIED'
    | 'BACKUP_DOWNLOADED'
    | 'DATABASE_RESTORED'
    | 'DUE_PAYMENT_COLLECTED'
    | 'DUE_REFUND_PROCESSED'
    | 'DUE_WAIVER_APPROVED'
    | 'PURCHASE_ORDER_RECEIVED'
    | 'PASSWORD_CHANGED'
    | 'PASSWORD_RECOVERY_OTP'
    | 'PASSWORD_RESET_SUCCESS'
    | 'USER_REGISTERED'
    | 'RESET_CLEAN_SLATE'
    | 'LOGOUT';
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  deviceId: string;
  status: 'SUCCESS' | 'BLOCKED_GUARDRAIL' | 'OVERRIDE_APPROVED';
}

export interface CashWithdrawal {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  withdrawnBy: string;
  purpose?: string;
  note?: string;
  closingCashBefore: number;
  remainingAfter: number;
  createdAt: string;
}

export interface DailyFinancialReportRecord {
  id: string; // YYYY-MM-DD
  reportDate: string;
  dayGrossSales: number;
  dayNetIncome: number;
  dayTotalExpense: number;
  dayGrossProfit: number;
  dayNetProfit: number;
  dayTotalPaidCash: number;
  dayTotalDue: number;
  dayDuesCollectedCash: number;
  dayCashExpenses: number;
  dayCashInflow: number;
  dayCashOutflow: number;
  closingCash: number;
  cashWithdrawn?: number;
  remainingCashBalance?: number;
  invoicesCount: number;
  expensesCount: number;
  updatedAt: string;
}

export interface DueRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  currentDue: number;
  totalPurchases: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  status: 'pending' | 'cleared';
  updatedAt: string;
}

export interface ProfitAnalyticsRecord {
  id: string; // e.g. 'summary_current' or 'month_YYYY_MM'
  period: string;
  revenue: number;
  operatingExpenses: number;
  grossMargin: number;
  netProfit: number;
  netProfitMargin: number;
  netCashInflow: number;
  invoicesCount: number;
  expenseVouchersCount: number;
  updatedAt: string;
}
