import React, { useState } from 'react';
import { X, Printer, Tag } from 'lucide-react';

export default function BarcodeModal({ isOpen, onClose, product, settings }) {
  if (!isOpen || !product) return null;

  const [labelCount, setLabelCount] = useState(8);
  const currency = settings?.currency_symbol || '₹';
  const storeName = settings?.store_name || 'VijayaLakshmi Minimart';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-base">Shelf Price Tag & Barcode Label Generator</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between no-print text-sm">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">Labels to Print:</span>
            {[4, 8, 12, 16].map((cnt) => (
              <button
                key={cnt}
                onClick={() => setLabelCount(cnt)}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  labelCount === cnt ? 'bg-emerald-800 text-white' : 'bg-white border text-slate-700 hover:bg-slate-50'
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-4 rounded-xl flex items-center space-x-1.5 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label Sheet</span>
          </button>
        </div>

        {/* Printable Label Grid */}
        <div className="p-6 overflow-y-auto bg-slate-50">
          <div id="printable-labels" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: labelCount }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white p-3 border-2 border-dashed border-slate-300 rounded-xl text-center flex flex-col justify-between h-36 font-sans shadow-xs"
              >
                <div>
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block truncate">
                    {storeName}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight mt-0.5">
                    {product.name}
                  </h4>
                </div>

                <div className="py-1">
                  <span className="text-lg font-black text-emerald-800 block">
                    {currency}{product.selling_price}
                    <span className="text-xs font-medium text-slate-600"> /{product.unit}</span>
                  </span>
                </div>

                {/* Simulated Barcode */}
                <div className="pt-1 border-t border-slate-200">
                  <div className="font-mono text-[9px] tracking-[3px] text-slate-700 font-bold">
                    |||| | ||||| || |||
                  </div>
                  <span className="text-[8px] font-mono text-slate-600 block truncate">
                    {product.barcode || `SKU-${product.id}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
