import React, { useState, useEffect } from 'react';
import { ShoppingCart, FileText, Package, BarChart3, Settings, Store, Clock, Calendar } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, settings, onOpenSettings }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'pos', label: 'POS Billing', icon: ShoppingCart },
    { id: 'orders', label: 'Saved Bills', icon: FileText },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[76px] sm:h-[84px] gap-2 sm:gap-4">
          {/* Left: Brand + Navigation links with nowrap layout */}
          <div className="flex items-center space-x-2 sm:space-x-5 min-w-0 flex-nowrap">
            {/* Clickable Logo & Store Info (Home Button) */}
            <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0">
              <button
                onClick={() => setActiveTab('pos')}
                title="Go to POS Billing Home"
                className="bg-yellow-400 hover:bg-yellow-300 text-emerald-950 p-2 sm:p-2.5 rounded-xl font-black text-xl flex items-center justify-center shadow-md transition transform hover:scale-105 active:scale-95"
              >
                <Store className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={() => setActiveTab('pos')}
                className="text-left group cursor-pointer focus:outline-none whitespace-nowrap hidden lg:block"
              >
                <span className="font-black text-lg xl:text-2xl tracking-tight text-white group-hover:text-yellow-300 transition">
                  {settings.store_name || 'Manidevi General Store'}
                </span>
              </button>
            </div>

            {/* Navigation Links - Single line guaranteed */}
            <nav className="flex items-center space-x-1 sm:space-x-1.5 flex-nowrap shrink-0 overflow-x-auto py-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-150 whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-emerald-950/95 text-yellow-300 shadow-inner ring-1 ring-yellow-400/40'
                        : 'text-emerald-100 hover:bg-emerald-700/80 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Time (Up) & Date (Down) + Settings */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <div className="hidden md:flex flex-col items-end justify-center bg-emerald-900/90 px-3 py-1 rounded-xl text-emerald-200 shadow-inner border border-emerald-700/50 leading-tight shrink-0">
              {/* Time Up */}
              <div className="flex items-center space-x-1 font-mono font-black text-xs sm:text-sm text-yellow-300">
                <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                <span>
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              {/* Date Down */}
              <div className="flex items-center space-x-1 font-mono text-[11px] font-bold text-emerald-100 mt-0.5">
                <Calendar className="w-3 h-3 text-emerald-300 flex-shrink-0" />
                <span>
                  {time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                </span>
              </div>
            </div>

            <button
              onClick={onOpenSettings}
              title="Store & UPI Settings"
              className="p-2 sm:p-2.5 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors shrink-0"
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
