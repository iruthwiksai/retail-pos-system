import React, { useState, useEffect } from 'react';
import { ShoppingCart, FileText, Package, BarChart3, Settings, Store, Clock, Calendar, LogOut } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  settings,
  onOpenSettings,
  currentUser,
  onLogout
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isManager = currentUser?.role === 'manager';

  // For staff: ONLY show POS Billing and Saved Bills (No Inventory, No Analytics, No UI traces)
  const navItems = isManager
    ? [
        { id: 'pos', label: 'POS Billing', icon: ShoppingCart },
        { id: 'orders', label: 'Saved Bills', icon: FileText },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 }
      ]
    : [
        { id: 'pos', label: 'POS Billing', icon: ShoppingCart },
        { id: 'orders', label: 'Saved Bills', icon: FileText }
      ];

  return (
    <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[76px] sm:h-[84px] gap-2 sm:gap-4">
          
          {/* Left: Brand + Navigation links with nowrap layout */}
          <div className="flex items-center space-x-2 sm:space-x-5 min-w-0 flex-nowrap">
            {/* Clickable Logo & Store Info */}
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
                <span className="font-black text-xl xl:text-3xl tracking-tight text-white group-hover:text-yellow-300 transition">
                  {settings.store_name || 'Mani Devi General Store'}
                </span>
              </button>
            </div>

            {/* Navigation Links - Filtered by role */}
            <nav className="flex items-center space-x-1 sm:space-x-2 flex-nowrap shrink-0 overflow-x-auto py-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-sm sm:text-base font-black transition-all duration-150 whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-emerald-950/95 text-yellow-300 shadow-inner ring-1 ring-yellow-400/40'
                        : 'text-emerald-100 hover:bg-emerald-700/80 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Time/Date, Settings (Owner only), and Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Time Up & Date Down */}
            <div className="hidden lg:flex flex-col items-end justify-center bg-emerald-900/90 px-3.5 py-1.5 rounded-xl text-emerald-200 shadow-inner border border-emerald-700/50 leading-tight shrink-0">
              <div className="flex items-center space-x-1.5 font-mono font-black text-sm sm:text-base text-yellow-300">
                <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span>
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center space-x-1 font-mono text-xs sm:text-sm font-extrabold text-emerald-100 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                <span>
                  {time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                </span>
              </div>
            </div>

            {/* Store & UPI Settings Gear Button (ONLY rendered for Owner) */}
            {isManager && (
              <button
                onClick={onOpenSettings}
                title="Store & UPI Settings"
                className="p-2.5 sm:p-3 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors shrink-0"
              >
                <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              title="Logout / Exit Terminal"
              className="flex items-center space-x-1.5 bg-emerald-950/80 hover:bg-emerald-950 text-emerald-100 hover:text-white px-3.5 py-2.5 rounded-xl text-sm font-extrabold border border-emerald-700/50 transition shadow-xs active:scale-95"
            >
              <LogOut className="w-4.5 h-4.5 text-emerald-300" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
