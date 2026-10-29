import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Delete } from 'lucide-react';

export default function ManagerElevationModal({ isOpen, onClose, onSuccess, targetFeature = 'this section' }) {
  if (!isOpen) return null;

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSubmitting) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isSubmitting]);

  const handleDigit = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      verifyPin(newPin);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const verifyPin = async (pinToVerify) => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-manager-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToVerify })
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || 'Incorrect Manager PIN');
      }

      // Update local storage with elevated manager token
      if (data.token) {
        localStorage.setItem('pos_auth_token', data.token);
        localStorage.setItem('pos_user', JSON.stringify({
          role: 'manager',
          name: 'Owner / Manager'
        }));
      }

      onSuccess(data);
      onClose();
    } catch (err) {
      setShake(true);
      setError(err.message || 'Incorrect Manager PIN');
      setTimeout(() => setShake(false), 500);
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center animate-scaleUp">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-yellow-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-bold text-sm uppercase tracking-wider text-white">
              Manager Approval
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Prompt */}
        <div className="text-center my-4">
          <p className="text-sm font-semibold text-slate-200">
            Enter 4-Digit Manager PIN to access <span className="text-yellow-400 font-bold">{targetFeature}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Default Owner PIN: 1234
          </p>
        </div>

        {/* 4 Dots PIN Display */}
        <div
          className={`flex items-center space-x-3.5 h-11 px-5 py-2 rounded-2xl bg-black/50 border border-slate-700 mb-4 ${
            shake ? 'animate-shake border-red-500 bg-red-950/40' : ''
          }`}
        >
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                pin.length > idx
                  ? 'bg-yellow-400 scale-125 shadow-md shadow-yellow-400/50'
                  : 'border-2 border-slate-600 bg-transparent'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs font-bold text-red-400 mb-3 text-center">
            ⚠️ {error}
          </p>
        )}

        {/* Touch Keypad */}
        <div className="w-full grid grid-cols-3 gap-2 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              disabled={isSubmitting}
              className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition text-lg font-bold text-white border border-slate-700 flex items-center justify-center disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            disabled={isSubmitting || pin.length === 0}
            className="h-12 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-xs font-bold text-red-300 border border-red-800/40 flex items-center justify-center disabled:opacity-30"
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={isSubmitting}
            className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition text-lg font-bold text-white border border-slate-700 flex items-center justify-center disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={isSubmitting || pin.length === 0}
            className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition text-white border border-slate-700 flex items-center justify-center disabled:opacity-30"
          >
            <Delete className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
