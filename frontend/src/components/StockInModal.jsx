import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowDownToLine, Trash2, CheckCircle2, Search, Building2, Package, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';

export default function StockInModal({
  isOpen,
  onClose,
  products = [],
  preselectedProduct = null,
  onSuccess,
  onRefreshProducts,
  settings = {}
}) {
  if (!isOpen) return null;

  const currency = settings?.currency_symbol || '₹';

  // Available remembered suppliers from backend
  const [suppliersList, setSuppliersList] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');

  // Bill items list (Right Panel)
  const [billItems, setBillItems] = useState([]);

  // Left Panel: Product Search & Entry state
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [showNewProdForm, setShowNewProdForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Grains & Flours');
  const [newProductUnit, setNewProductUnit] = useState('pcs');
  const [newProductSellingPrice, setNewProductSellingPrice] = useState('');

  const [incomingStock, setIncomingStock] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [notes, setNotes] = useState('');

  // Status flags
  const [submittingBill, setSubmittingBill] = useState(false);
  const [addingProductToBill, setAddingProductToBill] = useState(false);

  // Categories list
  const existingCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  if (!existingCategories.includes('General')) existingCategories.push('General');

  // Fetch remembered suppliers on modal open
  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const res = await fetch('/api/suppliers');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSuppliersList(data);
            setSelectedSupplier(data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch suppliers:', err);
      }
    }
    fetchSuppliers();
  }, [isOpen]);

  // Reset or initialize on open
  useEffect(() => {
    if (preselectedProduct) {
      setSelectedProductId(String(preselectedProduct.id));
      setProductSearchQuery(preselectedProduct.name);
      setCostPerUnit(String(preselectedProduct.cost_price || ''));
      setIncomingStock('');
    } else {
      setSelectedProductId('');
      setProductSearchQuery('');
      setCostPerUnit('');
      setIncomingStock('');
    }
    setShowNewProdForm(false);
    setNewProductName('');
    setNewProductSellingPrice('');
    setNotes('');
    setBillItems([]);
    setShowNewSupplierInput(false);
    setNewSupplierName('');
    setIsSearchDropdownOpen(false);
  }, [isOpen, preselectedProduct]);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products for search
  const filteredProducts = products.filter(p => {
    if (!productSearchQuery.trim()) return true;
    const q = productSearchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  // Select existing product from search
  const handleSelectProduct = (prod) => {
    setSelectedProductId(String(prod.id));
    setProductSearchQuery(prod.name);
    setShowNewProdForm(false);
    setNewProductName('');
    setCostPerUnit(String(prod.cost_price || ''));
    setIsSearchDropdownOpen(false);
  };

  // Clear product selection
  const handleClearSelection = () => {
    setSelectedProductId('');
    setProductSearchQuery('');
    setCostPerUnit('');
    setIsSearchDropdownOpen(false);
  };

  // Active product details
  const activeExistingProduct = selectedProductId ? products.find(p => p.id === Number(selectedProductId)) : null;
  const isNewProductMode = showNewProdForm && newProductName.trim() !== '';

  // Current stock display
  const currentStockDisplay = activeExistingProduct
    ? `${activeExistingProduct.stock} ${activeExistingProduct.unit}`
    : (isNewProductMode ? '0 (New)' : '—');

  // Dynamic replenishment analysis: velocity & shelf threshold cover
  const calculateSuggestedRestock = (prod) => {
    if (!prod) return 10;
    const threshold = prod.low_stock_threshold || 10;
    const currentStock = prod.stock || 0;
    // Fast-moving item dynamic cover: target buffer 2.5x threshold minus current stock
    const needed = Math.max(Math.ceil(threshold * 2.5) - Math.floor(currentStock), prod.unit === 'kg' ? 10 : 12);
    return Math.max(needed, 5);
  };
  const suggestedRestockQty = activeExistingProduct ? calculateSuggestedRestock(activeExistingProduct) : null;

  // Active pricing & margin calculation
  const activeSellingPrice = isNewProductMode
    ? (newProductSellingPrice !== '' ? Number(newProductSellingPrice) : Number((costNum * 1.25).toFixed(2)))
    : (activeExistingProduct?.selling_price || 0);

  const profitPerUnit = activeSellingPrice - costNum;
  const marginPercent = activeSellingPrice > 0
    ? ((profitPerUnit / activeSellingPrice) * 100).toFixed(1)
    : null;
  const markupPercent = costNum > 0
    ? ((profitPerUnit / costNum) * 100).toFixed(1)
    : null;

  // Total cost for current item: incomingStock * costPerUnit
  const qtyNum = Number(incomingStock) || 0;
  const costNum = Number(costPerUnit) || 0;
  const currentTotalCost = qtyNum * costNum;

  // Running Final Vendor Amount
  const billTotalAmount = billItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.cost_price)), 0);

  // Add product to vendor bill (Left Action)
  const handleAddProductToVendorBill = async () => {
    if (!selectedProductId && !newProductName.trim()) {
      alert('Please select a product or enter a new product name.');
      return;
    }

    if (!incomingStock || Number(incomingStock) <= 0) {
      alert('Please enter a valid incoming stock quantity (> 0).');
      return;
    }

    if (costPerUnit === '' || Number(costPerUnit) < 0) {
      alert('Please enter a valid cost per 1 unit.');
      return;
    }

    setAddingProductToBill(true);

    try {
      let finalProductId = selectedProductId ? Number(selectedProductId) : null;
      let finalProductName = '';
      let finalUnit = 'pcs';

      if (isNewProductMode) {
        // Register new product in SQLite database immediately
        const sellingPrice = newProductSellingPrice !== '' ? Number(newProductSellingPrice) : Number((costNum * 1.25).toFixed(2));
        const newProdPayload = {
          name: newProductName.trim(),
          category: newProductCategory || 'General',
          unit: newProductUnit || 'pcs',
          cost_price: costNum,
          selling_price: sellingPrice,
          mrp: sellingPrice,
          stock: 0
        };

        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProdPayload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to create new product');
        }

        const createdProd = await res.json();
        finalProductId = createdProd.id;
        finalProductName = createdProd.name;
        finalUnit = createdProd.unit;

        if (onRefreshProducts) onRefreshProducts();
      } else if (activeExistingProduct) {
        finalProductId = activeExistingProduct.id;
        finalProductName = activeExistingProduct.name;
        finalUnit = activeExistingProduct.unit;
      }

      // Add to bill items list
      const newItem = {
        productId: finalProductId,
        name: finalProductName,
        unit: finalUnit,
        quantity: qtyNum,
        cost_price: costNum,
        totalCost: currentTotalCost,
        notes: notes.trim()
      };

      setBillItems(prev => [...prev, newItem]);

      // Reset left side fields for the next product
      setSelectedProductId('');
      setProductSearchQuery('');
      setShowNewProdForm(false);
      setNewProductName('');
      setNewProductSellingPrice('');
      setIncomingStock('');
      setCostPerUnit('');
      setNotes('');
      setIsSearchDropdownOpen(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAddingProductToBill(false);
    }
  };

  // Adjust quantity of item in the bill using + and - buttons
  const handleUpdateBillItemQty = (index, delta) => {
    setBillItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(0.1, Number((item.quantity + delta).toFixed(2)));
      return {
        ...item,
        quantity: newQty,
        totalCost: newQty * item.cost_price
      };
    }));
  };

  // Remove item from bill
  const handleRemoveBillItem = (index) => {
    setBillItems(prev => prev.filter((_, i) => i !== index));
  };

  // Confirm & Add Inventory (Right Action)
  const handleConfirmAndAddToStock = async () => {
    if (billItems.length === 0) {
      alert('Vendor bill is empty. Please add at least one product using "Add Product to Vendor Bill".');
      return;
    }

    const supplierToUse = (newSupplierName.trim() || selectedSupplier.trim() || 'Direct Vendor').trim();
    const totalUnitsCount = billItems.reduce((acc, it) => acc + Number(it.quantity), 0);

    const isConfirmed = window.confirm(
      `Confirm & Add Inventory to Stock?\n\n` +
      `• Supplier: ${supplierToUse}\n` +
      (invoiceNo.trim() ? `• Invoice #: ${invoiceNo.trim()}\n` : '') +
      `• Products: ${billItems.length} items (${totalUnitsCount} total units)\n` +
      `• Total Inward Cost: ${currency}${billTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
      `Click OK to confirm. This will immediately update shelf stock and log the vendor inward entry.`
    );

    if (!isConfirmed) return;

    setSubmittingBill(true);

    try {
      const payload = {
        supplier_name: supplierToUse,
        invoice_no: invoiceNo.trim() || '',
        notes: `Inward delivery for ${billItems.length} items (${new Date().toLocaleDateString()})`,
        items: billItems.map(it => ({
          product_id: it.productId,
          quantity: it.quantity,
          cost_price: it.cost_price
        }))
      };

      const res = await fetch('/api/inventory/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit incoming stock');
      }

      // Refresh suppliers list
      try {
        const supRes = await fetch('/api/suppliers');
        if (supRes.ok) {
          const supData = await supRes.json();
          setSuppliersList(supData);
        }
      } catch (e) {}

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingBill(false);
    }
  };

  // Reset left form
  const handleResetLeftForm = () => {
    setSelectedProductId('');
    setProductSearchQuery('');
    setShowNewProdForm(false);
    setNewProductName('');
    setNewProductSellingPrice('');
    setIncomingStock('');
    setCostPerUnit('');
    setNotes('');
    setIsSearchDropdownOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container: constrained so bottom buttons never go below the page */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full min-h-[600px] max-h-[95vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-emerald-800 text-white px-5 py-3 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center space-x-2.5">
            <ArrowDownToLine className="w-5 h-5 text-yellow-300" />
            <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
              Receive Incoming Stock
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Panel Body */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          
          {/* ================= LEFT PANEL: PRODUCT ENTRY STATION ================= */}
          <div className="lg:col-span-6 bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2.5">
            
            <div className="space-y-2.5">
              
              {/* 1. SELECT PRODUCT with enlarged dropdown & single "+ New" button */}
              <div ref={searchContainerRef} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm sm:text-base font-extrabold text-slate-800">
                    Select Product
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewProdForm(prev => !prev);
                      if (!showNewProdForm) {
                        setSelectedProductId('');
                        setProductSearchQuery('');
                      }
                    }}
                    className={`text-xs font-bold px-3 py-1 rounded-md border transition ${
                      showNewProdForm
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300'
                    }`}
                  >
                    {showNewProdForm ? 'Cancel' : '+ New'}
                  </button>
                </div>

                {/* If + New is clicked */}
                {showNewProdForm ? (
                  <div className="p-3 bg-emerald-50/90 border-2 border-emerald-300 rounded-xl space-y-2.5 animate-fadeIn text-xs">
                    <div>
                      <input
                        type="text"
                        placeholder="Enter New Product Name..."
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-base font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-lg focus:border-emerald-600 outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Category</label>
                        <select
                          value={newProductCategory}
                          onChange={(e) => setNewProductCategory(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        >
                          {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Unit</label>
                        <select
                          value={newProductUnit}
                          onChange={(e) => setNewProductUnit(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        >
                          <option value="pcs">pcs</option>
                          <option value="pkt">pkt</option>
                          <option value="kg">kg</option>
                          <option value="ltr">ltr</option>
                          <option value="box">box</option>
                          <option value="gm">gm</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Selling Price</label>
                        <input
                          type="number"
                          placeholder="e.g. 60"
                          value={newProductSellingPrice}
                          onChange={(e) => setNewProductSellingPrice(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Enlarged Search Dropdown */
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search product by name or barcode..."
                      value={productSearchQuery}
                      onFocus={() => setIsSearchDropdownOpen(true)}
                      onChange={(e) => {
                        setProductSearchQuery(e.target.value);
                        setIsSearchDropdownOpen(true);
                      }}
                      className="w-full text-base sm:text-lg font-bold text-slate-900 bg-white border-2 border-slate-300 hover:border-emerald-500 focus:border-emerald-600 pl-11 pr-10 py-3 rounded-xl outline-none shadow-sm transition"
                    />
                    {(productSearchQuery || selectedProductId) && (
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 font-bold"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}

                    {/* ENLARGED Dropdown List */}
                    {isSearchDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border-2 border-emerald-500 rounded-2xl shadow-2xl z-40 divide-y divide-slate-100 animate-fadeIn">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => handleSelectProduct(p)}
                              className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                                selectedProductId === String(p.id) ? 'bg-emerald-50 font-bold border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="min-w-0 pr-3">
                                <span className="font-extrabold text-base text-slate-900 block truncate">{p.name}</span>
                                <span className="text-xs text-slate-500 font-medium">{p.category} • Cost: {currency}{p.cost_price} / {p.unit}</span>
                              </div>
                              <span className="shrink-0 font-black text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                                Stock: {p.stock} {p.unit}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-slate-500 font-medium">
                            No product found. Click <strong>+ New</strong> to register it.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Suggested Restock Assistant */}
              {activeExistingProduct && suggestedRestockQty && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 shadow-2xs animate-fadeIn">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="truncate text-xs">
                      <span className="font-extrabold text-emerald-950 mr-1.5">Suggested Restock:</span>
                      <span className="font-black text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                        {suggestedRestockQty} {activeExistingProduct.unit}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold ml-1.5 hidden sm:inline">
                        (Fast turnover & safety cover)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncomingStock(String(suggestedRestockQty))}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-lg transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* 2. INCOMING STOCK & COST PER 1 UNIT (without +5 +10 steppers) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1">
                    Incoming Stock *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      placeholder="e.g. 10"
                      value={incomingStock}
                      onChange={(e) => setIncomingStock(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base sm:text-lg font-black text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:border-emerald-600 outline-none"
                    />
                    <span className="absolute right-3 top-3 text-xs font-bold text-slate-400 uppercase">
                      {activeExistingProduct?.unit || newProductUnit}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1">
                    Cost per 1 unit *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">
                      {currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 50"
                      value={costPerUnit}
                      onChange={(e) => setCostPerUnit(e.target.value)}
                      className="w-full pl-7 pr-3.5 py-2.5 text-base sm:text-lg font-black text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:border-emerald-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Expected Profit Margin Breakdown */}
              {activeSellingPrice > 0 && costNum > 0 && (
                <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition animate-fadeIn ${
                  Number(marginPercent) >= 20 ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' :
                  Number(marginPercent) >= 10 ? 'bg-blue-50/90 border-blue-300 text-blue-950' :
                  Number(marginPercent) >= 0 ? 'bg-amber-50/90 border-amber-300 text-amber-950' :
                  'bg-rose-50/90 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-center space-x-2 min-w-0">
                    <TrendingUp className="w-4 h-4 shrink-0 text-emerald-700" />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold">Profit Margin:</span>
                        <span className="font-black text-sm">{marginPercent}%</span>
                        {Number(marginPercent) < 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-800 text-[10px] font-black">
                            Cost exceeds Selling Price!
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Selling @ {currency}{activeSellingPrice.toFixed(2)} • Profit: {currency}{profitPerUnit.toFixed(2)} / {activeExistingProduct?.unit || newProductUnit}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Markup</span>
                    <span className="font-black text-xs text-slate-800">{markupPercent}%</span>
                  </div>
                </div>
              )}

              {/* 3. CURRENT STOCK & TOTAL COST */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1">
                    Current Stock
                  </label>
                  <div className="px-3.5 py-2.5 bg-slate-200/70 border border-slate-300 rounded-xl text-sm sm:text-base font-black text-slate-800 flex items-center justify-between">
                    <span>{currentStockDisplay}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1">
                    Total Cost
                  </label>
                  <div className="px-3.5 py-2.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-sm sm:text-base font-black text-emerald-900">
                    {currency}{currentTotalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* 4. NOTES */}
              <div>
                <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Batch #4, expiry 2027..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-xl outline-none"
                />
              </div>

            </div>

            {/* Bottom Actions of Left Panel */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetLeftForm}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleAddProductToVendorBill}
                  disabled={addingProductToBill || (!selectedProductId && !newProductName.trim())}
                  className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center space-x-1.5 shadow-md transition disabled:opacity-50"
                >
                  <span>{addingProductToBill ? 'Adding...' : 'Add Product to Vendor Bill'}</span>
                </button>
              </div>

              {/* Final Vendor Amount Pill */}
              <div className="bg-emerald-950 text-white px-4 py-2.5 rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-300">
                  Final Vendor Amount
                </span>
                <span className="text-base sm:text-lg font-black text-yellow-300">
                  {currency}{billTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

          </div>


          {/* ================= RIGHT PANEL: VENDOR BILL & CONFIRM ================= */}
          <div className="lg:col-span-6 bg-white p-3.5 rounded-xl border-2 border-emerald-400 shadow-sm flex flex-col justify-between space-y-2.5">
            
            <div className="space-y-2.5 flex-1 flex flex-col">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-black text-sm sm:text-base text-slate-900">
                  Vendor Bill
                </h4>
                <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                  {billItems.length} {billItems.length === 1 ? 'Product' : 'Products'}
                </span>
              </div>

              {/* Table with Prominent + and - Feature with Expanded Height */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 flex-1 min-h-[260px] max-h-[380px] sm:max-h-[440px] overflow-y-auto">
                <table className="w-full table-fixed text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5 w-[46%]">Product</th>
                      <th className="py-2 px-1 text-center w-[28%]">Quantity</th>
                      <th className="py-2 px-2 text-right w-[18%]">Cost</th>
                      <th className="py-2 px-1 text-center w-[8%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {billItems.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-400 font-medium">
                          <Package className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                          No products in bill yet.
                        </td>
                      </tr>
                    ) : (
                      billItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-emerald-50/40 transition">
                          <td className="py-2 px-2.5 font-bold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </td>

                          {/* PROMINENT + and - Stepper Feature */}
                          <td className="py-2 px-1 text-center whitespace-nowrap">
                            <div className="inline-flex items-center justify-center space-x-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateBillItemQty(idx, -1)}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 transition active:scale-90"
                                title="Decrease quantity (-1)"
                              >
                                -
                              </button>
                              <span className="font-black text-xs text-slate-900 px-1 min-w-[28px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateBillItemQty(idx, 1)}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 transition active:scale-90"
                                title="Increase quantity (+1)"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Cost column */}
                          <td className="py-2 px-2 text-right font-black text-emerald-800 whitespace-nowrap text-xs sm:text-sm">
                            {currency}{item.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>

                          <td className="py-2 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBillItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* SUPPLIER SECTION with ENLARGED dropdown & single "+ New" button */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span>Supplier</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewSupplierInput(prev => !prev);
                      if (!showNewSupplierInput) {
                        setSelectedSupplier('');
                      }
                    }}
                    className={`text-xs font-bold px-3 py-1 rounded-md border transition ${
                      showNewSupplierInput
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300'
                    }`}
                  >
                    {showNewSupplierInput ? 'Cancel' : '+ New'}
                  </button>
                </div>

                {showNewSupplierInput ? (
                  <input
                    type="text"
                    placeholder="Enter New Supplier Name..."
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="w-full text-sm sm:text-base font-bold text-slate-900 bg-white border-2 border-slate-300 focus:border-emerald-600 py-2.5 px-3 rounded-xl outline-none"
                    autoFocus
                  />
                ) : (
                  /* ENLARGED Supplier Dropdown */
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full text-base sm:text-lg font-bold text-slate-900 bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 py-3 px-3.5 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="">-- Select Saved Supplier --</option>
                    {suppliersList.map((s, idx) => (
                      <option key={idx} value={s} className="font-semibold text-base py-2">
                        {s}
                      </option>
                    ))}
                  </select>
                )}

                {/* Optional Invoice # */}
                <div>
                  <input
                    type="text"
                    placeholder="Invoice # (Optional, e.g. INV-9021)"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 py-1.5 px-2.5 rounded-lg outline-none"
                  />
                </div>
              </div>

            </div>

            {/* Bottom Button: ONLY "Confirm & Add Inventory" */}
            <div className="pt-1 shrink-0">
              <button
                type="button"
                onClick={handleConfirmAndAddToStock}
                disabled={submittingBill || billItems.length === 0}
                className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-sm sm:text-base flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-yellow-300" />
                <span>
                  {submittingBill ? 'Updating Stock...' : 'Confirm & Add Inventory'}
                </span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
