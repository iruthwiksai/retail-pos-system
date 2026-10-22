import React, { useState, useEffect } from 'react';
import { Package, Plus, ArrowDownToLine, Search, AlertTriangle, Edit, Trash2, History, RefreshCw, Tag } from 'lucide-react';
import StockInModal from './StockInModal';
import AddProductModal from './AddProductModal';
import BarcodeModal from './BarcodeModal';

export default function Inventory({ products, onRefreshProducts, settings }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, LOW, OUT
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [preselectedStockInProd, setPreselectedStockInProd] = useState(null);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const currency = settings.currency_symbol || '₹';

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  // Calculations
  const totalSkus = products.length;
  const totalUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const totalCostValuation = products.reduce((acc, p) => acc + (p.stock * p.cost_price), 0);
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.low_stock_threshold).length;
  const outOfStockCount = products.filter(p => p.stock <= 0).length;

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    let matchesFilter = true;
    if (filterType === 'LOW') matchesFilter = p.stock > 0 && p.stock <= p.low_stock_threshold;
    if (filterType === 'OUT') matchesFilter = p.stock <= 0;

    return matchesSearch && matchesCategory && matchesFilter;
  });

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
          onRefreshProducts();
        } else {
          alert('Failed to delete product');
        }
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/inventory/logs');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
      setShowLogs(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total SKUs</span>
          <div className="text-2xl font-black text-slate-800 mt-1">{totalSkus} Items</div>
          <span className="text-[11px] text-slate-400">Unique registered products</span>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leftover Units</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{totalUnits.toFixed(1)}</div>
          <span className="text-[11px] text-slate-400">Total physical quantity in store</span>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Valuation</span>
          <div className="text-2xl font-black text-slate-800 mt-1">
            {currency}{totalCostValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-400">Cost capital invested</span>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Reorder Alerts</span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {lowStockCount + outOfStockCount} Items
          </div>
          <span className="text-[11px] text-amber-600 font-medium">
            {lowStockCount} low, {outOfStockCount} out of stock
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-5">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setPreselectedStockInProd(null);
                setIsStockInOpen(true);
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center space-x-1.5 shadow-sm transition"
            >
              <ArrowDownToLine className="w-4 h-4 text-yellow-300" />
              <span>Receive Incoming Stock</span>
            </button>

            <button
              onClick={() => {
                setProductToEdit(null);
                setIsAddProductOpen(true);
              }}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center space-x-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add New Product</span>
            </button>

            <button
              onClick={fetchLogs}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center space-x-1.5 transition"
            >
              <History className="w-4 h-4" />
              <span>Stock Logs</span>
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={onRefreshProducts}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Inventory</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name, barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stock Filter Pills */}
          <div className="sm:col-span-3 flex space-x-1">
            <button
              onClick={() => setFilterType('ALL')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                filterType === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('LOW')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                filterType === 'LOW'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Low ({lowStockCount})
            </button>
            <button
              onClick={() => setFilterType('OUT')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                filterType === 'OUT'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Out ({outOfStockCount})
            </button>
          </div>
        </div>

        {/* Inventory Items Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[11px] text-slate-500 tracking-wider">
              <tr className="text-xs">
                <th className="py-3.5 px-4">Item & Barcode</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Cost (Buy)</th>
                <th className="py-3.5 px-4 text-right">Selling Rate</th>
                <th className="py-3.5 px-4 text-center">Leftover Stock</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock > 0 && p.stock <= p.low_stock_threshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition text-sm">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-contain p-0.5 bg-white flex-shrink-0 border border-slate-200 shadow-xs"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 border border-slate-200">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-base">{p.name}</div>
                            <div className="text-xs text-slate-400 font-mono">{p.barcode || 'NO-BARCODE'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {p.category}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                        {currency}{p.cost_price.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-800 text-base">
                        {currency}{p.selling_price.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-sm font-black border ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : isLowStock
                              ? 'bg-yellow-100 text-amber-900 border-yellow-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide border ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : isLowStock
                              ? 'bg-yellow-100 text-amber-900 border-yellow-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => {
                              setPreselectedStockInProd(p);
                              setIsStockInOpen(true);
                            }}
                            title="Receive Incoming Stock"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setBarcodeProduct(p)}
                            title="Print Barcode / Shelf Price Tag"
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 transition"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setProductToEdit(p);
                              setIsAddProductOpen(true);
                            }}
                            title="Edit Product"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            title="Delete Product"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center space-x-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Inventory Stock Movement Logs</span>
              </h3>
              <button
                onClick={() => setShowLogs(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto divide-y divide-slate-100 text-xs">
              {logs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{log.product_name}</span>
                    <div className="text-[11px] text-slate-500">
                      {log.notes || (log.change_type === 'STOCK_IN' ? `From: ${log.supplier_name || 'Vendor'}` : 'Sale')} • {new Date(log.created_at).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-black text-sm ${
                        log.quantity > 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {log.quantity > 0 ? `+${log.quantity}` : log.quantity} {log.unit || ''}
                    </span>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      {log.change_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => setIsStockInOpen(false)}
        products={products}
        preselectedProduct={preselectedStockInProd}
        onSuccess={onRefreshProducts}
        settings={settings}
      />

      <AddProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        productToEdit={productToEdit}
        onSuccess={onRefreshProducts}
        settings={settings}
      />

      <BarcodeModal
        isOpen={!!barcodeProduct}
        onClose={() => setBarcodeProduct(null)}
        product={barcodeProduct}
        settings={settings}
      />
    </div>
  );
}
