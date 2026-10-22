import React, { useRef } from 'react';
import { CustomerLedgerTransaction, CompanySettings } from '../../types';
import {
  Printer,
  X,
  FileText,
  Building2,
  Download,
} from 'lucide-react';

interface DueVoucherPrintModalProps {
  voucher: CustomerLedgerTransaction;
  settings: CompanySettings;
  onClose: () => void;
}

export const DueVoucherPrintModal: React.FC<DueVoucherPrintModalProps> = ({
  voucher,
  settings,
  onClose,
}) => {
  const isRefund =
    voucher.type === 'cash_refund' ||
    voucher.type === 'due_waiver' ||
    voucher.type === 'material_return';

  const typeLabel = isRefund ? 'OFFICIAL CREDIT / REFUND VOUCHER' : 'OFFICIAL MONEY RECEIPT VOUCHER';

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Print error', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans print-modal-container">
      <div className="bg-white border border-[#EADBCE] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] text-slate-800 print-surface">
        {/* Header bar */}
        <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#C49A45]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{typeLabel}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-50 text-[#C49A45] font-bold border border-[#C49A45]/30">
                  {voucher.voucherNumber}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Official Settlement Voucher &middot; {new Date(voucher.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voucher Content */}
        <div id="printable-voucher-area" className="p-6 overflow-y-auto space-y-4 text-xs bg-[#FEFAF3]">
          <div className="text-center pb-3 border-b border-slate-200">
            <div className="flex items-center justify-center gap-1.5 text-slate-900 font-extrabold text-sm">
              <Building2 className="w-4 h-4 text-[#C49A45]" />
              <span>{settings.businessName}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{settings.tagline}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {settings.address} &middot; Phone: {settings.phone}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white border border-[#EADBCE]">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Customer Info</span>
              <span className="font-bold text-slate-900 text-xs block">{voucher.customerName}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Payment Method</span>
              <span className="font-semibold text-emerald-700 uppercase text-xs block">
                {voucher.paymentMethod || 'Cash'}
              </span>
              <span className="text-[10px] font-mono text-slate-500 block">
                Ref: {voucher.reference || 'N/A'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#EADBCE] space-y-2">
            <div className="flex justify-between items-center text-slate-600">
              <span>Previous Due Balance:</span>
              <span className="font-mono tabular-nums">
                {settings.currencySymbol}{voucher.balanceBefore.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-slate-100 text-emerald-700">
              <span>{isRefund ? 'Refund / Adjustment Amount:' : 'Amount Received:'}</span>
              <span className="font-mono text-base tabular-nums">
                {settings.currencySymbol}{voucher.amount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-slate-100 text-slate-900">
              <span>Remaining Due Balance:</span>
              <span className="font-mono text-sm tabular-nums text-rose-600">
                {settings.currencySymbol}{voucher.balanceAfter.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-[#EADBCE] space-y-1">
            <span className="text-[10px] font-bold text-[#C49A45] uppercase tracking-wider block">
              Transaction Narration:
            </span>
            <p className="text-slate-700 text-xs leading-relaxed">
              {voucher.explanation}
            </p>
          </div>

          <div className="flex justify-between items-center pt-2 text-[10px] text-slate-500 border-t border-slate-200">
            <span>Date: <strong>{new Date(voucher.date).toLocaleString()}</strong></span>
            <span>Authorized by: <strong>{voucher.processedBy}</strong></span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer font-semibold"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt Voucher</span>
          </button>
        </div>
      </div>
    </div>
  );
};
