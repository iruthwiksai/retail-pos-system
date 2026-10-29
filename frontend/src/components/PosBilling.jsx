import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Package,
  Bell,
  BellOff,
  Languages,
  Zap,
  Check
} from 'lucide-react';
import { getTranslatedProductName } from '../utils/productTranslations';

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
  const [language, setLanguage] = useState('en'); // 'en' | 'te' | 'hi_en'
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const [widgetsData, setWidgetsData] = useState({
    recentOrders: [],
    frequentItems: [],
    outOfStockItems: []
  });

  const searchInputRef = useRef(null);
  const langMenuRef = useRef(null);
  const currency = settings?.currency_symbol || '₹';

  // Current active slot
  const currentSlot = slots[activeSlot] || { id: activeSlot, orderNumber: '', cart: [], customerName: '', customerPhone: '' };
  const cart = currentSlot.cart;

  // Web Audio API Cash Register Bell Chime (Plays on adding to cart)
  const playCartBellSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Primary crisp register bell tone (E6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.51, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.32);

      // Secondary overtone chime (B6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1975.53, now + 0.04);
      gain2.gain.setValueAtTime(0.22, now + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.38);
    } catch (e) {
      // AudioContext policy
    }
  };

  const showWarning = (msg) => {
    setWarningMsg(msg);
    setTimeout(() => setWarningMsg(''), 3000);
  };

  // Close language menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch quick widgets (frequent items)
  const fetchWidgets = async () => {
    try {
      const res = await fetch('/api/dashboard/widgets');
      const data = await res.json();
      setWidgetsData(data || {});
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

    // Play retail register bell chime
    playCartBellSound();

    setSlots((prevSlots) => {
      const updated = [...prevSlots];
      const slot = { ...updated[activeSlot] };
      const existing = slot.cart.find((item) => item.product_id === product.id);

      if (existing) {
        if (available <= 0) {
          showWarning(`No more stock available for "${product.name}"`);
          return prevSlots;
        }
        slot.cart = slot.cart.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        slot.cart = [
          ...slot.cart,
          {
            product_id: product.id,
            product_name: product.name,
            selling_price: product.selling_price,
            mrp: product.mrp,
            unit: product.unit,
            quantity: 1
          }
        ];
      }

      updated[activeSlot] = slot;
      return updated;
    });
  };

  const updateQuantity = (productId, delta) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const currentItem = cart.find((item) => item.product_id === productId);
    if (!currentItem) return;

    if (delta > 0) {
      const available = getAvailableStock(product);
      if (available <= 0) {
        showWarning(`No more stock available for "${product.name}"`);
        return;
      }
      playCartBellSound();
    }

    const newQty = currentItem.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setSlots((prevSlots) => {
      const updated = [...prevSlots];
      const slot = { ...updated[activeSlot] };
      slot.cart = slot.cart.map((item) =>
        item.product_id === productId ? { ...item, quantity: newQty } : item
      );
      updated[activeSlot] = slot;
      return updated;
    });
  };

  const handleManualQuantityChange = (productId, val) => {
    let newQty = parseInt(val, 10);
    if (isNaN(newQty)) return;

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const currentItem = cart.find((item) => item.product_id === productId);
    const otherSlotsAllocated = slots.reduce((total, s, idx) => {
      if (idx === activeSlot) return total;
      const item = s.cart.find((it) => it.product_id === productId);
      return total + (item ? item.quantity : 0);
    }, 0);

    const maxAllowedForThisSlot = Math.max(0, product.stock - otherSlotsAllocated);

    if (newQty > maxAllowedForThisSlot) {
      showWarning(`Stock limit reached! Max available for this bill: ${maxAllowedForThisSlot} ${product.unit}`);
      newQty = maxAllowedForThisSlot;
    }

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > (currentItem?.quantity || 0)) {
      playCartBellSound();
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

  // Keyboard shortcuts (F8 for Checkout, F2 focus search silently)
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

  // Sort products by most frequent orders (times_ordered DESC, total_qty_sold DESC, name ASC)
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aCount = Number(a.times_ordered || 0);
      const bCount = Number(b.times_ordered || 0);
      if (bCount !== aCount) return bCount - aCount;
      const aQty = Number(a.total_qty_sold || 0);
      const bQty = Number(b.total_qty_sold || 0);
      if (bQty !== aQty) return bQty - aQty;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [products]);

  // Multilingual Search: matches English name, Barcode, Telugu translation, or Hindi translation!
  const filteredProducts = useMemo(() => {
    return sortedProducts.filter((p) => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      const nameMatch = p.name.toLowerCase().includes(term);
      const barcodeMatch = p.barcode && p.barcode.toLowerCase().includes(term);
      const teluguMatch = getTranslatedProductName(p.name, 'te').toLowerCase().includes(term);
      const hindiMatch = getTranslatedProductName(p.name, 'hi_en').toLowerCase().includes(term);
      return nameMatch || barcodeMatch || teluguMatch || hindiMatch;
    });
  }, [sortedProducts, searchTerm]);

  // Cart Totals with accurate MRP savings calculation
  const grandTotal = cart.reduce((acc, item) => acc + item.selling_price * item.quantity, 0);
  const totalMrp = cart.reduce((acc, item) => acc + (item.mrp || item.selling_price) * item.quantity, 0);
  const totalSavings = Math.max(0, totalMrp - grandTotal);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="max-w-[1680px] mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-3">
      {/* Warning Alert Banner */}
      {warningMsg && (
        <div className="bg-red-600 text-white p-3 rounded-xl font-bold text-sm flex items-center justify-between shadow-lg">
          <span>⚠️ {warningMsg}</span>
          <button onClick={() => setWarningMsg('')} className="text-white hover:text-slate-200 text-base">✕</button>
        </div>
      )}

      {/* 2-COLUMN LAYOUT: Catalog & Quick Add | Active Cart */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        
        {/* COLUMN 1: Product Catalog & Search (Expands to fill all space) */}
        <div className="flex-1 min-w-0 space-y-3 w-full">
          
          {/* SEARCH BAR with Bell Chime Toggle & Translate Button */}
          <div className="bg-white p-3 sm:p-3.5 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex items-center gap-2">
              
              {/* Search Input (F2 label removed) */}
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search item name or scan barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition shadow-2xs"
                  autoFocus
                />
              </div>

              {/* BELL AUDIO SOUND TOGGLE */}
              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                title={soundEnabled ? 'Bell Chime: ON (Dings when item added to cart)' : 'Bell Chime: MUTED'}
                className={`p-3 rounded-xl border flex items-center justify-center transition active:scale-95 shrink-0 ${
                  soundEnabled
                    ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 shadow-2xs'
                    : 'bg-slate-100 border-slate-300 text-slate-400 hover:bg-slate-200'
                }`}
              >
                {soundEnabled ? (
                  <Bell className="w-5 h-5 text-amber-600 fill-amber-500 animate-pulse" />
                ) : (
                  <BellOff className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {/* TRANSLATE BUTTON (Telugu & Hindi in English Letters) */}
              <div className="relative shrink-0" ref={langMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsLangMenuOpen((prev) => !prev)}
                  title="Translate Product Names"
                  className={`px-3 py-3 rounded-xl border flex items-center space-x-1.5 font-bold text-xs sm:text-sm transition shadow-2xs cursor-pointer active:scale-95 ${
                    language !== 'en'
                      ? 'bg-emerald-700 text-yellow-300 border-emerald-800 ring-2 ring-emerald-500/30'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  <Languages className="w-5 h-5 text-emerald-600" />
                  <span className="hidden sm:inline">
                    {language === 'en' ? 'English' : language === 'te' ? 'తెలుగు' : 'Hindi (Eng)'}
                  </span>
                  <span className="sm:hidden font-mono text-xs">
                    {language === 'en' ? 'EN' : language === 'te' ? 'తె' : 'HI'}
                  </span>
                </button>

                {/* Translate Options Dropdown */}
                {isLangMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-scaleUp">
                    <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                      <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                        Display Language
                      </p>
                    </div>

                    {/* Option 1: English */}
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('en');
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-bold transition ${
                        language === 'en'
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>🇬🇧</span>
                        <span>English (Default)</span>
                      </div>
                      {language === 'en' && <Check className="w-4 h-4 text-emerald-700" />}
                    </button>

                    {/* Option 2: Telugu (Telugu Script) */}
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('te');
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-bold transition ${
                        language === 'te'
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>🇮🇳</span>
                        <div>
                          <p className="text-slate-900 font-black">తెలుగు (Telugu)</p>
                          <p className="text-[10px] text-slate-400">కందిపప్పు, ఉప్పు, పంచదార...</p>
                        </div>
                      </div>
                      {language === 'te' && <Check className="w-4 h-4 text-emerald-700" />}
                    </button>

                    {/* Option 3: Hindi in English Letters (Hinglish) */}
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('hi_en');
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-bold transition ${
                        language === 'hi_en'
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>🔤</span>
                        <div>
                          <p className="text-slate-900 font-black">Hindi (English Letters)</p>
                          <p className="text-[10px] text-slate-400">Arhar Dal, Namak, Cheeni...</p>
                        </div>
                      </div>
                      {language === 'hi_en' && <Check className="w-4 h-4 text-emerald-700" />}
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Product Catalog Grid (Expands to 3-4 columns) */}
          <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[660px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const availableStock = getAvailableStock(p);
                const isOutOfStock = availableStock <= 0;
                const isLowStock = availableStock > 0 && availableStock <= (p.low_stock_threshold || 5);
                const translatedName = getTranslatedProductName(p.name, language);

                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={isOutOfStock}
                    className={`text-left p-2.5 sm:p-3 rounded-xl border transition flex items-center space-x-2.5 relative group cursor-pointer ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md active:scale-98'
                    }`}
                  >
                    {/* Item Image */}
                    <img
                      src={p.image_url || DEFAULT_IMG}
                      alt={p.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-contain p-1 bg-white flex-shrink-0 border border-slate-200 shadow-2xs"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_IMG;
                      }}
                    />

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-tight" title={translatedName}>
                        {translatedName}
                      </h4>
                      {language !== 'en' && translatedName !== p.name && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5" title={p.name}>
                          {p.name}
                        </p>
                      )}

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

        {/* COLUMN 2: Active Cart & Checkout (Pinned so Finalize never goes under page) */}
        <div className="w-full xl:w-[480px] 2xl:w-[520px] flex-shrink-0 xl:sticky xl:top-3 xl:h-[calc(100vh-80px)] flex flex-col">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col h-full max-h-[calc(100vh-80px)]">
            
            {/* Multi-Bill Hold & Resume Tabs */}
            <div className="bg-emerald-900 px-3.5 py-2.5 flex items-center justify-between border-b border-emerald-800 shrink-0">
              <span className="text-sm sm:text-base font-black text-yellow-300 uppercase tracking-wider">
                ACTIVE CART:
              </span>
              <div className="flex space-x-1.5">
                {[0, 1, 2].map((slotIdx) => {
                  const isCurrent = activeSlot === slotIdx;
                  const slotItemCount = slots[slotIdx]?.cart?.length || 0;
                  return (
                    <button
                      key={slotIdx}
                      onClick={() => setActiveSlot(slotIdx)}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        isCurrent
                          ? 'bg-yellow-400 text-emerald-950 shadow-xs ring-1 ring-yellow-300'
                          : 'bg-emerald-800 text-emerald-200 hover:bg-emerald-700'
                      }`}
                    >
                      <span>Bill {slotIdx + 1}</span>
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

            {/* Cart Header */}
            <div className="bg-emerald-800 text-white px-4 py-3 flex items-center justify-between shrink-0">
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
                  className="text-xs sm:text-sm font-bold text-emerald-200 hover:text-white flex items-center space-x-1 bg-emerald-900/80 hover:bg-emerald-900 px-3 py-1.5 rounded-lg transition border border-emerald-700/50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Cart Items List (Flexes and scrolls internally) */}
            <div className="p-3 overflow-y-auto flex-1 min-h-[120px] divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
                  <p className="text-base font-bold text-slate-600">Cart is empty</p>
                  <p className="text-xs text-slate-400">Scan barcode, tap item in catalog, or search</p>
                </div>
              ) : (
                cart.map((item) => {
                  const translatedCartName = getTranslatedProductName(item.product_name, language);
                  return (
                    <div key={item.product_id} className="py-2.5 flex items-center justify-between space-x-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900 truncate" title={translatedCartName}>
                          {translatedCartName}
                        </h5>
                        <div className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                          <span>Rate: {currency}{item.selling_price}</span>
                          {item.mrp > item.selling_price && (
                            <span className="text-[10px] text-slate-400 line-through">
                              MRP {currency}{item.mrp}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1 border border-slate-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, -1)}
                          className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-200 rounded text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleManualQuantityChange(item.product_id, e.target.value)}
                          className="w-10 text-center font-black text-xs sm:text-sm bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, 1)}
                          className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-200 rounded text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px] shrink-0">
                        <div className="font-black text-sm sm:text-base text-slate-900">
                          {currency}{(item.selling_price * item.quantity).toFixed(2)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition shrink-0 cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Customer Details Form */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1.5 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Walk-in Customer"
                    value={currentSlot.customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    Mobile No (WhatsApp Bill)
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    value={currentSlot.customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Cart Summary & Checkout (Pinned at bottom of card - never goes under page!) */}
            {cart.length > 0 && (
              <div className="p-3.5 bg-emerald-50/80 border-t border-emerald-100 space-y-2.5 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-base sm:text-lg font-black text-slate-900">
                    <span>Payable Total:</span>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700">
                      {currency}{grandTotal.toFixed(2)}
                    </div>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-0.5 rounded-lg">
                      <span>Customer Savings (MRP):</span>
                      <span>🎉 {currency}{totalSavings.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onCheckoutClick}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-base sm:text-lg py-3 px-4 rounded-xl shadow-md hover:shadow-lg flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <CreditCard className="w-5 h-5 text-yellow-300" />
                  <span>Finalize & Generate UPI QR (F8)</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
