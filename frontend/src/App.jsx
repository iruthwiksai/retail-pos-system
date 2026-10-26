import React, { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import PosBilling from './components/PosBilling';
import UpiPaymentModal from './components/UpiPaymentModal';
import ReceiptModal from './components/ReceiptModal';

// Code-split heavy non-critical modules so POS billing loads instantly on tablets
const OrdersHistory = lazy(() => import('./components/OrdersHistory'));
const Inventory = lazy(() => import('./components/Inventory'));
const Analytics = lazy(() => import('./components/Analytics'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

function TabLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-12 text-slate-400">
      <div className="flex items-center space-x-3 bg-white px-6 py-4 rounded-2xl shadow-xs border border-slate-200">
        <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-700">Loading module...</span>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  // Multi-Bill Slots with generated Order IDs in the cart itself!
  const [activeSlot, setActiveSlot] = useState(0);
  const [slots, setSlots] = useState([
    { id: 0, orderNumber: '', cart: [], customerName: '', customerPhone: '' },
    { id: 1, orderNumber: '', cart: [], customerName: '', customerPhone: '' },
    { id: 2, orderNumber: '', cart: [], customerName: '', customerPhone: '' }
  ]);

  // Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [currentReceiptOrder, setCurrentReceiptOrder] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Helper to generate client fallback Order ID
  const generateClientOrderId = (offset = 0) => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSeq = String(Math.floor(Math.random() * 800) + 1 + offset).padStart(4, '0');
    return `VL-${dateStr}-${randSeq}`;
  };

  // Fetch Order IDs for slots from backend
  const refreshSlotOrderIds = async () => {
    try {
      const updated = await Promise.all(
        [0, 1, 2].map(async (slotIdx) => {
          try {
            const res = await fetch(`/api/orders/next-id?slot=${slotIdx}`);
            const data = await res.json();
            return data.nextId;
          } catch (e) {
            return generateClientOrderId(slotIdx);
          }
        })
      );

      setSlots((prev) =>
        prev.map((s, idx) => ({
          ...s,
          orderNumber: s.orderNumber && s.cart.length > 0 ? s.orderNumber : (updated[idx] || generateClientOrderId(idx))
        }))
      );
    } catch (err) {
      console.error('Error fetching next order IDs:', err);
    }
  };

  // Fetch initial data
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data || {});
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchProducts(), fetchSettings(), refreshSlotOrderIds()]).finally(() => {
      setLoading(false);
    });
  }, []);

  // Current slot info
  const currentSlot = slots[activeSlot] || { cart: [], customerName: '', customerPhone: '', orderNumber: '' };
  const grandTotal = currentSlot.cart.reduce((acc, item) => acc + item.selling_price * item.quantity, 0);

  // Finalize order handler
  const handleConfirmOrder = async (paymentDetails) => {
    setIsSubmittingOrder(true);
    try {
      const payload = {
        order_number: currentSlot.orderNumber,
        items: currentSlot.cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          selling_price: item.selling_price
        })),
        customer_name: currentSlot.customerName,
        customer_phone: currentSlot.customerPhone,
        payment_method: paymentDetails.payment_method,
        payment_status: paymentDetails.payment_status || 'PAID',
        upi_reference: paymentDetails.upi_reference,
        cashier_notes: paymentDetails.cashier_notes
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const createdOrder = await res.json();

      // Reset active slot
      setSlots((prev) => {
        const updated = [...prev];
        updated[activeSlot] = {
          ...updated[activeSlot],
          cart: [],
          customerName: '',
          customerPhone: '',
          orderNumber: ''
        };
        return updated;
      });

      setIsPaymentOpen(false);

      // Refresh products & order IDs for next customers
      await Promise.all([fetchProducts(), refreshSlotOrderIds()]);

      // Open receipt view
      setCurrentReceiptOrder(createdOrder);
      setIsReceiptOpen(true);
    } catch (err) {
      alert(`Error finalizing order: ${err.message}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleSelectOrderFromHistory = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      setCurrentReceiptOrder(data);
      setIsReceiptOpen(true);
    } catch (err) {
      alert('Failed to load receipt details');
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const pin = newSettings.manager_pin || settings.manager_pin || '1234';
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-manager-pin': pin
        },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        setSettings(newSettings);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save settings');
      }
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 text-base">
      {/* Navbar with clickable home button */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'pos' && (
          <PosBilling
            products={products}
            onRefreshProducts={fetchProducts}
            onCheckoutClick={() => setIsPaymentOpen(true)}
            settings={settings}
            slots={slots}
            setSlots={setSlots}
            activeSlot={activeSlot}
            setActiveSlot={setActiveSlot}
            onViewOrderReceipt={handleSelectOrderFromHistory}
          />
        )}

        {activeTab === 'orders' && (
          <Suspense fallback={<TabLoadingFallback />}>
            <OrdersHistory
              onSelectOrder={handleSelectOrderFromHistory}
              settings={settings}
            />
          </Suspense>
        )}

        {activeTab === 'inventory' && (
          <Suspense fallback={<TabLoadingFallback />}>
            <Inventory
              products={products}
              onRefreshProducts={fetchProducts}
              settings={settings}
            />
          </Suspense>
        )}

        {activeTab === 'analytics' && (
          <Suspense fallback={<TabLoadingFallback />}>
            <Analytics
              settings={settings}
            />
          </Suspense>
        )}
      </main>

      {/* Checkout / UPI QR Modal */}
      <UpiPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        totalAmount={grandTotal}
        customerName={currentSlot.customerName}
        customerPhone={currentSlot.customerPhone}
        orderNumber={currentSlot.orderNumber}
        settings={settings}
        onConfirmOrder={handleConfirmOrder}
        isSubmitting={isSubmittingOrder}
      />

      {/* Receipt Modal (Clean Slip Style, No Discounts) */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        order={currentReceiptOrder}
        settings={settings}
      />

      {/* Settings Modal (Lazy Loaded) */}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        </Suspense>
      )}
    </div>
  );
}
