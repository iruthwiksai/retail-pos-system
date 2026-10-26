import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
  Search,
  ArrowRight,
  Sparkles,
  Phone
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

export default function Analytics({ settings = {}, onGoToPos }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'rush', 'products', 'inventory', 'udhaar'
  const [period, setPeriod] = useState('week'); // 'today', 'week', 'month', 'all', 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [metricToggle, setMetricToggle] = useState('revenue'); // 'revenue', 'bills'
  const [udhaarSearch, setUdhaarSearch] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currency = settings.currency_symbol || '₹';
  const storeName = settings.store_name || 'Manidevi General Store';
  const upiId = settings.upi_id || '';

  // Compact currency formatter (e.g. ₹1.5k, ₹25k, ₹1.2L)
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
    const { summary, todayAtAGlance } = analyticsData;
    const rows = [
      ['Metric', 'Value'],
      ['Store Name', storeName],
      ['Report Period', analyticsData.periodLabel || period],
      ['Export Date', new Date().toLocaleString('en-IN')],
      ['Total Paid Revenue', `${summary.total_revenue}`],
      ['Total Gross Profit', `${summary.gross_profit}`],
      ['Profit Margin %', `${summary.profit_margin}%`],
      ['Total Bills', `${summary.total_orders}`],
      ['Average Order Value', `${summary.avg_order_value}`],
      ['Total Items Sold', `${summary.total_items_sold}`],
      ['Customer Savings Given', `${summary.total_savings}`],
      ['Today Revenue', `${todayAtAGlance.today_revenue}`],
      ['Today Bills', `${todayAtAGlance.today_orders}`],
      ['Today Cash', `${todayAtAGlance.today_cash}`],
      ['Today UPI', `${todayAtAGlance.today_upi}`],
      ['Today Udhaar', `${todayAtAGlance.today_udhaar_amount}`]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Store_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
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
    let msg = `Namaste ${cust.customer_name} ji,\nThis is a gentle reminder from *${storeName}*.\nYour outstanding Udhaar balance is *${currency}${cust.total_balance.toFixed(2)}* across ${cust.bills_count} bill(s).`;
    if (upiId) {
      msg += `\nYou can settle via UPI to: *${upiId}* or pay cash at the store counter.`;
    } else {
      msg += `\nKindly settle at your earliest convenience at our store counter.`;
    }
    msg += `\nThank you! 🙏`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // WhatsApp Purchase Order for Wholesale Distributors
  const sendSupplierPO = (group) => {
    let msg = `*--- PURCHASE ORDER ---*\n`;
    msg += `Store: *${storeName}*\n`;
    msg += `Date: ${new Date().toLocaleDateString('en-IN')}\n`;
    msg += `Distributor: *${group.supplier}*\n\n`;
    msg += `*Items Required:*\n`;
    group.items.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.name}*\n   Qty: *${item.suggested_qty} ${item.unit}* (Current stock: ${item.current_stock})\n`;
    });
    msg += `\nTotal Estimated: ~${currency}${group.total_estimated_cost.toLocaleString('en-IN')}\n`;
    msg += `Please confirm dispatch and expected delivery date. Thank you!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Extracted data with bulletproof defaults
  const summary = analyticsData?.summary || {
    total_orders: 0,
    total_revenue: 0,
    gross_profit: 0,
    profit_margin: 0,
    total_savings: 0,
    avg_order_value: 0,
    total_items_sold: 0,
    prev_revenue: null,
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
  const reorderList = analyticsData?.reorderList || [];
  const categorySales = analyticsData?.categorySales || [];
  const supplierSpending = analyticsData?.supplierSpending || [];
  const paymentMethods = analyticsData?.paymentMethods || [];
  const heatmap = analyticsData?.heatmap || { max_bills: 1, data: [] };
  const hourlyDistribution = analyticsData?.hourlyDistribution || [];
  const peakFootfallHour = analyticsData?.peakFootfallHour || null;
  const peakRevenueHour = analyticsData?.peakRevenueHour || null;
  const peakDay = analyticsData?.peakDay || null;

  // Filter Udhaar customers by search term
  const filteredUdhaarCustomers = useMemo(() => {
    if (!udhaarSearch.trim()) return udhaar.customers;
    const q = udhaarSearch.toLowerCase().trim();
    return udhaar.customers.filter(
      (c) =>
        (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
        (c.customer_phone && c.customer_phone.includes(q))
    );
  }, [udhaar.customers, udhaarSearch]);

  // Average revenue line calculation
  const avgPeriodSales = trendData.length > 0
    ? trendData.reduce((acc, t) => acc + (t.revenue || 0), 0) / trendData.length
    : 0;

  const hasSalesInPeriod = summary.total_orders > 0;

  return (
    <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-5">

      {/* 1. Header with Sticky Filter & Action Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <BarChart3 className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>Store Intelligence & Analytics</span>
                {today.today_orders > 0 ? (
                  <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Today: {today.today_orders} bills ({currency}{today.today_revenue.toLocaleString('en-IN')})
                  </span>
                ) : (
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                    Counter Ready
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Real-time sales velocity, profit margins, counter rush hours, and customer credit recovery
              </p>
            </div>
          </div>
        </div>

        {/* Time Window Filters & Export */}
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

          {/* Refresh Button */}
          <button
            onClick={() => fetchAnalytics()}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-xl transition shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
          </button>

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

      {/* 2. Top-Level Restructured Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto text-sm font-bold text-slate-600">
        {[
          { id: 'overview', label: '🌟 Store Pulse (Overview)', count: null },
          { id: 'rush', label: '⏰ Rush Hours & Staffing', count: peakFootfallHour?.orders_count ? `${peakFootfallHour.label} Peak` : null },
          { id: 'products', label: '🛍️ Categories & Fast Movers', count: null },
          { id: 'inventory', label: '📦 Inventory & Wholesaler Reorder', count: inventory.low_stock_count > 0 ? `${inventory.low_stock_count} Reorder` : null },
          { id: 'udhaar', label: '📒 Udhaar Khata (Credit Register)', count: udhaar.customers.length > 0 ? `${currency}${formatCompact(udhaar.total_outstanding)}` : null }
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

      {/* 3. Error Banner */}
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 h-28 flex flex-col justify-between">
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-7 bg-slate-200 rounded w-3/4" />
              <div className="h-2 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB CONTENT: OVERVIEW (STORE PULSE) */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'overview' && (
        <div className="space-y-6">

          {/* Real-time Today Counter Pulse Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md border border-emerald-700/50">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                  Live Billing Counter — Today ({new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})
                </div>
                <div className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                  <span>Sales: <span className="text-yellow-300">{currency}{today.today_revenue.toLocaleString('en-IN')}</span></span>
                  <span className="text-emerald-400 text-xs font-bold">({today.today_orders} bills billed)</span>
                  <span className="text-emerald-600 hidden sm:inline">•</span>
                  <span>Gross Profit: <span className="text-emerald-300">{currency}{today.today_gross_profit.toLocaleString('en-IN')}</span> ({today.today_margin}%)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs font-bold flex-wrap">
              <span className="bg-emerald-800/90 text-emerald-100 border border-emerald-600 px-3 py-1.5 rounded-xl shadow-xs">
                💵 Cash: <strong className="text-white">{currency}{today.today_cash.toLocaleString('en-IN')}</strong>
              </span>
              <span className="bg-blue-800/90 text-blue-100 border border-blue-600 px-3 py-1.5 rounded-xl shadow-xs">
                📱 UPI: <strong className="text-white">{currency}{today.today_upi.toLocaleString('en-IN')}</strong>
              </span>
              {today.today_udhaar_amount > 0 && (
                <span className="bg-amber-800/90 text-amber-100 border border-amber-600 px-3 py-1.5 rounded-xl shadow-xs">
                  📒 Udhaar: <strong className="text-white">{currency}{today.today_udhaar_amount.toLocaleString('en-IN')}</strong>
                </span>
              )}
            </div>
          </div>

          {/* 4 Hero KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Card 1: Revenue & Growth */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    {period === 'today' ? "Today's Sales" : `${analyticsData?.periodLabel || 'Period'} Sales`}
                  </span>
                  <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                    <DollarSign className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {currency}{(period === 'today' ? today.today_revenue : summary.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </div>
              </div>

              {trendData.length > 1 && (
                <div className="h-9 my-1.5 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <Area type="monotone" dataKey="revenue" stroke="#059669" fill="#d1fae5" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">{period === 'today' ? 'vs Yesterday' : 'vs Prev Period'}</span>
                {period === 'today' ? (
                  today.today_growth_percent !== null ? (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-black text-[11px] ${
                      today.today_growth_percent >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {today.today_growth_percent >= 0 ? '+' : ''}{today.today_growth_percent}%
                    </span>
                  ) : (
                    <span className="text-slate-400 font-semibold">Active Counter</span>
                  )
                ) : (
                  summary.growth_percent !== null ? (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-black text-[11px] ${
                      summary.growth_percent >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {summary.growth_percent >= 0 ? '+' : ''}{summary.growth_percent}%
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )
                )}
              </div>
            </div>

            {/* Card 2: Gross Profit & Margin */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Gross Profit</span>
                  <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
                  {currency}{(period === 'today' ? today.today_gross_profit : summary.gross_profit).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </div>
              </div>

              {trendData.length > 1 && (
                <div className="h-9 my-1.5 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">Profit Margin</span>
                <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded font-black text-[11px]">
                  {period === 'today' ? today.today_margin : summary.profit_margin}%
                </span>
              </div>
            </div>

            {/* Card 3: Orders & Avg Basket */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    {period === 'today' ? 'Bills Today' : 'Total Bills'}
                  </span>
                  <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                    <ShoppingBag className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {period === 'today' ? today.today_orders : summary.total_orders} <span className="text-xs font-bold text-slate-400">tickets</span>
                </div>
              </div>

              {trendData.length > 1 && (
                <div className="h-9 my-1.5 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <Area type="monotone" dataKey="orders_count" stroke="#7c3aed" fill="#ede9fe" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">Avg Basket</span>
                <span className="text-slate-800 font-black">
                  {currency}{period === 'today' ? (today.today_orders > 0 ? (today.today_revenue / today.today_orders).toFixed(0) : '0') : summary.avg_order_value} / bill
                </span>
              </div>
            </div>

            {/* Card 4: Udhaar Ledger & Collections */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider">Total Udhaar Due</span>
                  <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                    <BookOpen className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-900 mt-1">
                  {currency}{udhaar.total_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </div>
              </div>

              <div className="text-xs text-amber-800 font-semibold my-2">
                {udhaar.customers.length} customer accounts active
              </div>

              <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">Customer Savings</span>
                <span className="text-emerald-700 font-black">
                  {currency}{summary.total_savings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

          </div>

          {/* MAIN CHARTS SECTION: Core Revenue Trajectory (Left 8 cols) + Payment Channels (Right 4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left: Revenue & Profit Trajectory Chart */}
            <div className="lg:col-span-8 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-700" />
                    <span>Sales Revenue & Volume Trajectory</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Daily sales trajectory with store performance benchmarks
                  </p>
                </div>

                {/* Metric Selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700 self-start sm:self-auto">
                  <button
                    onClick={() => setMetricToggle('revenue')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      metricToggle === 'revenue'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Revenue ({currency})
                  </button>
                  <button
                    onClick={() => setMetricToggle('bills')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      metricToggle === 'bills'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Bills Count
                  </button>
                </div>
              </div>

              {/* Chart Body */}
              <div className="h-72 sm:h-80 w-full min-h-[250px]">
                {trendData.length > 0 && hasSalesInPeriod ? (
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
                          <Bar dataKey="revenue" name="Gross Sales" fill="#007A3D" radius={[6, 6, 0, 0]} />
                        </>
                      ) : (
                        <Bar dataKey="orders_count" name="Bills Billed" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <ShoppingBag className="w-10 h-10 text-slate-300 mb-2" />
                    <h4 className="font-bold text-sm text-slate-700">No sales recorded for this period</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      When you generate bills in the POS billing counter, daily revenue trends and volume will plot automatically here.
                    </p>
                    {onGoToPos && (
                      <button
                        onClick={onGoToPos}
                        className="mt-3 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
                      >
                        <span>Open POS Billing Counter</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Payment Method Split & Collections Donut */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>Payment Channels</span>
                </h3>
                <p className="text-xs text-slate-400">Cash drawer vs UPI QR vs Card share</p>
              </div>

              <div className="h-44 w-full flex items-center justify-center">
                {paymentMethods.length > 0 && hasSalesInPeriod ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethods}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
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
                  <div className="text-center text-slate-400 text-xs py-8">
                    No payment collections recorded yet.
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-bold">
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((pm) => (
                    <div key={pm.payment_method} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pm.color }} />
                        <span className="text-slate-700">{pm.payment_method}</span>
                      </div>
                      <span className="text-slate-900 font-black">{currency}{pm.total_amount.toLocaleString('en-IN')} ({pm.percent}%)</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-slate-400 text-center">
                    Collections will display automatically once bills are paid.
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-semibold flex items-center justify-between">
                <span>Counter Reconciled:</span>
                <span className="text-emerald-700 font-black">100% Verified</span>
              </div>
            </div>

          </div>

          {/* Quick Snapshot Row: Best Selling Fast Movers & Low Stock Alert */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Top Best-Selling Fast Movers */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <span>🏆 Best-Selling Fast Movers</span>
                </h3>
                <button
                  onClick={() => setActiveTab('products')}
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center"
                >
                  <span>View All Products</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {topProducts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <ShoppingBag className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
                    <p className="font-bold text-xs text-slate-600">No products billed in this time window</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Completed bills at the POS counter will rank fast-movers here</p>
                  </div>
                ) : (
                  topProducts.slice(0, 4).map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-emerald-800 text-yellow-300 text-xs font-black flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{p.product_name}</h4>
                          <span className="text-[10px] text-slate-400">{p.category} • {p.total_qty} units sold</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-slate-900 text-xs sm:text-sm">{currency}{p.total_sales.toFixed(0)}</div>
                        <div className="text-[11px] font-bold text-emerald-700">+{currency}{p.total_profit.toFixed(0)} profit</div>
                      </div>
                    </div>
                  ))
                )}
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
                <span className="text-slate-500 font-semibold">Total Stock Capital:</span>
                <span className="font-black text-slate-900">{currency}{inventory.inventory_valuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>

              <button
                onClick={() => setActiveTab('inventory')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition"
              >
                <span>Open Wholesaler Reorder Assistant</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB CONTENT: RUSH HOURS & STAFFING HEATMAP */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'rush' && (
        <div className="space-y-6">

          {/* Operational Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Busiest Rush Hour</span>
              <div className="text-xl font-black text-amber-950">
                {peakFootfallHour?.orders_count > 0 ? `${peakFootfallHour.label}` : '7:00 PM – 9:00 PM'}
              </div>
              <span className="text-[11px] text-amber-800 font-bold">
                {peakFootfallHour?.orders_count > 0 ? `${peakFootfallHour.orders_count} customer bills` : 'Typical evening rush'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Peak Sales Revenue Hour</span>
              <div className="text-xl font-black text-emerald-800">
                {peakRevenueHour?.revenue > 0 ? `${peakRevenueHour.label}` : '8:00 PM'}
              </div>
              <span className="text-[11px] text-emerald-700 font-bold">
                {peakRevenueHour?.revenue > 0 ? `${currency}${peakRevenueHour.revenue.toLocaleString('en-IN')} peak turnover` : 'Highest basket turnover'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Busiest Shopping Day</span>
              <div className="text-xl font-black text-blue-900">
                {peakDay?.orders_count > 0 ? `${peakDay.day_name}` : 'Saturday / Sunday'}
              </div>
              <span className="text-[11px] text-blue-700 font-bold">
                {peakDay?.orders_count > 0 ? `${peakDay.orders_count} bills completed` : 'Weekend grocery rush'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Staffing Recommendation</span>
              <div className="text-xl font-black text-slate-900">
                2 Cashiers Needed
              </div>
              <span className="text-[11px] text-slate-500 font-bold">
                During 8-11 AM & 6-9 PM slots
              </span>
            </div>

          </div>

          {/* Customer Footfall Heatmap (Day × Hour) */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <Flame className="w-4 h-4 text-orange-600 fill-orange-500" />
                  <span>Customer Footfall Heatmap (Day × Hour Matrix)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Darker cells represent rush hours with highest completed bills — staff counters accordingly
                </p>
              </div>

              {peakFootfallHour && peakFootfallHour.orders_count > 0 && (
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
                <div
                  style={{ display: 'grid', gridTemplateColumns: '44px repeat(16, minmax(0, 1fr))', gap: '4px' }}
                  className="text-[10px] font-bold text-slate-400 text-center mb-1.5"
                >
                  <div className="text-left font-black text-slate-500">Day</div>
                  {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => (
                    <div key={h} className="text-center">{h % 12 === 0 ? 12 : h % 12}{h >= 12 ? 'p' : 'a'}</div>
                  ))}
                </div>

                {/* Rows for Mon through Sun */}
                <div className="space-y-1">
                  {heatmap.data.map((row) => (
                    <div
                      key={row.day_index}
                      style={{ display: 'grid', gridTemplateColumns: '44px repeat(16, minmax(0, 1fr))', gap: '4px' }}
                      className="items-center"
                    >
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

          {/* Hourly Distribution Footfall Chart */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                Hourly Customer Volume (7:00 AM – 10:00 PM)
              </h3>
              <p className="text-xs text-slate-400">
                Number of completed billing tickets across hours of the day
              </p>
            </div>

            <div className="h-64 w-full min-h-[220px]">
              {hourlyDistribution.length > 0 && hasSalesInPeriod ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyDistribution} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip
                      formatter={(val, name, item) => [
                        `${val} bills (${currency}${item.payload.revenue.toLocaleString('en-IN')})`,
                        'Footfall'
                      ]}
                    />
                    <Bar dataKey="orders_count" fill="#007A3D" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No hourly footfall data recorded for this period yet.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB CONTENT: PRODUCTS & CATEGORIES */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'products' && (
        <div className="space-y-6">

          {/* Categories: Horizontal Bar Chart Sorted by Revenue with Margin % */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Category Performance & Margin Contribution</h3>
              <p className="text-xs text-slate-400">Horizontal bars sorted by revenue with Gross Margin % directly labeled</p>
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
            
            {/* Top Best Sellers */}
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
                    {topProducts.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-400">No product sales yet.</td>
                      </tr>
                    ) : (
                      topProducts.slice(0, 8).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-bold text-slate-900 truncate max-w-[180px]" title={p.product_name}>
                            <span className="text-slate-400 mr-1.5">#{idx + 1}</span>
                            {p.product_name}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-800">{p.total_qty}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">{currency}{p.total_sales.toFixed(0)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-700">+{currency}{p.total_profit.toFixed(0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actionable Slow Movers Table */}
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
                    {slowProducts.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-400">No inventory products registered.</td>
                      </tr>
                    ) : (
                      slowProducts.map((p, idx) => (
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TAB CONTENT: INVENTORY & WHOLESALER REORDER */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'inventory' && (
        <div className="space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Working Capital & Turnover */}
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
                    {supplierSpending.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-400">No inward supplier records found.</td>
                      </tr>
                    ) : (
                      supplierSpending.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{s.supplier}</td>
                          <td className="py-2.5 px-2 text-center font-medium text-slate-700">{s.delivery_count}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-800">{s.total_units_received}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-800">{currency}{s.total_spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Actionable Wholesaler Reorder Assistant (Grouped with 1-Click WhatsApp PO) */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Wholesaler Purchase Order Assistant (1-Click Reorder)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Automatically groups depleted products by distributor and calculates suggested restocking orders
                </p>
              </div>
            </div>

            {reorderList.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-200 text-emerald-900">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
                <h4 className="font-bold text-sm">All SKUs Well Stocked!</h4>
                <p className="text-xs text-emerald-700 mt-0.5">No products currently below minimum replenishment thresholds.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reorderList.map((group, gIdx) => (
                  <div key={gIdx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">{group.supplier}</h4>
                          <span className="text-[11px] text-slate-500">{group.items.length} items to reorder</span>
                        </div>
                        <span className="font-black text-emerald-800 text-sm bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300">
                          Est: ~{currency}{group.total_estimated_cost.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="space-y-1.5 mt-2.5 max-h-48 overflow-y-auto pr-1">
                        {group.items.map((item) => (
                          <div key={item.id} className="text-xs flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                            <div className="truncate mr-2">
                              <span className="font-bold text-slate-800">{item.name}</span>
                              <span className="text-[10px] text-rose-600 block">Stock: {item.current_stock} {item.unit} (Min: {item.low_stock_threshold})</span>
                            </div>
                            <span className="font-bold text-slate-900 shrink-0 bg-slate-100 px-2 py-0.5 rounded">
                              Order: {item.suggested_qty} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => sendSupplierPO(group)}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send PO to {group.supplier} via WhatsApp</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. TAB CONTENT: UDHAAR KHATA (CUSTOMER CREDIT REGISTER) */}
      {/* ========================================================================= */}
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
              <span className="text-[10px] text-emerald-700 font-semibold">Normal billing cycle</span>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-800">Due (8 – 30 Days)</span>
              <div className="text-2xl font-black text-amber-900">{currency}{udhaar.aging_8_30.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-amber-700 font-semibold">Payment reminder suggested</span>
            </div>

            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-800">Overdue (30+ Days)</span>
              <div className="text-2xl font-black text-rose-900">{currency}{udhaar.aging_30_plus.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-rose-700 font-semibold">Follow-up needed</span>
            </div>

          </div>

          {/* Customer Credit Accounts Table with Search & 1-Tap WhatsApp Reminder */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Customer Udhaar Ledger & 1-Tap WhatsApp Reminders
                </h3>
                <p className="text-xs text-slate-400">
                  Send polite payment reminders directly to customer mobile numbers
                </p>
              </div>

              {/* Customer Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customer name or phone..."
                  value={udhaarSearch}
                  onChange={(e) => setUdhaarSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
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
                  {filteredUdhaarCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                        {udhaarSearch ? 'No customer matches your search.' : '🎉 All customer credit accounts are clear! No pending Udhaar bills.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUdhaarCustomers.map((c, idx) => (
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
