import { Invoice, BillStatus } from '../types';

/**
 * Formats a sequence number into the official ANIMEX invoice code: ANX-YYMM-XXXX
 * Example: seq = 1 in September 2026 => ANX-2609-0001
 */
export function formatInvoiceNumber(seq: number, dateStr?: string): string {
  const dateObj = dateStr ? new Date(dateStr) : new Date();
  const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
  
  const yy = String(validDate.getFullYear()).slice(-2);
  const mm = String(validDate.getMonth() + 1).padStart(2, '0');
  const paddedSeq = String(seq).padStart(4, '0');
  
  return `ANX-${yy}${mm}-${paddedSeq}`;
}

/**
 * Resolves the primary display label for an invoice:
 * Preference: #companyInvoiceNumber (e.g. #1, #5), fallback to invoiceNumber or invoiceNo.
 */
export function getDisplayInvoiceId(inv: Partial<Invoice>): string {
  if (inv.companyInvoiceNumber !== undefined && inv.companyInvoiceNumber !== null) {
    return `#${inv.companyInvoiceNumber}`;
  }
  if (inv.globalBillId !== undefined && inv.globalBillId !== null) {
    return `#${inv.globalBillId}`;
  }
  if (inv.invoiceNumber && inv.invoiceNumber.trim()) {
    return inv.invoiceNumber;
  }
  if (inv.invoiceNo !== undefined && inv.invoiceNo !== null) {
    return `#${inv.invoiceNo}`;
  }
  return '#1';
}

/**
 * Standard status styling matching animex_frontend app_models.dart
 */
export function getStatusBadgeConfig(status: string | BillStatus): {
  label: string;
  badgeClass: string;
  dotColor: string;
} {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case 'PAID':
      return {
        label: 'PAID',
        badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        dotColor: 'bg-emerald-500',
      };
    case 'PENDING':
    case 'DUE':
      return {
        label: 'PENDING',
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        dotColor: 'bg-amber-500',
      };
    case 'PARTIALLY PAID':
    case 'PARTIALLYPAID':
    case 'PARTIAL':
      return {
        label: 'PARTIALLY PAID',
        badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
        dotColor: 'bg-sky-500',
      };
    case 'CANCELLED':
      return {
        label: 'CANCELLED',
        badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
        dotColor: 'bg-slate-500',
      };
    default:
      return {
        label: 'PENDING',
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        dotColor: 'bg-amber-500',
      };
  }
}
