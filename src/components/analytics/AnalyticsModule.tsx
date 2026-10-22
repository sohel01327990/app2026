import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { formatCurrencyAmount } from '../../utils/currencyAndWords';
import { printMonthlyReportSafely } from '../../utils/generateInvoicePDF';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  TrendingDown,
  Wallet,
  Calendar,
  Printer,
  Receipt,
  CheckCircle2,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const AnalyticsModule: React.FC = () => {
  const {
    invoices,
    expenses,
    products,
    customers,
    settings,
    getEffectiveInvoiceRevenue,
    getEffectiveInvoiceProfit,
    customerTransactions,
  } = usePOS();

  // Helper: Format YYYY-MM-DD to DD-MM-YYYY (Day-month-year)
  const formatDateDMY = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
    }
    return dateStr;
  };

  // State: Exact Date Range (YYYY-MM-DD)
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`; // Default from Jan 1st of current year
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10); // Default to today
  });

  // Safe normalized range [rangeStart, rangeEnd]
  const [rangeStart, rangeEnd] = useMemo(() => {
    if (startDate > endDate) {
      return [endDate, startDate];
    }
    return [startDate, endDate];
  }, [startDate, endDate]);

  // List of all months spanned by the selected date range
  const monthsList = useMemo(() => {
    const list: string[] = [];
    const startMStr = rangeStart.slice(0, 7);
    const endMStr = rangeEnd.slice(0, 7);

    const [sY, sM] = startMStr.split('-').map(Number);
    const [eY, eM] = endMStr.split('-').map(Number);
    let y = sY;
    let m = sM;

    while (y < eY || (y === eY && m <= eM)) {
      list.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return list;
  }, [rangeStart, rangeEnd]);

  // Filter Invoices in Selected Date Range (Day-Month-Year precision)
  const rangeInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const invDate = inv.createdAt.slice(0, 10);
      return invDate >= rangeStart && invDate <= rangeEnd && inv.status !== 'cancelled';
    });
  }, [invoices, rangeStart, rangeEnd]);

  // Filter Expenses in Selected Date Range
  const rangeExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const expDate = exp.date.slice(0, 10);
      return expDate >= rangeStart && expDate <= rangeEnd;
    });
  }, [expenses, rangeStart, rangeEnd]);

  // Calculations for Selected Date Range
  const rangeGrossSales = useMemo(() => {
    return rangeInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [rangeInvoices]);

  const rangeReturnsTotal = useMemo(() => {
    return rangeInvoices.reduce((sum, inv) => {
      return sum + (inv.returns?.reduce((s, r) => s + r.totalRefunded, 0) || 0);
    }, 0);
  }, [rangeInvoices]);

  const rangeRevenue = useMemo(() => {
    return rangeInvoices.reduce((sum, inv) => sum + getEffectiveInvoiceRevenue(inv), 0);
  }, [rangeInvoices, getEffectiveInvoiceRevenue]);

  const rangeExpensesTotal = useMemo(() => {
    return rangeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [rangeExpenses]);

  const rangeGrossProfit = useMemo(() => {
    return rangeInvoices.reduce((sum, inv) => sum + getEffectiveInvoiceProfit(inv), 0);
  }, [rangeInvoices, getEffectiveInvoiceProfit]);

  const rangeNetProfit = useMemo(() => {
    return rangeGrossProfit - rangeExpensesTotal;
  }, [rangeGrossProfit, rangeExpensesTotal]);

  const rangeProfitMargin = useMemo(() => {
    if (rangeRevenue <= 0) return 0;
    return (rangeNetProfit / rangeRevenue) * 100;
  }, [rangeRevenue, rangeNetProfit]);

  // Cash flow in range
  const rangeCashSales = useMemo(() => {
    return rangeInvoices.reduce((sum, inv) => {
      const cashOnly =
        inv.payments
          ?.filter((p) => p.method === 'cash')
          .reduce((s, p) => s + p.amount, 0) || inv.totalPaid;
      return sum + cashOnly;
    }, 0);
  }, [rangeInvoices]);

  const rangeDuesCollectedCash = useMemo(() => {
    return (customerTransactions || [])
      .filter((tx) => {
        const txDate = tx.date.slice(0, 10);
        return txDate >= rangeStart && txDate <= rangeEnd && tx.type === 'due_payment';
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [customerTransactions, rangeStart, rangeEnd]);

  const rangeCashExpenses = useMemo(() => {
    return rangeExpenses
      .filter((e) => e.paidVia === 'cash' || !e.paidVia)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [rangeExpenses]);

  const rangeCashRefunds = useMemo(() => {
    return (customerTransactions || [])
      .filter((tx) => {
        const txDate = tx.date.slice(0, 10);
        return (
          txDate >= rangeStart &&
          txDate <= rangeEnd &&
          (tx.type === 'cash_refund' || tx.type === 'material_return')
        );
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [customerTransactions, rangeStart, rangeEnd]);

  const rangeNetCashFlow = useMemo(() => {
    return rangeCashSales + rangeDuesCollectedCash - (rangeCashExpenses + rangeCashRefunds);
  }, [rangeCashSales, rangeDuesCollectedCash, rangeCashExpenses, rangeCashRefunds]);

  // Inventory & Receivables context
  const inventoryValuation = products.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);
  const totalReceivables = customers.reduce((sum, c) => sum + c.currentDue, 0);

  // Month-by-Month Breakdown within the selected date boundary
  const monthlyBreakdown = useMemo(() => {
    return monthsList.map((mStr) => {
      const [y, m] = mStr.split('-').map(Number);
      const dObj = new Date(y, m - 1, 1);
      const monthLabel = dObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      // Invoices that fall both in this month AND within [rangeStart, rangeEnd]
      const mInvoices = invoices.filter((inv) => {
        const d = inv.createdAt.slice(0, 10);
        return inv.createdAt.startsWith(mStr) && d >= rangeStart && d <= rangeEnd && inv.status !== 'cancelled';
      });

      // Expenses that fall both in this month AND within [rangeStart, rangeEnd]
      const mExpenses = expenses.filter((exp) => {
        const d = exp.date.slice(0, 10);
        return exp.date.startsWith(mStr) && d >= rangeStart && d <= rangeEnd;
      });

      const rev = mInvoices.reduce((sum, inv) => sum + getEffectiveInvoiceRevenue(inv), 0);
      const exp = mExpenses.reduce((sum, e) => sum + e.amount, 0);
      const grossMargin = mInvoices.reduce((sum, inv) => sum + getEffectiveInvoiceProfit(inv), 0);
      const netProf = grossMargin - exp;
      const marginPct = rev > 0 ? (netProf / rev) * 100 : 0;

      return {
        month: mStr,
        monthLabel,
        invoiceCount: mInvoices.length,
        revenue: rev,
        expenses: exp,
        grossMargin,
        netProfit: netProf,
        marginPct,
      };
    });
  }, [monthsList, invoices, expenses, rangeStart, rangeEnd, getEffectiveInvoiceRevenue, getEffectiveInvoiceProfit]);

  // Top Expense Categories in Range
  const topExpenseCategories = useMemo(() => {
    const map = new Map<string, number>();
    rangeExpenses.forEach((e) => {
      const cat = e.category || 'General Operations';
      map.set(cat, (map.get(cat) || 0) + e.amount);
    });

    const arr = Array.from(map.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: rangeExpensesTotal > 0 ? (amount / rangeExpensesTotal) * 100 : 0,
    }));
    return arr.sort((a, b) => b.amount - a.amount);
  }, [rangeExpenses, rangeExpensesTotal]);

  // Max value for comparative visual chart
  const maxChartVal = useMemo(() => {
    const peak = Math.max(
      ...monthlyBreakdown.map((m) => Math.max(m.revenue, m.expenses, Math.max(0, m.netProfit))),
      100
    );
    return peak * 1.25;
  }, [monthlyBreakdown]);

  // Trigger Print Report
  const handlePrintReport = () => {
    printMonthlyReportSafely({
      startMonth: formatDateDMY(rangeStart),
      endMonth: formatDateDMY(rangeEnd),
      settings,
      rangeRevenue,
      rangeGrossSales,
      rangeReturnsTotal,
      rangeExpenses: rangeExpensesTotal,
      rangeGrossProfit,
      rangeNetProfit,
      profitMarginPct: rangeProfitMargin,
      invoiceCount: rangeInvoices.length,
      expenseCount: rangeExpenses.length,
      monthlyBreakdown,
      topExpenseCategories,
    });
  };

  const curr = settings.currencySymbol || 'OMR';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-900 bg-[#FEFAF3]">
      {/* Header with Title and Day-Month-Year Range Picker Toolbar */}
      <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EADBCE]">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#C49A45]" />
              <span>Financial Analytics & Profit Intelligence</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              শুরুর তারিখ (Day-Month-Year) থেকে শেষ তারিখ (Day-Month-Year) পর্যন্ত আয়, ব্যয়, লাভ ও আর্থিক বিশ্লেষণের হিসাব
            </p>
          </div>

          {/* Action: Print / PDF Report */}
          <button
            onClick={handlePrintReport}
            className="self-start md:self-auto px-4 py-2 text-xs font-bold rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Financial Statement</span>
          </button>
        </div>

        {/* Day-Month-Year Date Range Inputs (No Presets) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-4 pt-1">
          {/* From: Day-month-year */}
          <div className="flex items-center gap-2 bg-[#FEFAF3] px-3.5 py-2 rounded-2xl border border-[#EADBCE]">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="w-4 h-4 text-[#C49A45]" />
              <span>From: Day-month-year</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold font-mono rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#C49A45] cursor-pointer"
            />
            <span className="text-[11px] font-bold font-mono text-[#856324] bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
              {formatDateDMY(startDate)}
            </span>
          </div>

          <span className="text-slate-400 font-bold hidden sm:flex items-center">
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </span>

          {/* To: Day-month-year */}
          <div className="flex items-center gap-2 bg-[#FEFAF3] px-3.5 py-2 rounded-2xl border border-[#EADBCE]">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="w-4 h-4 text-[#C49A45]" />
              <span>To: Day-month-year</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold font-mono rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#C49A45] cursor-pointer"
            />
            <span className="text-[11px] font-bold font-mono text-[#856324] bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
              {formatDateDMY(endDate)}
            </span>
          </div>
        </div>

        {/* Selected Range Confirmation Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE] text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 font-bold text-[#856324]">
              <CheckCircle2 className="w-4 h-4 text-[#C49A45]" />
              <span>Viewing Range:</span>
            </span>
            <span className="font-extrabold text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-xs font-mono">
              From: {formatDateDMY(rangeStart)} &nbsp;&rarr;&nbsp; To: {formatDateDMY(rangeEnd)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              ({monthsList.length} {monthsList.length === 1 ? 'Month span' : 'Months span'})
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
            <span>Invoices: <strong className="text-slate-900">{rangeInvoices.length}</strong></span>
            <span>&middot;</span>
            <span>Expense Vouchers: <strong className="text-slate-900">{rangeExpenses.length}</strong></span>
          </div>
        </div>
      </div>

      {/* KPI Cards for the Selected Day-Month-Year Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Range Revenue */}
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Range Effective Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {curr} {formatCurrencyAmount(rangeRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between items-center pt-0.5">
            <span>Gross: {curr} {formatCurrencyAmount(rangeGrossSales)}</span>
            {rangeReturnsTotal > 0 && (
              <span className="text-rose-600 font-medium">-{curr} {formatCurrencyAmount(rangeReturnsTotal)}</span>
            )}
          </div>
        </div>

        {/* Total Range Operating Expenses */}
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Range Operating Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 font-mono tabular-nums">
            {curr} {formatCurrencyAmount(rangeExpensesTotal)}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {rangeExpenses.length} expense vouchers in range
          </span>
        </div>

        {/* Range Net Profit */}
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Range Net Profit</span>
            <DollarSign className="w-4 h-4 text-[#C49A45]" />
          </div>
          <div
            className={`text-2xl font-extrabold font-mono tabular-nums ${
              rangeNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {curr} {formatCurrencyAmount(rangeNetProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-slate-500">Gross Margin: {curr} {formatCurrencyAmount(rangeGrossProfit)}</span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded ${
                rangeNetProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {rangeProfitMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Range Net Cash Flow */}
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Range Net Cash Inflow</span>
            <Wallet className="w-4 h-4 text-[#C49A45]" />
          </div>
          <div
            className={`text-2xl font-extrabold font-mono tabular-nums ${
              rangeNetCashFlow >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {curr} {formatCurrencyAmount(rangeNetCashFlow)}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Cash Sales + Dues - Expenses & Refunds
          </span>
        </div>
      </div>

      {/* Multi-Month Visual Bar Chart */}
      <div className="p-6 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#C49A45]" />
              <span>Financial Performance Timeline ({formatDateDMY(rangeStart)} &mdash; {formatDateDMY(rangeEnd)})</span>
            </h3>
            <p className="text-xs text-slate-500">
              নির্বাচিত সময়সীমার আয় (Revenue), ব্যয় (Expense) এবং নিট লাভের (Net Profit) তুলনামূলক চার্ট ({curr})
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-[#856324]">
              <span className="w-3 h-3 rounded-sm bg-[#C49A45] inline-block" /> Revenue
            </span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Expenses
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Net Profit
            </span>
          </div>
        </div>

        {/* Responsive Bar Chart SVG */}
        <div className="h-64 w-full pt-4">
          <svg viewBox="0 0 700 240" className="w-full h-full overflow-visible">
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = 200 - pct * 180;
              return (
                <g key={idx}>
                  <line x1="40" y1={y} x2="690" y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <text x="35" y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                    {formatCurrencyAmount(maxChartVal * pct).slice(0, -4)}
                  </text>
                </g>
              );
            })}

            {monthlyBreakdown.map((m, idx) => {
              const count = monthlyBreakdown.length;
              const colWidth = Math.min(60, 600 / Math.max(count, 1));
              const startX = 50 + (600 / count) * idx + (600 / count - colWidth) / 2;
              const barW = Math.max(4, colWidth / 3.4);

              const salesHeight = (m.revenue / maxChartVal) * 180;
              const expenseHeight = (m.expenses / maxChartVal) * 180;
              const profitHeight = Math.max(0, (m.netProfit / maxChartVal) * 180);

              return (
                <g key={idx} className="transition-opacity hover:opacity-80">
                  {/* Revenue Bar */}
                  <rect
                    x={startX}
                    y={200 - salesHeight}
                    width={barW}
                    height={Math.max(2, salesHeight)}
                    rx="3"
                    fill="#C49A45"
                  >
                    <title>{`${m.monthLabel} Revenue: ${curr} ${formatCurrencyAmount(m.revenue)}`}</title>
                  </rect>

                  {/* Expense Bar */}
                  <rect
                    x={startX + barW + 2}
                    y={200 - expenseHeight}
                    width={barW}
                    height={Math.max(2, expenseHeight)}
                    rx="3"
                    fill="#f43f5e"
                  >
                    <title>{`${m.monthLabel} Expenses: ${curr} ${formatCurrencyAmount(m.expenses)}`}</title>
                  </rect>

                  {/* Profit Bar */}
                  <rect
                    x={startX + (barW + 2) * 2}
                    y={200 - profitHeight}
                    width={barW}
                    height={Math.max(2, profitHeight)}
                    rx="3"
                    fill="#10b981"
                  >
                    <title>{`${m.monthLabel} Net Profit: ${curr} ${formatCurrencyAmount(m.netProfit)}`}</title>
                  </rect>

                  {/* Month Label */}
                  <text
                    x={startX + barW * 1.5 + 2}
                    y="218"
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#64748b"
                    fontWeight="600"
                  >
                    {m.monthLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Breakdown Ledger Table */}
      <div className="p-6 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#C49A45]" />
              <span>Periodic Financial Breakdown ({formatDateDMY(rangeStart)} to {formatDateDMY(rangeEnd)})</span>
            </h3>
            <p className="text-xs text-slate-500">
              নির্বাচিত সময়কালের আয়, ব্যয়, গ্রস মার্জিন এবং নিট লাভের বিস্তারিত বিবরণী
            </p>
          </div>

          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            {rangeInvoices.length} Invoices &middot; {rangeExpenses.length} Expenses
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FEFAF3] text-slate-700 font-bold uppercase text-[10.5px] border-y border-[#EADBCE]">
                <th className="py-3 px-3.5">Period</th>
                <th className="py-3 px-3 text-center">Invoices</th>
                <th className="py-3 px-3 text-right">Revenue ({curr})</th>
                <th className="py-3 px-3 text-right">Expenses ({curr})</th>
                <th className="py-3 px-3 text-right">Gross Margin ({curr})</th>
                <th className="py-3 px-3 text-right">Net Profit / Loss ({curr})</th>
                <th className="py-3 px-3.5 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {monthlyBreakdown.map((m) => (
                <tr key={m.month} className="hover:bg-amber-50/40 transition-colors">
                  <td className="py-3 px-3.5 font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#C49A45]" />
                    <span>{m.monthLabel}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-medium text-slate-600">
                    {m.invoiceCount}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    {formatCurrencyAmount(m.revenue)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-rose-600 font-medium">
                    {formatCurrencyAmount(m.expenses)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    {formatCurrencyAmount(m.grossMargin)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-lg ${
                        m.netProfit >= 0
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'bg-rose-50 text-rose-700 font-bold'
                      }`}
                    >
                      {formatCurrencyAmount(m.netProfit)}
                    </span>
                  </td>
                  <td
                    className={`py-3 px-3.5 text-right font-mono font-bold ${
                      m.marginPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {m.marginPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Total Footer Row */}
            <tfoot>
              <tr className="bg-[#FEFAF3] font-bold text-slate-900 border-t-2 border-[#C49A45]/50">
                <td className="py-3 px-3.5 uppercase tracking-wider text-[#856324]">
                  Total ({formatDateDMY(rangeStart)} to {formatDateDMY(rangeEnd)})
                </td>
                <td className="py-3 px-3 text-center font-mono">
                  {rangeInvoices.length}
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm">
                  {formatCurrencyAmount(rangeRevenue)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-rose-600 text-sm">
                  {formatCurrencyAmount(rangeExpensesTotal)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-800">
                  {formatCurrencyAmount(rangeGrossProfit)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-lg ${
                      rangeNetProfit >= 0
                        ? 'bg-emerald-100 text-emerald-800 font-black'
                        : 'bg-rose-100 text-rose-800 font-black'
                    }`}
                  >
                    {formatCurrencyAmount(rangeNetProfit)}
                  </span>
                </td>
                <td
                  className={`py-3 px-3.5 text-right font-mono font-bold ${
                    rangeProfitMargin >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {rangeProfitMargin.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Expense Categories Breakdown & Store Assets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense Category Distribution */}
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>Expense Categories in Range</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Total: {curr} {formatCurrencyAmount(rangeExpensesTotal)}
            </span>
          </div>

          <div className="space-y-2.5">
            {topExpenseCategories.map((c, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800">{c.category}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500 text-[11px]">{c.percentage.toFixed(1)}%</span>
                    <strong className="text-rose-600">{curr} {formatCurrencyAmount(c.amount)}</strong>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(3, c.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
            {topExpenseCategories.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">
                No expense vouchers recorded within this date range.
              </p>
            )}
          </div>
        </div>

        {/* Assets & Outstanding Dues Summary */}
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#C49A45]" />
              <span>Balance Sheet Assets & Receivables</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Asset Audit</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE] flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-bold block text-[11px] uppercase">
                  Physical Inventory Valuation
                </span>
                <span className="text-[10px] text-slate-400">At Purchase Cost Price ({products.length} materials)</span>
              </div>
              <strong className="text-base font-extrabold font-mono text-[#856324]">
                {curr} {formatCurrencyAmount(inventoryValuation)}
              </strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE] flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-bold block text-[11px] uppercase">
                  Customer Due Receivables
                </span>
                <span className="text-[10px] text-slate-400">Outstanding credit ({customers.length} accounts)</span>
              </div>
              <strong className="text-base font-extrabold font-mono text-rose-600">
                {curr} {formatCurrencyAmount(totalReceivables)}
              </strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-[#C49A45]/30 flex items-center justify-between">
              <div>
                <span className="text-slate-800 font-bold block text-[11px] uppercase">
                  Cash Flow Balance in Selected Range
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">Net Cash Generation</span>
              </div>
              <strong className="text-base font-black font-mono text-slate-900">
                {curr} {formatCurrencyAmount(rangeNetCashFlow)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
