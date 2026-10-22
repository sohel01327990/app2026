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
} from 'lucide-react';

export const DailyReportModule: React.FC = () => {
  const {
    invoices,
    expenses,
    settings,
    getEffectiveInvoiceRevenue,
    getEffectiveInvoiceProfit,
    customerTransactions,
  } = usePOS();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

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

  const dayTotalPaidCash = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => {
      const cashPayments = inv.payments
        ?.filter((p) => p.method === 'cash')
        .reduce((s, p) => s + p.amount, 0) || inv.totalPaid;
      return sum + cashPayments;
    }, 0);
  }, [dayInvoices]);

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

  const openingCashBalance = Number(settings.openingCashBalance || 0);
  const estimatedClosingCash = Math.max(
    0,
    openingCashBalance + dayTotalPaidCash + dayDuesCollectedCash - dayCashExpenses - dayCashRefunds
  );

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
      dayDuesCollectedCash,
      dayCashExpenses,
      dayCashRefunds,
      estimatedClosingCash,
      invoices: dayInvoices,
      expenses: dayExpenses,
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-800 bg-[#FEFAF3]">
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

          <div className="text-[11px] text-slate-500 flex flex-wrap justify-between pt-1 border-t border-slate-100">
            <span>Gross Sales: {settings.currencySymbol}{dayGrossSales.toLocaleString()}</span>
            {dayReturnsTotal > 0 && (
              <span className="text-rose-600 font-medium">
                Returns Deducted: -{settings.currencySymbol}{dayReturnsTotal.toLocaleString()}
              </span>
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
          <span className="text-[10px] text-slate-400 block">Starting balance set by Admin</span>
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

        <div className="p-4 rounded-2xl bg-white border border-[#C49A45]/40 shadow-xs space-y-1 bg-amber-50/30">
          <span className="text-xs text-slate-700 font-bold block">Closing Cash in Hand</span>
          <span className="text-xl font-extrabold text-[#C49A45] font-mono tabular-nums">
            {settings.currencySymbol} {estimatedClosingCash.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">Opening + Inflows - Outflows</span>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices */}
        <div className="bg-white border border-[#EADBCE] rounded-3xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#C49A45]" />
              <span>Invoices for Date ({dayInvoices.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Date: {selectedDate}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
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
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.id}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold block text-slate-900">{inv.customerName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {settings.currencySymbol}{effective.toLocaleString()}
                        {isReturned && (
                          <span className="text-[10px] text-rose-600 block font-normal">Return Adjusted</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        {settings.currencySymbol}{inv.totalPaid.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">
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
        <div className="bg-white border border-[#EADBCE] rounded-3xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>Expenses for Date ({dayExpenses.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Total: {settings.currencySymbol}{dayTotalExpense.toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
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
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{exp.category}</td>
                    <td className="py-2.5 px-3 text-slate-600">{exp.description}</td>
                    <td className="py-2.5 px-3 text-[11px] capitalize text-slate-500">{exp.paidVia}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
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
      </div>
    </div>
  </div>
);
};
