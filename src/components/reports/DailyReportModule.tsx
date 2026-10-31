import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { printDailyReportSafely } from '../../utils/generateInvoicePDF';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Printer,
  ChevronLeft,
  ChevronRight,
  Receipt,
  CheckCircle2,
  ArrowDownLeft,
  Wallet,
  ArrowUpRight,
  Plus,
  Trash2,
  X,
  AlertCircle,
  PiggyBank,
  Check,
} from 'lucide-react';

export const DailyReportModule: React.FC = () => {
  const {
    invoices,
    expenses,
    settings,
    getEffectiveInvoiceRevenue,
    getEffectiveInvoiceProfit,
    customerTransactions,
    cashWithdrawals,
    recordCashWithdrawal,
    deleteCashWithdrawal,
    currentUser,
  } = usePOS();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Cash withdrawal modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawnBy, setWithdrawnBy] = useState<string>('');
  const [withdrawPurpose, setWithdrawPurpose] = useState<string>('Owner Draw / Bank Deposit');
  const [withdrawNote, setWithdrawNote] = useState<string>('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string>('');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string>('');

  const handleDateShift = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().slice(0, 10));
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  const dayInvoices = useMemo(() => {
    return invoices.filter(
      (inv) => inv.createdAt.startsWith(selectedDate) && inv.status !== 'cancelled'
    );
  }, [invoices, selectedDate]);

  const dayExpenses = useMemo(() => {
    return expenses.filter((e) => e.date.startsWith(selectedDate));
  }, [expenses, selectedDate]);

  const dayGrossSales = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [dayInvoices]);

  const dayReturnsTotal = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => {
      return sum + (inv.returns?.reduce((s, r) => s + r.totalRefunded, 0) || 0);
    }, 0);
  }, [dayInvoices]);

  const dayNetIncome = useMemo(() => {
    return Math.max(0, dayGrossSales - dayReturnsTotal);
  }, [dayGrossSales, dayReturnsTotal]);

  const dayTotalExpense = useMemo(() => {
    return dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [dayExpenses]);

  const dayGrossProfit = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => sum + getEffectiveInvoiceProfit(inv), 0);
  }, [dayInvoices, getEffectiveInvoiceProfit]);

  const dayNetProfit = useMemo(() => {
    return dayGrossProfit - dayTotalExpense;
  }, [dayGrossProfit, dayTotalExpense]);

  const dayCashRevenue = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => {
      const cashPayments = inv.payments
        ?.filter((p) => p.method === 'cash')
        .reduce((s, p) => s + p.amount, 0) ?? (inv.payments && inv.payments.length > 0 ? 0 : inv.totalPaid);
      return sum + cashPayments;
    }, 0);
  }, [dayInvoices]);

  const dayBankTransferRevenue = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => {
      const bankPayments = inv.payments
        ?.filter((p) => p.method === 'bank_transfer')
        .reduce((s, p) => s + p.amount, 0) || 0;
      return sum + bankPayments;
    }, 0);
  }, [dayInvoices]);

  const dayMobileRevenue = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => {
      const mobPayments = inv.payments
        ?.filter((p) => p.method === 'bkash' || p.method === 'nagad')
        .reduce((s, p) => s + p.amount, 0) || 0;
      return sum + mobPayments;
    }, 0);
  }, [dayInvoices]);

  const dayTotalPaidCash = dayCashRevenue;

  const dayTotalDue = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
  }, [dayInvoices]);

  // Cash Reconciliation with Initial Opening Cash Balance
  const dayDuesCollectedCash = useMemo(() => {
    return (customerTransactions || [])
      .filter((tx) => tx.date.startsWith(selectedDate) && tx.type === 'due_payment')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [customerTransactions, selectedDate]);

  const dayCashExpenses = useMemo(() => {
    return dayExpenses
      .filter((e) => e.paidVia === 'cash' || !e.paidVia)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [dayExpenses]);

  const dayCashRefunds = useMemo(() => {
    return (customerTransactions || [])
      .filter((tx) => tx.date.startsWith(selectedDate) && (tx.type === 'cash_refund' || tx.type === 'material_return'))
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [customerTransactions, selectedDate]);

  // Automatically calculate opening cash balance from previous day's remaining cash balance, chained back to base settings
  const openingCashBalance = useMemo(() => {
    const allDatesSet = new Set<string>();
    invoices.forEach(inv => { if (inv.status !== 'cancelled') allDatesSet.add(inv.createdAt.slice(0, 10)); });
    expenses.forEach(e => allDatesSet.add(e.date.slice(0, 10)));
    (customerTransactions || []).forEach(tx => allDatesSet.add(tx.date.slice(0, 10)));
    (cashWithdrawals || []).forEach(w => allDatesSet.add(w.date));

    const sortedDates = Array.from(allDatesSet).filter(d => d < selectedDate).sort();
    if (sortedDates.length === 0) {
      return Number(settings.openingCashBalance || 0);
    }

    let runningOpening = Number(settings.openingCashBalance || 0);

    for (const d of sortedDates) {
      const dInv = invoices.filter(inv => inv.createdAt.startsWith(d) && inv.status !== 'cancelled');
      const dExp = expenses.filter(e => e.date.startsWith(d));
      const dTx = (customerTransactions || []).filter(tx => tx.date.startsWith(d));
      const dWd = (cashWithdrawals || []).filter(w => w.date === d);

      const paidCash = dInv.reduce((sum, inv) => {
        const cp = inv.payments?.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0) ?? (inv.payments && inv.payments.length > 0 ? 0 : inv.totalPaid);
        return sum + cp;
      }, 0);
      const duesCollected = dTx.filter(tx => tx.type === 'due_payment').reduce((sum, tx) => sum + tx.amount, 0);
      const cashExp = dExp.filter(e => e.paidVia === 'cash' || !e.paidVia).reduce((sum, e) => sum + e.amount, 0);
      const cashRef = dTx.filter(tx => tx.type === 'cash_refund' || tx.type === 'material_return').reduce((sum, tx) => sum + tx.amount, 0);
      const withdrawn = dWd.reduce((sum, w) => sum + w.amount, 0);

      const closing = Math.max(0, runningOpening + paidCash + duesCollected - cashExp - cashRef);
      runningOpening = Math.max(0, closing - withdrawn);
    }

    return runningOpening;
  }, [selectedDate, invoices, expenses, customerTransactions, cashWithdrawals, settings.openingCashBalance]);

  const estimatedClosingCash = Math.max(
    0,
    openingCashBalance + dayTotalPaidCash + dayDuesCollectedCash - dayCashExpenses - dayCashRefunds
  );

  // Cash Withdrawals for this date
  const dayCashWithdrawals = useMemo(() => {
    return (cashWithdrawals || []).filter((w) => w.date === selectedDate);
  }, [cashWithdrawals, selectedDate]);

  const dayTotalCashWithdrawn = useMemo(() => {
    return dayCashWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  }, [dayCashWithdrawals]);

  // Remaining Balance in drawer/safe after cash withdrawals
  const dayRemainingCashBalance = useMemo(() => {
    return Math.max(0, estimatedClosingCash - dayTotalCashWithdrawn);
  }, [estimatedClosingCash, dayTotalCashWithdrawn]);

  const openWithdrawModal = () => {
    setWithdrawAmount('');
    setWithdrawnBy(currentUser?.name || 'Store Owner');
    setWithdrawPurpose('Owner Draw / Bank Deposit');
    setWithdrawNote('');
    setWithdrawError('');
    setWithdrawSuccessMsg('');
    setShowWithdrawModal(true);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setWithdrawError('Please enter a valid cash amount to withdraw.');
      return;
    }
    setWithdrawSubmitting(true);
    setWithdrawError('');
    const res = await recordCashWithdrawal({
      date: selectedDate,
      amount: amt,
      withdrawnBy: withdrawnBy.trim() || currentUser?.name || 'Store Owner',
      purpose: withdrawPurpose,
      note: withdrawNote,
      closingCashBefore: estimatedClosingCash,
    });
    setWithdrawSubmitting(false);
    if (res.success) {
      setWithdrawSuccessMsg('Cash withdrawal recorded successfully and synced to Firebase!');
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawSuccessMsg('');
      }, 900);
    } else {
      setWithdrawError(res.message);
    }
  };

  const handleDeleteWithdrawal = async (id: string, amount: number) => {
    if (window.confirm(`Are you sure you want to cancel and delete this cash withdrawal of ${settings.currencySymbol}${amount.toLocaleString()}? The amount will return to the remaining balance.`)) {
      await deleteCashWithdrawal(id);
    }
  };

  const handlePrintDailyReport = () => {
    printDailyReportSafely({
      selectedDate,
      settings,
      dayGrossSales,
      dayReturnsTotal,
      dayNetIncome,
      dayTotalExpense,
      dayGrossProfit,
      dayNetProfit,
      openingCashBalance,
      dayTotalPaidCash,
      dayCashRevenue,
      dayBankTransferRevenue,
      dayMobileRevenue,
      dayDuesCollectedCash,
      dayCashExpenses,
      dayCashRefunds,
      estimatedClosingCash,
      cashWithdrawnToday: dayTotalCashWithdrawn,
      remainingCashBalance: dayRemainingCashBalance,
      withdrawals: dayCashWithdrawals,
      invoices: dayInvoices,
      expenses: dayExpenses,
    });
  };

  return (
    <div className="p-4 sm:p-6 pb-28 space-y-6 max-w-7xl mx-auto font-sans text-slate-800 bg-[#FEFAF3]">
      <div id="daily-report-printable" className="space-y-6">
      {/* Header with Date Selector */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#EADBCE]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#C49A45]" />
            <span>Daily Financial Report (Income, Expenses & Net Profit)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select any date to view that specific day's income, expenses, and net profit with return deductions
          </p>
        </div>

        {/* Date Selector & Print Button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleDateShift(-1)}
            className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#C49A45] shadow-xs cursor-pointer font-mono"
          />

          <button
            onClick={() => handleDateShift(1)}
            className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleSetToday}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors cursor-pointer"
          >
            Today
          </button>


          <button
            onClick={handlePrintDailyReport}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 3 Core Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Daily Income */}
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Day's Total Revenue (Income)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono">
              {dayInvoices.length} Invoices
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tabular-nums tracking-tight">
            {settings.currencySymbol}
            {dayNetIncome.toLocaleString()}
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between">
              <span>Gross Sales: {settings.currencySymbol}{dayGrossSales.toLocaleString()}</span>
              {dayReturnsTotal > 0 && (
                <span className="text-rose-600 font-medium">
                  Returns: -{settings.currencySymbol}{dayReturnsTotal.toLocaleString()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-semibold block">Cash Revenue:</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">{settings.currencySymbol}{dayCashRevenue.toLocaleString()}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-blue-50/80 border border-blue-200">
                <span className="text-[10px] text-blue-800 font-semibold block">Bank Transfer:</span>
                <span className="font-mono font-bold text-blue-700 text-xs">{settings.currencySymbol}{dayBankTransferRevenue.toLocaleString()}</span>
              </div>
            </div>
            {dayMobileRevenue > 0 && (
              <div className="text-[10px] text-purple-700 font-medium">
                Mobile Banking (bKash/Nagad): {settings.currencySymbol}{dayMobileRevenue.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* 2. Daily Expense */}
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-rose-800">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>Day's Total Expenses</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono">
              {dayExpenses.length} Vouchers
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono tabular-nums tracking-tight">
            {settings.currencySymbol}
            {dayTotalExpense.toLocaleString()}
          </div>

          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Labor, transport & daily yard operations</span>
          </div>
        </div>

        {/* 3. Daily Profit */}
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#C49A45]" />
              <span>Day's Net Profit</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              dayNetProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {dayNetProfit >= 0 ? 'Profit' : 'Loss'}
            </span>
          </div>

          <div className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight ${
            dayNetProfit >= 0 ? 'text-[#C49A45]' : 'text-rose-600'
          }`}>
            {settings.currencySymbol}
            {dayNetProfit.toLocaleString()}
          </div>

          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
            <span>Gross Margin: {settings.currencySymbol}{dayGrossProfit.toLocaleString()}</span>
            <span>Expenses: -{settings.currencySymbol}{dayTotalExpense.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Cash Flow Reconciliation Accounting for Opening Cash Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#EADBCE] shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-semibold block">Opening Cash Balance</span>
          <span className="text-xl font-bold text-amber-700 font-mono tabular-nums">
            {settings.currencySymbol} {openingCashBalance.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block">Auto from previous day's remaining balance</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EADBCE] shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-semibold block">Cash Inflow Today</span>
          <span className="text-xl font-bold text-emerald-700 font-mono tabular-nums">
            {settings.currencySymbol} {(dayTotalPaidCash + dayDuesCollectedCash).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">
            Sales: {settings.currencySymbol} {dayTotalPaidCash.toLocaleString()} | Dues: {settings.currencySymbol} {dayDuesCollectedCash.toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EADBCE] shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-semibold block">Cash Outflow Today</span>
          <span className="text-xl font-bold text-rose-600 font-mono tabular-nums">
            {settings.currencySymbol} {(dayCashExpenses + dayCashRefunds).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">
            Expenses: {settings.currencySymbol} {dayCashExpenses.toLocaleString()} | Refunds: {settings.currencySymbol} {dayCashRefunds.toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#C49A45]/40 shadow-xs space-y-1 bg-amber-50/20">
          <span className="text-xs text-slate-700 font-bold block">Closing Cash in Hand</span>
          <span className="text-xl font-extrabold text-[#C49A45] font-mono tabular-nums">
            {settings.currencySymbol} {estimatedClosingCash.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">Opening + Inflows - Outflows</span>
        </div>
      </div>

      {/* Prominent Cash Withdrawal & Remaining Balance Reconciliation Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-50 via-white to-emerald-50 border-2 border-emerald-300/80 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
        {/* Left: Cash Withdrawn Today */}
        <div className="flex-1 flex items-center justify-between p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
              <Wallet className="w-4 h-4 text-rose-600" />
              <span>Day's Cash Withdrawn</span>
            </div>
            <div className="text-2xl font-black font-mono text-rose-600 tabular-nums">
              {settings.currencySymbol} {dayTotalCashWithdrawn.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500">
              {dayCashWithdrawals.length} withdrawal voucher(s) logged today
            </div>
          </div>

          <button
            type="button"
            onClick={openWithdrawModal}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0 ml-3"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Withdraw Cash</span>
          </button>
        </div>

        {/* Middle: Math Calculation Arrow */}
        <div className="hidden lg:flex flex-col items-center justify-center px-2 text-center text-xs font-mono font-semibold text-slate-400">
          <span>Closing ({settings.currencySymbol}{estimatedClosingCash.toLocaleString()})</span>
          <span className="text-rose-500 font-bold">- Withdrawn ({settings.currencySymbol}{dayTotalCashWithdrawn.toLocaleString()})</span>
          <span className="text-emerald-700 font-bold">= Remaining Balance</span>
        </div>

        {/* Right: Remaining Cash Balance */}
        <div className="flex-1 flex items-center justify-between p-4 rounded-2xl bg-emerald-600 text-white shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-100">
              <PiggyBank className="w-4 h-4 text-emerald-200" />
              <span>Remaining Balance in Hand / Safe</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tabular-nums tracking-tight">
              {settings.currencySymbol} {dayRemainingCashBalance.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-100/90 font-medium">
              Closing Cash - Cash Withdrawn = Net Remaining in Drawer / Safe
            </div>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider font-mono">
            Available
          </span>
        </div>
      </div>

      {/* Tables Section: Invoices, Expenses & Cash Withdrawals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoices */}
        <div className="bg-white border border-[#EADBCE] rounded-3xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#C49A45]" />
              <span>Invoices ({dayInvoices.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Date: {selectedDate}</span>
          </div>

          <div className="overflow-x-auto flex-1 max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Net Bill</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dayInvoices.map((inv) => {
                  const effective = getEffectiveInvoiceRevenue(inv);
                  const isReturned = (inv.returns && inv.returns.length > 0);
                  return (
                    <tr key={inv.id} className="hover:bg-[#FEFAF3]">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{inv.id}</td>
                      <td className="py-2 px-3">
                        <span className="font-semibold block text-slate-900 truncate max-w-[120px]">{inv.customerName}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                        {settings.currencySymbol}{effective.toLocaleString()}
                        {isReturned && (
                          <span className="text-[10px] text-rose-600 block font-normal">Return Adjusted</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                        {settings.currencySymbol}{inv.totalPaid.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-rose-600 font-semibold whitespace-nowrap">
                        {settings.currencySymbol}{inv.dueAmount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {dayInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      No invoices recorded on this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white border border-[#EADBCE] rounded-3xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>Expenses ({dayExpenses.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Total: {settings.currencySymbol}{dayTotalExpense.toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto flex-1 max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dayExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FEFAF3]">
                    <td className="py-2 px-3 font-semibold text-slate-900">{exp.category}</td>
                    <td className="py-2 px-3 text-slate-600 truncate max-w-[120px]">{exp.description}</td>
                    <td className="py-2 px-3 text-[11px] capitalize text-slate-500">{exp.paidVia}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                      {settings.currencySymbol}{exp.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {dayExpenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                      No expenses logged on this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cash Withdrawals Table */}
        <div className="bg-white border border-[#EADBCE] rounded-3xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-rose-600" />
              <span>Cash Withdrawals ({dayCashWithdrawals.length})</span>
            </h3>
            <button
              type="button"
              onClick={openWithdrawModal}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Withdraw</span>
            </button>
          </div>

          <div className="overflow-x-auto flex-1 max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">By / Reason</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dayCashWithdrawals.map((wth) => (
                  <tr key={wth.id} className="hover:bg-[#FEFAF3]">
                    <td className="py-2 px-3 font-mono font-bold text-rose-600 whitespace-nowrap">
                      {settings.currencySymbol}{wth.amount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-semibold block text-slate-900">{wth.withdrawnBy}</span>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                        {wth.purpose || 'Owner draw'} {wth.note ? `(${wth.note})` : ''}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(wth.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteWithdrawal(wth.id, wth.amount)}
                        title="Delete withdrawal"
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {dayCashWithdrawals.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs space-y-1">
                      <p>No cash withdrawals on this date.</p>
                      <button
                        type="button"
                        onClick={openWithdrawModal}
                        className="text-rose-600 font-bold hover:underline"
                      >
                        + Withdraw Cash Now
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    {/* Record Cash Withdrawal Modal */}
    {showWithdrawModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-rose-600" />
              <span>Record Daily Cash Withdrawal</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowWithdrawModal(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Balance Overview Card inside Modal */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Closing Cash in Hand:</span>
              <span className="font-mono font-bold text-slate-900">
                {settings.currencySymbol} {estimatedClosingCash.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Already Withdrawn Today:</span>
              <span className="font-mono font-bold text-rose-600">
                -{settings.currencySymbol} {dayTotalCashWithdrawn.toLocaleString()}
              </span>
            </div>
            <div className="pt-2 border-t border-amber-200 flex items-center justify-between font-bold">
              <span className="text-slate-800">Available Balance:</span>
              <span className="font-mono text-emerald-700 text-sm">
                {settings.currencySymbol} {dayRemainingCashBalance.toLocaleString()}
              </span>
            </div>
          </div>

          {withdrawError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{withdrawError}</span>
            </div>
          )}

          {withdrawSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{withdrawSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleWithdrawSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Withdrawal Amount ({settings.currencySymbol}) *
              </label>
              <input
                type="number"
                min="0.001"
                step="any"
                required
                placeholder="Enter amount to withdraw..."
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Purpose / Reason *</label>
              <select
                value={withdrawPurpose}
                onChange={(e) => setWithdrawPurpose(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-rose-500"
              >
                <option value="Owner Draw / Bank Deposit">Owner Draw / Bank Deposit</option>
                <option value="Safe / Vault Transfer">Safe / Vault Transfer</option>
                <option value="Cash Deposit to Bank">Cash Deposit to Bank</option>
                <option value="Emergency Operating Advance">Emergency Operating Advance</option>
                <option value="Supplier Cash Settlement">Supplier Cash Settlement</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Withdrawn By *</label>
              <input
                type="text"
                required
                placeholder="Name of person withdrawing cash"
                value={withdrawnBy}
                onChange={(e) => setWithdrawnBy(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Note / Voucher Ref (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Bank slip #124 or personal draw"
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Live Remaining Balance Calculation Preview */}
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between">
              <span className="text-slate-700 font-medium">Remaining Cash after this Withdrawal:</span>
              <span className="font-mono font-black text-emerald-800 text-sm">
                {settings.currencySymbol}{' '}
                {Math.max(0, dayRemainingCashBalance - (parseFloat(withdrawAmount) || 0)).toLocaleString()}
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={withdrawSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
              >
                {withdrawSubmitting ? 'Saving to Firebase...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);
};
