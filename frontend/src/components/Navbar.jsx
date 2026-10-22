import React, { useState, useEffect } from 'react';
import { ShoppingCart, FileText, Package, BarChart3, Settings, Store, Clock, Calendar } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, settings, onOpenSettings }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'pos', label: 'Billing Counter (POS)', icon: ShoppingCart },
    { id: 'orders', label: 'Saved Bills & Orders', icon: FileText },
    { id: 'inventory', label: 'Inventory & Stock', icon: Package },
    { id: 'analytics', label: 'Business Analytics', icon: BarChart3 },
  ];

  return (
    <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[88px] gap-4">
          {/* Left: Brand + Navigation links with clean, adjusted spacing */}
          <div className="flex items-center space-x-4 sm:space-x-6 min-w-0">
            {/* Clickable Logo & Store Info (Home Button) */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                onClick={() => setActiveTab('pos')}
                title="Go to POS Billing Home"
                className="bg-yellow-400 hover:bg-yellow-300 text-emerald-950 p-2.5 rounded-xl font-black text-2xl flex items-center justify-center shadow-md transition transform hover:scale-105 active:scale-95"
              >
                <Store className="w-7 h-7" />
              </button>
              <button
                onClick={() => setActiveTab('pos')}
                className="text-left group cursor-pointer focus:outline-none"
              >
                <span className="font-black text-xl sm:text-2xl 2xl:text-3xl tracking-tight text-white group-hover:text-yellow-300 transition">
                  {settings.store_name || 'VijayaLakshmi Minimart'}
                </span>
              </button>
            </div>

            {/* Navigation Links with balanced spacing */}
            <nav className="flex items-center space-x-2 flex-wrap">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all duration-150 ${
                      isActive
                        ? 'bg-emerald-950/90 text-yellow-300 shadow-inner ring-1 ring-yellow-400/40'
                        : 'text-emerald-100 hover:bg-emerald-700/70 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden md:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Time (Up) & Date (Down) + Settings */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="hidden sm:flex flex-col items-end justify-center bg-emerald-900/90 px-3.5 py-1.5 rounded-xl text-emerald-200 shadow-inner border border-emerald-700/50 leading-tight">
              {/* Time Up */}
              <div className="flex items-center space-x-1.5 font-mono font-black text-sm sm:text-base text-yellow-300">
                <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span>
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              {/* Date Down */}
              <div className="flex items-center space-x-1.5 font-mono text-xs sm:text-sm font-bold text-emerald-100 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                <span>
                  {time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            <button
              onClick={onOpenSettings}
              title="Store & UPI Settings"
              className="p-2.5 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
