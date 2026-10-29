import React, { useState, useMemo, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  Product,
  PaymentMethod,
  SplitPayment,
} from '../../types';
import { formatCurrencyAmount } from '../../utils/currencyAndWords';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Lock,
  CheckCircle,
  CreditCard,
  UserPlus,
  Boxes,
  ShoppingCart,
  Building,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Phone,
  X,
  Check,
} from 'lucide-react';

export const POSModule: React.FC = () => {
  const {
    products,
    categories,
    cart,
    addToCart,
    updateCartItemQty,
    updateCartItemPrice,
    removeFromCart,
    clearCart,
    settings,
    customers,
    addCustomer,
    createInvoice,
    currentUser,
    currentRole,
    selectedCustomerIdForPOS,
    setSelectedCustomerIdForPOS,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Responsive Mobile Tab: 'products' | 'cart'
  const [mobileActiveView, setMobileActiveView] = useState<'products' | 'cart'>('products');

  // Customer state for this sale
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Product Catalog view mode: 'table' (rows and columns) or 'grid' (cards)
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'table'>('table');
  const [selectedProductIndex, setSelectedProductIndex] = useState<number>(0);

  useEffect(() => {
    if (selectedCustomerIdForPOS) {
      setSelectedCustomerId(selectedCustomerIdForPOS);
      setSelectedCustomerIdForPOS(null);
      setMobileActiveView('cart');
    }
  }, [selectedCustomerIdForPOS, setSelectedCustomerIdForPOS]);

  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinAddress, setWalkinAddress] = useState('');

  // Modals
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Discount & Checkout modal
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Manager Override
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overridePasscode, setOverridePasscode] = useState('');
  const [overrideError, setOverrideError] = useState('');
  const [overrideApproved, setOverrideApproved] = useState(false);
  const [overrideApproverName, setOverrideApproverName] = useState('');

  // Split payments in checkout
  const [payments, setPayments] = useState<SplitPayment[]>([
    { method: 'cash', amount: 0, reference: '' },
  ]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.brand.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Reset selected product index whenever search or category changes
  useEffect(() => {
    setSelectedProductIndex(0);
  }, [searchQuery, selectedCategory]);

  // Real-time matching previous customers by Name or Mobile Phone
  const matchingCustomers = useMemo(() => {
    if (!customerSearchText.trim()) return [];
    const q = customerSearchText.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, customerSearchText]);



  const rawSubtotal = cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const itemDiscounts = cart.reduce((acc, item) => acc + item.discount, 0);
  const totalDiscount = itemDiscounts + cartDiscount;
  const netAmount = Math.max(0, rawSubtotal - totalDiscount);
  const vatPct = settings.vatPercent ?? 5;
  const vatAmount = Math.round((netAmount * vatPct) / 100 * 1000) / 1000;
  const grandTotal = Math.round((netAmount + vatAmount) * 1000) / 1000;

  const minPriceViolations = cart.filter((item) => item.unitPrice < item.product.minSellingPrice);
  const hasMinPriceViolation = minPriceViolations.length > 0;
  const discountPercent = rawSubtotal > 0 ? (totalDiscount / rawSubtotal) * 100 : 0;
  const isHighDiscount =
    discountPercent > settings.maxCashierDiscountPercent && !currentRole.permissions.canOverrideMinPrice;
  const requiresManagerOverride = (hasMinPriceViolation || isHighDiscount) && !overrideApproved;

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const openCheckout = () => {
    setPayments([{ method: 'cash', amount: grandTotal, reference: '' }]);
    setShowCheckoutModal(true);
  };

  const updateSplitPayment = (index: number, updates: Partial<SplitPayment>) => {
    setPayments(payments.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  const addSplitPaymentRow = (method: PaymentMethod) => {
    const paidSoFar = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, grandTotal - paidSoFar);
    setPayments([...payments, { method, amount: remaining, reference: '' }]);
  };

  const removeSplitPayment = (index: number) => {
    if (payments.length <= 1) return;
    setPayments(payments.filter((_, i) => i !== index));
  };

  // Requirement 7: Customer cannot pay more than total bill amount!
  const totalPaidInCheckout = payments
    .filter((p) => p.method !== 'customer_due')
    .reduce((sum, p) => sum + p.amount, 0);

  const isOverpaid = totalPaidInCheckout > grandTotal;
  const calculatedDue = Math.max(0, grandTotal - totalPaidInCheckout);

  const handleVerifyOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (overridePasscode === settings.managerOverridePin || overridePasscode === '1234') {
      setOverrideApproved(true);
      setOverrideApproverName(`${currentUser.name} (Approved)`);
      setShowOverrideModal(false);
      setOverrideError('');
    } else {
      setOverrideError('Invalid Manager Passcode!');
    }
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created = addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || 'N/A',
      address: newCustAddress.trim() || 'Dhaka',
      creditLimit: 500000,
    });
    setSelectedCustomerId(created.id);
    setShowNewCustModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
  };

  // Finalize Sale
  const handleFinalizeSale = () => {
    if (isOverpaid) return;

    let customerIdToUse = selectedCustomer?.id;
    let customerNameToUse = selectedCustomer?.name || walkinName.trim() || 'Walk-in Cash Customer';
    let customerPhoneToUse = selectedCustomer?.phone || walkinPhone.trim() || 'N/A';

    if (calculatedDue > 0 && !customerIdToUse) {
      const created = addCustomer({
        name: walkinName.trim() || `Customer (${walkinPhone.trim() || 'Due Account'})`,
        phone: walkinPhone.trim() || 'N/A',
        address: walkinAddress.trim() || 'Dhaka',
        creditLimit: 500000,
      });
      customerIdToUse = created.id;
      customerNameToUse = created.name;
      customerPhoneToUse = created.phone;
    }

    const finalPayments: SplitPayment[] = payments.filter((p) => p.method !== 'customer_due' && p.amount > 0);
    if (calculatedDue > 0) {
      finalPayments.push({
        method: 'customer_due',
        amount: calculatedDue,
        reference: 'Remaining Credit Due',
      });
    }

    createInvoice(
      { name: customerNameToUse, phone: customerPhoneToUse, customerId: customerIdToUse },
      cart,
      finalPayments,
      cartDiscount,
      discountReason,
      overrideApproved ? overrideApproverName : undefined
    );

    setShowCheckoutModal(false);
    setCartDiscount(0);
    setDiscountReason('');
    setOverrideApproved(false);
    setOverrideApproverName('');
    setWalkinName('');
    setWalkinPhone('');
    setWalkinAddress('');
    setSelectedCustomerId('');
  };

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-[#FEFAF3] text-slate-800 font-sans">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden bg-white border-b border-[#EADBCE] px-3 py-2 flex items-center justify-between">
        <div className="flex rounded-xl bg-[#FEFAF3] p-1 w-full max-w-sm mx-auto border border-[#EADBCE]">
          <button
            onClick={() => setMobileActiveView('products')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileActiveView === 'products' ? 'bg-[#C49A45] text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Products</span>
          </button>
          <button
            onClick={() => setMobileActiveView('cart')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileActiveView === 'cart' ? 'bg-[#C49A45] text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Cart ({cart.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* LEFT: Product Catalog & Search                            */}
      {/* ========================================================= */}
      <div className={`flex-1 flex flex-col border-r border-[#EADBCE] overflow-hidden bg-[#FEFAF3] ${
        mobileActiveView === 'products' ? 'flex' : 'hidden lg:flex'
      }`}>
        {/* Search, Barcode & View Switcher */}
        <div className="p-3 bg-white border-b border-[#EADBCE] flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name, SKU, brand, or barcode (↑/↓ to navigate, Enter to add)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (filteredProducts.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedProductIndex((prev) => Math.min(filteredProducts.length - 1, prev + 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedProductIndex((prev) => Math.max(0, prev - 1));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const target = filteredProducts[selectedProductIndex] || filteredProducts[0];
                  if (target) {
                    addToCart(target, 1);
                  }
                }
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#C49A45]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* View Mode Toggle (Table / Grid) */}
            <div className="flex items-center border border-slate-200 bg-[#FEFAF3] rounded-xl p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setCatalogViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  catalogViewMode === 'table' || searchQuery.trim().length > 0
                    ? 'bg-[#C49A45] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="রোল ও কলাম ভিউ (Table View)"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Table View</span>
              </button>
              <button
                type="button"
                onClick={() => setCatalogViewMode('grid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  catalogViewMode === 'grid' && searchQuery.trim().length === 0
                    ? 'bg-[#C49A45] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="কার্ড ভিউ (Grid View)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Grid View</span>
              </button>
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="px-3 py-2 bg-white border-b border-[#EADBCE] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs rounded-xl font-bold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#C49A45] text-white shadow-xs'
                : 'bg-[#FEFAF3] text-slate-700 hover:bg-[#ebd5ad]/40 border border-[#EADBCE]'
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat.name).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 text-xs rounded-xl font-bold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  selectedCategory === cat.name
                    ? 'bg-[#C49A45] text-white shadow-xs'
                    : 'bg-[#FEFAF3] text-slate-700 hover:bg-[#ebd5ad]/40 border border-[#EADBCE]'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Product Catalog Display: Row & Column Table View when searching or selected, otherwise Grid */}
        {searchQuery.trim().length > 0 || catalogViewMode === 'table' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Table Header matching Image 1 */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#EBEBEB] text-slate-800 font-bold border-b border-slate-300 sticky top-0 z-10 select-none">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-300 w-28 md:w-32">Code</th>
                    <th className="py-2 px-3 border-r border-slate-300">Item Name</th>
                    <th className="py-2 px-3 border-r border-slate-300 hidden md:table-cell w-28">Category</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-center w-24">Stock</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-right w-28">MRP</th>
                    <th className="py-2 px-3 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProducts.map((prod, idx) => {
                    const isSelected = idx === selectedProductIndex;
                    const isLowStock = prod.currentStock <= prod.minStockThreshold;
                    return (
                      <tr
                        key={prod.id}
                        onClick={() => {
                          setSelectedProductIndex(idx);
                        }}
                        onDoubleClick={() => addToCart(prod, 1)}
                        className={`transition-colors cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[#2563eb] text-white font-medium hover:bg-[#1d4ed8]'
                            : idx % 2 === 0
                            ? 'bg-white hover:bg-amber-50/50 text-slate-800'
                            : 'bg-[#FAF8F5] hover:bg-amber-50/50 text-slate-800'
                        }`}
                      >
                        {/* Code Column with active selection indicator arrow ▸ */}
                        <td className="py-2 px-3 border-r border-slate-300/60 font-mono font-bold whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            {isSelected ? (
                              <span className="text-amber-300 font-black">▸</span>
                            ) : (
                              <span className="inline-block w-2.5"></span>
                            )}
                            <span>{prod.sku}</span>
                          </span>
                        </td>

                        {/* Item Name Column */}
                        <td className="py-2 px-3 border-r border-slate-300/60 font-semibold truncate max-w-[200px] md:max-w-[320px]">
                          <span>{prod.name}</span>
                          {prod.brand && (
                            <span className={`text-[10px] ml-1.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                              ({prod.brand})
                            </span>
                          )}
                        </td>

                        {/* Category Column */}
                        <td className="py-2 px-3 border-r border-slate-300/60 hidden md:table-cell truncate">
                          <span className={isSelected ? 'text-blue-100' : 'text-slate-600'}>
                            {prod.category}
                          </span>
                        </td>

                        {/* Stock Column */}
                        <td className="py-2 px-3 border-r border-slate-300/60 text-center font-mono whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : isLowStock
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {prod.currentStock.toLocaleString()} {prod.unit}
                          </span>
                        </td>

                        {/* MRP Column */}
                        <td className="py-2 px-3 border-r border-slate-300/60 text-right font-mono font-extrabold text-sm whitespace-nowrap">
                          {settings.currencySymbol}
                          {Number(prod.regularPrice).toFixed(3)}
                        </td>

                        {/* Action Column */}
                        <td className="py-1.5 px-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(prod, 1);
                            }}
                            className={`px-2 py-1 text-[11px] font-bold rounded-md shadow-2xs transition-transform active:scale-95 cursor-pointer ${
                              isSelected
                                ? 'bg-white text-[#2563eb] hover:bg-blue-50'
                                : 'bg-[#C49A45] text-white hover:bg-[#a88235]'
                            }`}
                          >
                            + Add
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-slate-400">
                        <Boxes className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700">No products match search criteria</p>
                        <p className="text-xs text-slate-500">Check spelling or create the item in Inventory</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ERP Footer Status Bar matching Image 1 */}
            <div className="px-3 py-1.5 bg-[#E6E6E6] border-t border-slate-300 flex items-center justify-between text-xs text-slate-700 select-none">
              <div className="flex items-center gap-1 font-mono">
                <button
                  type="button"
                  title="First Record"
                  disabled={selectedProductIndex <= 0 || filteredProducts.length === 0}
                  onClick={() => setSelectedProductIndex(0)}
                  className="p-1 rounded hover:bg-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Previous Record"
                  disabled={selectedProductIndex <= 0 || filteredProducts.length === 0}
                  onClick={() => setSelectedProductIndex((prev) => Math.max(0, prev - 1))}
                  className="p-1 rounded hover:bg-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="px-2 font-semibold text-slate-800">
                  Record {filteredProducts.length > 0 ? selectedProductIndex + 1 : 0} of {filteredProducts.length}
                </span>

                <button
                  type="button"
                  title="Next Record"
                  disabled={selectedProductIndex >= filteredProducts.length - 1 || filteredProducts.length === 0}
                  onClick={() => setSelectedProductIndex((prev) => Math.min(filteredProducts.length - 1, prev + 1))}
                  className="p-1 rounded hover:bg-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Last Record"
                  disabled={selectedProductIndex >= filteredProducts.length - 1 || filteredProducts.length === 0}
                  onClick={() => setSelectedProductIndex(Math.max(0, filteredProducts.length - 1))}
                  className="p-1 rounded hover:bg-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-600">
                <span className="bg-white px-2 py-0.5 rounded border border-slate-300 font-mono">
                  Press [Enter] to Add
                </span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-300 font-mono">
                  [↑ / ↓] to Navigate
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Product Cards Grid: Responsive 4 cols on 2xl, 3 on xl, 2 on sm/md/lg, 1 on mobile */
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 content-start">
            {filteredProducts.map((prod) => {
              const isLowStock = prod.currentStock <= prod.minStockThreshold;
              return (
                <div
                  key={prod.id}
                  onClick={() => addToCart(prod, 1)}
                  className="p-3.5 rounded-2xl bg-white border border-[#EADBCE] product-card-hover hover:border-[#C49A45] hover:bg-[#C49A45] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group select-none relative min-h-[160px]"
                >
                  <div>
                    {/* Top Row: SKU badge & Brand */}
                    <div className="flex items-center justify-between gap-1 text-[11px] mb-1.5">
                      <span className="font-mono font-bold text-[#856324] group-hover:text-white bg-amber-50 group-hover:bg-white/20 px-2 py-0.5 rounded-md transition-colors truncate max-w-[120px]">
                        {prod.sku}
                      </span>
                      <span className="font-semibold text-slate-500 group-hover:text-white/90 transition-colors text-right truncate text-[11px]">
                        {prod.brand || 'General'}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-white transition-colors line-clamp-2 leading-snug mb-0.5">
                      {prod.name}
                    </h4>

                    {/* Category */}
                    <p className="text-xs text-slate-500 group-hover:text-white/80 transition-colors truncate">
                      {prod.category}
                    </p>
                  </div>

                  {/* Bottom Info Section */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 group-hover:border-white/20 transition-colors space-y-2">
                    {/* Stock Badge & Min Price Row */}
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-md transition-colors whitespace-nowrap ${
                          isLowStock
                            ? 'bg-rose-50 text-rose-700 group-hover:bg-rose-900/40 group-hover:text-white'
                            : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-900/40 group-hover:text-white'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'} group-hover:bg-white`} />
                        Stock: {prod.currentStock.toLocaleString()} {prod.unit}
                      </span>

                      <span className="text-[10px] text-slate-400 group-hover:text-white/70 transition-colors font-mono whitespace-nowrap">
                        Min: {settings.currencySymbol}{prod.minSellingPrice.toLocaleString()}
                      </span>
                    </div>

                    {/* Price & Add to Cart Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono leading-none">
                        <span className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-white transition-colors tabular-nums">
                          {settings.currencySymbol}{prod.regularPrice.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 group-hover:text-white/80 font-normal ml-0.5">
                          /{prod.unit}
                        </span>
                      </div>

                      <div className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#C49A45] group-hover:bg-white text-white group-hover:text-[#856324] shadow-xs transition-colors shrink-0 whitespace-nowrap flex items-center gap-1">
                        <span>+ Add</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 space-y-2">
                <Boxes className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No products match search criteria</p>
                <p className="text-xs text-slate-500">Go to "Inventory & Yard" to add or edit catalog products</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* RIGHT: POS Cart & Checkout                                */}
      {/* ========================================================= */}
      <div className={`w-full lg:w-[460px] flex flex-col bg-white border-l border-[#EADBCE] overflow-hidden shrink-0 ${
        mobileActiveView === 'cart' ? 'flex' : 'hidden lg:flex'
      }`}>
        {/* Customer Header */}
        <div className="p-3.5 bg-white border-b border-[#EADBCE] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#C49A45]" />
              <span>Customer Information</span>
            </span>
            <button
              onClick={() => setShowNewCustModal(true)}
              className="text-xs text-[#C49A45] hover:text-[#a88235] font-bold flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ New Customer</span>
            </button>
          </div>

          {/* Customer Dropdown */}
          <select
            value={selectedCustomerId}
            onChange={(e) => {
              setSelectedCustomerId(e.target.value);
              const found = customers.find((c) => c.id === e.target.value);
              if (found) {
                setCustomerSearchText(found.name);
              } else {
                setCustomerSearchText('');
              }
            }}
            className="w-full px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-medium cursor-pointer"
          >
            <option value="">Walk-in Cash Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''} {c.currentDue > 0 ? `[Due: ${settings.currencySymbol}${c.currentDue.toLocaleString()}]` : ''}
              </option>
            ))}
          </select>

          {/* Search bar directly above Customer Name input as marked in Image 2 */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#C49A45]" />
              <input
                type="text"
                placeholder="Search previous customer by Name or Mobile..."
                value={customerSearchText}
                onChange={(e) => {
                  setCustomerSearchText(e.target.value);
                  setShowCustomerSuggestions(true);
                }}
                onFocus={() => setShowCustomerSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && matchingCustomers.length > 0) {
                    e.preventDefault();
                    const cust = matchingCustomers[0];
                    setSelectedCustomerId(cust.id);
                    setCustomerSearchText(cust.name);
                    setShowCustomerSuggestions(false);
                  }
                }}
                className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-amber-300/80 focus:border-[#C49A45] text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C49A45] font-medium"
              />
              {customerSearchText && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSearchText('');
                    setShowCustomerSuggestions(false);
                  }}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Instant suggestions list when typing in search bar */}
            {showCustomerSuggestions && customerSearchText.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#EADBCE] rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                {matchingCustomers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No previous customer found with "{customerSearchText}"
                  </div>
                ) : (
                  matchingCustomers.map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(cust.id);
                        setCustomerSearchText(cust.name);
                        setShowCustomerSuggestions(false);
                      }}
                      className="w-full p-2.5 text-left hover:bg-amber-50/70 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{cust.name}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-[#C49A45]" />
                          {cust.phone || 'No phone'} &middot; {cust.address || 'Dhaka'}
                        </p>
                      </div>
                      <div className="text-right">
                        {cust.currentDue > 0 ? (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 font-mono">
                            Due: {settings.currencySymbol}{cust.currentDue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                            No Due
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Customer Details OR Walk-in Input Fields (directly below Search Bar) */}
          {selectedCustomer ? (
            <div className="p-2.5 rounded-xl bg-[#FEFAF3] border border-[#EADBCE] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{selectedCustomer.name}</span>
                <div className="flex items-center gap-1.5">
                  {selectedCustomer.currentDue > 0 && (
                    <span className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Due: {settings.currencySymbol}{selectedCustomer.currentDue.toLocaleString()}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId('');
                      setCustomerSearchText('');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Switch to Walk-in
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3">
                <span className="font-mono">Phone: {selectedCustomer.phone || 'N/A'}</span>
                <span>Address: {selectedCustomer.address || 'Dhaka'}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
              <input
                type="text"
                placeholder="Customer Name (Optional)"
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-[#FEFAF3] border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#C49A45]"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={walkinPhone}
                onChange={(e) => setWalkinPhone(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-[#FEFAF3] border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
              />
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#FEFAF3]/40">
          {cart.map((item) => {
            const violatesMin = item.unitPrice < item.product.minSellingPrice;
            return (
              <div
                key={item.product.id}
                className={`p-3 rounded-xl border text-xs transition-colors bg-white ${
                  violatesMin ? 'border-rose-300 ring-1 ring-rose-200' : 'border-[#EADBCE] shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-slate-900 truncate">{item.product.name}</h5>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {item.product.sku} &middot; {item.unit}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-[#FEFAF3] rounded-lg p-0.5 border border-[#EADBCE]">
                    <button
                      onClick={() => updateCartItemQty(item.product.id, Math.max(0, item.quantity - 1))}
                      className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.quantity}
                      onChange={(e) =>
                        updateCartItemQty(item.product.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-12 text-center text-xs font-mono font-bold bg-transparent text-slate-900 focus:outline-none"
                    />
                    <button
                      onClick={() => updateCartItemQty(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Unit Price Input */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">@</span>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateCartItemPrice(item.product.id, parseFloat(e.target.value) || 0)
                      }
                      className={`w-20 px-2 py-1 text-xs font-mono rounded-lg text-right border focus:outline-none ${
                        violatesMin
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-[#FEFAF3] text-slate-900 border-slate-200'
                      }`}
                    />
                  </div>

                  {/* Line Total */}
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 font-mono text-sm tabular-nums">
                      {settings.currencySymbol}
                      {item.total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {violatesMin && (
                  <div className="mt-1.5 text-[10px] text-rose-700 flex items-center gap-1 font-semibold bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                    <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                    <span>
                      Below min price ({settings.currencySymbol}{item.product.minSellingPrice})! Manager PIN required.
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {cart.length === 0 && (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Cart is empty</p>
              <p className="text-[11px] text-slate-400">Click products from catalog to add</p>
            </div>
          )}
        </div>

        {/* Manager Override Warning */}
        {requiresManagerOverride && (
          <div className="mx-3 my-1 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#C49A45] shrink-0" />
              <span className="font-medium">Manager Approval (PIN) Required</span>
            </div>
            <button
              onClick={() => setShowOverrideModal(true)}
              className="px-2.5 py-1 bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold text-[11px] rounded-lg shadow-xs cursor-pointer"
            >
              Enter PIN
            </button>
          </div>
        )}

        {/* Bill Summary & Checkout Button */}
        <div className="p-3.5 bg-white border-t border-[#EADBCE] space-y-2.5 shadow-sm">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {settings.currencySymbol} {formatCurrencyAmount(rawSubtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Discount:</span>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={cartDiscount || ''}
                onChange={(e) => setCartDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-0.5 text-xs text-right font-mono font-bold rounded-lg bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:outline-none"
              />
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT ({settings.vatPercent ?? 5}%):</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {settings.currencySymbol} {formatCurrencyAmount(vatAmount)}
              </span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-[#C49A45] font-mono tabular-nums">
                {settings.currencySymbol} {formatCurrencyAmount(grandTotal)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={openCheckout}
              disabled={cart.length === 0 || requiresManagerOverride}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                cart.length === 0 || requiresManagerOverride
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-[#C49A45] hover:bg-[#b58c38] text-white shadow-md'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Checkout & Pay ({settings.currencySymbol} {formatCurrencyAmount(grandTotal)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: CHECKOUT WITH STRICT OVERPAYMENT GUARDRAIL (Req 7) */}
      {/* ========================================================= */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#C49A45]" />
                  <span>Receive Payment & Confirm Order</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customer: {selectedCustomer ? selectedCustomer.name : walkinName || 'Walk-in Cash Customer'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Grand Total</span>
                <span className="text-lg font-extrabold text-[#C49A45] font-mono">
                  {settings.currencySymbol}{grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* REQUIREMENT 7: Overpayment Banner - Order Confirm disabled! */}
            {isOverpaid && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-800 text-xs space-y-1 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-rose-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Excess payment detected! Order Confirm is disabled.</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Customer paid ({settings.currencySymbol}{totalPaidInCheckout.toLocaleString()}) which exceeds the bill amount ({settings.currencySymbol}{grandTotal.toLocaleString()}). You cannot enter more than the bill amount. Please enter equal or less amount.
                </p>
              </div>
            )}

            {/* Payment Methods */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Payment Tender Breakdown
              </label>

              {payments.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#FEFAF3] p-2 rounded-xl border border-[#EADBCE]">
                  <select
                    value={p.method}
                    onChange={(e) =>
                      updateSplitPayment(idx, { method: e.target.value as PaymentMethod })
                    }
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 font-medium cursor-pointer"
                  >
                    <option value="cash">Cash</option>
                    <option value="bkash">bKash (MFS)</option>
                    <option value="nagad">Nagad (MFS)</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>

                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">
                      {settings.currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={p.amount}
                      onChange={(e) =>
                        updateSplitPayment(idx, { amount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full pl-6 pr-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-white border border-slate-300 text-slate-900 text-right focus:outline-none focus:border-[#C49A45]"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Trx / Ref ID"
                    value={p.reference || ''}
                    onChange={(e) => updateSplitPayment(idx, { reference: e.target.value })}
                    className="w-28 px-2 py-1.5 text-xs font-mono rounded-lg bg-white border border-slate-300 text-slate-900"
                  />

                  {payments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSplitPayment(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addSplitPaymentRow('bkash')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-[#FEFAF3] hover:bg-[#ebd5ad]/50 text-slate-700 font-medium cursor-pointer border border-[#EADBCE]"
                >
                  + Add bKash
                </button>
                <button
                  type="button"
                  onClick={() => addSplitPaymentRow('cash')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-[#FEFAF3] hover:bg-[#ebd5ad]/50 text-slate-700 font-medium cursor-pointer border border-[#EADBCE]"
                >
                  + Add Cash
                </button>
              </div>
            </div>

            {/* Reconciliation Totals */}
            <div className="p-3.5 bg-[#FEFAF3] rounded-2xl border border-[#EADBCE] space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Total Bill</span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono">
                    {settings.currencySymbol}{grandTotal.toLocaleString()}
                  </span>
                </div>
                <div className={`p-2 rounded-xl border ${
                  isOverpaid ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'
                }`}>
                  <span className={`text-[10px] block ${isOverpaid ? 'text-rose-700 font-bold' : 'text-slate-500'}`}>
                    Amount Paid
                  </span>
                  <span className={`text-sm font-extrabold font-mono ${isOverpaid ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {settings.currencySymbol}{totalPaidInCheckout.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Remaining Due</span>
                  <span className={`text-sm font-extrabold font-mono ${calculatedDue > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {settings.currencySymbol}{calculatedDue.toLocaleString()}
                  </span>
                </div>
              </div>

              {calculatedDue > 0 && !isOverpaid && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Unpaid amount ({settings.currencySymbol}{calculatedDue.toLocaleString()}) automatically transfers to <strong>Due List</strong>, where it can later be collected via the <strong>Due Receive</strong> button.
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Back to Cart
              </button>

              {/* Requirement 7: Disabled if overpaid */}
              <button
                type="button"
                onClick={handleFinalizeSale}
                disabled={isOverpaid || cart.length === 0}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                  isOverpaid || cart.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <span>{isOverpaid ? 'Blocked: Excess Payment' : 'Confirm Order & Print'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showNewCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-[#EADBCE] p-6 shadow-2xl text-slate-900 space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#C49A45]" />
              <span>Register Customer</span>
            </h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Miller"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Phone</label>
                <input
                  type="text"
                  placeholder="+880 1..."
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Site / Billing Address</label>
                <input
                  type="text"
                  placeholder="Demra, Dhaka"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustModal(false)}
                  className="flex-1 py-2 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold shadow-md cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager Override PIN Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-[#EADBCE] p-6 shadow-2xl space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#C49A45]" />
              <span>Manager Override PIN</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Price below minimum or high discount requires manager PIN (Default: 1234).
            </p>
            <form onSubmit={handleVerifyOverride} className="space-y-3">
              <input
                type="password"
                autoFocus
                placeholder="Enter 4-digit PIN..."
                value={overridePasscode}
                onChange={(e) => setOverridePasscode(e.target.value)}
                className="w-full px-3 py-2 text-center text-lg font-mono font-bold tracking-widest rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
              />
              {overrideError && (
                <p className="text-xs text-rose-600 font-semibold text-center">{overrideError}</p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="flex-1 py-2 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold shadow-md cursor-pointer"
                >
                  Authorize Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
