import React, { useState, useEffect } from 'react';
import { X, Plus, PackageCheck } from 'lucide-react';

export default function AddProductModal({ isOpen, onClose, productToEdit, onSuccess, settings }) {
  if (!isOpen) return null;

  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Grains & Flours');
  const [unit, setUnit] = useState('pcs');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [submitting, setSubmitting] = useState(false);

  const currency = settings?.currency_symbol || '₹';

  useEffect(() => {
    if (productToEdit) {
      setBarcode(productToEdit.barcode || '');
      setName(productToEdit.name || '');
      setCategory(productToEdit.category || 'General');
      setUnit(productToEdit.unit || 'pcs');
      setCostPrice(String(productToEdit.cost_price || ''));
      setSellingPrice(String(productToEdit.selling_price || ''));
      setStock(String(productToEdit.stock || '0'));
      setLowStockThreshold(String(productToEdit.low_stock_threshold || '5'));
    } else {
      setBarcode('');
      setName('');
      setCategory('Packaged Food & Snacks');
      setUnit('pcs');
      setCostPrice('');
      setSellingPrice('');
      setStock('20');
      setLowStockThreshold('5');
    }
  }, [productToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || costPrice === '' || sellingPrice === '') {
      alert('Please fill all required pricing fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        barcode: barcode.trim() || undefined,
        name: name.trim(),
        category,
        unit,
        cost_price: Number(costPrice),
        selling_price: Number(sellingPrice),
        mrp: Number(sellingPrice),
        stock: Math.max(0, Number(stock) || 0),
        low_stock_threshold: Number(lowStockThreshold) || 5
      };

      const url = productToEdit ? `/api/products/${productToEdit.id}` : '/api/products';
      const method = productToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save product');
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PackageCheck className="w-6 h-6 text-yellow-300" />
            <h3 className="font-bold text-lg">
              {productToEdit ? 'Edit Product Catalog Item' : 'Add New Retail Product'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm overflow-y-auto">
          {/* Barcode & Name */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Aashirvaad Atta 5kg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 text-base"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Barcode / SKU (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Scan or leave blank"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                >
                  <option value="Grains & Flours">Grains & Flours</option>
                  <option value="Dairy & Eggs">Dairy & Eggs</option>
                  <option value="Staples & Spices">Staples & Spices</option>
                  <option value="Packaged Food & Snacks">Packaged Food & Snacks</option>
                  <option value="Edible Oils">Edible Oils</option>
                  <option value="Household & Cleaning">Household & Cleaning</option>
                  <option value="Chocolates & Sweets">Chocolates & Sweets</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Fresh Produce">Fresh Produce</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing Row: Selling Rate, Cost Price */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-xs">
              Pricing Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-emerald-800 mb-1">
                  Selling Rate ({currency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="180"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl font-black text-emerald-800 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Purchase Cost ({currency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="150"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-black text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {sellingPrice && costPrice && (
              <div className="text-xs font-bold text-slate-600 pt-1">
                Margin / Profit: <span className="text-emerald-800 font-extrabold">{currency}{(sellingPrice - costPrice).toFixed(2)} per unit</span>
              </div>
            )}
          </div>

          {/* Stock & Unit */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="pkt">Packet (pkt)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="ltr">Litres (ltr)</option>
                <option value="box">Box (box)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Low Alert At
              </label>
              <input
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-base shadow-sm transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : productToEdit ? 'Update Product' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
