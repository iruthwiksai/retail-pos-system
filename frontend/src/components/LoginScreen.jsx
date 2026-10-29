import React, { useState, useEffect } from 'react';
import { Store, ShieldCheck, UserCheck, Lock, Delete, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginScreen({ settings = {}, onLoginSuccess }) {
  const [selectedRole, setSelectedRole] = useState('manager'); // 'manager' | 'cashier'
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const storeName = settings.store_name || 'Mani Devi General Store';
  const tagline = settings.store_tagline || 'Daily Best Prices • Maximum Savings';

  // Keyboard listener for physical keyboard & barcode scanner numeric input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSubmitting) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedRole, isSubmitting]);

  // Handle digit input
  const handleDigit = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    // Auto submit when 4 digits are completed
    if (newPin.length === 4) {
      submitPin(newPin, selectedRole);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  // Submit PIN to backend authentication API
  const submitPin = async (pinToSubmit, roleToSubmit) => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToSubmit, role: roleToSubmit })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Incorrect PIN. Please try again.');
      }

      // Success: Save token & user profile
      localStorage.setItem('pos_auth_token', data.token);
      localStorage.setItem('pos_user', JSON.stringify(data.user));

      if (onLoginSuccess) {
        onLoginSuccess(data.user, data.token);
      }
    } catch (err) {
      setShake(true);
      setError(err.message || 'Incorrect PIN');
      setTimeout(() => setShake(false), 500);
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 text-white font-sans select-none">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center">
        
        {/* Store Logo & Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3 transform hover:scale-105 transition">
            <Store className="w-9 h-9 text-emerald-950" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {storeName}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200/80 font-medium mt-1">
            {tagline}
          </p>
          <div className="inline-flex items-center space-x-1.5 mt-2.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-bold text-emerald-300">
            <Lock className="w-3 h-3" />
            <span>Counter Terminal Locked</span>
          </div>
        </div>

        {/* Role Selection Tabs */}
        <div className="w-full grid grid-cols-2 gap-2.5 p-1.5 bg-black/30 rounded-2xl border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('manager');
              setPin('');
              setError('');
            }}
            className={`flex items-center justify-center space-x-2 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 ${
              selectedRole === 'manager'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400/50'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-yellow-300 shrink-0" />
            <span>Owner / Manager</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('cashier');
              setPin('');
              setError('');
            }}
            className={`flex items-center justify-center space-x-2 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 ${
              selectedRole === 'cashier'
                ? 'bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-lg shadow-sky-600/30 ring-1 ring-sky-400/50'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserCheck className="w-4 h-4 text-sky-200 shrink-0" />
            <span>Cashier / Staff</span>
          </button>
        </div>

        {/* PIN Indicators (4 Dots) */}
        <div className="flex flex-col items-center mb-6">
          <p className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
            Enter 4-Digit {selectedRole === 'manager' ? 'Owner' : 'Cashier'} PIN
          </p>
          <div
            className={`flex items-center space-x-4 h-12 px-6 py-2 rounded-2xl bg-black/40 border border-white/10 ${
              shake ? 'animate-shake border-red-500/80 bg-red-950/30' : ''
            }`}
          >
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    isFilled
                      ? selectedRole === 'manager'
                        ? 'bg-yellow-400 shadow-md shadow-yellow-400/50 scale-125'
                        : 'bg-sky-400 shadow-md shadow-sky-400/50 scale-125'
                      : 'border-2 border-white/30 bg-transparent'
                  }`}
                />
              );
            })}
          </div>

          {/* Feedback & Error Message */}
          {error ? (
            <p className="text-xs font-bold text-red-400 mt-2.5 text-center animate-fadeIn">
              ⚠️ {error}
            </p>
          ) : isSubmitting ? (
            <p className="text-xs font-bold text-emerald-300 mt-2.5 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Verifying PIN...</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Type on keyboard or tap numeric keypad below
            </p>
          )}
        </div>

        {/* Touchscreen Numeric Keypad */}
        <div className="w-full max-w-[320px] grid grid-cols-3 gap-2.5 mb-5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              disabled={isSubmitting}
              className="h-14 sm:h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 transition-all text-xl sm:text-2xl font-black text-white shadow-sm border border-white/10 flex items-center justify-center disabled:opacity-50"
            >
              {digit}
            </button>
          ))}

          {/* Bottom row: Clear, 0, Backspace */}
          <button
            type="button"
            onClick={handleClear}
            disabled={isSubmitting || pin.length === 0}
            className="h-14 sm:h-16 rounded-2xl bg-red-500/20 hover:bg-red-500/30 active:scale-95 transition-all text-xs sm:text-sm font-bold text-red-300 border border-red-500/30 flex items-center justify-center disabled:opacity-40"
          >
            CLEAR
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={isSubmitting}
            className="h-14 sm:h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 transition-all text-xl sm:text-2xl font-black text-white shadow-sm border border-white/10 flex items-center justify-center disabled:opacity-50"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={isSubmitting || pin.length === 0}
            className="h-14 sm:h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/10 flex items-center justify-center disabled:opacity-40"
            title="Backspace"
          >
            <Delete className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300" />
          </button>
        </div>

        {/* Counter Helper Footer */}
        <div className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-center">
          <p className="text-[11px] text-slate-300">
            <span className="font-bold text-yellow-300">Default PINs:</span> Owner PIN: <strong className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">1234</strong> | Cashier PIN: <strong className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">0000</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
