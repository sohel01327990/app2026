import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Invoice } from '../../types';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Ban,
  Trash2,
  CheckCircle,
} from 'lucide-react';

export const InvoicesListModule: React.FC = () => {
  const {
    invoices,
    settings,
    processReturn,
    cancelInvoice,
    deleteInvoice,
    currentRole,
    setActivePrintInvoice,
    getEffectiveInvoiceRevenue,
  } = usePOS();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'returned' | 'partially_returned' | 'cancelled'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Return modal state
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<Invoice | null>(null);
  const [returnItemsState, setReturnItemsState] = useState<{ [productId: string]: { qty: number; reason: string } }>({});
  const [returnError, setReturnError] = useState('');

  // Cancel modal state
  const [selectedInvoiceForCancel, setSelectedInvoiceForCancel] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Delete invoice modal state
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.id.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.includes(q) ||
        inv.cashierName.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [invoices, statusFilter, search]);

  const openReturnModal = (inv: Invoice) => {
    setSelectedInvoiceForReturn(inv);
    const initialMap: { [productId: string]: { qty: number; reason: string } } = {};
    inv.items.forEach((it) => {
      initialMap[it.productId] = { qty: 0, reason: 'Over-estimated order returned' };
    });
    setReturnItemsState(initialMap);
    setReturnError('');
  };

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForReturn) return;

    const returnPayload = Object.entries(returnItemsState)
      .filter(([_, data]) => data.qty > 0)
      .map(([productId, data]) => {
        const item = selectedInvoiceForReturn.items.find((i) => i.productId === productId)!;
        const refundAmount = data.qty * item.unitPrice;
        return {
          productId,
          quantity: data.qty,
          refundAmount,
          reason: data.reason,
        };
      });

    if (returnPayload.length === 0) {
      setReturnError('Please select at least 1 item with quantity to return.');
      return;
    }

    const success = processReturn(selectedInvoiceForReturn.id, returnPayload);
    if (success) {
      setSelectedInvoiceForReturn(null);
      setToastMessage(`Material return processed for Invoice #${selectedInvoiceForReturn.id}. Revenue & Profit adjusted!`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForCancel || !cancelReason.trim()) return;
    const success = cancelInvoice(selectedInvoiceForCancel.id, cancelReason.trim());
    if (success) {
      setSelectedInvoiceForCancel(null);
      setCancelReason('');
      setToastMessage(`Invoice #${selectedInvoiceForCancel.id} has been cancelled.`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-800 bg-[#FEFAF3]">
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#EADBCE]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#C49A45]" />
            <span>Sales Invoices & Returns Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit sales, reprint invoices, and process material returns with automatic revenue and profit deduction
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice #, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#C49A45] shadow-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 cursor-pointer shadow-xs"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="returned">Fully Returned</option>
            <option value="partially_returned">Partially Returned</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-3xl bg-white border border-[#EADBCE] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Invoice # (Max 10 chars)</th>
                <th className="py-3 px-4">Date & Cashier</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Effective Grand Total</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-right">Remaining Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInvoices.map((inv) => {
                const effectiveRev = getEffectiveInvoiceRevenue(inv);
                const totalReturned = inv.returns?.reduce((s, r) => s + r.totalRefunded, 0) || 0;
                return (
                  <tr key={inv.id} className="hover:bg-[#FEFAF3] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs">
                      {inv.id}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <div>{new Date(inv.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{inv.cashierName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{inv.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{inv.customerPhone}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {settings.currencySymbol}{effectiveRev.toLocaleString()}
                      {totalReturned > 0 && (
                        <span className="text-[10px] text-rose-600 block font-normal">
                          (-{settings.currencySymbol}{totalReturned.toLocaleString()} Returned)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 tabular-nums font-semibold">
                      {settings.currencySymbol}{inv.totalPaid.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {inv.dueAmount > 0 ? (
                        <span className="text-rose-600 font-bold">
                          {settings.currencySymbol}{inv.dueAmount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold text-xs">PAID</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.status === 'partially_returned'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : inv.status === 'returned'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActivePrintInvoice(inv)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Print / View Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {inv.status === 'completed' && currentRole.permissions.canProcessRefund && (
                          <button
                            type="button"
                            onClick={() => openReturnModal(inv)}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                            title="Process Return & Restock"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {inv.status === 'completed' && currentRole.permissions.canDeleteRecords && (
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForCancel(inv)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                            title="Cancel / Void"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setInvoiceToDelete(inv)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Receipt className="w-9 h-9 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No invoices recorded yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Modal */}
      {selectedInvoiceForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-[#C49A45]" />
                <span>Process Sales Return & Restock Inventory</span>
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Invoice #{selectedInvoiceForReturn.id} &middot; Customer: {selectedInvoiceForReturn.customerName}
            </p>

            <form onSubmit={handleConfirmReturn} className="space-y-4 text-xs">
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {selectedInvoiceForReturn.items.map((it) => (
                  <div key={it.productId} className="p-3.5 bg-[#FEFAF3] rounded-2xl border border-[#EADBCE] space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900 block">{it.productName}</span>
                        <span className="text-[11px] text-slate-500">
                          Sold Qty: {it.quantity} {it.unit} @ {settings.currencySymbol}{it.unitPrice}
                        </span>
                      </div>
                      <span className="font-bold text-slate-700 font-mono text-xs">
                        Max: {it.quantity} {it.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-600 font-bold block mb-0.5">Return Quantity</label>
                        <input
                          type="number"
                          min="0"
                          max={it.quantity}
                          step="any"
                          value={returnItemsState[it.productId]?.qty || 0}
                          onChange={(e) =>
                            setReturnItemsState({
                              ...returnItemsState,
                              [it.productId]: {
                                ...returnItemsState[it.productId],
                                qty: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 font-bold block mb-0.5">Reason</label>
                        <select
                          value={returnItemsState[it.productId]?.reason || ''}
                          onChange={(e) =>
                            setReturnItemsState({
                              ...returnItemsState,
                              [it.productId]: {
                                ...returnItemsState[it.productId],
                                reason: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                        >
                          <option value="Over-estimated order returned">Over-estimated order returned</option>
                          <option value="Defective or damp bags replaced">Defective / damp bags</option>
                          <option value="Project specification changed">Specification changed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {returnError && <p className="text-xs text-rose-600 font-semibold">{returnError}</p>}

              <div className="p-3 bg-amber-50 rounded-2xl text-amber-900 text-xs border border-amber-200">
                Notice: Returned goods will be restocked into inventory and deducted immediately from Total Revenue and Net Profit.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForReturn(null)}
                  className="flex-1 py-2 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold shadow-md cursor-pointer"
                >
                  Confirm Return & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {selectedInvoiceForCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-rose-200 p-6 shadow-2xl space-y-3">
            <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" />
              <span>Cancel Invoice & Restock</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to void invoice <strong className="text-slate-900 font-mono">#{selectedInvoiceForCancel.id}</strong>? All items will be restocked to inventory.
            </p>
            <form onSubmit={handleConfirmCancel} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Duplicate entry by mistake"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForCancel(null)}
                  className="flex-1 py-2 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                >
                  Void Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Invoice Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-rose-200 p-6 shadow-2xl space-y-3">
            <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>Delete Invoice Record?</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Permanently delete invoice record <strong className="text-slate-900 font-mono">#{invoiceToDelete.id}</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="flex-1 py-2 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteInvoice(invoiceToDelete.id);
                  setInvoiceToDelete(null);
                }}
                className="flex-1 py-2 text-xs rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
