import React, { useState } from 'react';
import { Invoice, BillStatus } from '../types';
import { FileText, Eye, Search, Calendar, Store, Trash2, Printer, Share2, Filter } from 'lucide-react';
import { formatInvoiceNumber, getStatusBadgeConfig } from '../utils/invoiceUtils';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const globalIdStr = (inv.globalBillId || '').toString();
      const numStr = (inv.companyInvoiceNumber || inv.invoiceNo || '').toString();
      const codeStr = (inv.invoiceNumber || formatInvoiceNumber(inv.companyInvoiceNumber || inv.invoiceNo, inv.date)).toLowerCase();
      const matchFirm = (inv.billTo.firmName || '').toLowerCase().includes(q);
      const matchContact = (inv.billTo.contactName || '').toLowerCase().includes(q);
      const matchDate = (inv.date || '').includes(q);
      return globalIdStr.includes(q) || numStr.includes(q) || codeStr.includes(q) || matchFirm || matchContact || matchDate;
    })
    .sort((a, b) => {
      const idA = a.globalBillId || a.companyInvoiceNumber || a.invoiceNo || 0;
      const idB = b.globalBillId || b.companyInvoiceNumber || b.invoiceNo || 0;
      return sortOrder === 'asc' ? idA - idB : idB - idA;
    });

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalBalance = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

  const handleShareInvoice = (inv: Invoice) => {
    const masterNo = inv.companyInvoiceNumber || inv.invoiceNo;
    const status = getResolvedStatus(inv);

    let msg = `=========================================\n`;
    msg += `   ANIMEX ANIMAL HEALTH CARE PVT LTD\n`;
    msg += `   BILL / INVOICE NO: ${masterNo}\n`;
    msg += `=========================================\n\n`;
    msg += `Bill To: ${inv.billTo.firmName}\n`;
    if (inv.billTo.contactName) msg += `Prop: ${inv.billTo.contactName}\n`;
    msg += `Date: ${inv.date}\n`;
    msg += `Status: ${status}\n`;
    msg += `Payment Mode: ${inv.paymentType || 'UPI'}\n\n`;
    msg += `ITEMS SUMMARY:\n`;
    inv.items.forEach((item, index) => {
      const isFreeItem = item.isFree || item.isScheme;
      const tag = isFreeItem ? ' [Free]' : '';
      const amt = isFreeItem ? 'Free' : `₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      msg += `${index + 1}. ${item.itemName}${tag} x ${item.quantity} ${item.unit} = ${amt}\n`;
    });
    msg += `\n-----------------------------------------\n`;
    msg += `TOTAL AMOUNT: ₹${inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    msg += `RECEIVED: ₹${inv.receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    msg += `BALANCE DUE: ₹${inv.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    msg += `=========================================\n`;
    msg += `Helpline: 9307990811 / 8999323908\n`;

    if (navigator.share) {
      navigator.share({
        title: `Invoice No: ${masterNo} - Animex`,
        text: msg,
      }).catch(() => {
        const targetPhone = inv.billTo.phone ? inv.billTo.phone.replace(/[^0-9]/g, '') : '';
        window.open(`https://wa.me/${targetPhone ? '91' + targetPhone : ''}?text=${encodeURIComponent(msg)}`, '_blank');
      });
    } else {
      const targetPhone = inv.billTo.phone ? inv.billTo.phone.replace(/[^0-9]/g, '') : '';
      window.open(`https://wa.me/${targetPhone ? '91' + targetPhone : ''}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

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

          {/* Filter Chips matching animex_frontend */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 pt-1 text-xs">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </span>

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
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-animex-blue-900 dark:bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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

        {/* Mobile Card List View (Visible only on mobile screens < md) */}
        <div className="md:hidden space-y-3">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 font-bold bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              No bills found matching your search / filter.
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
                  <span>{inv.billTo.firmName}</span>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  📍 {inv.billTo.district}, {inv.billTo.state}
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
                  onClick={() => handleShareInvoice(inv)}
                  className="px-3.5 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Share on WhatsApp"
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
                  <td colSpan={7} className="text-center py-8 text-xs text-slate-500 font-bold">
                    No bills found matching your search / filter.
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
                          <span>{inv.billTo.firmName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          {inv.billTo.district}, {inv.billTo.state}
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
                        onClick={() => handleShareInvoice(inv)}
                        className="px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0 whitespace-nowrap"
                        title="Share on WhatsApp"
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
