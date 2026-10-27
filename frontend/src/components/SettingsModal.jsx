import React, { useState, useEffect } from 'react';
import { X, Settings, Store, QrCode, Save, Check, ShieldCheck, Download } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings }) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    store_name: '',
    store_tagline: '',
    store_address: '',
    store_phone: '',
    upi_id: '',
    upi_name: '',
    gstin: '',
    receipt_footer_msg: '',
    currency_symbol: '₹',
    manager_pin: '1234'
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        store_name: settings.store_name || 'Mani Devi General Store',
        store_tagline: settings.store_tagline || 'Daily Best Prices • Maximum Savings',
        store_address: settings.store_address || 'Shop No. 12, Main Market Road',
        store_phone: settings.store_phone || '+91 98765 43210',
        upi_id: settings.upi_id || 'manidevi@upi',
        upi_name: settings.upi_name || 'Mani Devi General Store',
        gstin: settings.gstin || '27AABCS1429B1ZB',
        receipt_footer_msg: settings.receipt_footer_msg || 'Thank You For Shopping With Us! Visit Again.',
        currency_symbol: settings.currency_symbol || '₹',
        manager_pin: settings.manager_pin || '1234'
      });
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSaveSettings(formData);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-yellow-300" />
            <h3 className="font-bold text-base">Store & UPI Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
          {/* UPI Settings Highlight Box */}
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold uppercase tracking-wider text-[11px]">
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span>UPI Dynamic QR Code Setup</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              This UPI ID receives payments when customers scan the QR code at checkout.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Shop UPI ID (VPA) *
                </label>
                <input
                  type="text"
                  name="upi_id"
                  placeholder="e.g. yourstore@okhdfcbank"
                  value={formData.upi_id}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payee Business Name *
                </label>
                <input
                  type="text"
                  name="upi_name"
                  placeholder="e.g. Smart Supermarket"
                  value={formData.upi_name}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Store Info */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1">
              <Store className="w-3.5 h-3.5" />
              <span>Store Profile (Printed on Bill)</span>
            </h4>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Store Name</label>
              <input
                type="text"
                name="store_name"
                value={formData.store_name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Store Tagline / Slogan</label>
              <input
                type="text"
                name="store_tagline"
                value={formData.store_tagline}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone / Helpline</label>
                <input
                  type="text"
                  name="store_phone"
                  value={formData.store_phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Store Address</label>
              <textarea
                name="store_address"
                rows="2"
                value={formData.store_address}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receipt Footer Note</label>
              <input
                type="text"
                name="receipt_footer_msg"
                value={formData.receipt_footer_msg}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Manager Security PIN */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>4-Digit Manager Security PIN</span>
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  Protects Settings & Voids
                </span>
              </div>
              <input
                type="password"
                maxLength={4}
                name="manager_pin"
                value={formData.manager_pin}
                onChange={handleChange}
                placeholder="1234"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono text-center tracking-widest text-lg font-black focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-amber-800">
                Required for modifying settings, deleting products, or voiding saved bills. Default: <strong>1234</strong>
              </p>
            </div>

            {/* 1-Click Database Backup */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">1-Click SQLite DB Backup</span>
                <p className="text-[10px] text-slate-400">Download snapshot of all products, stock & bills</p>
              </div>
              <a
                href={`/api/backup/download?manager_pin=${formData.manager_pin || '1234'}`}
                download
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 flex items-center space-x-1.5 shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Download .db Backup</span>
              </a>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-yellow-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
