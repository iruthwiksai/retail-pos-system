import React, { useState, useEffect } from 'react';
import { Search, Calendar, Eye, Share2, Download, RefreshCw, FileText, CheckCircle2, Clock, BookOpen, AlertCircle, Trash2 } from 'lucide-react';

export default function OrdersHistory({ onSelectOrder, settings }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'PAID', 'UNPAID'

  const currency = settings.currency_symbol || '₹';

  const parseDate = (d) => {
    if (!d) return new Date();
    if (d instanceof Date) return d;
    if (typeof d === 'string') {
      if (d.includes('Z') || d.includes('+')) return new Date(d);
      return new Date(d.replace(' ', 'T'));
    }
    return new Date(d);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = '/api/orders?';
      if (searchTerm) url += `q=${encodeURIComponent(searchTerm)}&`;
      if (dateFilter) url += `date=${encodeURIComponent(dateFilter)}&`;
      if (paymentFilter !== 'All') url += `payment_method=${encodeURIComponent(paymentFilter)}&`;

      const res = await fetch(url);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      // Guarantee strictly NO bills of future time ever appear in the UI
      const nowMs = Date.now() + 60000;
      setOrders(list.filter(o => parseDate(o.created_at).getTime() <= nowMs));
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [searchTerm, dateFilter, paymentFilter]);

  // Settle Udhaar / Credit bill
  const handleSettleOrder = async (orderId, orderNum) => {
    const payMode = window.prompt(`Select payment mode to settle ${orderNum}:\nType: UPI or CASH`, 'UPI');
    if (!payMode) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: 'PAID',
          payment_method: payMode.toUpperCase() === 'CASH' ? 'CASH' : 'UPI'
        })
      });
      if (res.ok) {
        fetchOrders();
      } else {
        alert('Failed to settle order');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Void / Cancel order with Manager PIN protection
  const handleCancelOrder = async (orderId, orderNum) => {
    const pin = window.prompt(`Enter 4-digit Manager PIN to void/cancel order ${orderNum}:`, '1234');
    if (!pin) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'x-manager-pin': pin }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Order ${orderNum} cancelled and stock restored`);
        fetchOrders();
      } else {
        alert(data.error || 'Failed to cancel order');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleWhatsAppClick = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const fullOrder = await res.json();
      if (!fullOrder.customer_phone) {
        alert('No customer phone number for this bill.');
        return;
      }
      const cleanPhone = fullOrder.customer_phone.replace(/\D/g, '');
      const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      let msg = `*--- ${settings.store_name || 'Mani Devi General Store'} ---*\n`;
      msg += `🧾 *Tax Invoice:* ${fullOrder.order_number}\n`;
      msg += `📅 *Date:* ${new Date(fullOrder.created_at).toLocaleString('en-IN')}\n\n`;
      msg += `*Items Purchased:*\n`;

      (fullOrder.items || []).forEach((item, idx) => {
        msg += `${idx + 1}. ${item.product_name} (${item.quantity} ${item.unit})\n   MRP: ${currency}${item.mrp} | Rate: ${currency}${item.selling_price} = *${currency}${item.item_total}*\n`;
      });

      msg += `\n-------------------------\n`;
      msg += `*Total Amount: ${currency}${fullOrder.total_amount.toFixed(2)}*\n`;
      msg += `Status: ${fullOrder.payment_status === 'UNPAID' ? '⚠️ UNPAID / UDHAAR' : 'PAID'}\n`;
      if (fullOrder.total_savings > 0) {
        msg += `🎉 *Your Total Savings: ${currency}${fullOrder.total_savings.toFixed(2)}*\n`;
      }
      msg += `💳 Mode: ${fullOrder.payment_method}\n`;
      msg += `-------------------------\n`;
      msg += `${settings.receipt_footer_msg || 'Thank You For Shopping!'}\n`;

      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err) {
      alert('Failed to load order details');
    }
  };

  // Filter orders by status
  const displayedOrders = orders.filter(o => {
    if (statusFilter === 'PAID') return o.payment_status === 'PAID';
    if (statusFilter === 'UNPAID') return o.payment_status === 'UNPAID';
    return true;
  });

  const totalUnpaidAmount = orders
    .filter(o => o.payment_status === 'UNPAID')
    .reduce((acc, o) => acc + o.total_amount, 0);

  // Export orders to CSV
  const exportToCSV = () => {
    if (displayedOrders.length === 0) return;
    const headers = ['Order Number', 'Date', 'Customer Name', 'Phone', 'Total Amount', 'Total Cost', 'Profit', 'Margin %', 'Payment Mode', 'Status'];
    const rows = displayedOrders.map(o => [
      o.order_number,
      o.created_at,
      `"${o.customer_name || ''}"`,
      o.customer_phone || '',
      o.total_amount,
      o.total_cost || 0,
      (o.profit !== undefined ? o.profit : (o.total_amount - (o.total_cost || 0))),
      `${o.margin_percent !== undefined ? o.margin_percent : 0}%`,
      o.payment_method,
      o.payment_status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Udhaar / Customer Credit Banner */}
      {totalUnpaidAmount > 0 && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-center justify-between text-amber-900 shadow-xs">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-5 h-5 text-amber-700" />
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider">Customer Udhaar (Credit) Outstanding</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Total unpaid balance across accounts: <strong>{currency}{totalUnpaidAmount.toFixed(2)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter(statusFilter === 'UNPAID' ? 'All' : 'UNPAID')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'UNPAID'
                ? 'bg-amber-800 text-white'
                : 'bg-amber-200 text-amber-950 hover:bg-amber-300'
            }`}
          >
            {statusFilter === 'UNPAID' ? 'Showing Udhaar Bills' : 'Filter Udhaar Bills'}
          </button>
        </div>
      )}

      {/* Top Header & Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-emerald-700" />
              <span>Saved Bills & Order Invoices</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review saved receipts, profit margins, download bills as PDF, manage Udhaar, or resend to customer WhatsApp
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={exportToCSV}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold py-2 px-3 rounded-xl flex items-center space-x-1.5 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchOrders}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold py-2 px-3 rounded-xl flex items-center space-x-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Controls with Enlarged Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          {/* Search - Enlarged Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order ID, Phone or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
            />
          </div>

          {/* Date Picker */}
          <div className="sm:col-span-3 relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="sm:col-span-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2.5 sm:py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700"
            >
              <option value="All">All Modes</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="CREDIT">Udhaar</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2 flex bg-slate-100 p-1 rounded-xl text-xs sm:text-sm">
            {['All', 'PAID', 'UNPAID'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  statusFilter === st
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'UNPAID' ? 'Udhaar' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-xs text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4 text-right">Bill Amount</th>
                <th className="py-3.5 px-4 text-right">Profit / Margin</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Payment</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                    Loading orders...
                  </td>
                </tr>
              ) : displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                    No bills found matching your criteria.
                  </td>
                </tr>
              ) : (
                displayedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition text-sm">
                    <td className="py-3.5 px-4 font-bold font-mono text-emerald-800 text-base">
                      {o.order_number}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {parseDate(o.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}{' '}
                      <span className="text-slate-400 text-xs">
                        {parseDate(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{o.customer_name || 'Walk-in'}</div>
                      {o.customer_phone && <div className="text-xs text-slate-500 font-mono">{o.customer_phone}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 text-base">
                      {currency}{o.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-black text-emerald-800 text-base">
                        +{currency}{(o.profit !== undefined ? Number(o.profit) : (o.total_amount - (o.total_cost || 0))).toFixed(2)}
                      </div>
                      <span className="inline-block text-[11px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {(o.margin_percent !== undefined ? Number(o.margin_percent) : 0).toFixed(1)}% margin
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          o.payment_status === 'UNPAID'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {o.payment_status || 'PAID'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          o.payment_method === 'UPI'
                            ? 'bg-purple-100 text-purple-800'
                            : o.payment_method === 'CASH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.payment_method === 'CREDIT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {o.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => onSelectOrder(o.id)}
                          title="View / Print Receipt"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {o.payment_status === 'UNPAID' && (
                          <button
                            onClick={() => handleSettleOrder(o.id, o.order_number)}
                            title="Settle / Mark as Paid"
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition text-[10px] font-bold flex items-center space-x-1 px-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Settle</span>
                          </button>
                        )}

                        {o.customer_phone && (
                          <button
                            onClick={() => handleWhatsAppClick(o.id)}
                            title="Send on WhatsApp"
                            className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleCancelOrder(o.id, o.order_number)}
                          title="Cancel / Void Bill"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
