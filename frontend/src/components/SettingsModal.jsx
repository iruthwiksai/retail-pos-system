import React, { useState, useEffect } from 'react';
import { X, Settings, Store, QrCode, Save, Check, ShieldCheck, Download, Ban } from 'lucide-react';

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
    currency_symbol: '₹'
  });

  const [blockStaff, setBlockStaff] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_manager_pin: '',
    confirm_manager_pin: '',
    new_cashier_pin: ''
  });
  const [passwordError, setPasswordError] = useState('');
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
        currency_symbol: settings.currency_symbol || '₹'
      });
      setBlockStaff(settings.block_staff_access === 'true');
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    const payload = {
      ...formData,
      block_staff_access: blockStaff ? 'true' : 'false'
    };

    // Check if any passcode change was requested
    const isChangingOwner = Boolean(passwordForm.new_manager_pin);
    const isChangingStaff = Boolean(passwordForm.new_cashier_pin);

    if (isChangingOwner || isChangingStaff) {
      if (!passwordForm.current_password || passwordForm.current_password.length !== 6) {
        setPasswordError('Please enter your current 6-digit Owner password to verify identity.');
        return;
      }
      payload.current_password = passwordForm.current_password;

      if (isChangingOwner) {
        if (!/^\d{6}$/.test(passwordForm.new_manager_pin)) {
          setPasswordError('New Owner password must be strictly 6 digits.');
          return;
        }
        if (passwordForm.new_manager_pin !== passwordForm.confirm_manager_pin) {
          setPasswordError('New Owner password and confirmation do not match.');
          return;
        }
        payload.manager_pin = passwordForm.new_manager_pin;
      }

      if (isChangingStaff) {
        if (!/^\d{6}$/.test(passwordForm.new_cashier_pin)) {
          setPasswordError('Staff password must be strictly 6 digits.');
          return;
        }
        payload.cashier_pin = passwordForm.new_cashier_pin;
      }
    }

    const res = await onSaveSettings(payload);
    if (res !== false) {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    }
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

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
          
          {/* UPI Settings Banner */}
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
                <label className="block font-semibold text-slate-700 mb-1">Shop UPI ID (VPA) *</label>
                <input
                  type="text"
                  name="upi_id"
                  placeholder="e.g. shop@okaxis"
                  value={formData.upi_id}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payee Business Name *</label>
                <input
                  type="text"
                  name="upi_name"
                  placeholder="e.g. Mani Devi General Store"
                  value={formData.upi_name}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Store Details Section */}
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
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
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

            {/* BLOCK ACCESS TO STAFF */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              blockStaff
                ? 'bg-red-50/90 border-red-300 ring-1 ring-red-400/50'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Ban className={`w-4 h-4 ${blockStaff ? 'text-red-600' : 'text-slate-500'}`} />
                    <span className="font-bold text-xs text-slate-900">Block Access to Staff</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      blockStaff
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {blockStaff ? 'BLOCKED' : 'ALLOWED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    When enabled, staff cannot log in to this terminal. Only the 6-digit Owner password is accepted.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                  <input
                    type="checkbox"
                    checked={blockStaff}
                    onChange={(e) => setBlockStaff(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>

            {/* SECURITY & PASSWORDS (ASK PASSWORD TO CHANGE PASSWORD) */}
            <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Security & Passwords (6 Digits)</span>
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  6-Digit Numbers
                </span>
              </div>

              {/* Current Password Field */}
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                <label className="block font-bold text-amber-950 text-[11px] mb-1">
                  Current Owner Password *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={passwordForm.current_password}
                  onChange={(e) => {
                    setPasswordForm(prev => ({ ...prev, current_password: e.target.value }));
                    setPasswordError('');
                  }}
                  placeholder="Enter current 6-digit password to authorize changes"
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono text-center tracking-widest text-base font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-amber-800 mt-1">
                  You must enter your current password before changing Owner or Staff passcodes.
                </p>
              </div>

              {/* New Owner Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                    New Owner Password
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={passwordForm.new_manager_pin}
                    onChange={(e) => {
                      setPasswordForm(prev => ({ ...prev, new_manager_pin: e.target.value }));
                      setPasswordError('');
                    }}
                    placeholder="New 6-digit code"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-center tracking-widest text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={passwordForm.confirm_manager_pin}
                    onChange={(e) => {
                      setPasswordForm(prev => ({ ...prev, confirm_manager_pin: e.target.value }));
                      setPasswordError('');
                    }}
                    placeholder="Re-enter 6-digit code"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-center tracking-widest text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Staff Password */}
              <div>
                <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                  Staff Passcode
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={passwordForm.new_cashier_pin}
                  onChange={(e) => {
                    setPasswordForm(prev => ({ ...prev, new_cashier_pin: e.target.value }));
                    setPasswordError('');
                  }}
                  placeholder="Set 6-digit passcode for staff (e.g. 000000)"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-center tracking-widest text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {passwordError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  ⚠️ {passwordError}
                </p>
              )}
            </div>

            {/* 1-Click Database Backup */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">1-Click SQLite DB Backup</span>
                <p className="text-[10px] text-slate-400">Download snapshot of all products, stock & bills</p>
              </div>
              <a
                href={`/api/backup/download?token=${localStorage.getItem('pos_auth_token') || ''}`}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center space-x-1.5 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .db</span>
              </a>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saved}
              className={`px-5 py-2 rounded-xl text-white font-bold flex items-center space-x-1.5 shadow-sm transition ${
                saved ? 'bg-emerald-600' : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
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
