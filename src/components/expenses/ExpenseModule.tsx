import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Expense, PaymentMethod } from '../../types';
import {
  TrendingDown,
  Plus,
  Search,
  Trash2,
  Calendar,
  X,
} from 'lucide-react';

export const ExpenseModule: React.FC = () => {
  const { expenses, addExpense, deleteExpense, settings } = usePOS();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [category, setCategory] = useState<string>('Labor & Unloading');
  const [amount, setAmount] = useState<number>(1000);
  const [description, setDescription] = useState('');
  const [paidVia, setPaidVia] = useState<PaymentMethod>('cash');
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.referenceNumber.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [expenses, selectedCategory, search]);

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) return;
    addExpense({
      category,
      amount: Number(amount),
      date: expenseDate,
      description: description.trim(),
      paidVia,
      referenceNumber: `EXP-${Date.now().toString().slice(-4)}`,
    });
    setShowAddModal(false);
    setDescription('');
  };

  return (
    <div className="p-4 sm:p-6 pb-28 space-y-6 max-w-7xl mx-auto font-sans text-slate-900 bg-[#FEFAF3]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#EADBCE]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            <span>Operating Expenses Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record daily yard expenses, labor wages, freight, electricity, and miscellaneous costs
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Expense</span>
        </button>
      </div>

      {/* KPI Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-1">
          <span className="text-xs text-rose-800 font-bold block">Total Operating Expenses</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono tabular-nums">
            {settings.currencySymbol}{totalExpenseAmount.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block">Total {expenses.length} expense vouchers</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#EADBCE] shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search description, category, voucher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#C49A45]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 cursor-pointer"
          >
            <option value="all">All Expense Categories</option>
            <option value="Labor & Unloading">Labor & Unloading</option>
            <option value="Transport & Freight">Transport & Freight</option>
            <option value="Yard Maintenance">Yard Maintenance</option>
            <option value="Utilities & Electricity">Utilities & Electricity</option>
            <option value="Office & Tea">Office & Refreshment</option>
            <option value="Miscellaneous">Miscellaneous</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white border border-[#EADBCE] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Voucher #</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Paid Via</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-[#FEFAF3] transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-600">{e.date}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{e.referenceNumber}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-slate-800">{e.description}</td>
                  <td className="py-3 px-4 uppercase text-[10px] font-mono text-slate-500">{e.paidVia}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 text-sm tabular-nums">
                    {settings.currencySymbol}{e.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setExpenseToDelete(e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Expense */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-rose-600" />
                <span>Record New Expense</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 cursor-pointer"
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
                  min="1"
                  step="any"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base font-mono font-bold rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
                />
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

              <div>
                <label className="block text-slate-700 font-bold mb-1">Expense Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Unloading fee for trailer cement delivery"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Method</label>
                <select
                  value={paidVia}
                  onChange={(e) => setPaidVia(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 cursor-pointer"
                >
                  <option value="cash">Cash Counter</option>
                  <option value="bkash">bKash (MFS)</option>
                  <option value="nagad">Nagad (MFS)</option>
                  <option value="bank_transfer">Bank Transfer / Cheque</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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

      {/* Confirm Delete */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-rose-200 shadow-2xl p-6 text-slate-900 space-y-3">
            <h3 className="text-base font-bold text-rose-700">Delete Expense Record?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this expense record of {settings.currencySymbol}
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
    </div>
  );
};
