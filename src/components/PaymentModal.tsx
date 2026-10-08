import React, { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { X, IndianRupee, CheckCircle2, AlertCircle, Wallet, ArrowRight, ShieldCheck, Banknote } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSavePayment: (invoiceId: string, additionalAmount: number, paymentMode: string, isFullPaid: boolean) => Promise<void> | void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSavePayment,
}) => {
  const { language } = useLanguage();
  const isMr = language === 'mr';
  const isHi = language === 'hi';

  const totalAmount = Math.round(Number(invoice.totalAmount || 0));
  const alreadyReceived = Number(invoice.receivedAmount || 0);
  const currentDue = Math.max(0, totalAmount - alreadyReceived);

  const [payingAmount, setPayingAmount] = useState<string>(currentDue > 0 ? currentDue.toString() : '0');
  const [paymentMode, setPaymentMode] = useState<string>(invoice.paymentType && invoice.paymentType !== 'Credit' ? invoice.paymentType : 'UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPayingAmount(currentDue > 0 ? currentDue.toString() : '0');
      setPaymentMode(invoice.paymentType && invoice.paymentType !== 'Credit' ? invoice.paymentType : 'UPI');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, invoice.id, currentDue]);

  if (!isOpen) return null;

  const payingNum = Math.max(0, Number(payingAmount.replace(/[^0-9.]/g, '')) || 0);
  const remainingDue = Math.max(0, currentDue - payingNum);
  const isFullPaid = payingNum >= currentDue - 0.5 || remainingDue <= 0.5;

  const handleFullPayClick = () => {
    setPayingAmount(currentDue.toString());
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payingNum <= 0) {
      setError(isMr ? 'कृपया ० पेक्षा जास्त रक्कम टाका.' : 'Please enter an amount greater than 0.');
      return;
    }
    if (payingNum > currentDue + 0.5) {
      setError(isMr ? `रक्कम बाकी रकमेपेक्षा (₹${currentDue}) जास्त असू शकत नाही.` : `Amount cannot exceed current due of ₹${currentDue}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSavePayment(invoice.id, payingNum, paymentMode, isFullPaid);
      onClose();
    } catch (err: any) {
      console.error('Save payment error:', err);
      setError(err?.message || (isMr ? 'पेमेंट सेव्ह करताना त्रुटी आली.' : 'Failed to save payment.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-animex-blue-900 via-animex-blue-800 to-animex-blue-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">
                {isMr ? 'पेमेंट जमा करा (Collect Payment)' : isHi ? 'भुगतान प्राप्त करें' : 'Record Payment'}
              </h3>
              <p className="text-[11px] text-slate-300 font-bold mt-0.5">
                Bill #{invoice.globalBillId || invoice.companyInvoiceNumber || invoice.invoiceNo} • {invoice.billTo?.firmName || 'Store'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          
          {/* Bill Summary Banner */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                {isMr ? 'एकूण बिल' : 'Total Bill'}
              </span>
              <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-0.5">
                ₹{totalAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="border-x border-slate-200 dark:border-slate-700">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {isMr ? 'आधी जमा' : 'Already Paid'}
              </span>
              <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                ₹{alreadyReceived.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {isMr ? 'सध्या बाकी' : 'Current Due'}
              </span>
              <p className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                ₹{currentDue.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200">
                {isMr ? 'आता जमा होणारी रक्कम (₹)' : isHi ? 'प्राप्त राशि (₹)' : 'Amount Paying Now (₹)'}
              </label>
              <button
                type="button"
                onClick={handleFullPayClick}
                className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800"
              >
                {isMr ? `पूर्ण जमा (₹${currentDue})` : `Full Pay (₹${currentDue})`}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 font-black text-base">
                ₹
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={payingAmount}
                autoFocus
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setPayingAmount(val);
                  if (error) setError(null);
                }}
                placeholder="0"
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl pl-8 pr-4 py-3 font-black text-xl text-slate-900 dark:text-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Payment Status Calculation Preview */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500 dark:text-slate-400">
                {isMr ? 'नवीन उरलेली बाकी:' : 'Remaining Balance:'}
              </span>
              <span className={`font-black text-sm ${remainingDue <= 0.5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                ₹{remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-black">
              <span className="text-slate-500">
                {isMr ? 'बिलाची नवीन स्थिती:' : 'New Bill Status:'}
              </span>
              {isFullPaid ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isMr ? '✓ पूर्ण जमा (PAID)' : '✓ FULLY PAID'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{isMr ? '⚡ अंशतः बाकी (PARTIALLY PAID)' : '⚡ PARTIALLY PAID'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
              {isMr ? 'पेमेंट प्रकार (Payment Mode)' : isHi ? 'भुगतान प्रकार' : 'Payment Mode'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'UPI', label: 'UPI / GPay', icon: Wallet },
                { id: 'Cash', label: isMr ? 'रोख (Cash)' : 'Cash', icon: Banknote },
                { id: 'Bank Transfer', label: 'Bank / RTGS', icon: ShieldCheck },
              ].map((m) => {
                const isSelected = paymentMode === m.id;
                const IconComponent = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMode(m.id)}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-animex-blue-900 border-animex-blue-900 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-slate-500'}`} />
                    <span className="text-[11px] leading-tight text-center">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 rounded-xl p-2.5 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-1/3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              {isMr ? 'रद्द करा' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || payingNum <= 0}
              className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-lg hover:shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {isSubmitting ? (
                <span>{isMr ? 'जमा होत आहे...' : 'Saving...'}</span>
              ) : (
                <>
                  <span>{isMr ? `₹${payingNum.toLocaleString('en-IN')} जमा करा` : `Record ₹${payingNum.toLocaleString('en-IN')}`}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
