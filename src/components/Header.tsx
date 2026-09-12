import React, { useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Store,
  Package,
  ShieldCheck,
  LogOut,
  User,
  Menu,
  X,
  ChevronRight,
  Phone,
  MapPin,
  Settings,
  Factory,
  Bell,
  AlertTriangle,
  ArrowDownToLine,
} from 'lucide-react';
import { UserSession } from '../services/authService';
import { useLanguage } from '../context/LanguageContext';
import { Product } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  invoicesCount: number;
  products?: Product[];
  user?: UserSession | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  invoicesCount,
  products = [],
  user,
  onLogout,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const { t } = useLanguage();

  const lowStockProducts = (products || []).filter(
    (p) => (p.stockQuantity ?? 0) <= (p.minStockAlert || p.boxCapacity || 50)
  );

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="bg-animex-blue-900 text-white shadow-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-4">
          
          {/* Brand & Menu Trigger */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Menu Bar Toggle Button (Hamburger) */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer flex items-center justify-center border border-white/15 shadow-sm"
              title="Open Menu Bar"
              aria-label="Open Menu Bar"
            >
              <Menu className="w-5 h-5 text-amber-300" />
            </button>

            {/* Subtle Divider between Menu Trigger and Brand */}
            <div className="h-6 w-px bg-white/15 hidden sm:block" />

            {/* Brand Logo & Title */}
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => handleTabClick('dashboard')}
            >
              <img
                src="/images/logo image.jpg"
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.png'; }}
                alt="ANIMEX Logo"
                className="h-8 sm:h-10 w-auto object-contain rounded-lg bg-white p-0.5 shadow-md"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-white">
                    ANIMEX BILLING
                  </h1>
                  <span className="bg-animex-green-600 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-emerald-400/40">
                    <ShieldCheck className="w-3 h-3" /> OFFICIAL
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium mt-0.5">
                  {t('brand.subtitle')}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile screens < lg) */}
          <nav className="hidden lg:flex items-center gap-1.5 py-1">
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-animex-orange-500 text-white shadow-lg scale-105'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t('nav.dashboard')}</span>
            </button>

            <button
              onClick={() => handleTabClick('new-invoice')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'new-invoice'
                  ? 'bg-animex-orange-500 text-white shadow-lg scale-105'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('nav.createBill')}</span>
            </button>

            <button
              onClick={() => handleTabClick('history')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-animex-orange-500 text-white shadow-lg scale-105'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t('nav.history')}</span>
              <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-md text-[10px]">
                {invoicesCount}
              </span>
            </button>

            <button
              onClick={() => handleTabClick('stores')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'stores'
                  ? 'bg-animex-orange-500 text-white shadow-lg scale-105'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>{t('nav.stores')}</span>
            </button>

            <button
              onClick={() => handleTabClick('products')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-animex-orange-500 text-white shadow-lg scale-105'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>{t('nav.products')}</span>
            </button>

            <button
              onClick={() => handleTabClick('purchases')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'purchases'
                  ? 'bg-animex-orange-500 text-white shadow-lg scale-105'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <Factory className="w-4 h-4" />
              <span>{t('nav.purchases')}</span>
            </button>
          </nav>

          {/* Right Header Actions: Low Stock Notification Bell */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer flex items-center justify-center border border-white/15 shadow-sm"
              title="Stock Alert Notifications (कमी साठा चेतावणी)"
              aria-label="Stock Alert Notifications"
            >
              <Bell className="w-5 h-5 text-amber-300" />
              {lowStockProducts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black min-w-5 h-5 px-1 rounded-full flex items-center justify-center border-2 border-animex-blue-900 shadow-md animate-pulse">
                  {lowStockProducts.length}
                </span>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* Stock Alerts & Notifications Center Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mt-12 sm:mt-10 animate-fadeIn">
            
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-animex-blue-900 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Stock Alert Notifications</h3>
                  <p className="text-[10px] text-slate-300">Live Godown Stock Alerts & Thresholds</p>
                </div>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 max-h-[75vh] overflow-y-auto space-y-3">
              {lowStockProducts.length > 0 ? (
                <>
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-red-700 dark:text-red-400">
                        ⚠️ Warning! {lowStockProducts.length} Product(s) Low on Stock
                      </h4>
                      <p className="text-[11px] text-red-600 dark:text-red-300 mt-0.5">
                        The following products have fallen below company minimum threshold limit. Please restock immediately.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {lowStockProducts.map((p) => {
                      const stock = p.stockQuantity ?? 0;
                      const limit = p.minStockAlert || p.boxCapacity || 50;
                      return (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-red-200 dark:border-red-900/40 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                                {p.name}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {p.category}
                              </div>
                            </div>
                            <span className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded-full font-black border border-red-300">
                              Low Stock
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Available Stock:</span>
                              <span className="font-black text-red-600 dark:text-red-400 text-sm">
                                {stock} {p.defaultUnit}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Alert Limit:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                {limit} {p.defaultUnit}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setShowNotifications(false);
                              handleTabClick('products');
                            }}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                          >
                            <ArrowDownToLine className="w-4 h-4" />
                            <span>Inward Stock (+ Boxes)</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                      All Products Stock is Healthy!
                    </h4>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                      Currently no products are below the minimum threshold limit. Real-time alerts will notify you here when stock runs low.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                      Current Stock & Alert Limits:
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {(products || []).map((p) => {
                        const stock = p.stockQuantity ?? 0;
                        const limit = p.minStockAlert || p.boxCapacity || 50;
                        return (
                          <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="truncate max-w-[190px] font-bold text-slate-700 dark:text-slate-300">{p.name}</span>
                            <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              {stock} {p.defaultUnit} <span className="text-slate-400 text-[9px] font-normal">(Limit: {limit})</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowNotifications(false);
                  handleTabClick('products');
                }}
                className="text-xs font-black text-animex-blue-600 hover:text-animex-blue-800 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Manage All Inventory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Slide-out Menu Bar Drawer (Matching animex_frontend app_drawer.dart) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Sidebar Panel */}
          <div className="relative flex flex-col w-full max-w-xs sm:max-w-sm bg-slate-900 text-white shadow-2xl z-10 h-full border-r border-slate-800 animate-fadeIn">
            
            {/* Drawer Header Brand Card (Replicating AppCard with AppGradients.brand) */}
            <div className="p-4 sm:p-5">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0D2A4D] via-[#123963] to-[#17395F] border border-white/10 shadow-lg relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <img
                    src="/images/logo image.jpg"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.png'; }}
                    alt="ANIMEX Logo"
                    className="h-12 w-12 object-contain rounded-xl bg-white p-1.5 shadow-md border border-white/20"
                  />
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all cursor-pointer"
                    title="Close Menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-3.5">
                  <h2 className="text-lg font-extrabold tracking-tight text-white leading-tight">
                    ANIMEX Billing
                  </h2>
                  <p className="text-xs text-white/80 font-medium mt-0.5">
                    Premium veterinary billing UI
                  </p>
                </div>

                {/* User Session Chip */}
                {user && (
                  <div
                    onClick={() => handleTabClick('profile')}
                    className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-300 truncate">{user.email}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </div>
                )}
              </div>
            </div>

            {/* Menu Navigation Items */}
            <div className="flex-1 overflow-y-auto px-4 space-y-1">
              
              {/* Dashboard */}
              <button
                onClick={() => handleTabClick('dashboard')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-animex-orange-500 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4 text-blue-400" />
                  <span>{t('nav.dashboard')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Create Bill */}
              <button
                onClick={() => handleTabClick('new-invoice')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'new-invoice'
                    ? 'bg-animex-orange-500 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <PlusCircle className="w-4 h-4 text-animex-orange-400" />
                  <span>{t('nav.createBill')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Bill History */}
              <button
                onClick={() => handleTabClick('history')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-animex-orange-500 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>{t('nav.history')}</span>
                </div>
                <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-[10px] font-mono">
                  {invoicesCount}
                </span>
              </button>

              {/* Products */}
              <button
                onClick={() => handleTabClick('products')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'products'
                    ? 'bg-animex-orange-500 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-amber-400" />
                  <span>{t('nav.products')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Purchases / Manufacturing Inward */}
              <button
                onClick={() => handleTabClick('purchases')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'purchases'
                    ? 'bg-animex-orange-500 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Factory className="w-4 h-4 text-purple-400" />
                  <span>{t('nav.purchasesFull')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Medical Stores */}
              <button
                onClick={() => handleTabClick('stores')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'stores'
                    ? 'bg-animex-orange-500 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Store className="w-4 h-4 text-teal-400" />
                  <span>{t('nav.stores')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Settings */}
              <button
                onClick={() => handleTabClick('settings')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-animex-orange-500 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-orange-400" />
                  <span className="font-extrabold">{t('nav.settings')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Company Profile */}
              <button
                onClick={() => handleTabClick('profile')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-animex-orange-500 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-purple-400" />
                  <span>{t('nav.profile')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Contact Support Info */}
              <div className="pt-4 pb-2 px-1">
                <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/60 space-y-1.5 text-[11px] text-slate-300">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t('nav.helpline')}
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-orange-400 flex-shrink-0" />
                    <span>9307990811 / 8999323908</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-orange-400 flex-shrink-0" />
                    <span>Kopargaon, Ahmednagar</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Secondary Button at bottom */}
            {onLogout && (
              <div className="p-4 border-t border-slate-800 bg-slate-900/95">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-200 hover:text-red-300 border border-slate-700 hover:border-red-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Touch Navigation Bar (5 Primary Tabs: Dashboard, Create Bill, History, Stores, Products) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D2A4D] border-t border-slate-700/80 grid grid-cols-5 p-1 shadow-2xl text-center">
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-xl text-[10px] font-extrabold tracking-tight transition-all leading-tight cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-animex-orange-500 text-white shadow-md'
              : 'text-slate-200 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span className="truncate max-w-full">{t('nav.dashboard')}</span>
        </button>

        <button
          onClick={() => handleTabClick('new-invoice')}
          className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-xl text-[10px] font-extrabold tracking-tight transition-all leading-tight cursor-pointer ${
            activeTab === 'new-invoice'
              ? 'bg-animex-orange-500 text-white shadow-md'
              : 'text-slate-200 hover:text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4 mb-0.5" />
          <span className="truncate max-w-full">{t('nav.createBill')}</span>
        </button>

        <button
          onClick={() => handleTabClick('history')}
          className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-xl text-[10px] font-extrabold tracking-tight transition-all leading-tight cursor-pointer ${
            activeTab === 'history'
              ? 'bg-animex-orange-500 text-white shadow-md'
              : 'text-slate-200 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span className="truncate max-w-full">{t('nav.history')}</span>
        </button>

        <button
          onClick={() => handleTabClick('stores')}
          className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-xl text-[10px] font-extrabold tracking-tight transition-all leading-tight cursor-pointer ${
            activeTab === 'stores'
              ? 'bg-animex-orange-500 text-white shadow-md'
              : 'text-slate-200 hover:text-white'
          }`}
        >
          <Store className="w-4 h-4 mb-0.5" />
          <span className="truncate max-w-full">{t('nav.stores')}</span>
        </button>

        <button
          onClick={() => handleTabClick('products')}
          className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-xl text-[10px] font-extrabold tracking-tight transition-all leading-tight cursor-pointer ${
            activeTab === 'products'
              ? 'bg-animex-orange-500 text-white shadow-md'
              : 'text-slate-200 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4 mb-0.5" />
          <span className="truncate max-w-full">{t('nav.productsShort', t('nav.products', 'Products'))}</span>
        </button>
      </div>
    </>
  );
};
