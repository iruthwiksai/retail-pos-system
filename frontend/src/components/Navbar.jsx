import React, { useState, useEffect } from 'react';
import { ShoppingCart, FileText, Package, BarChart3, Settings, Store, Clock, Calendar, Lock, ShieldCheck, UserCheck } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  settings,
  onOpenSettings,
  currentUser,
  onLock,
  onRequestManagerTab
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isManager = currentUser?.role === 'manager';

  const navItems = [
    { id: 'pos', label: 'POS Billing', icon: ShoppingCart, requiresManager: false },
    { id: 'orders', label: 'Saved Bills', icon: FileText, requiresManager: false },
    { id: 'inventory', label: 'Inventory', icon: Package, requiresManager: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, requiresManager: true },
  ];

  const handleTabClick = (item) => {
    if (item.requiresManager && !isManager) {
      if (onRequestManagerTab) {
        onRequestManagerTab(item.id);
      }
      return;
    }
    setActiveTab(item.id);
  };

  const handleSettingsClick = () => {
    if (!isManager) {
      if (onRequestManagerTab) {
        onRequestManagerTab('settings');
      }
      return;
    }
    onOpenSettings();
  };

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
                  {settings.store_name || 'Mani Devi General Store'}
                </span>
              </button>
            </div>

            {/* Navigation Links - Single line guaranteed */}
            <nav className="flex items-center space-x-1 sm:space-x-1.5 flex-nowrap shrink-0 overflow-x-auto py-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isRestrictedForCashier = item.requiresManager && !isManager;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item)}
                    className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-150 whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-emerald-950/95 text-yellow-300 shadow-inner ring-1 ring-yellow-400/40'
                        : 'text-emerald-100 hover:bg-emerald-700/80 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {isRestrictedForCashier && (
                      <Lock className="w-3 h-3 text-yellow-300/80 shrink-0 ml-0.5" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: User Role Pill + Lock + Time & Date + Settings */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Active User Role Badge */}
            {currentUser && (
              <div
                className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs shadow-xs ${
                  isManager
                    ? 'bg-yellow-400 text-emerald-950 ring-1 ring-yellow-300'
                    : 'bg-sky-500 text-white ring-1 ring-sky-400'
                }`}
              >
                {isManager ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
                <span>{isManager ? 'Owner' : 'Cashier'}</span>
              </div>
            )}

            {/* Terminal Lock Button */}
            <button
              onClick={onLock}
              title="Lock Counter Terminal (Switch User)"
              className="flex items-center space-x-1.5 bg-emerald-950/90 hover:bg-emerald-950 text-yellow-300 hover:text-white px-2.5 sm:px-3 py-2 rounded-xl text-xs font-black border border-yellow-400/40 transition shadow-sm active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>

            {/* Time Up & Date Down */}
            <div className="hidden lg:flex flex-col items-end justify-center bg-emerald-900/90 px-3 py-1 rounded-xl text-emerald-200 shadow-inner border border-emerald-700/50 leading-tight shrink-0">
              <div className="flex items-center space-x-1 font-mono font-black text-xs sm:text-sm text-yellow-300">
                <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                <span>
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center space-x-1 font-mono text-[11px] font-bold text-emerald-100 mt-0.5">
                <Calendar className="w-3 h-3 text-emerald-300 flex-shrink-0" />
                <span>
                  {time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                </span>
              </div>
            </div>

            {/* Store & UPI Settings Gear Button */}
            <button
              onClick={handleSettingsClick}
              title={isManager ? "Store & UPI Settings" : "Store & UPI Settings (Manager Approval Required)"}
              className="p-2 sm:p-2.5 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors shrink-0 relative"
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              {!isManager && (
                <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full ring-2 ring-emerald-800" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
