import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePOS } from '../../context/POSContext';
import { Product, MaterialUnit, StockAdjustment } from '../../types';
import { printProductSticker, downloadStickerHTML } from '../../utils/printProductSticker';
import { cleanItemName } from '../../utils/currencyAndWords';
import {
  Boxes,
  Plus,
  AlertTriangle,
  ArrowDownToLine,
  Trash2,
  Search,
  Calculator,
  Edit2,
  Tag,
  Printer,
  X,
} from 'lucide-react';

export const InventoryModule: React.FC = () => {
  const {
    products,
    categories,
    addCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    logStockAdjustment,
    currentRole,
    settings,
  } = usePOS();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [selectedStickerProduct, setSelectedStickerProduct] = useState<Product | null>(null);
  const [stickerCopies, setStickerCopies] = useState<number>(1);

  // Product Form state
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState<MaterialUnit>('Bag');
  const [formCost, setFormCost] = useState(400);
  const [formRegular, setFormRegular] = useState(460);
  const [formMin, setFormMin] = useState(430);
  const [formStock, setFormStock] = useState(100);
  const [formThreshold, setFormThreshold] = useState(20);
  const [formBrand, setFormBrand] = useState('');

  // Inward PO Form
  const [inwardProductId, setInwardProductId] = useState('');
  const [inwardQty, setInwardQty] = useState(50);
  const [inwardSupplier, setInwardSupplier] = useState('');
  const [inwardTruckNumber, setInwardTruckNumber] = useState('');
  const [inwardSearchQuery, setInwardSearchQuery] = useState('');
  const inwardQtyInputRef = useRef<HTMLInputElement>(null);

  const filteredInwardProducts = useMemo(() => {
    const q = inwardSearchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.brand.toLowerCase().includes(q)
    );
  }, [products, inwardSearchQuery]);

  // Automatically select the first matching product when searching
  useEffect(() => {
    if (showInwardModal && filteredInwardProducts.length > 0) {
      const isCurrentInFiltered = filteredInwardProducts.some((p) => p.id === inwardProductId);
      if (!isCurrentInFiltered) {
        setInwardProductId(filteredInwardProducts[0].id);
      }
    }
  }, [filteredInwardProducts, showInwardModal, inwardProductId]);

  const selectedInwardProd = useMemo(() => {
    return products.find((p) => p.id === inwardProductId) || filteredInwardProducts[0];
  }, [products, inwardProductId, filteredInwardProducts]);

  // Waste Form
  const [wasteProductId, setWasteProductId] = useState('');
  const [wasteQty, setWasteQty] = useState(2);
  const [wasteType, setWasteType] = useState<StockAdjustment['type']>('damage');
  const [wasteReason, setWasteReason] = useState('Damaged during rain/unloading');

  // Calculator
  const [calcInputVal, setCalcInputVal] = useState(1);
  const [calcType, setCalcType] = useState<'ton_to_bags' | 'ton_to_kg' | 'cft_to_truck'>('ton_to_bags');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchLow = !lowStockOnly || p.currentStock <= p.minStockThreshold;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      return matchCat && matchLow && matchSearch;
    });
  }, [products, categoryFilter, lowStockOnly, search]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku(`SKU-${Date.now().toString().slice(-5)}`);
    setFormBarcode(`${Date.now()}`.slice(-12));
    setFormCategory(categories[0]?.name || 'General');
    setFormUnit('Bag');
    setFormCost(400);
    setFormRegular(460);
    setFormMin(430);
    setFormStock(100);
    setFormThreshold(20);
    setFormBrand('General');
    setShowProductModal(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormSku(prod.sku);
    setFormBarcode(prod.barcode);
    setFormCategory(prod.category);
    setFormUnit(prod.unit);
    setFormCost(prod.costPrice);
    setFormRegular(prod.regularPrice);
    setFormMin(prod.minSellingPrice);
    setFormStock(prod.currentStock);
    setFormThreshold(prod.minStockThreshold);
    setFormBrand(prod.brand);
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formName.trim(),
        sku: formSku.trim().toUpperCase(),
        barcode: formBarcode.trim(),
        category: formCategory,
        unit: formUnit,
        costPrice: Number(formCost),
        regularPrice: Number(formRegular),
        minSellingPrice: Number(formMin),
        currentStock: Number(formStock),
        minStockThreshold: Number(formThreshold),
        brand: formBrand.trim() || 'General',
      });
    } else {
      addProduct({
        name: formName.trim(),
        sku: formSku.trim().toUpperCase(),
        barcode: formBarcode.trim() || `${Date.now()}`.slice(-12),
        category: formCategory,
        unit: formUnit,
        costPrice: Number(formCost),
        regularPrice: Number(formRegular),
        minSellingPrice: Number(formMin),
        currentStock: Number(formStock),
        minStockThreshold: Number(formThreshold),
        warehouse: settings.defaultWarehouse,
        brand: formBrand.trim() || 'General',
      });
    }
    setShowProductModal(false);
  };

  const handleInwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = inwardProductId || filteredInwardProducts[0]?.id;
    if (!targetId) return;
    const prod = products.find((p) => p.id === targetId);
    if (!prod) return;
    const qtyToAdd = Number(inwardQty);
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) return;

    logStockAdjustment(
      targetId,
      'inward_purchase',
      qtyToAdd,
      prod.unit,
      `Inward PO delivery: ${inwardSupplier || 'Factory Direct'} (Truck: ${inwardTruckNumber || 'N/A'})`
    );
    setShowInwardModal(false);
    setInwardSearchQuery('');
  };

  const handleWasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === wasteProductId);
    if (!prod) return;
    logStockAdjustment(wasteProductId, wasteType, Number(wasteQty), prod.unit, wasteReason);
    setShowWasteModal(false);
  };

  return (
    <div className="p-4 sm:p-6 pb-28 space-y-6 max-w-7xl mx-auto font-sans text-slate-800 bg-[#FEFAF3]">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#EADBCE]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#C49A45]" />
            <span>Inventory & Yard Stock Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time warehouse stock, edit products, adjust delivery inwards, and log damage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCalcModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold cursor-pointer shadow-xs"
          >
            <Calculator className="w-3.5 h-3.5 text-[#C49A45]" />
            <span>Unit Converter</span>
          </button>

          {currentRole.permissions.canManageCategories && (
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold cursor-pointer shadow-xs"
            >
              <Tag className="w-3.5 h-3.5 text-[#C49A45]" />
              <span>Categories</span>
            </button>
          )}

          {currentRole.permissions.canAdjustStock && (
            <>
              <button
                onClick={() => {
                  setInwardProductId(products[0]?.id || '');
                  setShowInwardModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold cursor-pointer"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Stock In (Inward)</span>
              </button>
              <button
                onClick={() => {
                  setWasteProductId(products[0]?.id || '');
                  setShowWasteModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Log Damage / Waste</span>
              </button>
            </>
          )}

          {/* REQUIREMENT 4: Edit & Add items strictly from Inventory & Yard */}
          {currentRole.permissions.canManageSettings && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#EADBCE] shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search material name, SKU, brand, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#C49A45]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 text-xs rounded-xl font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              lowStockOnly
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Filter</span>
          </button>
        </div>
      </div>

      {/* Products Table with Edit and Delete Buttons (Requirement 4) */}
      <div className="rounded-2xl bg-white border border-[#EADBCE] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#EBEBEB] text-slate-800 font-bold border-b border-slate-300 sticky top-0 z-20 shadow-xs select-none">
              <tr>
                <th className="py-3 px-4 border-r border-slate-300">Material / SKU</th>
                <th className="py-3 px-4 border-r border-slate-300">Category</th>
                {currentRole.permissions.canViewPurchasePrice && (
                  <th className="py-3 px-4 border-r border-slate-300 text-right">Cost Price</th>
                )}
                <th className="py-3 px-4 border-r border-slate-300 text-right">Selling Price</th>
                <th className="py-3 px-4 border-r border-slate-300 text-right">Min Selling Price</th>
                <th className="py-3 px-4 border-r border-slate-300 text-right">Stock Level</th>
                <th className="py-3 px-4 border-r border-slate-300 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions (Print / Edit / Delete)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProducts.map((prod) => {
                const isLowStock = prod.currentStock <= prod.minStockThreshold;
                return (
                  <tr key={prod.id} className="hover:bg-[#FEFAF3] transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block text-xs">{cleanItemName(prod.name)}</span>
                      <span className="text-[10px] text-[#C49A45] font-mono font-bold">
                        {prod.sku} &middot; Barcode: {prod.barcode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{prod.category}</td>
                    {currentRole.permissions.canViewPurchasePrice && (
                      <td className="py-3 px-4 text-right font-mono text-slate-500 tabular-nums">
                        {settings.currencySymbol}{prod.costPrice.toLocaleString()}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {settings.currencySymbol}{prod.regularPrice.toLocaleString()}
                      <span className="text-[10px] text-slate-400 font-normal ml-0.5">/{prod.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-700 tabular-nums font-semibold">
                      {settings.currencySymbol}{prod.minSellingPrice.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                      <span className={isLowStock ? 'text-rose-600 font-extrabold' : 'text-emerald-700'}>
                        {prod.currentStock.toLocaleString()} {prod.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isLowStock
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isLowStock ? 'Low Stock' : 'Sufficient'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {/* Actions: Print Sticker, Edit, and Delete */}
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStickerProduct(prod);
                            setStickerCopies(1);
                          }}
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-[#C49A45] hover:text-white text-[#C49A45] border border-[#C49A45]/30 transition-colors cursor-pointer flex items-center gap-1"
                          title="Print Product Sticker Label (Material Name, SKU, Price)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#C49A45] hover:text-white text-slate-700 transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(prod)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Boxes className="w-9 h-9 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No products found</p>
                    <button
                      onClick={handleOpenAdd}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add First Product</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add / Edit Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C49A45]" />
                <span>{editingProduct ? 'Edit Product Details' : 'Add New Inventory Material'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Product / Material Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shah Cement 50kg"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                  >
                    {categories.length === 0 ? (
                      <option value="General">General</option>
                    ) : (
                      categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unit of Measure</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as MaterialUnit)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                  >
                    <option value="Bag">Bag</option>
                    <option value="Ton">Ton</option>
                    <option value="CFT">CFT</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Kg">Kg</option>
                    <option value="Bundle">Bundle</option>
                    <option value="SqFt">SqFt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-[#FEFAF3] border border-[#EADBCE]">
                <div>
                  <label className="block text-[10px] text-slate-600 font-semibold mb-0.5">Cost Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={formCost}
                    onChange={(e) => setFormCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono rounded-lg bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-800 font-bold mb-0.5">Selling Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={formRegular}
                    onChange={(e) => setFormRegular(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold rounded-lg bg-white border border-slate-300 text-[#C49A45]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-rose-700 font-semibold mb-0.5">Min Price Guard</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={formMin}
                    onChange={(e) => setFormMin(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono rounded-lg bg-white border border-slate-300 text-rose-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-800 font-bold mb-0.5">Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold rounded-lg bg-white border border-slate-300 text-emerald-700"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold shadow-md cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#C49A45]" />
                <span>Categories Management</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCatName.trim()) return;
                addCategory(newCatName.trim());
                setNewCatName('');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  New Category Name *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Glass & Aluminum"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white cursor-pointer shrink-0"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </form>

            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-bold text-slate-700 block">Existing Categories:</span>
              <div className="max-h-52 overflow-y-auto space-y-1">
                {categories.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-[#FEFAF3] border border-[#EADBCE] flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-rose-200 p-6 shadow-2xl space-y-3">
            <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>Delete Product from Inventory?</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900">"{productToDelete.name}"</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="flex-1 py-2 text-xs rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inward Modal */}
      {showInwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-3">
            <h3 className="text-base font-bold text-emerald-800 flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
              <span>Receive Inward Stock Delivery</span>
            </h3>
            <form onSubmit={handleInwardSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Material * (Code | Item Name | Stock | MRP)</label>
                <div className="mb-2 relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search material by name, SKU, barcode (Press Enter to select)..."
                    value={inwardSearchQuery}
                    onChange={(e) => setInwardSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (filteredInwardProducts.length > 0) {
                          setInwardProductId(filteredInwardProducts[0].id);
                          inwardQtyInputRef.current?.focus();
                          inwardQtyInputRef.current?.select();
                        }
                      }
                    }}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                {/* ERP Row & Column Table for Material Selection matching Image 1 */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto mb-2">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-[#EBEBEB] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10">
                      <tr>
                        <th className="py-1 px-2 border-r border-slate-300 w-24">Code</th>
                        <th className="py-1 px-2 border-r border-slate-300">Item Name</th>
                        <th className="py-1 px-2 border-r border-slate-300 text-center w-20">Stock</th>
                        <th className="py-1 px-2 text-right w-20">MRP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInwardProducts.slice(0, 50).map((p) => {
                        const isSelected = p.id === inwardProductId;
                        return (
                          <tr
                            key={p.id}
                            onClick={() => {
                              setInwardProductId(p.id);
                              inwardQtyInputRef.current?.focus();
                              inwardQtyInputRef.current?.select();
                            }}
                            className={`cursor-pointer transition-colors select-none ${
                              isSelected
                                ? 'bg-[#2563eb] text-white font-bold'
                                : 'hover:bg-amber-50 text-slate-800'
                            }`}
                          >
                            <td className="py-1 px-2 border-r border-slate-200/50 font-mono whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                {isSelected ? (
                                  <span className="text-amber-300">▸</span>
                                ) : (
                                  <span className="inline-block w-2"></span>
                                )}
                                <span>{p.sku}</span>
                              </span>
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200/50 truncate max-w-[150px]">
                              {p.name}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200/50 text-center font-mono whitespace-nowrap">
                              {p.currentStock} {p.unit}
                            </td>
                            <td className="py-1 px-2 text-right font-mono font-bold whitespace-nowrap">
                              {settings.currencySymbol}{Number(p.regularPrice).toFixed(3)}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredInwardProducts.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            No materials found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedInwardProd && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Selected Material</span>
                    <strong className="text-slate-900 text-xs block font-bold">{selectedInwardProd.name}</strong>
                    <span className="text-[10px] text-slate-500 font-mono">SKU: {selectedInwardProd.sku}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-500 block">Stock Auto-Addition</span>
                    <span className="text-slate-700">{selectedInwardProd.currentStock}</span>
                    <span className="text-emerald-700 font-bold"> + {Number(inwardQty) || 0}</span>
                    <span className="font-extrabold text-emerald-800 block text-xs">
                      = {(Number(selectedInwardProd.currentStock) + (Number(inwardQty) || 0)).toLocaleString()} {selectedInwardProd.unit}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Quantity *</label>
                <input
                  ref={inwardQtyInputRef}
                  type="number"
                  min="1"
                  required
                  value={inwardQty}
                  onChange={(e) => setInwardQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  Add to Yard Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Converter */}
      {showCalcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-[#EADBCE] p-6 shadow-2xl space-y-3 text-slate-900">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#C49A45]" />
              <span>Building Materials Unit Converter</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Conversion Formula</label>
                <select
                  value={calcType}
                  onChange={(e) => setCalcType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900"
                >
                  <option value="ton_to_bags">Cement: Ton to Bags (1 Ton = 20 Bags @ 50kg)</option>
                  <option value="ton_to_kg">Steel Rebar: Ton to Kg (1 Ton = 1,000 Kg)</option>
                  <option value="cft_to_truck">Sand: CFT to Dump Truck (1 Truck ≈ 480 CFT)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={calcInputVal}
                  onChange={(e) => setCalcInputVal(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-mono font-bold text-sm"
                />
              </div>
              <div className="p-3 bg-[#FEFAF3] rounded-2xl text-center font-mono border border-[#C49A45]/30">
                <span className="text-[11px] text-slate-500 block mb-0.5">Equivalence:</span>
                <span className="text-base font-extrabold text-[#C49A45]">
                  {calcType === 'ton_to_bags' && `${(calcInputVal * 20).toFixed(1)} Bags (50kg)`}
                  {calcType === 'ton_to_kg' && `${(calcInputVal * 1000).toLocaleString()} Kg`}
                  {calcType === 'cft_to_truck' && `${(calcInputVal / 480).toFixed(2)} Trucks`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCalcModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Sticker Label Print Modal */}
      {selectedStickerProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#C49A45]" />
                <span>Print Product Sticker Label</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedStickerProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Sticker Preview Card */}
            <div className="p-4 bg-[#FEFAF3] border border-[#EADBCE] rounded-2xl flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 mb-2">Live Sticker Preview (55mm x 35mm)</span>
              
              <div className="w-64 bg-white border-2 border-slate-800 rounded-xl p-3 shadow-md space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-600 tracking-wider truncate max-w-[150px]">
                    {settings.businessName}
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-amber-100 text-[#C49A45] px-1.5 py-0.5 rounded">
                    STICKER
                  </span>
                </div>

                <div>
                  <label className="text-[9px] uppercase text-slate-400 font-bold block">Material Name:</label>
                  <strong className="text-sm font-extrabold text-slate-900 block leading-tight">
                    {cleanItemName(selectedStickerProduct.name)}
                  </strong>
                </div>

                <div className="flex justify-between items-end pt-1">
                  <div>
                    <label className="text-[9px] uppercase text-slate-400 font-bold block">SKU / Code:</label>
                    <span className="font-mono font-bold text-xs text-[#C49A45] block">
                      {selectedStickerProduct.sku}
                    </span>
                    {selectedStickerProduct.barcode && (
                      <span className="text-[10px] font-mono text-slate-500 block">
                        BC: {selectedStickerProduct.barcode}
                      </span>
                    )}
                  </div>

                  <div className="text-right bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                    <span className="text-[8px] uppercase font-bold block text-amber-300">Selling Price</span>
                    <span className="font-mono font-extrabold text-sm text-yellow-300">
                      {settings.currencySymbol}{selectedStickerProduct.regularPrice.toLocaleString()}
                      {selectedStickerProduct.unit ? <span className="text-[10px] text-slate-300 font-normal">/{selectedStickerProduct.unit}</span> : ''}
                    </span>
                  </div>
                </div>

                <div className="text-center font-mono text-[11px] font-black tracking-widest text-slate-800 pt-1 border-t border-slate-200 select-none">
                  ||||| | ||||| |||| ||||| ||
                </div>
              </div>
            </div>

            {/* Copies Selection & Print Trigger */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold block">
                    Number of Sticker Copies to Print
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono font-bold">
                    Preset:
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={stickerCopies}
                  onChange={(e) => setStickerCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 font-mono font-bold text-base focus:bg-white focus:outline-none focus:border-[#C49A45]"
                />
                <div className="flex gap-1.5 mt-2">
                  {[1, 5, 10, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setStickerCopies(num)}
                      className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold border cursor-pointer transition-all ${
                        stickerCopies === num
                          ? 'bg-[#C49A45] text-white border-[#C49A45] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {num} {num === 1 ? 'Copy' : 'Pcs'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    printProductSticker(selectedStickerProduct, settings, stickerCopies);
                  }}
                  className="w-full py-3 rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-extrabold shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print {stickerCopies} Sticker{stickerCopies > 1 ? 's' : ''} Now</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      downloadStickerHTML(selectedStickerProduct, settings, stickerCopies);
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 cursor-pointer text-xs"
                  >
                    📥 Download Printable HTML
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStickerProduct(null)}
                    className="py-2 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden DOM Printable Sticker Area for instant window.print() */}
      {selectedStickerProduct && (
        <div id="printable-sticker-area" className="hidden print:block p-2">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: Math.max(1, Math.min(stickerCopies, 100)) }).map((_, idx) => (
              <div
                key={idx}
                className="w-[55mm] h-[35mm] border border-slate-400 rounded-md p-2 bg-white flex flex-col justify-between text-left box-border font-sans break-inside-avoid"
              >
                <div className="text-[8px] font-extrabold text-slate-700 uppercase border-b border-slate-300 pb-0.5 truncate">
                  {settings.businessName || 'STORE LABEL'}
                </div>
                <div className="text-xs font-black text-slate-900 leading-tight">
                  {cleanItemName(selectedStickerProduct.name)}
                </div>
                <div className="flex justify-between text-[8px] font-mono font-bold text-slate-800">
                  <span>SKU: {selectedStickerProduct.sku}</span>
                  {selectedStickerProduct.barcode && <span>BC: {selectedStickerProduct.barcode}</span>}
                </div>
                <div className="font-mono text-center text-xs font-bold tracking-widest text-slate-900 select-none">
                  ||||| | ||||| |||| ||||| ||
                </div>
                <div className="bg-slate-900 text-white px-2 py-0.5 rounded flex items-center justify-between">
                  <span className="text-[7px] font-bold">PRICE:</span>
                  <span className="font-mono font-extrabold text-xs text-yellow-300">
                    {settings.currencySymbol}{selectedStickerProduct.regularPrice.toLocaleString()}
                    {selectedStickerProduct.unit ? `/${selectedStickerProduct.unit}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
