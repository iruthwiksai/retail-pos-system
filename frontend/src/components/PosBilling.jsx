import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  RefreshCw,
  Volume2,
  VolumeX,
  Clock,
  AlertOctagon,
  Eye,
  CheckCircle2,
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&auto=format&fit=crop&q=80';

export default function PosBilling({
  products,
  onRefreshProducts,
  onCheckoutClick,
  settings,
  slots,
  setSlots,
  activeSlot,
  setActiveSlot,
  onViewOrderReceipt
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [warningMsg, setWarningMsg] = useState('');
  const [widgetsData, setWidgetsData] = useState({
    recentOrders: [],
    frequentItems: [],
    outOfStockItems: []
  });
  const [collapsedWidgets, setCollapsedWidgets] = useState({
    frequent: false,
    previous: false,
    stock: false
  });

  const toggleWidget = (key) => {
    setCollapsedWidgets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const searchInputRef = useRef(null);
  const currency = settings?.currency_symbol || '₹';

  // Current active slot
  const currentSlot = slots[activeSlot] || { id: activeSlot, orderNumber: '', cart: [], customerName: '', customerPhone: '' };
  const cart = currentSlot.cart;

  // Scanner Audio Beep via Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
      // AudioContext policy
    }
  };

  const showWarning = (msg) => {
    setWarningMsg(msg);
    setTimeout(() => setWarningMsg(''), 3000);
  };

  // Fetch quick widgets: Previous 3 orders, Frequent 3-5 items, Out of stock items
  const fetchWidgets = async () => {
    try {
      const res = await fetch('/api/dashboard/widgets');
      const data = await res.json();
      setWidgetsData(data);
    } catch (err) {
      console.error('Error fetching dashboard widgets:', err);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  // Shared Inventory calculation across Bill 1, Bill 2, and Bill 3
  const getAllocatedQty = (productId) => {
    return slots.reduce((total, s) => {
      const item = s.cart.find((it) => it.product_id === productId);
      return total + (item ? item.quantity : 0);
    }, 0);
  };

  const getAvailableStock = (product) => {
    const allocated = getAllocatedQty(product.id);
    return Math.max(0, product.stock - allocated);
  };

  // Add item to active cart with strict stock limit
  const addToCart = (product) => {
    const available = getAvailableStock(product);
    if (available <= 0) {
      showWarning(`"${product.name}" is completely out of stock!`);
      return;
    }

    playBeep();

    setSlots((prevSlots) => {
      const updated = [...prevSlots];
      const slot = { ...updated[activeSlot] };
      const existing = slot.cart.find((item) => item.product_id === product.id);

      const addQty = product.unit === 'kg' ? 0.5 : 1;

      if (existing) {
        if (available < addQty) {
          showWarning(`Cannot add more. Only ${available} available in store!`);
          return prevSlots;
        }
        slot.cart = slot.cart.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: Number((item.quantity + addQty).toFixed(2)) }
            : item
        );
      } else {
        slot.cart = [
          ...slot.cart,
          {
            product_id: product.id,
            name: product.name,
            barcode: product.barcode,
            unit: product.unit || 'pcs',
            selling_price: product.selling_price,
            mrp: product.mrp || product.selling_price,
            cost_price: product.cost_price,
            image_url: product.image_url || DEFAULT_IMG,
            quantity: product.unit === 'kg' ? 1 : 1
          }
        ];
      }

      updated[activeSlot] = slot;
      return updated;
    });
  };

  // Update item quantity in active cart with strict clamp to physical stock
  const updateQuantity = (productId, newQty) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    // Quantity in OTHER slots
    const inOtherSlots = slots.reduce((total, s, idx) => {
      if (idx === activeSlot) return total;
      const it = s.cart.find((item) => item.product_id === productId);
      return total + (it ? it.quantity : 0);
    }, 0);

    const maxAllowedForThisSlot = Math.max(0, product.stock - inOtherSlots);

    if (newQty > maxAllowedForThisSlot) {
      showWarning(`Stock limit reached! Max available for this bill: ${maxAllowedForThisSlot} ${product.unit}`);
      newQty = maxAllowedForThisSlot;
    }

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setSlots((prevSlots) => {
      const updated = [...prevSlots];
      const slot = { ...updated[activeSlot] };
      slot.cart = slot.cart.map((item) =>
        item.product_id === productId ? { ...item, quantity: Number(newQty) } : item
      );
      updated[activeSlot] = slot;
      return updated;
    });
  };

  const removeFromCart = (productId) => {
    setSlots((prevSlots) => {
      const updated = [...prevSlots];
      const slot = { ...updated[activeSlot] };
      slot.cart = slot.cart.filter((item) => item.product_id !== productId);
      updated[activeSlot] = slot;
      return updated;
    });
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Clear all items from current cart?')) {
      setSlots((prevSlots) => {
        const updated = [...prevSlots];
        updated[activeSlot] = { ...updated[activeSlot], cart: [] };
        return updated;
      });
    }
  };

  const setCustomerName = (val) => {
    setSlots((prev) => {
      const updated = [...prev];
      updated[activeSlot] = { ...updated[activeSlot], customerName: val };
      return updated;
    });
  };

  const setCustomerPhone = (val) => {
    setSlots((prev) => {
      const updated = [...prev];
      updated[activeSlot] = { ...updated[activeSlot], customerPhone: val };
      return updated;
    });
  };

  // Keyboard Enter on Search
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      e.preventDefault();
      const exactBarcode = products.find((p) => p.barcode === searchTerm.trim());
      if (exactBarcode) {
        addToCart(exactBarcode);
        setSearchTerm('');
      } else if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearchTerm('');
      }
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F8' && cart.length > 0) {
        e.preventDefault();
        onCheckoutClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, onCheckoutClick]);

  // Filter products by search (No categories in dashboard)
  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.toLowerCase().includes(term));
  });

  // Cart Totals with accurate MRP savings calculation
  const grandTotal = cart.reduce((acc, item) => acc + item.selling_price * item.quantity, 0);
  const totalMrp = cart.reduce((acc, item) => acc + (item.mrp || item.selling_price) * item.quantity, 0);
  const totalSavings = Math.max(0, totalMrp - grandTotal);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Dynamic Out of Stock count based on real available stock
  const liveOutOfStock = products.filter((p) => getAvailableStock(p) <= 0);

  return (
    <div className="max-w-[1680px] mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-3">
      {/* Warning Alert Banner */}
      {warningMsg && (
        <div className="bg-red-600 text-white p-3 rounded-xl font-bold text-sm flex items-center justify-between shadow-lg">
          <span>⚠️ {warningMsg}</span>
          <button onClick={() => setWarningMsg('')} className="text-white hover:text-slate-200 text-base">✕</button>
        </div>
      )}

      {/* 3-COLUMN LAYOUT: Catalog & Search (Aligned to start Section 2 under Inventory) | Cart | Quick Panels */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        {/* COLUMN 1: Product Catalog & Search (Expands to fill all remaining space) */}
        <div className="flex-1 min-w-0 space-y-3 w-full">
          {/* Search Header - Prominent & Enlarged */}
          <div className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200">
            <div className="relative">
              <Search className="w-5 h-5 sm:w-6 sm:h-6 absolute left-3.5 top-3 sm:top-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search item name or scan barcode (F2)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-11 sm:pl-12 pr-24 py-3 sm:py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base md:text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition shadow-2xs"
                autoFocus
              />
              <div className="absolute right-3.5 top-3 sm:top-3.5 hidden sm:flex items-center">
                <kbd className="px-2.5 py-1 text-xs font-black text-slate-600 bg-slate-200 rounded-lg border border-slate-300">F2 Search</kbd>
              </div>
            </div>
          </div>

          {/* Products Grid - 3 items per row, balanced font sizes and images */}
          <div className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3 max-h-[660px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const availableStock = getAvailableStock(p);
                const isOutOfStock = availableStock <= 0;
                const isLowStock = availableStock > 0 && availableStock <= (p.low_stock_threshold || 5);

                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={isOutOfStock}
                    className={`text-left p-2.5 sm:p-3 rounded-xl border transition flex items-center space-x-2.5 relative group ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md'
                    }`}
                  >
                    {/* Item Image - Balanced size */}
                    <img
                      src={p.image_url || DEFAULT_IMG}
                      alt={p.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-contain p-1 bg-white flex-shrink-0 border border-slate-200 shadow-2xs"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_IMG;
                      }}
                    />

                    {/* Item Details - Reduced comfortable font sizes */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-tight" title={p.name}>
                        {p.name}
                      </h4>

                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="text-sm sm:text-base font-black text-emerald-800">
                          {currency}{p.selling_price}
                          <span className="text-[11px] font-normal text-slate-500"> /{p.unit}</span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border leading-none ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : isLowStock
                              ? 'bg-yellow-100 text-amber-900 border-yellow-300 font-bold'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {isOutOfStock ? '0 in stock' : `${availableStock} ${p.unit}`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400">
                  <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-base font-bold">No items found matching "{searchTerm}"</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 2: Active Cart (Increased width and enhanced font sizing) */}
        <div className="w-full xl:w-[450px] 2xl:w-[490px] flex-shrink-0 space-y-3">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
            {/* Multi-Bill Hold & Resume Tabs */}
            <div className="bg-emerald-900 px-3.5 py-2.5 flex items-center justify-between border-b border-emerald-800">
              <span className="text-sm sm:text-base md:text-lg font-black text-yellow-300 uppercase tracking-wider">
                ORDER:
              </span>
              <div className="flex space-x-1.5">
                {[0, 1, 2].map((slotIdx) => {
                  const isCurrent = activeSlot === slotIdx;
                  const slotItemCount = slots[slotIdx]?.cart?.length || 0;
                  return (
                    <button
                      key={slotIdx}
                      onClick={() => setActiveSlot(slotIdx)}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
                        isCurrent
                          ? 'bg-yellow-400 text-emerald-950 shadow-xs ring-1 ring-yellow-300'
                          : 'bg-emerald-800 text-emerald-200 hover:bg-emerald-700'
                      }`}
                    >
                      <span>Bill #{slotIdx + 1}</span>
                      {slotItemCount > 0 && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-black ${
                            isCurrent ? 'bg-emerald-950 text-white' : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {slotItemCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cart Header - No 'Bill #1 Cart', Just Order ID & Number of items */}
            <div className="bg-emerald-800 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShoppingCart className="w-5 h-5 text-yellow-300 flex-shrink-0" />
                <span className="font-mono font-black text-xs sm:text-sm text-yellow-300 bg-emerald-950/90 px-2.5 py-1 rounded-md border border-emerald-700/60 shadow-inner">
                  {currentSlot.orderNumber || 'Generating ID...'}
                </span>
                <span className="bg-yellow-400 text-emerald-950 text-xs sm:text-sm font-black px-3 py-1 rounded-full shadow-xs">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs sm:text-sm font-bold text-emerald-200 hover:text-white flex items-center space-x-1 bg-emerald-900/80 hover:bg-emerald-900 px-3 py-1.5 rounded-lg transition border border-emerald-700/50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="p-3.5 overflow-y-auto max-h-[460px] divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <ShoppingCart className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-base sm:text-lg font-bold text-slate-600">Cart is empty</p>
                  <p className="text-xs sm:text-sm text-slate-400">Click items to add or scan barcode</p>
                </div>
              ) : (
                cart.map((item) => {
                  const prodObj = products.find((p) => p.id === item.product_id);
                  const remStock = prodObj ? getAvailableStock(prodObj) : 0;
                  const isOutOfStock = remStock <= 0;
                  const isLowStock = remStock > 0 && remStock <= (prodObj?.low_stock_threshold || 5);

                  return (
                    <div key={item.product_id} className="py-3 flex items-center justify-between space-x-3">
                      {/* Item Image beside */}
                      <img
                        src={item.image_url || DEFAULT_IMG}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-contain p-0.5 bg-white flex-shrink-0 border border-slate-200 shadow-2xs"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_IMG;
                        }}
                      />

                      <div className="flex-1 min-w-0 pr-1">
                        <h5 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight truncate" title={item.name}>
                          {item.name}
                        </h5>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="font-extrabold text-slate-800 text-xs sm:text-sm">
                            {currency}{item.selling_price}/{item.unit}
                          </span>
                          <span
                            className={`text-[11px] font-black px-2 py-0.5 rounded border ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : isLowStock
                                ? 'bg-yellow-100 text-amber-900 border-yellow-300 font-bold'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                            title={`Available stock remaining: ${remStock} ${item.unit}`}
                          >
                            Left: {remStock} {item.unit}
                          </span>
                        </div>
                      </div>

                      {/* Stepper with strict bounds */}
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() =>
                            updateQuantity(item.product_id, item.quantity - (item.unit === 'kg' ? 0.5 : 1))
                          }
                          className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-black text-slate-800 transition cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0.1"
                          step={item.unit === 'kg' ? '0.1' : '1'}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product_id, parseFloat(e.target.value) || 0)}
                          className="w-12 text-center font-black py-1 border border-slate-300 rounded-lg bg-white text-sm"
                        />
                        <button
                          onClick={() =>
                            updateQuantity(item.product_id, item.quantity + (item.unit === 'kg' ? 0.5 : 1))
                          }
                          className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-black text-slate-800 transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Item Total */}
                      <div className="text-right pl-1 flex-shrink-0">
                        <div className="font-black text-slate-900 text-base sm:text-lg">
                          {currency}{(item.selling_price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bill Summary */}
            {cart.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
                        Total Payable
                      </span>
                      <div className="text-sm sm:text-base text-slate-700 font-extrabold">{totalItemsCount} total units</div>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-emerald-800">
                      {currency}{grandTotal.toFixed(2)}
                    </div>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-lg">
                      <span>Customer Savings (MRP):</span>
                      <span>🎉 {currency}{totalSavings.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onCheckoutClick}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-base sm:text-lg py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <CreditCard className="w-5 h-5 text-yellow-300" />
                  <span>Finalize & Generate UPI QR (F8)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: Quick Panels (Decreased width slightly) */}
        <div className="w-full xl:w-[215px] 2xl:w-[225px] flex-shrink-0 space-y-2.5">
          {/* Quick Header Controls */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-black text-slate-600 uppercase tracking-wider text-xs">
              Panels
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCollapsedWidgets({ frequent: false, previous: false, stock: false })}
                className="text-[10px] sm:text-[11px] font-bold text-emerald-900 hover:text-emerald-950 px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 transition border border-emerald-300 shadow-2xs cursor-pointer"
              >
                Expand
              </button>
              <button
                onClick={() => setCollapsedWidgets({ frequent: true, previous: true, stock: true })}
                className="text-[10px] sm:text-[11px] font-bold text-slate-700 hover:text-slate-900 px-2 py-0.5 rounded-md bg-slate-200 hover:bg-slate-300 transition border border-slate-300 shadow-2xs cursor-pointer"
              >
                Collapse
              </button>
            </div>
          </div>

          {/* WIDGET 1: FREQUENTLY ORDERED ITEMS (Collapsible Dropdown) */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden transition">
            <button
              onClick={() => toggleWidget('frequent')}
              className="w-full px-3 py-2 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition text-left cursor-pointer"
            >
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="text-xs sm:text-sm font-black text-slate-800 truncate">Frequent</span>
              </div>
              <div className="flex items-center ml-1 flex-shrink-0">
                {collapsedWidgets.frequent ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {!collapsedWidgets.frequent && (
              <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto">
                {widgetsData.frequentItems && widgetsData.frequentItems.length > 0 ? (
                  widgetsData.frequentItems.slice(0, 5).map((f) => {
                    const prod = products.find((p) => p.id === f.id) || f;
                    const avail = getAvailableStock(prod);
                    const isOut = avail <= 0;
                    const isLow = avail > 0 && avail <= (prod.low_stock_threshold || 5);

                    return (
                      <button
                        key={f.id}
                        onClick={() => addToCart(prod)}
                        disabled={isOut}
                        className={`w-full p-2 rounded-lg border text-left transition flex items-center space-x-2.5 ${
                          isOut
                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                            : 'bg-white hover:bg-emerald-50/60 border-slate-200 hover:border-emerald-300 text-slate-800 hover:shadow-xs'
                        }`}
                      >
                        <img
                          src={prod.image_url || DEFAULT_IMG}
                          alt={prod.name}
                          className="w-8 h-8 rounded-md object-contain p-0.5 bg-white flex-shrink-0 border border-slate-200"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = DEFAULT_IMG;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h6 className="font-bold text-xs sm:text-sm text-slate-900 truncate leading-tight" title={prod.name}>
                            {prod.name}
                          </h6>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="text-xs sm:text-sm font-black text-emerald-800">
                              {currency}{prod.selling_price}
                            </span>
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${
                                isOut
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : isLow
                                  ? 'bg-yellow-100 text-amber-900 border-yellow-300 font-bold'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              }`}
                            >
                              {isOut ? '0 left' : `${avail} left`}
                            </span>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-2 text-center">No frequent items yet</p>
                )}
              </div>
            )}
          </div>

          {/* WIDGET 2: PREVIOUS 3 ORDERS (Collapsible Dropdown) */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden transition">
            <button
              onClick={() => toggleWidget('previous')}
              className="w-full px-3 py-2.5 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition text-left cursor-pointer"
            >
              <div className="flex items-center space-x-1.5 min-w-0">
                <Clock className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-black text-slate-800 truncate">Previous Bills</span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full flex-shrink-0">
                  3
                </span>
              </div>
              <div className="flex items-center ml-1 flex-shrink-0">
                {collapsedWidgets.previous ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {!collapsedWidgets.previous && (
              <div className="p-2 space-y-1.5">
                {widgetsData.recentOrders && widgetsData.recentOrders.length > 0 ? (
                  widgetsData.recentOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between text-xs sm:text-sm hover:bg-slate-100 transition"
                    >
                      <div className="min-w-0 pr-1">
                        <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm block truncate">
                          {ord.order_number}
                        </span>
                        <span className="text-slate-500 text-xs block truncate">
                          {ord.customer_name || 'Walk-in'} • {ord.item_count || 1} items
                        </span>
                      </div>
                      <div className="text-right flex items-center space-x-1.5 flex-shrink-0">
                        <span className="font-black text-slate-900 text-xs sm:text-sm">
                          {currency}{ord.total_amount}
                        </span>
                        <button
                          onClick={() => onViewOrderReceipt(ord.id)}
                          title="View Bill Receipt"
                          className="p-1.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-2 text-center">No orders yet</p>
                )}
              </div>
            )}
          </div>

          {/* WIDGET 3: ITEMS OUT OF STOCK (Collapsible Dropdown) */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden transition">
            <button
              onClick={() => toggleWidget('stock')}
              className="w-full px-3 py-2.5 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition text-left cursor-pointer"
            >
              <div className="flex items-center space-x-1.5 min-w-0">
                <AlertOctagon className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-black text-red-700 truncate">Out of Stock</span>
                <span
                  className={`text-xs font-bold px-1.5 py-0.2 rounded-full flex-shrink-0 ${
                    liveOutOfStock.length > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {liveOutOfStock.length}
                </span>
              </div>
              <div className="flex items-center ml-1 flex-shrink-0">
                {collapsedWidgets.stock ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {!collapsedWidgets.stock && (
              <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto">
                {liveOutOfStock.length > 0 ? (
                  liveOutOfStock.map((out) => (
                    <div
                      key={out.id}
                      className="p-2 bg-red-50/80 border border-red-200 rounded-lg flex items-center justify-between text-xs sm:text-sm space-x-2"
                    >
                      <img
                        src={out.image_url || DEFAULT_IMG}
                        alt={out.name}
                        className="w-8 h-8 rounded-lg object-contain p-0.5 bg-white flex-shrink-0 border border-red-200"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_IMG;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm truncate block" title={out.name}>
                          {out.name}
                        </span>
                        <span className="text-[11px] font-black text-red-600 block">
                          0 {out.unit} left
                        </span>
                      </div>
                      <span className="text-red-700 font-black px-2 py-0.5 bg-red-100 border border-red-200 rounded text-xs flex-shrink-0">
                        Out
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg flex items-center justify-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>All items in stock!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
