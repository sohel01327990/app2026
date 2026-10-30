import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Invoice } from '../../types';
import {
  printInvoiceSafely,
  downloadInvoicePDF,
  downloadInvoiceHTML,
  getEffectiveInvoiceTerms,
} from '../../utils/generateInvoicePDF';
import { numberToWords, formatCurrencyAmount } from '../../utils/currencyAndWords';
import {
  Printer,
  X,
  Building2,
  Copy,
  Check,
  Download,
} from 'lucide-react';

interface InvoicePrintModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ invoice, onClose }) => {
  const { settings, getEffectiveInvoiceRevenue } = usePOS();
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');
  const [copied, setCopied] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState(false);

  const effectiveTotal = getEffectiveInvoiceRevenue(invoice);
  const totalReturned = invoice.returns?.reduce((s, r) => s + r.totalRefunded, 0) || 0;

  // Direct high-fidelity print showing all computer printers via isolated iframe
  const handlePrint = React.useCallback(() => {
    printInvoiceSafely(invoice, settings, printFormat);
  }, [invoice, settings, printFormat]);

  // Dedicated F3 & print keyboard shortcuts for instant printing
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3' || (e.ctrlKey && e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        e.stopPropagation();
        handlePrint();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handlePrint, onClose]);

  const handleDownloadPDF = () => {
    downloadInvoicePDF(invoice, settings, printFormat);
    setDownloadMsg(true);
    setTimeout(() => setDownloadMsg(false), 3000);
  };

  const handleDownloadHTML = () => {
    downloadInvoiceHTML(invoice, settings, printFormat);
    setDownloadMsg(true);
    setTimeout(() => setDownloadMsg(false), 3000);
  };

  const handleCopySummary = () => {
    const text = `Invoice #${invoice.id}\nStore: ${settings.businessName}\nCustomer: ${invoice.customerName}\nGrand Total: ${settings.currencySymbol}${formatCurrencyAmount(effectiveTotal)}\nPaid: ${settings.currencySymbol}${formatCurrencyAmount(invoice.totalPaid)}\nDue: ${settings.currencySymbol}${formatCurrencyAmount(invoice.dueAmount)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-sans print-modal-container">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-[#EADBCE] shadow-2xl text-slate-800 overflow-hidden my-auto print-surface">
        {/* Top Control Bar */}
        <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#C49A45]/15 text-[#C49A45]">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Invoice Print Preview</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-50 text-[#C49A45] font-bold border border-[#C49A45]/30">
                  {invoice.id}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Print A4 corporate bill or 80mm POS receipt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-white border border-slate-300 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  printFormat === 'a4' ? 'bg-[#C49A45] text-white font-bold' : 'text-slate-600'
                }`}
              >
                A4 Paper
              </button>
              <button
                onClick={() => setPrintFormat('thermal')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  printFormat === 'thermal' ? 'bg-[#C49A45] text-white font-bold' : 'text-slate-600'
                }`}
              >
                POS Receipt
              </button>
            </div>

            {/* Print Action */}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Print Invoice (Press F3)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-black/25 rounded text-white font-extrabold ml-1">
                F3
              </kbd>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="hidden sm:flex px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {downloadMsg && (
          <div className="no-print p-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs text-center font-bold">
            Document downloaded successfully!
          </div>
        )}

        {/* Printable Invoice Container */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#FEFAF3] flex justify-center print-surface">
          {printFormat === 'a4' ? (
            /* A4 Full Corporate Layout */
            <div id="printable-invoice-area" className="w-[680px] bg-white p-8 border border-[#EADBCE] shadow-sm rounded-2xl text-xs space-y-4 paper-a4">
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded" />
                    ) : (
                      <Building2 className="w-6 h-6 text-[#C49A45]" />
                    )}
                    <span>{settings.businessName}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{settings.tagline}</p>
                  <p className="text-xs text-slate-600">{settings.address} &middot; Phone: {settings.phone}</p>
                  <p className="text-xs font-bold text-slate-700 mt-1">Trade License / VAT BIN: {settings.taxId}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs uppercase rounded mb-1">
                    COMMERCIAL INVOICE
                  </span>
                  <p className="text-xs text-slate-700 font-mono">Invoice #: <strong>{invoice.id}</strong></p>
                  <p className="text-xs text-slate-600">Date: {new Date(invoice.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs font-bold uppercase mt-1">
                    Status:{' '}
                    <span className={invoice.dueAmount <= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                      {invoice.dueAmount <= 0 ? 'PAID' : 'UNPAID'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Bill To & Cashier */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Billed To (Customer):</span>
                  <p className="font-bold text-slate-900">{invoice.customerName}</p>
                  <p className="text-slate-600 font-mono">{invoice.customerPhone}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Terminal & Cashier:</span>
                  <p className="font-semibold text-slate-800">Cashier: {invoice.cashierName}</p>
                  <p className="text-slate-500 font-mono text-[11px]">Terminal ID: {invoice.deviceId}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Material Description</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {invoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <strong className="block text-slate-900">{it.productName}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{it.sku}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap">{it.quantity} {it.unit}</td>
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">{settings.currencySymbol} {it.unitPrice.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">{settings.currencySymbol} {it.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="p-2.5 rounded-xl bg-[#FEFAF3] border border-[#EADBCE]">
                    <span className="font-bold text-slate-800 text-[11px] block uppercase tracking-wider mb-1">
                      Terms & Conditions:
                    </span>
                    <p className="whitespace-pre-line text-[10.5px] leading-relaxed text-slate-600 font-sans">
                      {getEffectiveInvoiceTerms(settings)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono whitespace-nowrap">{settings.currencySymbol} {formatCurrencyAmount(invoice.subtotal)}</span>
                  </div>
                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-mono whitespace-nowrap">-{settings.currencySymbol} {formatCurrencyAmount(invoice.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>VAT ({settings.vatPercent ?? 5}%):</span>
                    <span className="font-mono whitespace-nowrap">{settings.currencySymbol} {formatCurrencyAmount(invoice.vatTaxAmount || 0)}</span>
                  </div>
                  {totalReturned > 0 && (
                    <div className="flex justify-between text-rose-600 font-medium">
                      <span>Returned Deducted:</span>
                      <span className="font-mono whitespace-nowrap">-{settings.currencySymbol} {formatCurrencyAmount(totalReturned)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-300">
                    <span className="shrink-0 pr-3">Grand Total:</span>
                    <span className="font-mono text-slate-900 whitespace-nowrap tabular-nums text-right">{settings.currencySymbol} {formatCurrencyAmount(effectiveTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center font-semibold text-emerald-700">
                    <span className="shrink-0 pr-3">Amount Paid:</span>
                    <span className="font-mono whitespace-nowrap tabular-nums text-right">{settings.currencySymbol} {formatCurrencyAmount(invoice.totalPaid)}</span>
                  </div>
                  <div className={`flex justify-between items-center font-bold ${invoice.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    <span className="shrink-0 pr-3">Remaining Due:</span>
                    <span className="font-mono whitespace-nowrap tabular-nums text-right">
                      {invoice.dueAmount > 0 ? `${settings.currencySymbol} ${formatCurrencyAmount(invoice.dueAmount)}` : `${settings.currencySymbol} 0.000`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount Paid in Words */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="font-bold text-slate-900">Amount Paid in Words:</span>
                <span className="font-italic font-medium text-slate-800 font-mono">{numberToWords(invoice.totalPaid, settings.currencySymbol)}</span>
              </div>

              {/* Signatures */}
              <div className="flex justify-between pt-12 mt-6 text-center text-xs text-slate-500 border-t border-slate-100">
                <div className="w-40 border-t border-slate-300 pt-1">Customer Signature</div>
                <div className="w-40 border-t border-slate-300 pt-1">Authorized Signatory</div>
              </div>
            </div>
          ) : (
            /* Thermal POS 80mm Receipt */
            <div id="printable-invoice-area" className="w-[300px] bg-white p-4 border border-slate-300 shadow-sm rounded-xl font-mono text-[11px] text-black space-y-2 thermal-80mm">
              <div className="text-center pb-2 border-b border-black border-dashed">
                <h4 className="font-bold text-sm uppercase">{settings.businessName}</h4>
                <p className="text-[10px]">{settings.tagline}</p>
                <p className="text-[10px]">{settings.phone}</p>
                <p className="text-[10px]">VAT/BIN: {settings.taxId}</p>
              </div>

              <div className="py-1 border-b border-black border-dashed text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Invoice #:</span>
                  <span className="font-bold">{invoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{invoice.customerName}</span>
                </div>
              </div>

              <div className="py-1 border-b border-black border-dashed space-y-1">
                {invoice.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <div>
                      <div>{it.productName}</div>
                      <div className="text-[9px] text-gray-600">{it.quantity} {it.unit} x {it.unitPrice}</div>
                    </div>
                    <span className="font-bold">{it.total}</span>
                  </div>
                ))}
              </div>

              <div className="py-1 border-b border-black border-dashed space-y-0.5 text-right">
                <div className="flex justify-between items-center">
                  <span className="shrink-0 pr-2">Grand Total:</span>
                  <span className="font-bold whitespace-nowrap tabular-nums text-right">{settings.currencySymbol} {effectiveTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="shrink-0 pr-2">Amount Paid:</span>
                  <span className="whitespace-nowrap tabular-nums text-right">{settings.currencySymbol} {invoice.totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="shrink-0 pr-2">Remaining Due:</span>
                  <span className="whitespace-nowrap tabular-nums text-right">{invoice.dueAmount > 0 ? `${settings.currencySymbol} ${invoice.dueAmount.toLocaleString()}` : `${settings.currencySymbol} 0`}</span>
                </div>
                <div className="flex justify-between items-center font-bold pt-0.5">
                  <span className="shrink-0 pr-2">Status:</span>
                  <span className={invoice.dueAmount <= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                    {invoice.dueAmount <= 0 ? 'PAID' : 'UNPAID'}
                  </span>
                </div>
              </div>

              <div className="py-2 border-b border-black border-dashed text-[8.5px] text-gray-700 leading-tight space-y-1">
                <span className="font-bold block uppercase text-[9px] text-black">Terms & Conditions:</span>
                <p className="whitespace-pre-line">{getEffectiveInvoiceTerms(settings)}</p>
              </div>

              <div className="text-center pt-2 text-[9px] text-gray-600 font-bold">
                *** THANK YOU FOR YOUR BUSINESS ***
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleCopySummary}
            className={`px-4 py-2 text-xs rounded-xl border border-slate-300 ${copied ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-white text-slate-700 hover:bg-slate-100'} cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors font-medium`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Summary!' : 'Copy Summary'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-extrabold cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors"
              title="Print Invoice (Press F3)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-black/25 rounded text-white font-extrabold ml-1">
                F3
              </kbd>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold cursor-pointer"
            >
              PDF
            </button>
            <button
              onClick={handleDownloadHTML}
              className="px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold cursor-pointer"
            >
              Download HTML
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
