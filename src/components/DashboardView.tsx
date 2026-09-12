import React from 'react';
import {
  PlusCircle,
  FileText,
  Store,
  Package,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Settings,
  Boxes,
  Factory,
} from 'lucide-react';
import { Invoice, MedicalStore, Product } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { parseDateSafe } from '../utils/invoiceUtils';

interface DashboardViewProps {
  invoices: Invoice[];
  stores: MedicalStore[];
  products: Product[];
  onNavigateTab: (tab: string) => void;
  onSelectInvoice: (invoice: Invoice) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices,
  stores,
  products,
  onNavigateTab,
  onSelectInvoice,
}) => {
  const { t, language } = useLanguage();

  // Financial metrics
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalReceived = invoices.reduce((sum, inv) => sum + (inv.receivedAmount || 0), 0);
  const totalDue = Math.max(0, totalRevenue - totalReceived);
  const recentInvoices = [...invoices].slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-animex-blue-900 via-animex-blue-800 to-animex-orange-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-amber-300">
              {t('dash.overview')}
            </span>
            <span className="text-slate-200 text-xs font-semibold">
              {t('brand.subtitle')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
            {t('dash.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-md">
            {t('dash.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('new-invoice')}
            className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('dash.createBill')}</span>
          </button>
          <button
            onClick={() => onNavigateTab('settings')}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
            title="Open Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Invoices */}
        <div
          onClick={() => onNavigateTab('history')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('dash.totalInvoices')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {invoices.length}
          </p>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
            {t('dash.invoicesGenerated')}
          </p>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('dash.totalBilled')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {t('dash.grossVolume')}
          </p>
        </div>

        {/* Balance Due */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('dash.outstanding')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
            ₹{totalDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-red-500 dark:text-red-400 font-semibold mt-1">
            {t('dash.pendingCollection')}
          </p>
        </div>

        {/* Medical Stores */}
        <div
          onClick={() => onNavigateTab('stores')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('dash.medicalStores')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stores.length}
          </p>
          <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold mt-1">
            {t('dash.activeClients')} ({products.length} products)
          </p>
        </div>
      </div>

      {/* Quick Access Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-4">
          {t('dash.quickActions')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigateTab('new-invoice')}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold text-xs transition-all border border-orange-500/20 cursor-pointer"
          >
            <PlusCircle className="w-6 h-6 mb-1.5 text-orange-500" />
            <span>{t('dash.createBill')}</span>
          </button>

          <button
            onClick={() => onNavigateTab('purchases')}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs transition-all border border-indigo-500/20 cursor-pointer"
          >
            <Factory className="w-6 h-6 mb-1.5 text-indigo-500" />
            <span>{t('dash.purchasesInward')}</span>
          </button>

          <button
            onClick={() => onNavigateTab('stores')}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-all border border-emerald-500/20 cursor-pointer"
          >
            <Store className="w-6 h-6 mb-1.5 text-emerald-500" />
            <span>{t('dash.addStore')}</span>
          </button>

          <button
            onClick={() => onNavigateTab('products')}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs transition-all border border-blue-500/20 cursor-pointer"
          >
            <Package className="w-6 h-6 mb-1.5 text-blue-500" />
            <span>{t('dash.manageProducts')}</span>
          </button>

          <button
            onClick={() => onNavigateTab('settings')}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-xs transition-all border border-purple-500/20 cursor-pointer"
          >
            <Settings className="w-6 h-6 mb-1.5 text-purple-500" />
            <span>{t('dash.openSettings')}</span>
          </button>
        </div>
      </div>

      {/* Live Godown Stock & Inventory Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('dash.godownStock')}</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {t('dash.autoTracking')}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dash.totalStock')}: <strong className="text-slate-800 dark:text-slate-200">{products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0).toLocaleString('en-IN')} Units</strong> • {t('dash.autoMinusNotice')}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('products')}
            className="text-xs font-bold text-animex-blue-600 hover:text-animex-blue-800 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>{t('dash.manageAllStock')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Product Stock Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.slice(0, 6).map((p) => {
            const stock = p.stockQuantity ?? 0;
            const cap = p.boxCapacity || 50;
            const boxes = Math.floor(stock / cap);
            const loose = stock % cap;
            const isLow = stock <= (p.minStockAlert || cap);

            const boxWord = language === 'en' ? 'Boxes' : language === 'hi' ? 'बॉक्स' : 'खोके';
            const perBoxWord = language === 'en' ? 'Box' : language === 'hi' ? 'बॉक्स' : 'खोका';
            const stockWord = language === 'en' ? 'Stock:' : language === 'hi' ? 'शेष:' : 'शिल्लक:';

            return (
              <div
                key={p.id}
                onClick={() => onNavigateTab('products')}
                className="bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase">
                      📦 {cap} {p.defaultUnit}/{perBoxWord}
                    </span>
                    {isLow && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                        {t('dash.lowStock')}
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1">
                    {p.name}
                  </h4>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{stockWord}</span>
                  <span className={`font-black ${isLow ? 'text-amber-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {boxes} {boxWord}{loose > 0 ? ` + ${loose}` : ''} ({stock} {p.defaultUnit})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Bills
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest invoices created for medical stores
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('history')}
            className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No bills created yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentInvoices.map((inv) => {
              const due = (inv.totalAmount || 0) - (inv.receivedAmount || 0);
              const isPaid = due <= 0;
              const storeName = inv.billTo?.firmName || 'Store';
              return (
                <div
                  key={inv.id}
                  onClick={() => onSelectInvoice(inv)}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs flex-shrink-0 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-black leading-tight">#{inv.globalBillId || inv.invoiceNo}</span>
                      <span className="text-[8px] text-animex-blue-700 dark:text-sky-400 font-extrabold leading-tight">Inv #{inv.companyInvoiceNumber || inv.invoiceNo}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {storeName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {parseDateSafe(inv.date).toLocaleDateString('en-IN')} • {inv.paymentType || 'UPI'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right flex-shrink-0">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        ₹{(inv.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </p>
                      <span
                        className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          isPaid
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {isPaid ? 'PAID' : `DUE ₹${due.toFixed(0)}`}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
