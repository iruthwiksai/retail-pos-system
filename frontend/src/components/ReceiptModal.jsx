import React, { useRef } from 'react';
import { X, Printer, Share2 } from 'lucide-react';

export default function ReceiptModal({ isOpen, onClose, order, settings }) {
  if (!isOpen || !order) return null;

  const receiptRef = useRef();

  const storeName = settings.store_name || 'VijayaLakshmi Minimart';
  const storeAddress = settings.store_address || 'Main Market Road';
  const storePhone = settings.store_phone || '+91 98765 43210';
  const gstin = settings.gstin || '';
  const currency = settings.currency_symbol || '₹';
  const footerMsg = settings.receipt_footer_msg || 'Thank you for shopping! Visit again.';

  const handlePrint = () => {
    window.print();
  };

  const parseDate = (d) => {
    if (!d) return new Date();
    const str = typeof d === 'string' && !d.includes('Z') && !d.includes('+')
      ? d.replace(' ', 'T') + 'Z'
      : d;
    return new Date(str);
  };

  const orderDate = parseDate(order.created_at);

  const handleWhatsAppShare = () => {
    if (!order.customer_phone) {
      alert('No customer phone number recorded for this bill.');
      return;
    }

    const cleanPhone = order.customer_phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    let msg = `*--- ${storeName.toUpperCase()} ---*\n`;
    msg += `🧾 *Bill No:* ${order.order_number}\n`;
    msg += `📅 *Date:* ${orderDate.toLocaleString('en-IN')}\n\n`;
    msg += `*Items Purchased:*\n`;

    (order.items || []).forEach((item, idx) => {
      msg += `${idx + 1}. ${item.product_name} (${item.quantity} ${item.unit || ''})\n   Rate: ${currency}${item.selling_price} = *${currency}${item.item_total}*\n`;
    });

    msg += `\n-------------------------\n`;
    msg += `*Total Amount Paid: ${currency}${order.total_amount.toFixed(2)}*\n`;
    if (order.total_savings > 0) {
      msg += `🎉 *Customer Total Savings: ${currency}${order.total_savings.toFixed(2)}*\n`;
    }
    msg += `💳 Mode: ${order.payment_method} (${order.payment_status || 'PAID'})\n`;
    msg += `-------------------------\n`;
    msg += `${footerMsg}\n`;

    const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base">Receipt Preview</span>
            <span className="bg-emerald-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">
              {order.order_number}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between no-print gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-2 shadow-xs transition"
          >
            <Printer className="w-5 h-5 text-emerald-600" />
            <span>Print / Save PDF</span>
          </button>

          {order.customer_phone && (
            <button
              onClick={handleWhatsAppShare}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-2 shadow-xs transition"
            >
              <Share2 className="w-5 h-5" />
              <span>WhatsApp Bill</span>
            </button>
          )}
        </div>

        {/* Bill Content - Clear, No Discounts, Easy to Read */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex justify-center">
          <div
            id="printable-receipt"
            ref={receiptRef}
            className="bg-white p-6 border border-slate-300 shadow-sm font-mono text-sm w-full max-w-[360px] text-slate-900 leading-normal"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <h1 className="text-lg font-black tracking-wide uppercase text-slate-900">{storeName}</h1>
              <p className="text-xs text-slate-600 mt-0.5">{storeAddress}</p>
              <p className="text-xs text-slate-600">Tel: {storePhone}</p>
              {gstin && <p className="text-xs text-slate-600 mt-0.5">GSTIN: {gstin}</p>}
              <div className="mt-2 text-xs font-bold uppercase tracking-wider bg-slate-100 py-1">
                RETAIL CASH MEMO
              </div>
            </div>

            {/* Bill Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Bill No: <strong className="font-bold text-slate-900">{order.order_number}</strong></span>
                <span>Date: {orderDate.toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Time: {orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>Counter: 01</span>
              </div>
              {order.customer_name && (
                <div className="flex justify-between pt-0.5 text-slate-800 font-medium">
                  <span>Customer: {order.customer_name}</span>
                  {order.customer_phone && <span>Ph: {order.customer_phone}</span>}
                </div>
              )}
            </div>

            {/* Items Header */}
            <div className="py-2 border-b border-dashed border-slate-400 text-xs font-bold flex justify-between uppercase text-slate-700">
              <span className="w-6/12">Item</span>
              <span className="w-2/12 text-center">Qty</span>
              <span className="w-2/12 text-right">Rate</span>
              <span className="w-2/12 text-right">Amount</span>
            </div>

            {/* Items List */}
            <div className="py-2 space-y-2 border-b border-dashed border-slate-400 text-xs">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-baseline">
                  <span className="w-6/12 font-semibold text-slate-800 truncate" title={item.product_name}>
                    {idx + 1}. {item.product_name}
                  </span>
                  <span className="w-2/12 text-center text-slate-700">
                    {item.quantity} {item.unit || ''}
                  </span>
                  <span className="w-2/12 text-right text-slate-700">
                    {currency}{item.selling_price}
                  </span>
                  <span className="w-2/12 text-right font-bold text-slate-900">
                    {currency}{item.item_total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals & Grand Total */}
            <div className="py-3 border-b border-dashed border-slate-400 space-y-1.5 text-sm">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Total Items:</span>
                <span>{(order.items || []).length} items</span>
              </div>
              {order.total_savings > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 font-bold">
                  <span>TOTAL SAVINGS (MRP):</span>
                  <span>{currency}{Number(order.total_savings).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black pt-1 border-t border-slate-300">
                <span>TOTAL PAYABLE:</span>
                <span>{currency}{order.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="pt-2 pb-2 border-b border-dashed border-slate-400 text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span>Payment Mode: <strong className="font-bold">{order.payment_method}</strong></span>
                <span>Status: <strong className="font-bold">{order.payment_status || 'PAID'}</strong></span>
              </div>
              {order.upi_reference && (
                <div>Ref / UTR: {order.upi_reference}</div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-800">{footerMsg}</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 no-print flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold text-base px-6 py-2.5 rounded-xl shadow-sm transition"
          >
            Close / Start Next Bill
          </button>
        </div>
      </div>
    </div>
  );
}
