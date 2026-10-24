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
  Clock,
  Flame,
  CalendarDays,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Building2,
  Package,
  Layers,
  Activity,
  BarChart2,
  ChevronDown,
  Tag,
  CheckCircle2,
  SlidersHorizontal
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

export default function Analytics({ settings = {} }) {
  const [period, setPeriod] = useState('week'); // 'today', 'week', 'month', 'all'
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'sales', 'peaks', 'products', 'inventory', 'all'
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

  const COLORS = ['#007A3D', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#64748B'];

  const exportSummaryCSV = () => {
    if (!analyticsData) return;
    const s = analyticsData.summary;
    const inv = analyticsData.inventory || {};
    const rows = [
      ['Metric', 'Value'],
      ['Period', period],
      ['Gross Sales', s.total_revenue],
      ['Sales Growth vs Previous Period', (s.growth_percent || 0) + '%'],
      ['Net Profit', s.total_profit],
      ['Profit Margin %', s.profit_margin + '%'],
      ['Total Completed Bills', s.total_orders],
      ['Average Bill Value', s.avg_order_value],
      ['Average Items Per Bill', s.avg_items_per_order || 0],
      ['Total Customer Discounts', s.total_savings],
      ['Inventory Valuation', inv.inventory_valuation || 0],
      ['Inventory Turnover Ratio', inv.turnover_ratio || 0],
      ['Days of Inventory on Hand', inv.days_on_hand || 0]
    ];

    if (analyticsData.peakHour) {
      rows.push(['Peak Rush Hour', `${analyticsData.peakHour.label} (${currency}${analyticsData.peakHour.revenue})`]);
    }
    if (analyticsData.peakDay) {
      rows.push(['Peak Sales Day', `${analyticsData.peakDay.day_name} (${currency}${analyticsData.peakDay.revenue})`]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `retail_analytics_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
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
    total_savings: 0,
    prev_revenue: 0,
    growth_percent: 0,
    avg_items_per_order: 0
  };

  const inventory = analyticsData?.inventory || {
    total_sku_count: 0,
    total_stock_units: 0,
    inventory_valuation: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    turnover_ratio: 0,
    days_on_hand: 0
  };

  const trendData = analyticsData?.salesTrend || [];
  const topProducts = analyticsData?.topProducts || [];
  const slowProducts = analyticsData?.slowProducts || [];
  const categorySales = analyticsData?.categorySales || [];
  const supplierSpending = analyticsData?.supplierSpending || [];
  const paymentMethods = analyticsData?.paymentMethods || [];
  const hourlyData = analyticsData?.hourlyDistribution || [];
  const peakHour = analyticsData?.peakHour || null;
  const dayOfWeekData = analyticsData?.dayOfWeekDistribution || [];
  const peakDay = analyticsData?.peakDay || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 1. Header with View Dropdown & Period Selector */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm shrink-0">
              <TrendingUp className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                Business Intelligence & Analytics
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Real-time sales velocity, peak hours, category performance & margins
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Dropdown & Time Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Dropdown */}
          <div className="relative flex items-center">
            <select
              value={activeView}
              onChange={(e) => setActiveView(e.target.value)}
              className="bg-emerald-50 hover:bg-emerald-100/70 border-2 border-emerald-600/30 text-emerald-950 font-bold text-xs rounded-xl px-3 py-2 pr-8 shadow-xs appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
            >
              <option value="overview">📊 Executive Overview</option>
              <option value="sales">📈 Sales, Revenue & Margins</option>
              <option value="peaks">⏰ Peak Hours & Busy Days</option>
              <option value="products">🛍️ Categories & Products Velocity</option>
              <option value="inventory">📦 Inventory & Supplier Spending</option>
              <option value="all">📑 Full Detailed Report</option>
            </select>
            <ChevronDown className="w-4 h-4 text-emerald-800 absolute right-2.5 pointer-events-none" />
          </div>

          {/* Period Selector Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: 'Month' },
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

          {/* Export CSV */}
          <button
            onClick={exportSummaryCSV}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold py-2 px-3 rounded-xl flex items-center space-x-1.5 shadow-xs transition"
            title="Download CSV Summary"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* 2. Top Essential KPI Cards (Concise, Non-Repeating) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Gross Sales */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Sales</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {currency}{summary.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">vs Prev Period</span>
            <span className={`inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-full ${
              summary.growth_percent >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {summary.growth_percent >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{summary.growth_percent > 0 ? `+${summary.growth_percent}%` : `${summary.growth_percent}%`}</span>
            </span>
          </div>
        </div>

        {/* KPI 2: Gross Profit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">
            {currency}{summary.total_profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">Margin</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-black">
              {summary.profit_margin}% margin
            </span>
          </div>
        </div>

        {/* KPI 3: Avg Basket & Completed Orders */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Bill Value</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-700">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {currency}{summary.avg_order_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">{summary.total_orders} Bills Billed</span>
            <span className="text-slate-700 font-extrabold">{summary.avg_items_per_order || 0} items/bill</span>
          </div>
        </div>

        {/* KPI 4: Peak Footfall Highlight */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peak Footfall</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
              <Flame className="w-4 h-4 text-orange-600 fill-orange-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 flex items-baseline gap-2">
            <span>{peakHour ? peakHour.label : '—'}</span>
            {peakDay && <span className="text-xs font-bold text-amber-800 uppercase">({peakDay.day_short})</span>}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">Peak Day</span>
            <span className="text-amber-900 font-extrabold">{peakDay ? peakDay.day_name : 'Standard'}</span>
          </div>
        </div>

      </div>

      {/* 3. DYNAMIC CONTENT BASED ON SELECTED VIEW */}

      {/* VIEW: EXECUTIVE OVERVIEW */}
      {(activeView === 'overview' || activeView === 'all') && (
        <div className="space-y-6">
          
          {/* Main Visual Row: Sales Trend + Payment Modes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sales Trend Chart (8 Cols) */}
            <div className="lg:col-span-8 min-w-0 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Sales & Revenue Velocity</h3>
                  <p className="text-xs text-slate-400">
                    {period === 'today' ? 'Hourly progression today' : 'Revenue trajectory over selected period'}
                  </p>
                </div>
              </div>

              <div className="h-64 w-full min-h-[250px]">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorOverviewRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#007A3D" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#007A3D" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip
                        formatter={(val) => [`${currency}${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Revenue']}
                        labelFormatter={(label) => `Time / Date: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#007A3D"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorOverviewRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No sales data recorded for this range.
                  </div>
                )}
              </div>
            </div>

            {/* Payment Modes Donut Chart (4 Cols) */}
            <div className="lg:col-span-4 min-w-0 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Payment Breakdown</h3>
                <p className="text-xs text-slate-400">UPI QR vs Cash vs Card Volume</p>
              </div>

              <div className="h-48 w-full min-h-[190px] flex items-center justify-center">
                {paymentMethods.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethods}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="total_amount"
                        nameKey="payment_method"
                      >
                        {paymentMethods.map((entry, index) => (
                          <Cell key={`cell-overview-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => [`${currency}${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Sales']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-400 text-xs">No payment records yet.</div>
                )}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                {paymentMethods.map((m, idx) => (
                  <div key={m.payment_method} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="font-medium text-slate-700">{m.payment_method}</span>
                    </div>
                    <span className="font-bold text-slate-900">{currency}{m.total_amount.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Secondary Visual Row: Category Revenue Graph + Peak Hours Mini Graph */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Category Performance Bar Chart (7 Cols) */}
            <div className="lg:col-span-7 min-w-0 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Top Categories by Revenue</h3>
                  <p className="text-xs text-slate-400">Department contribution to gross store sales</p>
                </div>
              </div>

              <div className="h-64 w-full min-h-[250px]">
                {categorySales.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categorySales.slice(0, 6)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} />
                      <YAxis
                        type="category"
                        dataKey="category"
                        tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                        width={100}
                      />
                      <Tooltip
                        formatter={(val, name, item) => [
                          `${currency}${Number(val).toLocaleString('en-IN')} (${item.payload.percent}%)`,
                          'Revenue'
                        ]}
                      />
                      <Bar dataKey="revenue" fill="#007A3D" radius={[0, 6, 6, 0]}>
                        {categorySales.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-cat-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No category data available.
                  </div>
                )}
              </div>
            </div>

            {/* Peak Hours Mini Chart (5 Cols) */}
            <div className="lg:col-span-5 min-w-0 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Peak Footfall Hours</h3>
                  <p className="text-xs text-slate-400">Customer rush pattern (8 AM - 10 PM)</p>
                </div>
                {peakHour && (
                  <span className="text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                    Peak: {peakHour.label}
                  </span>
                )}
              </div>

              <div className="h-56 w-full min-h-[220px]">
                {hourlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                      <Tooltip
                        formatter={(val, name, item) => [
                          `${currency}${Number(val).toLocaleString('en-IN')} (${item.payload.orders_count} bills)`,
                          'Sales'
                        ]}
                      />
                      <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                        {hourlyData.map((entry, index) => {
                          const isPeak = peakHour && entry.hour === peakHour.hour;
                          return <Cell key={`cell-hour-${index}`} fill={isPeak ? '#F59E0B' : '#059669'} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No hourly data available.
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Top Weekly Day: <strong className="text-slate-800">{peakDay ? peakDay.day_name : '—'}</strong></span>
                <span className="text-emerald-700 font-bold">{peakDay ? `${currency}${peakDay.revenue.toLocaleString('en-IN')}` : ''}</span>
              </div>
            </div>

          </div>

          {/* Tertiary Row: Fast Sellers & Inventory Health Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Top 5 Best Selling Fast Movers (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800">Top 5 Best-Selling Products</h3>
                <span className="text-xs font-semibold text-slate-400">By gross revenue</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[10px] text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-2 text-center">Units Sold</th>
                      <th className="py-2 px-3 text-right">Revenue</th>
                      <th className="py-2 px-3 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topProducts.slice(0, 5).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 font-bold text-slate-900 truncate max-w-[200px]" title={p.product_name}>
                          <span className="text-slate-400 mr-1.5">#{idx + 1}</span>
                          {p.product_name}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-slate-800">{p.total_qty}</td>
                        <td className="py-2 px-3 text-right font-black text-slate-900">{currency}{p.total_sales.toFixed(0)}</td>
                        <td className="py-2 px-3 text-right font-black text-emerald-700">{currency}{p.total_profit.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inventory Valuation & Supplier Snapshot (5 Cols) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Inventory Health & Suppliers</h3>
                <p className="text-xs text-slate-400">Working capital valuation and reorder velocity</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Stock Valuation</span>
                  <span className="text-base font-black text-slate-900">
                    {currency}{inventory.inventory_valuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{inventory.total_sku_count} registered SKUs</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Turnover Ratio</span>
                  <span className="text-base font-black text-emerald-700">{inventory.turnover_ratio}x</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">~{inventory.days_on_hand} days on hand</span>
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-semibold flex items-center justify-between">
                <span>Low Stock Alerts:</span>
                <span className="font-black px-2 py-0.5 bg-amber-200 text-amber-950 rounded-md">
                  {inventory.low_stock_count} Low ({inventory.out_of_stock_count} Out)
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Active Suppliers:</span>
                <span className="font-bold text-slate-800">{supplierSpending.length} Wholesalers</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* VIEW: SALES, REVENUE & MARGINS */}
      {(activeView === 'sales' || activeView === 'all') && (
        <div className="space-y-6">
          {activeView === 'all' && (
            <div className="border-t-2 border-slate-200 pt-6">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-700" />
                <span>Sales, Revenue & Margins Deep Dive</span>
              </h3>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sales Trajectory Area Chart (8 Cols) */}
            <div className="lg:col-span-8 min-w-0 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Gross Sales Trend</h3>
                  <p className="text-xs text-slate-400">Revenue timeline and sales momentum</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 block">Total Revenue</span>
                  <span className="text-sm font-black text-slate-900">{currency}{summary.total_revenue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="h-72 w-full min-h-[280px]">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSalesRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#007A3D" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#007A3D" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip
                        formatter={(val) => [`${currency}${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Revenue']}
                        labelFormatter={(label) => `Date/Hour: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#007A3D"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorSalesRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No sales recorded for this period.
                  </div>
                )}
              </div>
            </div>

            {/* Profitability & Discounts Breakdown (4 Cols) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Financial Performance</h3>
                <p className="text-xs text-slate-400">Margins, discounts & customer retention value</p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Gross Profit</span>
                  <div className="text-lg font-black text-blue-700">{currency}{summary.total_profit.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Calculated as (Sales − Product Unit Cost)</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Store Profit Margin</span>
                  <div className="text-lg font-black text-slate-900">{summary.profit_margin}%</div>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(summary.profit_margin, 100)}%` }} />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Customer Discounts Given</span>
                  <div className="text-lg font-black text-emerald-900">{currency}{summary.total_savings.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-emerald-700/90 mt-0.5">Promotions and MRP markdown value</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Average Basket Size:</span>
                <span className="font-black text-slate-800">{summary.avg_items_per_order} items/bill</span>
              </div>
            </div>

          </div>

          {/* Payment Method Breakdown Detailed */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Payment Collection Breakdown</h3>
                <p className="text-xs text-slate-400">Total volume and percentage share per payment channel</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {paymentMethods.map((pm, idx) => {
                const totalRev = summary.total_revenue || 1;
                const sharePercent = ((pm.total_amount / totalRev) * 100).toFixed(1);
                return (
                  <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-700 uppercase tracking-wide">{pm.payment_method}</span>
                      <span className="text-xs font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">{sharePercent}%</span>
                    </div>
                    <div className="text-xl font-black text-slate-900">{currency}{pm.total_amount.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-slate-500 font-medium">{pm.orders_count} transactions recorded</div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* VIEW: PEAK HOURS & BUSY DAYS */}
      {(activeView === 'peaks' || activeView === 'all') && (
        <div className="space-y-6">
          {activeView === 'all' && (
            <div className="border-t-2 border-slate-200 pt-6">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>Peak Hours & Footfall Velocity</span>
              </h3>
            </div>
          )}

          {/* Side-by-Side Peak Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Peak Hours Chart (6 Cols) */}
            <div className="lg:col-span-6 min-w-0 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <span>Hourly Sales & Footfall</span>
                  </h3>
                  <p className="text-xs text-slate-400">Customer rush pattern from 8:00 AM to 10:00 PM</p>
                </div>
                {peakHour && (
                  <span className="text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                    Rush Hour: {peakHour.label}
                  </span>
                )}
              </div>

              <div className="h-64 w-full min-h-[250px]">
                {hourlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip
                        formatter={(val, name, item) => [
                          `${currency}${Number(val).toLocaleString('en-IN')} (${item.payload.orders_count} bills)`,
                          'Sales'
                        ]}
                      />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {hourlyData.map((entry, index) => {
                          const isPeak = peakHour && entry.hour === peakHour.hour;
                          return <Cell key={`cell-hour-detail-${index}`} fill={isPeak ? '#F59E0B' : '#059669'} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No hourly sales recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Peak Days of Week Chart (6 Cols) */}
            <div className="lg:col-span-6 min-w-0 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-emerald-700" />
                    <span>Weekly Sales by Day</span>
                  </h3>
                  <p className="text-xs text-slate-400">Weekly customer rush across Monday to Sunday</p>
                </div>
                {peakDay && (
                  <span className="text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-md">
                    Top Day: {peakDay.day_name}
                  </span>
                )}
              </div>

              <div className="h-64 w-full min-h-[250px]">
                {dayOfWeekData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="day_short" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip
                        formatter={(val, name, item) => [
                          `${currency}${Number(val).toLocaleString('en-IN')} (${item.payload.orders_count} bills)`,
                          'Sales'
                        ]}
                      />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {dayOfWeekData.map((entry, index) => {
                          const isPeak = peakDay && entry.day_index === peakDay.day_index;
                          return <Cell key={`cell-dow-detail-${index}`} fill={isPeak ? '#F59E0B' : '#0284C7'} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No daily sales recorded yet.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Actionable Insights Cards (Staffing & Inventory Inward Schedule) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
                <Flame className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase">Cashier & Counter Staffing Advice</h4>
                <p className="text-xs text-amber-900/80 mt-1">
                  Peak customer traffic hits at <strong>{peakHour ? peakHour.label : 'evening hours'}</strong>. Keep both counter terminals active and barcode scanners ready during this rush window to prevent queue bottlenecks.
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800 shrink-0">
                <CalendarDays className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-900 uppercase">Wholesaler Inward Timing</h4>
                <p className="text-xs text-emerald-900/80 mt-1">
                  <strong>{peakDay ? peakDay.day_name : 'The weekend'}</strong> generates the largest share of weekly revenue. Schedule wholesaler purchase deliveries and shelf restocking 1 day prior to ensure complete shelf availability.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* VIEW: CATEGORIES & PRODUCT VELOCITY */}
      {(activeView === 'products' || activeView === 'all') && (
        <div className="space-y-6">
          {activeView === 'all' && (
            <div className="border-t-2 border-slate-200 pt-6">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-700" />
                <span>Department Sales & Product Velocity</span>
              </h3>
            </div>
          )}

          {/* Category Bar Chart & Distribution */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Category Revenue Comparison</h3>
                <p className="text-xs text-slate-400">Total sales and units sold breakdown by department</p>
              </div>
            </div>

            <div className="h-64 w-full min-h-[250px]">
              {categorySales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categorySales} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 9, fill: '#64748B' }}
                      angle={-20}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip
                      formatter={(val, name, item) => [
                        `${currency}${Number(val).toLocaleString('en-IN')} (${item.payload.units_sold} units, ${item.payload.percent}%)`,
                        'Sales'
                      ]}
                    />
                    <Bar dataKey="revenue" fill="#007A3D" radius={[6, 6, 0, 0]}>
                      {categorySales.map((entry, index) => (
                        <Cell key={`cell-cat-full-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No category sales recorded yet.
                </div>
              )}
            </div>

            {/* Department Quick Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              {categorySales.slice(0, 5).map((cat, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block truncate">{cat.category}</span>
                  <div className="text-base font-black text-slate-900">{currency}{cat.revenue.toLocaleString('en-IN')}</div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>{cat.units_sold} units</span>
                    <span className="text-emerald-700 bg-emerald-50 px-1 rounded">{cat.percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Side-by-Side: Best-Sellers vs Slow-Moving Dead Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Top Performing Fast Movers (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <span>🏆 Best-Selling Products (Fast Movers)</span>
                </h3>
                <span className="text-xs font-semibold text-slate-400">Ranked by revenue</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[11px] text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-2 text-center">Units</th>
                      <th className="py-2.5 px-3 text-right">Sales</th>
                      <th className="py-2.5 px-3 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topProducts.slice(0, 8).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900 truncate max-w-[200px]" title={p.product_name}>
                          <span className="text-slate-400 mr-1.5">#{idx + 1}</span>
                          {p.product_name}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-800">{p.total_qty}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">{currency}{p.total_sales.toFixed(0)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-700">{currency}{p.total_profit.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Slow-Selling / Dead Stock Alert (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Slow-Selling / Tied Capital</span>
                </h3>
                <span className="text-xs font-semibold text-slate-400">Low velocity</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[11px] text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-2 text-center">Sold</th>
                      <th className="py-2.5 px-3 text-right">Leftover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {slowProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900 truncate max-w-[160px]" title={p.name}>
                          {p.name}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-amber-800">
                          {p.units_sold} {p.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                          {p.stock} {p.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* VIEW: INVENTORY & SUPPLIER SPENDING */}
      {(activeView === 'inventory' || activeView === 'all') && (
        <div className="space-y-6">
          {activeView === 'all' && (
            <div className="border-t-2 border-slate-200 pt-6">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-700" />
                <span>Inventory Health & Wholesaler Inward</span>
              </h3>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Inventory Valuation & Turnover Metrics (5 Cols) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-700" />
                  <span>Inventory Valuation & Turnover</span>
                </h3>
                <p className="text-xs text-slate-400">Capital invested vs replenishment velocity</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Stock Valuation</span>
                  <span className="text-xl font-black text-slate-900">
                    {currency}{inventory.inventory_valuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{inventory.total_sku_count} registered SKUs</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Turnover Ratio</span>
                  <span className="text-xl font-black text-emerald-700">
                    {inventory.turnover_ratio}x
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Est. {inventory.days_on_hand} days on hand</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-semibold flex items-center justify-between">
                <span>Low Stock Reorder Alerts:</span>
                <span className="font-black px-2 py-0.5 bg-amber-200 text-amber-950 rounded-md">
                  {inventory.low_stock_count} Items Low ({inventory.out_of_stock_count} Out)
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium">
                <div className="flex justify-between items-center mb-1">
                  <span>Inventory In-Stock Rate</span>
                  <span className="font-bold text-slate-900">
                    {inventory.total_sku_count > 0 
                      ? `${(((inventory.total_sku_count - inventory.out_of_stock_count) / inventory.total_sku_count) * 100).toFixed(0)}%` 
                      : '100%'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{
                      width: `${inventory.total_sku_count > 0 ? (((inventory.total_sku_count - inventory.out_of_stock_count) / inventory.total_sku_count) * 100) : 100}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Wholesaler & Supplier Purchase Spending Table (7 Cols) */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span>Wholesaler Inward Deliveries & Spending</span>
                  </h3>
                  <p className="text-xs text-slate-400">Total inward purchase volume and payments by supplier</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[11px] text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Wholesaler / Vendor</th>
                      <th className="py-2.5 px-2 text-center">Deliveries</th>
                      <th className="py-2.5 px-3 text-center">Units Received</th>
                      <th className="py-2.5 px-3 text-right">Total Inward Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplierSpending.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {s.supplier}
                        </td>
                        <td className="py-2.5 px-2 text-center font-medium text-slate-700">
                          {s.delivery_count} inward
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {s.total_units_received} units
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                          {currency}{s.total_spent.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
