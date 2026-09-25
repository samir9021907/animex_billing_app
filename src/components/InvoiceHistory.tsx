import React, { useState } from 'react';
import { Invoice, BillStatus } from '../types';
import { FileText, Eye, Search, Calendar, Store, Trash2, Printer, Share2, Filter, ChevronDown, RotateCcw, X } from 'lucide-react';
import { formatInvoiceNumber, getStatusBadgeConfig } from '../utils/invoiceUtils';
import { useLanguage } from '../context/LanguageContext';

interface InvoiceHistoryProps {
  invoices: Invoice[];
  onSelectInvoice: (inv: Invoice) => void;
  onDeleteInvoice?: (id: string) => void;
}

type FilterStatus = 'ALL' | 'PAID' | 'PENDING' | 'PARTIALLY PAID';

export const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({
  invoices,
  onSelectInvoice,
  onDeleteInvoice
}) => {
  const { language } = useLanguage();
  const isMr = language === 'mr';
  const isHi = language === 'hi';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const uniqueStores = Array.from(
    new Set(
      invoices
        .map(inv => inv.billTo?.firmName?.trim())
        .filter((name): name is string => Boolean(name))
    )
  ).sort();

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setStoreFilter('ALL');
    setPaymentModeFilter('ALL');
    setDateFilter('');
  };

  const activeAdvancedCount = 
    (storeFilter !== 'ALL' ? 1 : 0) +
    (paymentModeFilter !== 'ALL' ? 1 : 0) +
    (dateFilter ? 1 : 0);

  const getResolvedStatus = (inv: Invoice): BillStatus => {
    if (inv.status) {
      const s = inv.status.toUpperCase();
      if (s === 'PAID') return 'PAID';
      if (s === 'PENDING' || s === 'DUE') return 'PENDING';
      if (s === 'PARTIALLY PAID' || s === 'PARTIAL' || s === 'PARTIALLYPAID') return 'PARTIALLY PAID';
      if (s === 'CANCELLED') return 'CANCELLED';
    }
    return inv.balanceAmount === 0 ? 'PAID' : (inv.receivedAmount === 0 ? 'PENDING' : 'PARTIALLY PAID');
  };

  const countAll = invoices.length;
  const countPaid = invoices.filter(i => getResolvedStatus(i) === 'PAID').length;
  const countPending = invoices.filter(i => getResolvedStatus(i) === 'PENDING').length;
  const countPartial = invoices.filter(i => getResolvedStatus(i) === 'PARTIALLY PAID').length;

  const filteredInvoices = invoices
    .filter(inv => {
      const status = getResolvedStatus(inv);
      if (statusFilter !== 'ALL' && status !== statusFilter) {
        return false;
      }
      if (storeFilter !== 'ALL' && (inv.billTo?.firmName?.trim() !== storeFilter)) {
        return false;
      }
      if (paymentModeFilter !== 'ALL' && (inv.paymentType?.trim() !== paymentModeFilter)) {
        return false;
      }
      if (dateFilter) {
        const invDate = inv.date || '';
        const reversedDate = invDate.split('-').reverse().join('-');
        if (!invDate.includes(dateFilter) && !reversedDate.includes(dateFilter)) {
          return false;
        }
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const globalIdStr = (inv.globalBillId || '').toString();
      const numStr = (inv.companyInvoiceNumber || inv.invoiceNo || '').toString();
      const codeStr = (inv.invoiceNumber || formatInvoiceNumber(inv.companyInvoiceNumber || inv.invoiceNo, inv.date)).toLowerCase();
      const matchFirm = (inv.billTo?.firmName || '').toLowerCase().includes(q);
      const matchContact = (inv.billTo?.contactName || '').toLowerCase().includes(q);
      const matchDate = (inv.date || '').includes(q);
      const matchPayment = (inv.paymentType || '').toLowerCase().includes(q);
      return globalIdStr.includes(q) || numStr.includes(q) || codeStr.includes(q) || matchFirm || matchContact || matchDate || matchPayment;
    })
    .sort((a, b) => {
      const idA = a.globalBillId || a.companyInvoiceNumber || a.invoiceNo || 0;
      const idB = b.globalBillId || b.companyInvoiceNumber || b.invoiceNo || 0;
      return sortOrder === 'asc' ? idA - idB : idB - idA;
    });

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalBalance = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);



  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-6">
      
      {/* Title & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Total Invoices Generated
          </span>
          <div className="text-3xl font-black text-animex-blue-900 dark:text-sky-300">
            {invoices.length} Bills
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Total Billed Amount (₹)
          </span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            ₹ {totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Total Pending Dues (₹)
          </span>
          <div className="text-3xl font-black text-animex-orange-600 dark:text-amber-400">
            ₹ {totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

      </div>

      {/* Search Bar & Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md border border-slate-200 dark:border-slate-800 space-y-4">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-animex-blue-600" />
            <span>Generated Bills History</span>
          </h3>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Bill No, Code, Store name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-animex-orange-500 outline-none"
            />
          </div>
        </div>

        {/* Filter Bar & Options */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 pt-1 text-xs">
            <div className="flex items-center gap-2 shrink-0">
              {/* Interactive Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setShowFilterPanel(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showFilterPanel || activeAdvancedCount > 0
                    ? 'bg-animex-orange-500 text-white border-animex-orange-500 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={isMr ? 'अधिक फिल्टर्स उघडा' : 'Click to toggle filter options'}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter</span>
                {activeAdvancedCount > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-white text-animex-orange-600">
                    {activeAdvancedCount}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
              </button>

              {/* Status Tabs */}
              {(
                [
                  { key: 'ALL', label: 'All Bills', count: countAll },
                  { key: 'PAID', label: 'Paid', count: countPaid },
                  { key: 'PENDING', label: 'Pending', count: countPending },
                  { key: 'PARTIALLY PAID', label: 'Partially Paid', count: countPartial },
                ] as const
              ).map((tab) => {
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-animex-blue-900 dark:bg-sky-600 text-white border-animex-blue-900 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer ml-auto"
              title="Toggle Bill Sequence Order"
            >
              <span>Sr No: {sortOrder === 'asc' ? '1, 2, 3... (Sequence)' : 'Newest First'}</span>
            </button>
          </div>

          {/* Expandable Advanced Filters Panel */}
          {showFilterPanel && (
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-animex-orange-500" />
                  <span>{isMr ? 'अधिक पर्याय' : isHi ? 'उन्नत फ़िल्टर' : 'Advanced Filters'}</span>
                </span>
                {(storeFilter !== 'ALL' || paymentModeFilter !== 'ALL' || dateFilter || statusFilter !== 'ALL' || searchQuery) && (
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="text-xs text-red-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{isMr ? 'सर्व पूर्ववत करा' : isHi ? 'रीसेट करें' : 'Reset All'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Store Filter */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    {isMr ? 'मेडिकल स्टोअर' : isHi ? 'मेडिकल स्टोर' : 'Medical Store'}
                  </label>
                  <select
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="ALL">{isMr ? 'सर्व मेडिकल स्टोअर्स' : isHi ? 'सभी मेडिकल स्टोर' : 'All Medical Stores'}</option>
                    {uniqueStores.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Mode Filter */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    {isMr ? 'देयक पद्धत' : isHi ? 'भुगतान प्रकार' : 'Payment Mode'}
                  </label>
                  <select
                    value={paymentModeFilter}
                    onChange={(e) => setPaymentModeFilter(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="ALL">{isMr ? 'सर्व पद्धती' : isHi ? 'सभी प्रकार' : 'All Modes'}</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit">{isMr ? 'उधारी' : isHi ? 'उधार' : 'Credit'}</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    {isMr ? 'तारीख' : isHi ? 'दिनांक' : 'Filter by Date'}
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-800 dark:text-white outline-none cursor-pointer text-xs"
                    />
                    {dateFilter && (
                      <button
                        type="button"
                        onClick={() => setDateFilter('')}
                        className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Card List View (Visible only on mobile screens < md) */}
        <div className="md:hidden space-y-3">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-slate-500 font-bold bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2">
              <p>{isMr ? 'तुमच्या फिल्टरनुसार कोणतीही बिले आढळली नाहीत.' : isHi ? 'चयनित फ़िल्टर के अनुसार कोई बिल नहीं मिला।' : 'No bills found matching selected filters.'}</p>
              {(statusFilter !== 'ALL' || storeFilter !== 'ALL' || paymentModeFilter !== 'ALL' || dateFilter || searchQuery) && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="mt-1 px-3.5 py-1.5 rounded-lg bg-animex-orange-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm hover:bg-animex-orange-600 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isMr ? 'सर्व फिल्टर्स क्लिअर करा' : isHi ? 'फ़िल्टर साफ़ करें' : 'Reset Filters'}</span>
                </button>
              )}
            </div>
          ) : (
            filteredInvoices.map((inv) => {
              const masterNo = inv.companyInvoiceNumber || inv.invoiceNo;
              const statusBadge = getStatusBadgeConfig(getResolvedStatus(inv));

              return (
                <div key={inv.id} className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-slate-900 text-amber-300 font-black px-2 py-0.5 rounded-md text-xs shadow-sm">
                        Sr No #{inv.globalBillId || '-'}
                      </span>
                      <span className="bg-animex-blue-900 text-white font-black px-2 py-0.5 rounded-md text-xs shadow-sm">
                        Invoice No: {masterNo}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="whitespace-nowrap">{inv.date}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${statusBadge.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor}`}></span>
                      <span>{statusBadge.label}</span>
                    </span>
                  </div>

              <div>
                <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-animex-orange-500 shrink-0" />
                  <span>{inv.billTo?.firmName || 'Store'}</span>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  📍 {inv.billTo?.district || '-'}, {inv.billTo?.state || '-'}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60 pt-2 text-xs">
                <span className="text-slate-500 font-bold">{inv.items.length} Products</span>
                <span className="font-black text-base text-animex-blue-900 dark:text-sky-300">
                  ₹ {inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action Buttons: View, Print, Share, Delete */}
              <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-200 dark:border-slate-700/60">
                <button
                  onClick={() => onSelectInvoice(inv)}
                  className="px-3.5 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="View Bill Details"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span>View</span>
                </button>

                <button
                  onClick={() => {
                    onSelectInvoice(inv);
                    setTimeout(() => window.print(), 350);
                  }}
                  className="px-3.5 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Print Bill"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => onSelectInvoice(inv)}
                  className="px-3.5 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Share Original Color Bill on WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span>Share</span>
                </button>

                {onDeleteInvoice && (
                  <button
                    onClick={() => onDeleteInvoice(inv.id)}
                    className="px-3.5 py-1.5 rounded-full border border-red-200 hover:border-red-300 bg-white dark:bg-slate-800 hover:bg-red-50 text-red-600 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Delete Bill"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Delete</span>
                  </button>
                )}
                </div>
              </div>
              );
            })
          )}
        </div>

        {/* Invoices List Desktop Table (Hidden on small mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                <th className="p-3 text-center w-20 whitespace-nowrap">Sr No #</th>
                <th className="p-3 whitespace-nowrap min-w-[120px]">Date</th>
                <th className="p-3">Medical Store (Bill To)</th>
                <th className="p-3 text-center whitespace-nowrap">Items Count</th>
                <th className="p-3 text-right whitespace-nowrap">Total Amount (₹)</th>
                <th className="p-3 text-center whitespace-nowrap">Payment Status</th>
                <th className="p-3 text-center whitespace-nowrap min-w-[270px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 px-4 text-xs text-slate-500 font-bold space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {isMr
                        ? 'तुमच्या फिल्टरनुसार कोणतीही बिले आढळली नाहीत.'
                        : isHi
                        ? 'फ़िल्टर के अनुसार कोई बिल नहीं मिला।'
                        : 'No bills found matching selected filter criteria.'}
                    </p>
                    <p className="text-[11px] text-slate-400 font-normal">
                      {isMr ? 'कृपया वेगळा फिल्टर निवडा.' : isHi ? 'फ़िल्टर सेटिंग्स बदलें।' : 'Try changing your filter settings.'}
                    </p>
                    {(statusFilter !== 'ALL' || storeFilter !== 'ALL' || paymentModeFilter !== 'ALL' || dateFilter || searchQuery) && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleResetAllFilters}
                          className="px-4 py-1.5 rounded-lg bg-animex-orange-500 hover:bg-animex-orange-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isMr ? 'सर्व फिल्टर्स क्लिअर करा' : isHi ? 'फ़िल्टर साफ़ करें' : 'Reset Filters'}</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const statusBadge = getStatusBadgeConfig(getResolvedStatus(inv));

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="bg-slate-900 text-amber-300 dark:bg-slate-800 font-black px-2.5 py-1 rounded-lg text-xs shadow-sm inline-block">
                          #{inv.globalBillId || '-'}
                        </span>
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap font-bold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="whitespace-nowrap">{inv.date}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-animex-orange-500 shrink-0" />
                          <span>{inv.billTo?.firmName || 'Store'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          {inv.billTo?.district || '-'}, {inv.billTo?.state || '-'}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                          {inv.items.length} Products
                        </span>
                      </td>

                      <td className="p-3 text-right font-black text-sm text-animex-blue-900 dark:text-sky-300">
                        ₹ {inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-3 text-center">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${statusBadge.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor}`}></span>
                            <span>{statusBadge.label}</span>
                          </span>
                          {inv.balanceAmount > 0 && inv.receivedAmount > 0 && (
                            <span className="text-[9px] text-slate-500 font-bold">
                              Paid: ₹{inv.receivedAmount.toFixed(0)}
                            </span>
                          )}
                          {inv.balanceAmount > 0 && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                              Due: ₹{inv.balanceAmount.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </td>

                  <td className="p-3 text-center whitespace-nowrap min-w-[270px]">
                    <div className="flex items-center justify-center gap-1.5 flex-nowrap whitespace-nowrap">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0 whitespace-nowrap"
                        title="View Bill Details"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectInvoice(inv);
                          setTimeout(() => window.print(), 350);
                        }}
                        className="px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0 whitespace-nowrap"
                        title="Print Bill"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                        <span>Print</span>
                      </button>

                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0 whitespace-nowrap"
                        title="Share Original Color Bill on WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                        <span>Share</span>
                      </button>

                      {onDeleteInvoice && (
                        <button
                          onClick={() => onDeleteInvoice(inv.id)}
                          className="px-2.5 py-1 rounded-full border border-red-200 hover:border-red-300 bg-white dark:bg-slate-800 hover:bg-red-50 text-red-600 font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0 whitespace-nowrap"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
