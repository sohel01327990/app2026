import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Expense, PaymentMethod, Supplier } from '../../types';
import {
  TrendingDown,
  Plus,
  Search,
  Trash2,
  Calendar,
  X,
  Building2,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Wallet,
  Coins,
  Receipt,
  Users,
} from 'lucide-react';

export const ExpenseModule: React.FC = () => {
  const {
    expenses,
    addExpense,
    deleteExpense,
    suppliers,
    addSupplier,
    deleteSupplier,
    recordSupplierPayment,
    invoices,
    getEffectiveInvoiceRevenue,
    settings,
  } = usePOS();

  // Active Tab: 'operating_expenses' | 'vendor_payments' | 'vendor_accounts'
  const [activeTab, setActiveTab] = useState<'operating_expenses' | 'vendor_payments' | 'vendor_accounts'>('operating_expenses');

  // Month Filter state (default: current month e.g. "2026-10")
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showVendorPaymentModal, setShowVendorPaymentModal] = useState(false);
  const [showVendorAddModal, setShowVendorAddModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<Supplier | null>(null);

  // Expense Form State
  const [expenseCategory, setExpenseCategory] = useState<string>('Labor & Unloading');
  const [expenseAmount, setExpenseAmount] = useState<number>(50);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expensePaidVia, setExpensePaidVia] = useState<PaymentMethod>('cash');
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Vendor Payment Form State
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [vendorPaymentAmount, setVendorPaymentAmount] = useState<number>(100);
  const [vendorPaymentMethod, setVendorPaymentMethod] = useState<PaymentMethod>('cash');
  const [vendorPaymentRef, setVendorPaymentRef] = useState('');
  const [vendorPaymentDate, setVendorPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [vendorPaymentNotes, setVendorPaymentNotes] = useState('');
  const [vendorPaymentError, setVendorPaymentError] = useState('');

  // Add Vendor Form State
  const [vendorCompanyName, setVendorCompanyName] = useState('');
  const [vendorContactPerson, setVendorContactPerson] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorCategory, setVendorCategory] = useState('Cement Supplier');
  const [vendorOpeningPayable, setVendorOpeningPayable] = useState<number>(0);
  const [vendorPaymentTerms, setVendorPaymentTerms] = useState('15 Days Credit');

  // Available Month options (generated dynamically from invoice and expense dates)
  const monthOptions = useMemo(() => {
    const dates = new Set<string>();
    dates.add(new Date().toISOString().slice(0, 7));
    invoices.forEach((i) => {
      if (i.createdAt) dates.add(i.createdAt.slice(0, 7));
    });
    expenses.forEach((e) => {
      if (e.date) dates.add(e.date.slice(0, 7));
    });
    const arr = Array.from(dates);
    arr.sort((a, b) => b.localeCompare(a)); // sort descending
    return arr;
  }, [invoices, expenses]);

  // Financial Summary Metrics for Selected Month
  const monthlyMetrics = useMemo(() => {
    // 1. Monthly Revenue from Invoices
    const monthInvs = invoices.filter(
      (inv) =>
        inv.status !== 'cancelled' &&
        (selectedMonth === 'all' || (inv.createdAt && inv.createdAt.startsWith(selectedMonth)))
    );
    const totalRevenue = monthInvs.reduce((sum, inv) => sum + getEffectiveInvoiceRevenue(inv), 0);

    // 2. Monthly Vendor Payments
    const monthVendorExps = expenses.filter(
      (e) =>
        e.category === 'Vendor Payment' &&
        (selectedMonth === 'all' || (e.date && e.date.startsWith(selectedMonth)))
    );
    const totalVendorPayments = monthVendorExps.reduce((sum, e) => sum + e.amount, 0);

    // 3. Monthly Operating Expenses (excluding Vendor Payments)
    const monthOpExps = expenses.filter(
      (e) =>
        e.category !== 'Vendor Payment' &&
        (selectedMonth === 'all' || (e.date && e.date.startsWith(selectedMonth)))
    );
    const totalOperatingExpenses = monthOpExps.reduce((sum, e) => sum + e.amount, 0);

    // 4. Net Cash Flow After Vendor & Operating Expenses
    const netCashFlow = totalRevenue - totalVendorPayments - totalOperatingExpenses;

    return {
      totalRevenue,
      totalVendorPayments,
      totalOperatingExpenses,
      netCashFlow,
      vendorPaymentsCount: monthVendorExps.length,
      opExpsCount: monthOpExps.length,
    };
  }, [invoices, expenses, selectedMonth, getEffectiveInvoiceRevenue]);

  // Filtered Operating Expenses
  const filteredOperatingExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.category === 'Vendor Payment') return false; // Exclude vendor payments
      const matchMonth = selectedMonth === 'all' || (e.date && e.date.startsWith(selectedMonth));
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.referenceNumber.toLowerCase().includes(q);
      return matchMonth && matchCat && matchSearch;
    });
  }, [expenses, selectedMonth, selectedCategory, search]);

  // Filtered Vendor Payments History
  const filteredVendorPayments = useMemo(() => {
    return expenses.filter((e) => {
      if (e.category !== 'Vendor Payment') return false; // Vendor payments only
      const matchMonth = selectedMonth === 'all' || (e.date && e.date.startsWith(selectedMonth));
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.referenceNumber.toLowerCase().includes(q) ||
        e.paidVia.toLowerCase().includes(q);
      return matchMonth && matchSearch;
    });
  }, [expenses, selectedMonth, search]);

  // Filtered Vendor Accounts
  const filteredVendors = useMemo(() => {
    return suppliers.filter((s) => {
      const q = search.toLowerCase().trim();
      return (
        !q ||
        s.companyName.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [suppliers, search]);

  const totalVendorPayableBalance = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.balancePayable || 0), 0);
  }, [suppliers]);

  // Selected Vendor object for modal
  const targetVendorForPayment = useMemo(() => {
    return suppliers.find((s) => s.id === selectedVendorId) || suppliers[0];
  }, [suppliers, selectedVendorId]);

  // Handlers
  const handleOpenVendorPaymentModal = (vendorId?: string) => {
    setVendorPaymentError('');
    if (vendorId) {
      setSelectedVendorId(vendorId);
    } else if (suppliers.length > 0) {
      setSelectedVendorId(suppliers[0].id);
    }
    const sup = suppliers.find((s) => s.id === (vendorId || (suppliers[0] ? suppliers[0].id : '')));
    setVendorPaymentAmount(sup && sup.balancePayable > 0 ? sup.balancePayable : 500);
    setVendorPaymentRef(`VND-${Date.now().toString().slice(-5)}`);
    setVendorPaymentNotes('');
    setVendorPaymentDate(new Date().toISOString().slice(0, 10));
    setVendorPaymentMethod('cash');
    setShowVendorPaymentModal(true);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0 || !expenseDescription.trim()) return;
    addExpense({
      category: expenseCategory,
      amount: Number(expenseAmount),
      date: expenseDate,
      description: expenseDescription.trim(),
      paidVia: expensePaidVia,
      referenceNumber: `EXP-${Date.now().toString().slice(-4)}`,
    });
    setShowExpenseModal(false);
    setExpenseDescription('');
  };

  const handleSubmitVendorPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setVendorPaymentError('');

    if (!selectedVendorId) {
      setVendorPaymentError('Please select a valid vendor.');
      return;
    }
    const payNum = Number(vendorPaymentAmount);
    if (isNaN(payNum) || payNum <= 0) {
      setVendorPaymentError('Please enter a valid payment amount greater than 0.');
      return;
    }

    recordSupplierPayment(
      selectedVendorId,
      payNum,
      vendorPaymentMethod,
      vendorPaymentRef || `VND-${Date.now().toString().slice(-5)}`,
      vendorPaymentDate,
      vendorPaymentNotes || `Vendor payment to ${targetVendorForPayment?.companyName || 'Supplier'}`
    );

    setShowVendorPaymentModal(false);
    setVendorPaymentNotes('');
  };

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorCompanyName.trim()) return;
    addSupplier({
      companyName: vendorCompanyName.trim(),
      contactPerson: vendorContactPerson.trim() || 'N/A',
      phone: vendorPhone.trim() || 'N/A',
      category: vendorCategory,
      balancePayable: Number(vendorOpeningPayable) || 0,
      paymentTerms: vendorPaymentTerms,
    });
    setShowVendorAddModal(false);
    setVendorCompanyName('');
    setVendorContactPerson('');
    setVendorPhone('');
    setVendorOpeningPayable(0);
  };

  return (
    <div className="p-4 sm:p-6 pb-28 space-y-6 max-w-7xl mx-auto font-sans text-slate-900 bg-[#FEFAF3]">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#EADBCE]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingDown className="w-5.5 h-5.5 text-rose-600" />
            <span>Operating Expenses & Vendor Payments</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track monthly sales income, supplier/vendor payments, labor wages, freight, and net available cash
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EADBCE] rounded-xl shadow-2xs text-xs font-semibold">
            <Calendar className="w-4 h-4 text-[#C49A45]" />
            <span className="text-slate-500">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="all">All Months</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleOpenVendorPaymentModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-xs cursor-pointer transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Vendor Payment</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Summary Cards (Monthly Income vs Vendor Payments vs Expenses vs Net Cash) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Monthly Revenue / Income */}
        <div className="p-4 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Monthly Revenue (আয়)</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono tabular-nums">
            {settings.currencySymbol}{monthlyMetrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            {selectedMonth === 'all' ? 'Total all-time sales income' : `Sales income in ${selectedMonth}`}
          </span>
        </div>

        {/* 2. Monthly Vendor Payments */}
        <div className="p-4 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Vendor Payments (সরবরাহকারী)</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700 font-mono tabular-nums">
            {settings.currencySymbol}{monthlyMetrics.totalVendorPayments.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            {monthlyMetrics.vendorPaymentsCount} vendor payment vouchers paid
          </span>
        </div>

        {/* 3. Operating Expenses */}
        <div className="p-4 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">Operating Expenses (পরিচালন ব্যয়)</span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-600 font-mono tabular-nums">
            {settings.currencySymbol}{monthlyMetrics.totalOperatingExpenses.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            Labor, freight, utilities & yard maintenance
          </span>
        </div>

        {/* 4. Net Cash Position */}
        <div className="p-4 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Net Cash Position (অবশিষ্ট তহবিল)</span>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${monthlyMetrics.netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${monthlyMetrics.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {settings.currencySymbol}{monthlyMetrics.netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            Income minus (Vendor Payments + OpEx)
          </span>
        </div>
      </div>

      {/* Navigation Tabs and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Module Sub-Tabs */}
        <div className="flex flex-wrap rounded-2xl bg-white p-1 border border-[#EADBCE] shadow-xs gap-1">
          <button
            onClick={() => setActiveTab('operating_expenses')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'operating_expenses'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Operating Expenses ({filteredOperatingExpenses.length})
          </button>
          <button
            onClick={() => setActiveTab('vendor_payments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'vendor_payments'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vendor Payments ({filteredVendorPayments.length})
          </button>
          <button
            onClick={() => setActiveTab('vendor_accounts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'vendor_accounts'
                ? 'bg-[#C49A45] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vendor Payable Accounts ({suppliers.length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'vendor_accounts'
                  ? 'Search vendor, phone, contact...'
                  : 'Search description, voucher, ref...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#C49A45] shadow-xs"
            />
          </div>

          {activeTab === 'operating_expenses' && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 cursor-pointer shadow-xs"
            >
              <option value="all">All Categories</option>
              <option value="Labor & Unloading">Labor & Unloading</option>
              <option value="Transport & Freight">Transport & Freight</option>
              <option value="Yard Maintenance">Yard Maintenance</option>
              <option value="Utilities & Electricity">Utilities & Electricity</option>
              <option value="Office & Tea">Office & Refreshment</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          )}

          {activeTab === 'vendor_accounts' && (
            <button
              onClick={() => setShowVendorAddModal(true)}
              className="px-3.5 py-2 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold cursor-pointer shadow-xs transition-colors shrink-0 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Vendor</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Operating Expenses Table */}
      {activeTab === 'operating_expenses' && (
        <div className="rounded-3xl bg-white border border-[#EADBCE] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description / Purpose</th>
                  <th className="py-3 px-4">Paid Via</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOperatingExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-[#FEFAF3] transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">{e.date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{e.referenceNumber}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-800 font-medium">{e.description}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-mono text-slate-500">{e.paidVia}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 text-sm tabular-nums">
                      {settings.currencySymbol}{e.amount.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setExpenseToDelete(e)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Delete expense record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOperatingExpenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <TrendingDown className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No operating expense vouchers found</p>
                      <p className="text-xs text-slate-500 mt-0.5">Click "+ Add Expense" to record daily labor, freight, or utility costs.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Vendor Payments History Table */}
      {activeTab === 'vendor_payments' && (
        <div className="rounded-3xl bg-white border border-[#EADBCE] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Voucher / Ref #</th>
                  <th className="py-3 px-4">Vendor Payment Narration</th>
                  <th className="py-3 px-4">Paid Via</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredVendorPayments.map((e) => (
                  <tr key={e.id} className="hover:bg-[#FEFAF3] transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">{e.date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#C49A45]">{e.referenceNumber}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{e.description}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-mono text-slate-500">{e.paidVia}</td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-700 text-sm tabular-nums">
                      {settings.currencySymbol}{e.amount.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setExpenseToDelete(e)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Delete vendor payment record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredVendorPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Building2 className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No vendor payment vouchers in selected period</p>
                      <p className="text-xs text-slate-500 mt-0.5">Click "+ Vendor Payment" to issue cash or bank settlement to suppliers.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Vendor Payable Accounts Table */}
      {activeTab === 'vendor_accounts' && (
        <div className="space-y-4">
          {/* Payable Total Summary Banner */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <strong className="text-amber-900 block text-sm">Total Outstanding Vendor Payable</strong>
                <span className="text-amber-700">Sum of unpaid supply dues to cement & rebar manufacturers</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Total Payable Balance:</span>
              <span className="text-xl font-black text-amber-900 font-mono tabular-nums">
                {settings.currencySymbol}{totalVendorPayableBalance.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
              </span>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-[#EADBCE] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">Vendor / Company Name</th>
                    <th className="py-3 px-4">Contact Person & Phone</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Credit Terms</th>
                    <th className="py-3 px-4 text-right">Payable Balance</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredVendors.map((s) => (
                    <tr key={s.id} className="hover:bg-[#FEFAF3] transition-colors">
                      <td className="py-3 px-4">
                        <strong className="font-bold text-slate-900 block text-sm">{s.companyName}</strong>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-800 block font-medium">{s.contactPerson}</span>
                        <span className="font-mono text-slate-500 text-[11px] block">{s.phone}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {s.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{s.paymentTerms || 'Standard'}</td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-800 text-sm tabular-nums">
                        {settings.currencySymbol}{(s.balancePayable || 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenVendorPaymentModal(s.id)}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>Pay Vendor</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setVendorToDelete(s)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Delete vendor account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredVendors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">No vendor accounts registered</p>
                        <p className="text-xs text-slate-500 mt-0.5">Click "+ Add Vendor" to create vendor accounts for cement/steel suppliers.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD VENDOR PAYMENT */}
      {showVendorPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-amber-600" />
                <span>Record Vendor / Supplier Payment</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowVendorPaymentModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {vendorPaymentError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {vendorPaymentError}
              </div>
            )}

            <form onSubmit={handleSubmitVendorPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Vendor / Supplier *</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => {
                    setSelectedVendorId(e.target.value);
                    const sup = suppliers.find((s) => s.id === e.target.value);
                    if (sup && sup.balancePayable > 0) {
                      setVendorPaymentAmount(sup.balancePayable);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-bold cursor-pointer"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} &mdash; Payable: {settings.currencySymbol}{s.balancePayable.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendor Balance Card */}
              {targetVendorForPayment && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-700 uppercase font-bold block">Vendor Account:</span>
                    <strong className="text-amber-900 text-xs block">{targetVendorForPayment.companyName}</strong>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                      Contact: {targetVendorForPayment.contactPerson} ({targetVendorForPayment.phone})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-amber-700 uppercase font-bold block">Current Payable:</span>
                    <span className="text-sm font-extrabold text-amber-900 font-mono">
                      {settings.currencySymbol}{(targetVendorForPayment.balancePayable || 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Paid Amount ({settings.currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  autoFocus
                  value={vendorPaymentAmount || ''}
                  onChange={(e) => setVendorPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 text-base font-mono font-bold rounded-xl bg-[#FEFAF3] border border-slate-300 text-amber-900 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Paid Via Method *</label>
                  <select
                    value={vendorPaymentMethod}
                    onChange={(e) => setVendorPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 cursor-pointer font-bold"
                  >
                    <option value="cash">Cash Counter</option>
                    <option value="bank_transfer">Bank Transfer / Cheque</option>
                    <option value="bkash">bKash (MFS)</option>
                    <option value="nagad">Nagad (MFS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={vendorPaymentDate}
                    onChange={(e) => setVendorPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Voucher / Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. Cheque # 98124 or Bank Txn"
                  value={vendorPaymentRef}
                  onChange={(e) => setVendorPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Narration / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Payment towards cement supply invoice #8812"
                  value={vendorPaymentNotes}
                  onChange={(e) => setVendorPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowVendorPaymentModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  Save Vendor Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD OPERATING EXPENSE */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-rose-600" />
                <span>Record New Operating Expense</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Expense Category *</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 cursor-pointer font-bold"
                >
                  <option value="Labor & Unloading">Labor & Unloading</option>
                  <option value="Transport & Freight">Transport & Freight</option>
                  <option value="Yard Maintenance">Yard Maintenance</option>
                  <option value="Utilities & Electricity">Utilities & Electricity</option>
                  <option value="Office & Tea">Office & Refreshment</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Amount ({settings.currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={expenseAmount || ''}
                  onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 text-base font-mono font-bold rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Method</label>
                  <select
                    value={expensePaidVia}
                    onChange={(e) => setExpensePaidVia(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 cursor-pointer font-bold"
                  >
                    <option value="cash">Cash Counter</option>
                    <option value="bkash">bKash (MFS)</option>
                    <option value="nagad">Nagad (MFS)</option>
                    <option value="bank_transfer">Bank Transfer / Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Expense Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Unloading fee for trailer cement delivery"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD VENDOR / SUPPLIER */}
      {showVendorAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#C49A45]" />
                <span>Register New Vendor / Supplier</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowVendorAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BSRM Steel Mills Ltd"
                  value={vendorCompanyName}
                  onChange={(e) => setVendorCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Engr. Rafiq"
                    value={vendorContactPerson}
                    onChange={(e) => setVendorContactPerson(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +880 1700-000000"
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Vendor Category</label>
                  <select
                    value={vendorCategory}
                    onChange={(e) => setVendorCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-medium"
                  >
                    <option value="Cement Supplier">Cement Supplier</option>
                    <option value="Steel & Rebar Manufacturer">Steel & Rebar Manufacturer</option>
                    <option value="Sand & Aggregates">Sand & Aggregates</option>
                    <option value="Hardware & Tools">Hardware & Tools</option>
                    <option value="Transport & Freight">Transport & Freight</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Opening Payable ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={vendorOpeningPayable || ''}
                    onChange={(e) => setVendorOpeningPayable(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Terms</label>
                <input
                  type="text"
                  placeholder="e.g. 15 Days Credit"
                  value={vendorPaymentTerms}
                  onChange={(e) => setVendorPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowVendorAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  Register Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Expense Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-rose-200 shadow-2xl p-6 text-slate-900 space-y-3">
            <h3 className="text-base font-bold text-rose-700">Delete Voucher Record?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this voucher of {settings.currencySymbol}
              {expenseToDelete.amount.toLocaleString()} ({expenseToDelete.category})?
            </p>
            <div className="flex gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteExpense(expenseToDelete.id);
                  setExpenseToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Vendor Modal */}
      {vendorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-rose-200 shadow-2xl p-6 text-slate-900 space-y-3">
            <h3 className="text-base font-bold text-rose-700">Delete Vendor Account?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete vendor <strong>{vendorToDelete.companyName}</strong>?
            </p>
            <div className="flex gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setVendorToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteSupplier(vendorToDelete.id);
                  setVendorToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
