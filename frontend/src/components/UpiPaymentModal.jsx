import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, Banknote, CreditCard, CheckCircle2, Copy, Check, BookOpen } from 'lucide-react';

export default function UpiPaymentModal({
  isOpen,
  onClose,
  totalAmount,
  customerName,
  customerPhone,
  settings,
  orderNumber,
  onConfirmOrder,
  isSubmitting
}) {
  if (!isOpen) return null;

  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [cashTendered, setCashTendered] = useState(totalAmount);
  const [upiRef, setUpiRef] = useState('');
  const [copied, setCopied] = useState(false);
  const [cashierNotes, setCashierNotes] = useState('');

  const upiId = settings.upi_id || 'smartretail@okaxis';
  const upiName = settings.upi_name || settings.store_name || 'VijayaLakshmi Minimart';
  const currency = settings.currency_symbol || '₹';

  // Construct UPI payment URI
  const note = `Bill ${orderNumber || ''} ${customerPhone ? `(${customerPhone})` : ''}`.trim();
  const upiPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cashChange = Math.max(0, (Number(cashTendered) || 0) - totalAmount);

  const handleSubmit = (status = 'PAID') => {
    if (paymentMethod === 'CREDIT' && !customerName && !customerPhone) {
      alert('Please enter customer name or mobile number for Udhaar / Credit bill.');
      return;
    }

    onConfirmOrder({
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'CREDIT' ? 'UNPAID' : status,
      upi_reference: upiRef,
      cash_tendered: paymentMethod === 'CASH' ? Number(cashTendered) : totalAmount,
      cashier_notes: cashierNotes,
      order_number: orderNumber
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-emerald-200">
              Checkout & Payment • {orderNumber || 'Order'}
            </div>
            <h2 className="text-2xl font-bold flex items-center space-x-2 mt-0.5">
              <span>Finalize Bill</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Amount Banner - Big & Bold, No Discounts */}
        <div className="bg-emerald-50 px-6 py-5 border-b border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Total Payable Amount</span>
            <div className="text-4xl font-black text-emerald-900 mt-1">
              {currency}{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          {orderNumber && (
            <span className="bg-emerald-200 text-emerald-900 font-mono font-bold text-sm px-3 py-1.5 rounded-lg">
              {orderNumber}
            </span>
          )}
        </div>

        {/* Payment Tabs (UPI, Cash, Card, Udhaar) */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('UPI')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-bold transition ${
                paymentMethod === 'UPI'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <QrCode className="w-6 h-6 mb-1 text-emerald-600" />
              <span>UPI QR</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-bold transition ${
                paymentMethod === 'CASH'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Banknote className="w-6 h-6 mb-1 text-emerald-600" />
              <span>Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CARD')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-bold transition ${
                paymentMethod === 'CARD'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <CreditCard className="w-6 h-6 mb-1 text-emerald-600" />
              <span>Card</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CREDIT')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-bold transition ${
                paymentMethod === 'CREDIT'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <BookOpen className="w-6 h-6 mb-1 text-amber-600" />
              <span>Udhaar</span>
            </button>
          </div>

          {/* Mode Details */}
          {paymentMethod === 'UPI' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col items-center text-center space-y-4">
              <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200">
                <QRCodeSVG
                  value={upiPayload}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>

              <div>
                <p className="text-base font-bold text-slate-800">Scan with any UPI App</p>
                <p className="text-xs text-slate-500">Google Pay, PhonePe, Paytm, BHIM</p>
                <div className="mt-2 inline-flex items-center space-x-1.5 bg-slate-200/80 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700">
                  <span>{upiId}</span>
                  <button
                    onClick={handleCopyUPI}
                    type="button"
                    className="text-slate-500 hover:text-slate-800"
                    title="Copy UPI Payload"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="w-full text-left pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  UPI Ref / UTR No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 429381749281"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="w-full text-sm px-3.5 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {paymentMethod === 'CASH' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Cash Received from Customer ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="w-full text-2xl font-black px-4 py-3 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              {/* Fast quick cash buttons */}
              <div className="flex flex-wrap gap-2">
                {[totalAmount, 50, 100, 200, 500, 1000, 2000]
                  .filter((amt, idx, arr) => amt >= totalAmount && arr.indexOf(amt) === idx)
                  .slice(0, 5)
                  .map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashTendered(amt)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 shadow-xs"
                    >
                      {currency}{amt}
                    </button>
                  ))}
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                <span className="text-sm font-bold text-emerald-800">Return Change to Customer:</span>
                <span className="text-2xl font-black text-emerald-700">
                  {currency}{cashChange.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {paymentMethod === 'CARD' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-2">
              <CreditCard className="w-12 h-12 text-emerald-600 mx-auto" />
              <p className="text-base font-bold text-slate-800">Card Payment via EDC Terminal</p>
              <p className="text-sm text-slate-500">
                Collect payment of {currency}{totalAmount.toFixed(2)} on card machine and click confirm.
              </p>
            </div>
          )}

          {paymentMethod === 'CREDIT' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left space-y-3">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm uppercase tracking-wider">
                <BookOpen className="w-5 h-5 text-amber-700" />
                <span>Udhaar / Customer Credit Register</span>
              </div>
              <p className="text-xs text-amber-800">
                This bill will be saved with status <strong>UNPAID</strong>. You can mark it as settled/paid later from the Saved Bills tab.
              </p>
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Customer Name / Phone:
                </label>
                <div className="text-sm font-bold text-slate-800 bg-white p-3 rounded-xl border border-amber-300">
                  {customerName || customerPhone ? `${customerName} (${customerPhone || 'No Phone'})` : '⚠️ Please enter customer mobile or name before saving Udhaar'}
                </div>
              </div>
            </div>
          )}

          {/* Customer info preview */}
          {(customerName || customerPhone) && paymentMethod !== 'CREDIT' && (
            <div className="text-xs bg-slate-100 p-3 rounded-xl text-slate-600 flex justify-between">
              <span>Customer: <strong className="text-slate-800">{customerName || 'Walk-in'}</strong></span>
              {customerPhone && <span>Phone: <strong className="text-slate-800">{customerPhone}</strong></span>}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="bg-slate-50 p-5 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => handleSubmit('PAID')}
            disabled={isSubmitting}
            className={`flex-1 font-bold text-base py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md transition disabled:opacity-50 text-white ${
              paymentMethod === 'CREDIT'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {isSubmitting
                ? 'Saving Order...'
                : paymentMethod === 'CREDIT'
                ? 'Save as Udhaar (Credit)'
                : 'Confirm & Save Bill'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
