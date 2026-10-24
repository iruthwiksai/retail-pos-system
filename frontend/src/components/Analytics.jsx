import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  Calendar,
  Download,
  CreditCard,
  RefreshCw,
  Clock,
  Flame,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Building2,
  Package,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Share2,
  BookOpen,
  Send,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ReferenceLine
} from 'recharts';

export default function Analytics({ settings = {} }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'sales', 'products', 'inventory', 'udhaar'
  const [period, setPeriod] = useState('week'); // 'today', 'week', 'month', 'all', 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [metricToggle, setMetricToggle] = useState('revenue'); // 'revenue', 'profit', 'bills'
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currency = settings.currency_symbol || '₹';
  const storeName = settings.store_name || 'VijayaLakshmi Minimart';

  // Compact currency formatter (e.g. ₹1.5k, ₹25k)
  const formatCompact = (val) => {
    const num = Number(val) || 0;
    if (Math.abs(num) >= 100000) return `${currency}${(num / 100000).toFixed(1)}L`;
    if (Math.abs(num) >= 1000) return `${currency}${(num / 1000).toFixed(1)}k`;
    return `${currency}${num.toFixed(0)}`;
  };

  const fetchAnalytics = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/analytics?period=${period}`;
      if (period === 'custom' && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      const res = await fetch(url, { signal });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setAnalyticsData(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching analytics:', err);
        setError(err.message || 'Failed to load business analytics.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchAnalytics(controller.signal);
    return () => controller.abort();
  }, [period, customStart, customEnd]);

  // Export CSV summary
  const exportSummaryCSV = () => {
    if (!analyticsData) return;
    const s = analyticsData.summary || {};
    const inv = analyticsData.inventory || {};
    const t = analyticsData.todayAtAGlance || {};
    const u = analyticsData.udhaar || {};

    const rows = [
      ['Report', 'VijayaLakshmi Minimart Business Analytics'],
      ['Generated At', new Date().toLocaleString('en-IN')],
      ['Selected Period', period],
      [],
      ['--- TODAY AT A GLANCE ---'],
      ['Today Sales', t.today_revenue || 0],
      ['Yesterday Sales', t.yesterday_revenue || 0],
      ['Today Bills', t.today_orders || 0],
      ['Today Gross Profit', t.today_gross_profit || 0],
      ['Today Cash Collected', t.today_cash || 0],
      ['Today UPI Collected', t.today_upi || 0],
      ['Today Udhaar Given', t.today_udhaar_amount || 0],
      [],
      ['--- PERIOD PERFORMANCE ---'],
      ['Period Gross Sales', s.total_revenue || 0],
      ['Period Gross Profit', s.gross_profit || 0],
      ['Gross Profit Margin %', `${s.profit_margin || 0}%`],
      ['Total Paid Bills', s.total_orders || 0],
      ['Average Bill Value', s.avg_order_value || 0],
      ['Total Customer MRP Savings', s.total_savings || 0],
      [],
      ['--- INVENTORY & UDHAAR ---'],
      ['Inventory Valuation', inv.inventory_valuation || 0],
      ['Inventory Turnover Ratio', `${inv.turnover_ratio || 0}x`],
      ['Total Outstanding Udhaar', u.total_outstanding || 0],
      ['Udhaar Due (8-30 Days)', u.aging_8_30 || 0],
      ['Udhaar Overdue (30+ Days)', u.aging_30_plus || 0]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `store_analytics_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp reminder for Udhaar customers
  const sendWhatsAppReminder = (cust) => {
    if (!cust.customer_phone) {
      alert(`No phone number available for ${cust.customer_name}`);
      return;
    }
    const cleanPhone = cust.customer_phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Namaste ${cust.customer_name} ji,\nThis is a gentle reminder from *${storeName}*.\nYour outstanding Udhaar balance is *${currency}${cust.total_balance.toFixed(2)}* across ${cust.bills_count} bill(s).\nKindly settle at your earliest convenience via UPI or cash at the counter. Thank you!`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const summary = analyticsData?.summary || {
    total_orders: 0,
    total_revenue: 0,
    gross_profit: 0,
    profit_margin: 0,
    total_savings: 0,
    avg_order_value: 0,
    growth_percent: null,
    avg_items_per_order: 0
  };

  const today = analyticsData?.todayAtAGlance || {
    today_revenue: 0,
    yesterday_revenue: 0,
    today_growth_percent: null,
    today_orders: 0,
    today_gross_profit: 0,
    today_margin: 0,
    today_cash: 0,
    today_upi: 0,
    today_udhaar_amount: 0,
    today_udhaar_count: 0
  };

  const udhaar = analyticsData?.udhaar || {
    total_outstanding: 0,
    aging_0_7: 0,
    aging_8_30: 0,
    aging_30_plus: 0,
    customers: []
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
  const heatmap = analyticsData?.heatmap || { max_bills: 1, data: [] };
  const peakFootfallHour = analyticsData?.peakFootfallHour || null;
  const peakRevenueHour = analyticsData?.peakRevenueHour || null;

  // Calculate average daily revenue for reference line
  const avgPeriodSales = trendData.length > 0
    ? trendData.reduce((acc, t) => acc + (t.revenue || 0), 0) / trendData.length
    : 0;

  return (
    <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-5">

      {/* 1. Header with Sticky Filter & Tab Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <BarChart3 className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>Business Intelligence & Analytics</span>
                {today.today_orders > 0 && (
                  <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                    Live Today: {today.today_orders} bills
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Real-time sales, gross profit, counter rush heatmap, and customer credit recovery
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Period Filters & Custom Date Range */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Period Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  period === p.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs if custom selected */}
          {period === 'custom' && (
            <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-300 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold"
              />
            </div>
          )}

          {/* Export CSV */}
          <button
            onClick={exportSummaryCSV}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold py-2 px-3 rounded-xl flex items-center space-x-1.5 shadow-2xs transition shrink-0"
            title="Download CSV Summary"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top-Level Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto text-sm font-bold text-slate-600">
        {[
          { id: 'overview', label: '🌟 Overview (Today at a Glance)', count: null },
          { id: 'sales', label: '📈 Sales & Revenue Combo', count: null },
          { id: 'products', label: '🛍️ Categories & Product Velocity', count: null },
          { id: 'inventory', label: '📦 Inventory & Wholesalers', count: inventory.low_stock_count > 0 ? `${inventory.low_stock_count} Low` : null },
          { id: 'udhaar', label: '📒 Udhaar (Customer Credit)', count: udhaar.customers.length > 0 ? `${currency}${formatCompact(udhaar.total_outstanding)}` : null }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-xs font-black'
                  : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-yellow-300 text-emerald-950' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Error Banner with Retry Button */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between text-red-800 text-xs sm:text-sm font-bold shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchAnalytics()}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black shadow-xs transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Skeleton Loader */}
      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 h-28 flex flex-col justify-between">
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-7 bg-slate-200 rounded w-3/4" />
              <div className="h-2 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* 5. TAB CONTENT: OVERVIEW (TODAY AT A GLANCE) */}
      {!loading && activeTab === 'overview' && (
        <div className="space-y-6">

          {/* 5 Big Questions Every Shopkeeper Asks Every Morning/Evening */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            
            {/* Card 1: Today's Sales vs Yesterday */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Today's Sales</span>
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {currency}{today.today_revenue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">vs Yesterday</span>
                {today.today_growth_percent !== null ? (
                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded font-black text-[11px] ${
                    today.today_growth_percent >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {today.today_growth_percent >= 0 ? '+' : ''}{today.today_growth_percent}%
                  </span>
                ) : (
                  <span className="text-slate-400">First Day</span>
                )}
              </div>
            </div>

            {/* Card 2: Bills Completed Today */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Bills Billed</span>
                <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                  <ShoppingBag className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {today.today_orders} <span className="text-xs font-bold text-slate-400">tickets</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">Avg Basket</span>
                <span className="text-slate-700 font-black">
                  {currency}{today.today_orders > 0 ? (today.today_revenue / today.today_orders).toFixed(0) : '0'} / bill
                </span>
              </div>
            </div>

            {/* Card 3: Gross Profit & Margin */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Gross Profit</span>
                <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-2">
                {currency}{today.today_gross_profit.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">Gross Margin</span>
                <span className="text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded font-black text-[11px]">
                  {today.today_margin}%
                </span>
              </div>
            </div>

            {/* Card 4: Cash vs UPI Received Today */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Collected Today</span>
                <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-1 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-blue-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600" /> UPI QR:
                  </span>
                  <span className="font-black text-slate-900">{currency}{today.today_upi.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" /> Cash:
                  </span>
                  <span className="font-black text-slate-900">{currency}{today.today_cash.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="mt-2 pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-semibold text-right">
                Real-time cash in counter
              </div>
            </div>

            {/* Card 5: Udhaar Given Today */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider">Udhaar Given</span>
                <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                  <BookOpen className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-900 mt-2">
                {currency}{today.today_udhaar_amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">Total Unpaid</span>
                <span className="text-amber-800 font-black">
                  {currency}{formatCompact(udhaar.total_outstanding)}
                </span>
              </div>
            </div>

          </div>

          {/* DAY × HOUR HEATMAP (Replaces separate peak charts and answers: "When should I have two people at the counter?") */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <Flame className="w-4 h-4 text-orange-600 fill-orange-500" />
                  <span>Customer Footfall Heatmap (Day × Hour)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Darker cells represent rush hours with highest completed bills — staff counter accordingly
                </p>
              </div>

              {peakFootfallHour && (
                <div className="flex items-center space-x-2 text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1 rounded-xl">
                  <span>Busiest Footfall Hour:</span>
                  <strong className="font-black text-amber-950">{peakFootfallHour.label} ({peakFootfallHour.orders_count} bills)</strong>
                </div>
              )}
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[700px]">
                {/* Header row with hours */}
                <div className="grid grid-cols-17 gap-1 text-[10px] font-bold text-slate-400 text-center mb-1">
                  <div className="text-left font-black text-slate-500">Day</div>
                  {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => (
                    <div key={h}>{h % 12 === 0 ? 12 : h % 12}{h >= 12 ? 'p' : 'a'}</div>
                  ))}
                </div>

                {/* Rows for Mon through Sun */}
                <div className="space-y-1">
                  {heatmap.data.map((row) => (
                    <div key={row.day_index} className="grid grid-cols-17 gap-1 items-center">
                      <div className="text-xs font-black text-slate-700 text-left">{row.day_short}</div>
                      {row.hours.map((cell) => {
                        const intensity = heatmap.max_bills > 0 ? (cell.bills_count / heatmap.max_bills) : 0;
                        let bgClass = 'bg-slate-50 text-slate-300 border-slate-100';
                        if (cell.bills_count > 0) {
                          if (intensity > 0.75) bgClass = 'bg-amber-500 text-white font-black border-amber-600 shadow-xs';
                          else if (intensity > 0.45) bgClass = 'bg-emerald-600 text-white font-bold border-emerald-700';
                          else if (intensity > 0.2) bgClass = 'bg-emerald-300 text-emerald-950 font-semibold border-emerald-400';
                          else bgClass = 'bg-emerald-100 text-emerald-900 border-emerald-200';
                        }
                        return (
                          <div
                            key={cell.hour}
                            title={`${row.day_name} at ${cell.label}: ${cell.bills_count} bills (${currency}${cell.revenue})`}
                            className={`h-7 rounded-md border flex items-center justify-center text-[10px] transition cursor-pointer hover:scale-110 hover:z-10 ${bgClass}`}
                          >
                            {cell.bills_count > 0 ? cell.bills_count : ''}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Heatmap Legend */}
                <div className="flex items-center justify-end space-x-2 text-[10px] text-slate-500 font-bold pt-3">
                  <span>Less Rush</span>
                  <span className="w-3.5 h-3.5 rounded bg-slate-50 border border-slate-200" />
                  <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-200" />
                  <span className="w-3.5 h-3.5 rounded bg-emerald-300 border border-emerald-400" />
                  <span className="w-3.5 h-3.5 rounded bg-emerald-600" />
                  <span className="w-3.5 h-3.5 rounded bg-amber-500" />
                  <span>Peak Rush</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Snapshot Row: Top 3 Fast Movers + Low Stock Reorder Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Top 3 Fast Movers */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">🏆 Best-Selling Fast Movers</h3>
                <button onClick={() => setActiveTab('products')} className="text-xs font-bold text-emerald-700 hover:underline flex items-center">
                  <span>View All Products</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {topProducts.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-emerald-800 text-yellow-300 text-xs font-black flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{p.product_name}</h4>
                        <span className="text-[10px] text-slate-400">{p.category}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-slate-900 text-xs sm:text-sm">{currency}{p.total_sales.toFixed(0)}</div>
                      <div className="text-[11px] font-bold text-emerald-700">+{currency}{p.total_profit.toFixed(0)} gross profit</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actionable Store Alert: Low Stock & Reorder */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Immediate Stock Attention</span>
                </h3>
                <p className="text-xs text-slate-400">Items below minimum shelf replenishment threshold</p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>Low Stock Items:</span>
                  <span className="font-black px-2 py-0.5 bg-amber-200 text-amber-950 rounded-md">
                    {inventory.low_stock_count} SKUs
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                  <span>Completely Out of Stock:</span>
                  <span className="font-black px-2 py-0.5 bg-rose-200 text-rose-950 rounded-md">
                    {inventory.out_of_stock_count} SKUs
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Stock Valuation:</span>
                <span className="font-black text-slate-900">{currency}{inventory.inventory_valuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 6. TAB CONTENT: SALES & REVENUE COMBO */}
      {!loading && activeTab === 'sales' && (
        <div className="space-y-6">

          {/* Revenue Combo Chart: Daily Bars for Revenue + Line for Profit + Average Reference Line */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Daily Revenue & Gross Profit Trajectory
                </h3>
                <p className="text-xs text-slate-400">
                  Bars show gross daily sales; line shows gross store profit earned
                </p>
              </div>

              {/* Toggle for Metric */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700 self-start sm:self-auto">
                {[
                  { id: 'revenue', label: 'Revenue + Profit' },
                  { id: 'bills', label: 'Completed Bills' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMetricToggle(m.id)}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      metricToggle === m.id
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Container */}
            <div className="h-72 sm:h-80 w-full min-h-[240px]">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      tickFormatter={(val) => metricToggle === 'bills' ? val : formatCompact(val)}
                    />
                    <Tooltip
                      formatter={(val, name) => [
                        name === 'Bills Billed' ? `${val} bills` : `${currency}${Number(val).toLocaleString('en-IN')}`,
                        name
                      ]}
                    />
                    {metricToggle === 'revenue' ? (
                      <>
                        <ReferenceLine
                          y={avgPeriodSales}
                          stroke="#F59E0B"
                          strokeDasharray="4 4"
                          label={{ value: `Avg: ${formatCompact(avgPeriodSales)}`, fill: '#D97706', fontSize: 10, position: 'right' }}
                        />
                        <Bar dataKey="revenue" name="Gross Sales" fill="#059669" radius={[6, 6, 0, 0]} />
                      </>
                    ) : (
                      <Bar dataKey="orders_count" name="Bills Billed" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No sales recorded yet for this period.
                </div>
              )}
            </div>
          </div>

          {/* Payment Methods Breakdown with Fixed Colors */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Payment Channels</h3>
                <p className="text-xs text-slate-400">Fixed color distribution of payment collections</p>
              </div>

              <div className="h-48 w-full flex items-center justify-center">
                {paymentMethods.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethods}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="total_amount"
                        nameKey="payment_method"
                      >
                        {paymentMethods.map((entry, index) => (
                          <Cell key={`cell-pm-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => [`${currency}${Number(val).toLocaleString('en-IN')}`, 'Sales']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-400 text-xs">No payment records yet.</div>
                )}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                {paymentMethods.map((pm) => (
                  <div key={pm.payment_method} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pm.color }} />
                      <span className="font-bold text-slate-700">{pm.payment_method}</span>
                    </div>
                    <span className="font-black text-slate-900">{currency}{pm.total_amount.toLocaleString('en-IN')} ({pm.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Summary Table */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Period Financial Highlights</h3>
                <p className="text-xs text-slate-400">Total net revenue, discounts given, and basket sizes</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Gross Sales</span>
                  <div className="text-xl font-black text-slate-900">{currency}{summary.total_revenue.toLocaleString('en-IN')}</div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{summary.total_orders} Completed Orders</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Gross Profit</span>
                  <div className="text-xl font-black text-blue-700">{currency}{summary.gross_profit.toLocaleString('en-IN')}</div>
                  <span className="text-[10px] text-blue-800 font-bold block mt-0.5">{summary.profit_margin}% margin</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Avg Bill Value</span>
                  <div className="text-xl font-black text-slate-900">{currency}{summary.avg_order_value.toLocaleString('en-IN')}</div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Average customer spend</span>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-black uppercase text-emerald-800 block">Customer MRP Savings</span>
                  <div className="text-xl font-black text-emerald-900">{currency}{summary.total_savings.toLocaleString('en-IN')}</div>
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Total MRP discounts provided</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 7. TAB CONTENT: PRODUCTS & CATEGORIES */}
      {!loading && activeTab === 'products' && (
        <div className="space-y-6">

          {/* Categories: Single Main Hue Horizontal Bar Chart Sorted by Revenue with Margin % Label */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Category Performance</h3>
                <p className="text-xs text-slate-400">Horizontal bars sorted by revenue with Gross Margin % directly labeled</p>
              </div>
            </div>

            <div className="h-72 w-full min-h-[260px]">
              {categorySales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categorySales}
                    layout="vertical"
                    margin={{ top: 5, right: 60, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" tickFormatter={formatCompact} tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 700 }}
                      width={130}
                    />
                    <Tooltip
                      formatter={(val, name, item) => [
                        `${currency}${Number(val).toLocaleString('en-IN')} (${item.payload.units_sold} units, ${item.payload.margin_percent}% margin)`,
                        'Sales'
                      ]}
                    />
                    <Bar dataKey="revenue" fill="#007A3D" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No category sales recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Top Sellers vs Slow Movers Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Top 8 Best Sellers */}
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">🏆 Best-Selling Products</h3>
                <span className="text-xs text-slate-400 font-semibold">Ranked by revenue</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase font-black text-[10px] text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-2 text-center">Units</th>
                      <th className="py-2.5 px-3 text-right">Revenue</th>
                      <th className="py-2.5 px-3 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topProducts.slice(0, 8).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900 truncate max-w-[180px]" title={p.product_name}>
                          <span className="text-slate-400 mr-1.5">#{idx + 1}</span>
                          {p.product_name}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-800">{p.total_qty}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">{currency}{p.total_sales.toFixed(0)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-700">+{currency}{p.total_profit.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actionable Slow Movers Table with Days of Stock Left & Reorder Alert */}
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Slow Movers & Tied Capital</span>
                  </h3>
                  <p className="text-xs text-slate-400">Products with lowest velocity and leftover shelf inventory</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase font-black text-[10px] text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-2 text-center">Sold</th>
                      <th className="py-2.5 px-2 text-center">Leftover</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {slowProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900 truncate max-w-[160px]" title={p.name}>
                          {p.name}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-amber-900">{p.units_sold} {p.unit}</td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-800">{p.stock} {p.unit}</td>
                        <td className="py-2.5 px-3 text-right">
                          {p.needs_reorder ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                              Reorder Low
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-semibold">
                              ~{p.days_of_stock}d stock
                            </span>
                          )}
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

      {/* 8. TAB CONTENT: INVENTORY & WHOLESALERS */}
      {!loading && activeTab === 'inventory' && (
        <div className="space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Inventory Valuation & Turnover Metrics */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-700" />
                  <span>Working Capital & Turnover</span>
                </h3>
                <p className="text-xs text-slate-400">Total invested inventory capital vs sales replenishment velocity</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">Total Stock Valuation</span>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {currency}{inventory.inventory_valuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{inventory.total_sku_count} registered SKUs</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">Turnover Ratio</span>
                  <div className="text-xl font-black text-emerald-700 mt-1">
                    {inventory.turnover_ratio}x
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">~{inventory.days_on_hand} days on hand</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-semibold flex items-center justify-between">
                <span>Low Stock Reorder Alerts:</span>
                <span className="font-black px-2 py-0.5 bg-amber-200 text-amber-950 rounded-md">
                  {inventory.low_stock_count} Low ({inventory.out_of_stock_count} Out)
                </span>
              </div>
            </div>

            {/* Wholesaler & Supplier Deliveries Table */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4 overflow-hidden">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span>Wholesaler Inward Deliveries & Spending</span>
                </h3>
                <p className="text-xs text-slate-400">Total inward purchase volume and payments by supplier</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase font-black text-[10px] text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Supplier / Wholesaler</th>
                      <th className="py-2.5 px-2 text-center">Deliveries</th>
                      <th className="py-2.5 px-2 text-center">Units Received</th>
                      <th className="py-2.5 px-3 text-right">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplierSpending.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{s.supplier}</td>
                        <td className="py-2.5 px-2 text-center font-medium text-slate-700">{s.delivery_count}</td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-800">{s.total_units_received}</td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-800">{currency}{s.total_spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 9. TAB CONTENT: UDHAAR (CUSTOMER CREDIT MANAGEMENT) */}
      {!loading && activeTab === 'udhaar' && (
        <div className="space-y-6">

          {/* Aging Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Total Outstanding</span>
              <div className="text-2xl font-black text-slate-900">{currency}{udhaar.total_outstanding.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-slate-400">{udhaar.customers.length} customer accounts</span>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-800">Recent (0 – 7 Days)</span>
              <div className="text-2xl font-black text-emerald-900">{currency}{udhaar.aging_0_7.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-emerald-700">Normal billing cycle</span>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-800">Due (8 – 30 Days)</span>
              <div className="text-2xl font-black text-amber-900">{currency}{udhaar.aging_8_30.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-amber-700">Payment reminder recommended</span>
            </div>

            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-800">Overdue (30+ Days)</span>
              <div className="text-2xl font-black text-rose-900">{currency}{udhaar.aging_30_plus.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-rose-700">Requires follow-up</span>
            </div>

          </div>

          {/* Customer Credit Accounts Table with 1-Tap WhatsApp Reminder */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Customer Udhaar Ledger & 1-Tap WhatsApp Reminders
                </h3>
                <p className="text-xs text-slate-400">
                  Send polite payment reminders directly to customer mobile numbers
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase font-black text-[10px] text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3 text-center">Unpaid Bills</th>
                    <th className="py-3 px-3 text-center">Max Age</th>
                    <th className="py-3 px-4 text-right">Balance Owed</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {udhaar.customers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                        🎉 All customer credit accounts are clear! No pending Udhaar bills.
                      </td>
                    </tr>
                  ) : (
                    udhaar.customers.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {c.customer_name}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {c.customer_phone || '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          {c.bills_count} bills
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            c.max_age_days > 30
                              ? 'bg-rose-100 text-rose-800'
                              : (c.max_age_days > 7 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                          }`}>
                            {c.max_age_days} days
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-amber-950 text-sm">
                          {currency}{c.total_balance.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {c.customer_phone ? (
                            <button
                              onClick={() => sendWhatsAppReminder(c)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center space-x-1 mx-auto shadow-2xs transition"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>WhatsApp Reminder</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No phone saved</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
