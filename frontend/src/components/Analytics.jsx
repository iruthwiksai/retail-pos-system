import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  Calendar,
  Download,
  Award,
  CreditCard,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function Analytics({ settings }) {
  const [period, setPeriod] = useState('week'); // 'today', 'week', 'month', 'all'
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  const currency = settings.currency_symbol || '₹';

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      const data = await res.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const COLORS = ['#007A3D', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

  const exportSummaryCSV = () => {
    if (!analyticsData) return;
    const s = analyticsData.summary;
    const rows = [
      ['Metric', 'Value'],
      ['Period', period],
      ['Total Revenue', s.total_revenue],
      ['Estimated Net Profit', s.total_profit],
      ['Profit Margin %', s.profit_margin + '%'],
      ['Total Invoices Billed', s.total_orders],
      ['Average Basket Size', s.avg_order_value],
      ['Total Customer Savings', s.total_savings]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `business_analytics_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = analyticsData?.summary || {
    total_revenue: 0,
    total_profit: 0,
    profit_margin: 0,
    total_orders: 0,
    avg_order_value: 0,
    total_savings: 0
  };

  const trendData = analyticsData?.salesTrend || [];
  const topProducts = analyticsData?.topProducts || [];
  const paymentMethods = analyticsData?.paymentMethods || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Period Switcher */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-700" />
            <span>Retail Business Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily, weekly, and monthly sales, profit margins, and inventory performance
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Period Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'today', label: 'Today (Daily)' },
              { id: 'week', label: 'Last 7 Days (Weekly)' },
              { id: 'month', label: 'This Month (Monthly)' },
              { id: 'all', label: 'All Time' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  period === p.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={exportSummaryCSV}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold py-2 px-3 rounded-xl flex items-center space-x-1.5 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Sales</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {currency}{summary.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center space-x-1 text-[11px] text-emerald-700 font-semibold mt-1">
            <span>Customer Savings: {currency}{summary.total_savings.toFixed(0)}</span>
          </div>
        </div>

        {/* Estimated Profit */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Profit</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">
            {currency}{summary.total_profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center space-x-1 text-[11px] text-blue-600 font-semibold mt-1">
            <Percent className="w-3 h-3" />
            <span>Margin: {summary.profit_margin}%</span>
          </div>
        </div>

        {/* Total Invoices Billed */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bills Generated</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-700">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary.total_orders} Orders
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            In selected period
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Basket Size</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {currency}{summary.avg_order_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Average ticket per customer
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales & Revenue Trend (8 Cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Sales & Revenue Trend</h3>
              <p className="text-xs text-slate-400">Daily gross revenue over past 30 days</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#007A3D" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#007A3D" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    formatter={(val) => [`${currency}${Number(val).toFixed(2)}`, 'Revenue']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#007A3D"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No trend data available for this range.
              </div>
            )}
          </div>
        </div>

        {/* Payment Modes Distribution (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Payment Breakdown</h3>
            <p className="text-xs text-slate-400">UPI vs Cash vs Card Volume</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="total_amount"
                    nameKey="payment_method"
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${currency}${Number(val).toFixed(2)}`, 'Sales']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs">No orders recorded yet.</div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            {paymentMethods.map((m, idx) => (
              <div key={m.payment_method} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="font-medium text-slate-700">{m.payment_method}</span>
                </div>
                <span className="font-bold text-slate-900">{currency}{m.total_amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing Products Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800">
          🏆 Top-Selling Products (Fastest Moving Inventory)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[11px] text-slate-500 tracking-wider">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Units Sold</th>
                <th className="py-3 px-4 text-right">Gross Sales</th>
                <th className="py-3 px-4 text-right">Estimated Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    No sales recorded in this period.
                  </td>
                </tr>
              ) : (
                topProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <span className="text-slate-400 mr-2">#{idx + 1}</span>
                      {p.product_name}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {p.category}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {p.total_qty} units
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {currency}{p.total_sales.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-700">
                      {currency}{p.total_profit.toFixed(2)}
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
