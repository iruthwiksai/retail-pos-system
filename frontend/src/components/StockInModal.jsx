import React, { useState } from 'react';
import { X, ArrowDownToLine, CheckCircle2 } from 'lucide-react';

export default function StockInModal({ isOpen, onClose, products, preselectedProduct, onSuccess, settings }) {
  if (!isOpen) return null;

  const [productId, setProductId] = useState(preselectedProduct ? preselectedProduct.id : (products[0]?.id || ''));
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState(preselectedProduct ? preselectedProduct.cost_price : '');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedProd = products.find(p => p.id === Number(productId));
  const currency = settings?.currency_symbol || '₹';

  const handleProductChange = (e) => {
    const id = Number(e.target.value);
    setProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setCostPrice(prod.cost_price);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId || !quantity || Number(quantity) <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(productId),
          quantity: Number(quantity),
          cost_price: costPrice !== '' ? Number(costPrice) : undefined,
          supplier_name: supplierName || 'Direct Vendor',
          invoice_no: invoiceNo,
          notes
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update stock');
      }

      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ArrowDownToLine className="w-5 h-5 text-yellow-300" />
            <h3 className="font-bold text-base">Receive Incoming Stock (Stock-In)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Select Product */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Product *
            </label>
            <select
              value={productId}
              onChange={handleProductChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current: {p.stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {selectedProd && (
            <div className={`p-2.5 rounded-xl border flex justify-between items-center ${
              selectedProd.stock <= 0
                ? 'bg-red-50 border-red-200 text-red-800'
                : selectedProd.stock <= (selectedProd.low_stock_threshold || 5)
                ? 'bg-yellow-50 border-yellow-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <span className="font-semibold">Current Leftover Stock:</span>
              <strong className={`px-2 py-0.5 rounded font-black text-xs ${
                selectedProd.stock <= 0
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : selectedProd.stock <= (selectedProd.low_stock_threshold || 5)
                  ? 'bg-yellow-100 text-amber-900 border border-yellow-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {selectedProd.stock} {selectedProd.unit}
              </strong>
            </div>
          )}

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Incoming Quantity *
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                placeholder="e.g. 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Purchase Cost Rate ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={selectedProd ? String(selectedProd.cost_price) : '0'}
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Supplier & Invoice */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supplier / Vendor
              </label>
              <input
                type="text"
                placeholder="e.g. Metro Cash & Carry"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Vendor Bill / Invoice #
              </label>
              <input
                type="text"
                placeholder="e.g. INV-8492"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Received batch #4 with expiry 2027"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Updating...' : 'Add to Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
