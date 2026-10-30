import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Customer, Invoice, PaymentMethod, CustomerLedgerTransaction } from '../../types';
import { DueVoucherPrintModal } from './DueVoucherPrintModal';
import {
  Wallet,
  ArrowDownLeft,
  Search,
  CheckCircle2,
  Printer,
  Plus,
  Trash2,
  X,
  RotateCcw,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface DueManagementModuleProps {
  onNavigateToPOS?: (customerId?: string) => void;
}

export const DueManagementModule: React.FC<DueManagementModuleProps> = ({ onNavigateToPOS }) => {
  const {
    customers,
    addCustomer,
    deleteCustomer,
    invoices,
    settings,
    receiveDuePayment,
    setSelectedCustomerIdForPOS,
    setActivePrintInvoice,
    customerTransactions,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'customer_dues' | 'all_customers' | 'invoice_dues' | 'vouchers'>('customer_dues');

  // Modals
  const [selectedCustForPayment, setSelectedCustForPayment] = useState<Customer | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [activeVoucher, setActiveVoucher] = useState<CustomerLedgerTransaction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Active Due Customers (currentDue > 0)
  const activeDueCustomers = useMemo(() => {
    return customers.filter((c) => c.currentDue > 0);
  }, [customers]);

  const activeDueInvoices = useMemo(() => {
    return invoices.filter((inv) => inv.dueAmount > 0 && inv.status !== 'cancelled');
  }, [invoices]);

  const totalReceivableDue = useMemo(() => {
    return activeDueCustomers.reduce((sum, c) => sum + c.currentDue, 0);
  }, [activeDueCustomers]);

  const filteredDueCustomers = useMemo(() => {
    return activeDueCustomers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q)
      );
    });
  }, [activeDueCustomers, searchQuery]);

  const filteredAllCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery]);

  const filteredDueInvoices = useMemo(() => {
    return activeDueInvoices.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        inv.id.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.includes(q)
      );
    });
  }, [activeDueInvoices, searchQuery]);

  const filteredVouchers = useMemo(() => {
    return (customerTransactions || []).filter((tx) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        tx.customerName.toLowerCase().includes(q) ||
        (tx.voucherNumber && tx.voucherNumber.toLowerCase().includes(q)) ||
        (tx.reference && tx.reference.toLowerCase().includes(q)) ||
        (tx.explanation && tx.explanation.toLowerCase().includes(q))
      );
    });
  }, [customerTransactions, searchQuery]);

  const customerDueInvoices = useMemo(() => {
    if (!selectedCustForPayment) return [];
    return invoices.filter(
      (inv) =>
        inv.dueAmount > 0 &&
        inv.status !== 'cancelled' &&
        (inv.customerId === selectedCustForPayment.id || inv.customerName === selectedCustForPayment.name)
    );
  }, [invoices, selectedCustForPayment]);

  // Open Receive Due Modal from Customer Dues
  const handleOpenReceiveDue = (cust: Customer) => {
    setSelectedCustForPayment(cust);
    const custInvs = invoices.filter(
      (inv) =>
        inv.dueAmount > 0 &&
        inv.status !== 'cancelled' &&
        (inv.customerId === cust.id || inv.customerName === cust.name)
    );
    if (custInvs.length > 1) {
      // If multiple invoices exist, default to All Invoices / Total Due so user can collect up to the total amount
      setSelectedInvoiceForPayment(null);
      setPaymentAmount(cust.currentDue > 0 ? Number(cust.currentDue.toFixed(3)) : 0);
      setPaymentReference('ALL-INVOICES');
      setPaymentNotes(`Cash settlement of total due from ${cust.name}`);
    } else if (custInvs.length === 1) {
      setSelectedInvoiceForPayment(custInvs[0]);
      setPaymentAmount(Number(custInvs[0].dueAmount.toFixed(3)));
      setPaymentReference(`INV-${custInvs[0].id}`);
      setPaymentNotes(`Settlement of Invoice #${custInvs[0].id}`);
    } else {
      setSelectedInvoiceForPayment(null);
      setPaymentAmount(cust.currentDue > 0 ? Number(cust.currentDue.toFixed(3)) : 0);
      setPaymentReference('');
      setPaymentNotes(`Cash settlement of due from ${cust.name}`);
    }
    setPaymentMethod('cash');
    setPaymentError('');
  };

  // Open Receive Due Modal from Specific Invoice
  const handleOpenReceiveDueForInvoice = (inv: Invoice) => {
    setSelectedInvoiceForPayment(inv);
    let linked = customers.find((c) => c.id === inv.customerId || c.name === inv.customerName);
    if (!linked) {
      linked = {
        id: inv.customerId || `cust_auto_${Date.now()}`,
        name: inv.customerName,
        phone: inv.customerPhone || 'N/A',
        address: 'Demra, Dhaka',
        creditLimit: 100000,
        currentDue: inv.dueAmount,
        totalPurchases: inv.grandTotal,
        aging: { current: inv.dueAmount, days30to60: 0, days60plus: 0 },
      };
    }
    setSelectedCustForPayment(linked);
    setPaymentAmount(inv.dueAmount);
    setPaymentMethod('cash');
    setPaymentReference(`INV-${inv.id}`);
    setPaymentNotes(`Full/Partial settlement of Invoice #${inv.id}`);
    setPaymentError('');
  };

  // Submit Due Payment (Requirement 7 & User request: Fix Due Receive)
  const handleSubmitDuePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    if (!selectedCustForPayment) {
      setPaymentError('No customer selected.');
      return;
    }

    const payNum = Number(paymentAmount);
    if (isNaN(payNum) || payNum <= 0) {
      setPaymentError('Please enter a valid amount greater than 0.');
      return;
    }

    const maxAllowed = selectedInvoiceForPayment
      ? selectedInvoiceForPayment.dueAmount
      : selectedCustForPayment.currentDue;

    if (payNum > maxAllowed) {
      setPaymentError(
        `Payment amount cannot exceed total due of ${settings.currencySymbol}${maxAllowed.toLocaleString()}.`
      );
      return;
    }

    // Ensure customer account exists in storage
    let targetCustomerId = selectedCustForPayment.id;
    const exists = customers.some((c) => c.id === targetCustomerId);
    if (!exists) {
      const added = addCustomer({
        name: selectedCustForPayment.name,
        phone: selectedCustForPayment.phone || 'N/A',
        address: selectedCustForPayment.address || 'Dhaka',
        creditLimit: 500000,
      });
      targetCustomerId = added.id;
    }

    const tx = receiveDuePayment(
      targetCustomerId,
      payNum,
      paymentMethod,
      paymentReference || 'COUNTER-CASH',
      paymentNotes,
      `Due payment received: ${settings.currencySymbol}${payNum.toLocaleString()} from ${selectedCustForPayment.name} via ${paymentMethod}`,
      selectedInvoiceForPayment ? selectedInvoiceForPayment.id : undefined
    );

    if (tx) {
      setSelectedCustForPayment(null);
      setSelectedInvoiceForPayment(null);
      setToastMessage(
        `Successfully collected ${settings.currencySymbol}${payNum.toLocaleString()} from ${selectedCustForPayment.name}!`
      );
      setActiveVoucher(tx);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setPaymentError('Failed to process due payment. Please try again.');
    }
  };

  const handleCreateNewInvoice = (cust: Customer) => {
    setSelectedCustomerIdForPOS(cust.id);
    if (onNavigateToPOS) {
      onNavigateToPOS(cust.id);
    }
  };

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || 'N/A',
      address: newCustAddress.trim() || 'Dhaka',
      creditLimit: 200000,
    });
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setShowAddCustomerModal(false);
    setToastMessage('New customer account registered successfully!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentModalMax = selectedInvoiceForPayment
    ? selectedInvoiceForPayment.dueAmount
    : selectedCustForPayment
    ? selectedCustForPayment.currentDue
    : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-800 bg-[#FEFAF3]">
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#EADBCE]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#C49A45]" />
            <span>Customer Credit & Due Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor accounts with unpaid balances and collect payments using the "Due Receive" button
          </p>
        </div>

        <button
          onClick={() => setShowAddCustomerModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-1">
          <span className="text-xs font-bold text-rose-700 block">Total Outstanding Receivables</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono tabular-nums">
            {settings.currencySymbol}{totalReceivableDue.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Across {activeDueCustomers.length} customer accounts with due balances
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-700 block">Invoices with Due Balances</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {activeDueInvoices.length} Invoices
          </div>
          <span className="text-[11px] text-slate-500 block">Unsettled credit invoices</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#EADBCE] shadow-xs space-y-1">
          <span className="text-xs font-bold text-emerald-800 block">Due Collection Workflow</span>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            Click <strong>Due Receive</strong> next to any customer or invoice to collect money and immediately print an official money receipt voucher.
          </p>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap rounded-2xl bg-white p-1 border border-[#EADBCE] shadow-xs gap-1">
          <button
            onClick={() => setActiveTab('customer_dues')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'customer_dues' ? 'bg-[#C49A45] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer Dues ({activeDueCustomers.length})
          </button>
          <button
            onClick={() => setActiveTab('all_customers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all_customers' ? 'bg-[#C49A45] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Customers ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('invoice_dues')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'invoice_dues' ? 'bg-[#C49A45] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Invoice Dues ({activeDueInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab('vouchers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'vouchers' ? 'bg-[#C49A45] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vouchers ({customerTransactions.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search customer, phone, voucher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#C49A45] shadow-xs"
          />
        </div>
      </div>

      {/* Customer Dues View */}
      {activeTab === 'customer_dues' && (
        <div className="rounded-3xl bg-white border border-[#EADBCE] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone & Address</th>
                  <th className="py-3 px-4 text-right">Total Purchases</th>
                  <th className="py-3 px-4 text-right">Current Due</th>
                  <th className="py-3 px-4 text-center">Actions (Due Receive)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDueCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FEFAF3] transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block text-xs">{c.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-800 block">{c.phone}</span>
                      <span className="text-[10px] text-slate-500">{c.address}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500 tabular-nums">
                      {settings.currencySymbol}{c.totalPurchases.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-rose-600 text-sm tabular-nums">
                      {settings.currencySymbol}{c.currentDue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReceiveDue(c)}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Due Receive</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateNewInvoice(c)}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-[#FEFAF3] hover:bg-[#ebd5ad]/50 text-slate-800 border border-[#EADBCE] cursor-pointer"
                        >
                          + New Sale
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerToDelete(c)}
                          className="p-1.5 text-xs rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                          title="Delete customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDueCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No customers with outstanding due</p>
                      <p className="text-xs text-slate-500 mt-0.5">All customer accounts have zero balance.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Customers View */}
      {activeTab === 'all_customers' && (
        <div className="rounded-3xl bg-white border border-[#EADBCE] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone & Address</th>
                  <th className="py-3 px-4 text-right">Total Purchases</th>
                  <th className="py-3 px-4 text-right">Current Due</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAllCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FEFAF3] transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block text-xs">{c.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-800 block">{c.phone}</span>
                      <span className="text-[10px] text-slate-500">{c.address}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums">
                      {settings.currencySymbol}{c.totalPurchases.toLocaleString()}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-extrabold tabular-nums text-sm ${c.currentDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {settings.currencySymbol}{c.currentDue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {c.currentDue > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenReceiveDue(c)}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>Due Receive</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCreateNewInvoice(c)}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-[#FEFAF3] hover:bg-[#ebd5ad]/50 text-slate-800 border border-[#EADBCE] cursor-pointer"
                        >
                          + New Sale
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerToDelete(c)}
                          className="p-1.5 text-xs rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                          title="Delete customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAllCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No customer accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Dues View */}
      {activeTab === 'invoice_dues' && (
        <div className="rounded-3xl bg-white border border-[#EADBCE] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Billing Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Due Balance</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDueInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#FEFAF3] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.id}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{inv.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{inv.customerPhone}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums">
                      {settings.currencySymbol}{inv.grandTotal.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 tabular-nums">
                      {settings.currencySymbol}{inv.totalPaid.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 tabular-nums text-sm">
                      {settings.currencySymbol}{inv.dueAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReceiveDueForInvoice(inv)}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Due Receive</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePrintInvoice(inv)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="Print invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDueInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No invoices with due balances.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vouchers / Transaction Ledger View */}
      {activeTab === 'vouchers' && (
        <div className="rounded-3xl bg-white border border-[#EADBCE] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Voucher / ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Narration / Explanation</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredVouchers.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#FEFAF3] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#C49A45]">{tx.voucherNumber || tx.id}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{new Date(tx.date).toLocaleString()}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{tx.customerName}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        tx.type === 'due_payment' ? 'bg-emerald-100 text-emerald-800' :
                        tx.type === 'sale_invoice' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 tabular-nums">
                      {settings.currencySymbol}{tx.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={tx.explanation}>
                      {tx.explanation}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveVoucher(tx)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#C49A45]" />
                        <span>View Voucher</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredVouchers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No payment vouchers recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: DUE RECEIVE */}
      {selectedCustForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                <span>Receive Due Payment</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustForPayment(null);
                  setSelectedInvoiceForPayment(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-[#FEFAF3] rounded-2xl border border-[#EADBCE] flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block">Customer:</span>
                <strong className="text-slate-900 text-sm block">{selectedCustForPayment.name}</strong>
                {selectedInvoiceForPayment ? (
                  <span className="text-[10px] text-[#C49A45] font-mono font-bold block mt-0.5">
                    Target Invoice: #{selectedInvoiceForPayment.id}
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-700 font-mono font-bold block mt-0.5">
                    Target: All Invoices (Total Due / সর্বমোট বকেয়া)
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">
                  {selectedInvoiceForPayment ? 'Invoice Due:' : 'Current Total Due:'}
                </span>
                <span className="text-base font-extrabold text-rose-600 font-mono">
                  {settings.currencySymbol}{Number(currentModalMax).toFixed(3)}
                </span>
              </div>
            </div>

            {/* Invoice-wise Due breakdown with Total Due Row beneath */}
            {customerDueInvoices.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Select Due Invoice or All Invoices (ইনভয়েস সিলেক্ট করুন অথবা সর্বমোট বকেয়া):
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-xl p-2 bg-[#FEFAF3]">
                  {/* Individual Invoices */}
                  {customerDueInvoices.map((inv) => {
                    const isSelected = selectedInvoiceForPayment?.id === inv.id;
                    return (
                      <div
                        key={inv.id}
                        onClick={() => {
                          setSelectedInvoiceForPayment(inv);
                          setPaymentAmount(Number(inv.dueAmount.toFixed(3)));
                          setPaymentReference(`INV-${inv.id}`);
                          setPaymentNotes(`Settlement of Invoice #${inv.id}`);
                        }}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-900 shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-amber-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                          }`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                          </span>
                          <div>
                            <span className="font-mono font-bold text-[#C49A45]">Invoice #{inv.id}</span>
                            <span className="text-[10px] text-slate-500 ml-2">({new Date(inv.createdAt).toLocaleDateString()})</span>
                          </div>
                        </div>
                        <span className="font-mono font-extrabold text-rose-600">
                          {settings.currencySymbol}{Number(inv.dueAmount).toFixed(3)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Total Due Section placed directly beneath individual invoices */}
                  <div
                    onClick={() => {
                      setSelectedInvoiceForPayment(null);
                      setPaymentAmount(Number(selectedCustForPayment.currentDue.toFixed(3)));
                      setPaymentReference('ALL-INVOICES');
                      setPaymentNotes(`Settlement of all due invoices for ${selectedCustForPayment.name}`);
                    }}
                    className={`p-2.5 rounded-lg border-2 text-xs flex items-center justify-between cursor-pointer transition-all mt-1 ${
                      selectedInvoiceForPayment === null
                        ? 'bg-amber-100/90 border-[#C49A45] text-amber-950 font-bold shadow-xs'
                        : 'bg-white border-amber-300 hover:bg-amber-50/70 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedInvoiceForPayment === null ? 'border-[#C49A45] bg-[#C49A45]' : 'border-slate-400 bg-white'
                      }`}>
                        {selectedInvoiceForPayment === null && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">
                          All Invoices / Total Due (সর্বমোট বকেয়া)
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          যেকোনো পরিমাণ টাকা (সর্বমোট {settings.currencySymbol}{Number(selectedCustForPayment.currentDue).toFixed(3)} পর্যন্ত) গ্রহণ করুন
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block font-sans">Total Due:</span>
                      <span className="font-mono font-black text-rose-700 text-sm">
                        {settings.currencySymbol}{Number(selectedCustForPayment.currentDue).toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDuePayment} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1.5">
                  Received Amount ({settings.currencySymbol}) * (Max: {settings.currencySymbol}{Number(currentModalMax).toFixed(3)})
                </label>
                <input
                  type="number"
                  min="0.001"
                  max={currentModalMax}
                  step="0.001"
                  required
                  autoFocus
                  value={paymentAmount || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (isNaN(val)) {
                      setPaymentAmount(0);
                    } else {
                      const rounded = Math.round(val * 1000) / 1000;
                      setPaymentAmount(rounded);
                    }
                  }}
                  className="w-full px-3 py-2.5 text-base font-mono font-bold rounded-xl bg-[#FEFAF3] border border-slate-300 text-emerald-700 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                  <span>Balance After Payment:</span>
                  <strong className="font-mono text-slate-800">
                    {settings.currencySymbol}
                    {Math.max(0, currentModalMax - (paymentAmount || 0)).toFixed(3)}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 cursor-pointer"
                  >
                    <option value="cash">Cash Counter</option>
                    <option value="bkash">bKash (MFS)</option>
                    <option value="nagad">Nagad (MFS)</option>
                    <option value="bank_transfer">Bank Transfer / Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reference / Note</label>
                  <input
                    type="text"
                    placeholder="Trx ID / Slip #"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Transaction Narration (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Cash collection at yard counter"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustForPayment(null);
                    setSelectedInvoiceForPayment(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentAmount <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md cursor-pointer transition-colors disabled:opacity-50"
                >
                  Collect {settings.currencySymbol}{paymentAmount.toLocaleString()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW CUSTOMER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#C49A45]" />
                <span>Register New Customer</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Customer / Contractor Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Haji Rafiqul Builders"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="017XXXXXXXX"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Site / Delivery Address</label>
                <input
                  type="text"
                  placeholder="Site location or office address"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE CUSTOMER */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-rose-200 shadow-2xl p-6 text-slate-900 space-y-3">
            <h3 className="text-base font-bold text-rose-700">Delete Customer Account?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete customer <strong>{customerToDelete.name}</strong>?
              {customerToDelete.currentDue > 0 && (
                <span className="text-rose-600 block mt-1 font-bold">
                  Warning: Customer has outstanding due of {settings.currencySymbol}
                  {customerToDelete.currentDue.toLocaleString()}!
                </span>
              )}
            </p>
            <div className="flex gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCustomer(customerToDelete.id);
                  setCustomerToDelete(null);
                  setToastMessage('Customer account deleted.');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUE PAYMENT RECEIPT VOUCHER PRINT MODAL */}
      {activeVoucher && (
        <DueVoucherPrintModal
          voucher={activeVoucher}
          settings={settings}
          onClose={() => setActiveVoucher(null)}
        />
      )}
    </div>
  );
};
