import React, { useState } from 'react';
import { Invoice } from '../types';
import { Printer, X, CheckCircle2, Loader2, MessageSquare, Download } from 'lucide-react';
import { getStatusBadgeConfig } from '../utils/invoiceUtils';
import html2canvas from 'html2canvas';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useLanguage } from '../context/LanguageContext';

interface WhatsAppOpenerPlugin {
  openWhatsApp(options: { phone?: string; text: string }): Promise<void>;
  openWhatsAppWithImage(options: { imageBase64: string; fileName: string; text?: string }): Promise<void>;
}

const WhatsAppOpener = registerPlugin<WhatsAppOpenerPlugin>('WhatsAppOpener');

const safeNum = (val: any): number => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

interface InvoicePreviewModalProps {
  invoice: Invoice;
  allInvoices?: Invoice[];
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  onClose,
}) => {
  const { language } = useLanguage();
  const isMr = language === 'mr';
  const isHi = language === 'hi';

  // Master continuous Bill Number matching animex_frontend
  const masterInvoiceNo = invoice.companyInvoiceNumber || invoice.invoiceNo;
  const statusBadge = getStatusBadgeConfig(
    invoice.status || (invoice.balanceAmount === 0 ? 'PAID' : invoice.receivedAmount === 0 ? 'PENDING' : 'PARTIALLY PAID')
  );

  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatingMsg, setGeneratingMsg] = useState<string>('');

  const isNative = Capacitor.isNativePlatform();
  const isMobile = isNative || (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent));

  // Fetch company profile for bank details
  const companyProfile = (() => {
    try {
      const saved = localStorage.getItem('animex_company_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      companyName: 'ANIMEX ANIMAL HEALTH CARE PVT LTD',
      address: '0208/RVN Bahadurpur, Kopargaon Dist - A.Nagar 423605 Maharashtra',
      phone: '8799883858',
      email: 'animexanimalhealthcare@gmail.com',
      bankName: 'State Bank of India',
      accountNo: '389920194821',
      ifscCode: 'SBIN0004123',
      upiId: 'animex@sbi',
    };
  })();

  const handlePrint = () => {
    window.print();
  };

  // Helper to extract clean customer phone number
  const getCleanCustomerPhone = (): string => {
    if (!invoice?.billTo?.phone) return '';
    let digits = String(invoice.billTo.phone).replace(/[^0-9]/g, '');
    if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.substring(1);
    }
    if (digits.length === 10) {
      return '91' + digits;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits;
    }
    if (digits.length >= 10) {
      return digits;
    }
    return '';
  };

  // Generate complete, official, original bill text for WhatsApp
  const getBillTextMessage = (): string => {
    const isCust = invoice?.billTo?.customerType === 'customer';
    const storeName = invoice?.billTo?.firmName || (isCust ? 'Valued Customer' : 'Medical Store');
    const contact = (!isCust && invoice?.billTo?.contactName) ? ` (${invoice.billTo.contactName})` : '';
    const location = [invoice?.billTo?.address, invoice?.billTo?.district].filter(Boolean).join(', ');

    let itemsList = '';
    (invoice?.items || []).forEach((item, index) => {
      const isScheme = item.isFree || item.isScheme;
      const freeTag = isScheme ? ' [FREE SCHEME]' : '';
      const priceVal = safeNum(item.pricePerUnit);
      const amtVal = safeNum(item.amount);
      const priceStr = isScheme ? '₹0.00' : `₹${priceVal.toFixed(2)}`;
      const amountStr = isScheme ? '₹0.00' : `₹${amtVal.toFixed(2)}`;
      itemsList += `${index + 1}. *${item.itemName || 'Item'}*${freeTag}\n   ${item.quantity || 1} ${item.unit || 'pcs'} x ${priceStr} = *${amountStr}*\n`;
    });

    const balanceAmt = safeNum(invoice?.balanceAmount);
    const receivedAmt = safeNum(invoice?.receivedAmount);
    const totalAmt = safeNum(invoice?.totalAmount);
    const subTotalAmt = safeNum(invoice?.subTotal);
    const discountAmt = safeNum(invoice?.discount);

    const balanceStatus = balanceAmt <= 0
      ? (isMr ? '🟢 *पूर्ण भरले (PAID)*' : isHi ? '🟢 *पूर्ण भुगतान (PAID)*' : '🟢 *PAID*')
      : receivedAmt > 0
        ? (isMr ? `🟠 *अंशतः भरले* - बाकी: ₹${balanceAmt.toFixed(2)}` : isHi ? `🟠 *आंशिक भुगतान* - शेष: ₹${balanceAmt.toFixed(2)}` : `🟠 *PARTIALLY PAID* - Balance: ₹${balanceAmt.toFixed(2)}`)
        : (isMr ? `🔴 *बाकी* - बाकी: ₹${balanceAmt.toFixed(2)}` : isHi ? `🔴 *बकाया* - शेष: ₹${balanceAmt.toFixed(2)}` : `🔴 *PENDING* - Balance: ₹${balanceAmt.toFixed(2)}`);

    const invDate = invoice?.date || new Date().toISOString().split('T')[0];

    const labelDate = isMr ? 'तारीख' : isHi ? 'दिनांक' : 'Date';
    const labelCustomer = isMr ? 'ग्राहक' : isHi ? 'ग्राहक' : 'Customer';
    const labelAddress = isMr ? 'पत्ता' : isHi ? 'पता' : 'Address';
    const labelItems = isMr ? 'वस्तू तपशील' : isHi ? 'सामग्री विवरण' : 'Items';
    const labelSubTotal = 'Sub Total';
    const labelDiscount = isMr ? 'सवलत' : isHi ? 'छूट' : 'Discount';
    const labelTotal = isMr ? 'एकूण बिल रक्कम' : isHi ? 'कुल बिल राशि' : 'Total Amount';
    const labelPaid = isMr ? 'भरलेली रक्कम' : isHi ? 'भुगतान राशि' : 'Paid Amount';
    const labelBalance = isMr ? 'बाकी रक्कम' : isHi ? 'बकाया राशि' : 'Balance Due';
    const labelStatus = isMr ? 'स्थिती' : isHi ? 'स्थिति' : 'Status';
    const labelBank = isMr ? 'बँक / UPI तपशील' : isHi ? 'बैंक / UPI विवरण' : 'Bank & UPI Details';
    const labelBankName = isMr ? 'बँक' : isHi ? 'बैंक' : 'Bank';
    const labelAccountNo = isMr ? 'खाते क्र.' : isHi ? 'खाता सं.' : 'A/C No.';
    const thankYou = isMr ? 'आपल्या सहकार्याबद्दल धन्यवाद!' : isHi ? 'व्यापार के लिए धन्यवाद!' : 'Thank you for your business!';

    return (
      `🏢 *${companyProfile?.companyName || 'ANIMEX ANIMAL HEALTH CARE PVT LTD'}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 *TAX INVOICE / BILL: #${masterInvoiceNo}*\n` +
      `📅 *${labelDate}:* ${invDate}\n` +
      `🏥 *${labelCustomer}:* ${storeName}${contact}\n` +
      (location ? `📍 *${labelAddress}:* ${location}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *${labelItems}:*\n` +
      itemsList +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *${labelSubTotal}:* ₹${subTotalAmt.toFixed(2)}\n` +
      (discountAmt > 0 ? `🏷️ *${labelDiscount}:* - ₹${discountAmt.toFixed(2)}\n` : '') +
      `💰 *${labelTotal}:* *₹${totalAmt.toFixed(2)}*\n` +
      `💳 *${labelPaid}:* ₹${receivedAmt.toFixed(2)} (${invoice?.paymentType || 'UPI'})\n` +
      `📌 *${labelBalance}:* ₹${balanceAmt.toFixed(2)}\n` +
      `📌 *${labelStatus}:* ${balanceStatus}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🏦 *${labelBank}:*\n` +
      `• ${labelBankName}: ${companyProfile?.bankName || 'State Bank of India'}\n` +
      `• ${labelAccountNo}: ${companyProfile?.accountNo || '389920194821'}\n` +
      `• IFSC: ${companyProfile?.ifscCode || 'SBIN0004123'}\n` +
      `• UPI ID: ${companyProfile?.upiId || 'animex@sbi'}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📞 Helpline: 8799883858 / 9146133858\n` +
      `🙏 *${thankYou}*`
    );
  };

  // Helper to render the original color bill into a Canvas
  const generateBillCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const billElement = document.getElementById('printable-bill-area');
    if (!billElement) return null;

    const renderScale = isMobile ? 1.3 : 1.6;

    return await html2canvas(billElement, {
      scale: renderScale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 850,
      imageTimeout: 3000,
    });
  };

  // 1. DIRECT INSTANT ORIGINAL BILL SHARE TO WHATSAPP (Sends the actual colorful Bill Image!)
  const handleDirectWhatsApp = async () => {
    try {
      setIsGeneratingImage(true);
      setGeneratingMsg(isMr ? 'मूळ रंगीत बिल WhatsApp साठी तयार होत आहे...' : isHi ? 'WhatsApp के लिए बिल तैयार हो रहा है...' : 'Preparing bill image for WhatsApp...');

      const cleanPhone = getCleanCustomerPhone();
      const cleanStore = (invoice?.billTo?.firmName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `ANIMEX_Bill_${masterInvoiceNo}_${cleanStore}.png`;
      const customerLabel = isMr ? 'ग्राहक:' : isHi ? 'ग्राहक:' : 'Customer:';
      const totalLabel = isMr ? 'एकूण रक्कम:' : isHi ? 'कुल राशि:' : 'Total:';
      const balanceLabel = isMr ? 'बाकी रक्कम:' : isHi ? 'बकाया:' : 'Balance:';
      const caption = `🏢 *${companyProfile?.companyName || 'ANIMEX ANIMAL HEALTH CARE PVT LTD'}*\n📄 *Tax Invoice / Bill: #${masterInvoiceNo}*\n🏥 *${customerLabel}* ${invoice?.billTo?.firmName || 'Valued Customer'}\n💰 *${totalLabel}* ₹${safeNum(invoice?.totalAmount).toFixed(2)}\n📌 *${balanceLabel}* ₹${safeNum(invoice?.balanceAmount).toFixed(2)}`;

      // Generate the REAL COLORFUL ORIGINAL BILL canvas image
      const canvas = await generateBillCanvas();
      if (!canvas) {
        setIsGeneratingImage(false);
        return;
      }

      const base64Data = canvas.toDataURL('image/png', 0.95);

      // A. On Native Android Mobile App (Capacitor):
      if (isNative) {
        try {
          await WhatsAppOpener.openWhatsAppWithImage({
            imageBase64: base64Data,
            fileName: fileName,
            text: caption,
          });
          setIsGeneratingImage(false);
          return;
        } catch (pluginErr) {
          console.warn('Native openWhatsAppWithImage failed, fallback to Share:', pluginErr);
          try {
            await Share.share({
              title: `ANIMEX Bill #${masterInvoiceNo}`,
              text: caption,
              dialogTitle: isMr ? 'WhatsApp निवडा' : 'Select WhatsApp',
            });
            setIsGeneratingImage(false);
            return;
          } catch (e) {
            const fullText = getBillTextMessage();
            await WhatsAppOpener.openWhatsApp({ phone: cleanPhone, text: fullText });
            setIsGeneratingImage(false);
            return;
          }
        }
      }

      // B. On Web / Desktop PC / Laptop Browser:
      // 1. Automatically copy the real bill image to clipboard
      try {
        canvas.toBlob(async (blob) => {
          if (blob && navigator.clipboard && (window as any).ClipboardItem) {
            const item = new (window as any).ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
          }
        }, 'image/png');
      } catch (clipErr) {
        console.warn('Clipboard image write:', clipErr);
      }

      // 2. If Web Share API supports file sharing (e.g. mobile Chrome):
      if (typeof navigator !== 'undefined' && (navigator as any).canShare) {
        try {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const file = new File([blob], fileName, { type: 'image/png' });
            if ((navigator as any).canShare({ files: [file] })) {
              await (navigator as any).share({
                files: [file],
                title: `ANIMEX Bill #${masterInvoiceNo}`,
                text: caption,
              });
              setIsGeneratingImage(false);
              return;
            }
          }
        } catch (shareErr) {
          console.warn('Web file share error:', shareErr);
        }
      }

      // 3. Desktop PC WhatsApp Web Launch:
      const encodedCaption = encodeURIComponent(caption);
      const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      let targetUrl = '';
      if (isMobileDevice) {
        targetUrl = cleanPhone
          ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedCaption}`
          : `https://api.whatsapp.com/send?text=${encodedCaption}`;
      } else {
        // Desktop PC (Windows / Edge / Chrome): Open WhatsApp Web directly!
        targetUrl = cleanPhone
          ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedCaption}`
          : `https://web.whatsapp.com/send?text=${encodedCaption}`;
      }

      let win: Window | null = null;
      try {
        win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        win = null;
      }

      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = targetUrl;
      }
    } catch (err: any) {
      console.error('Direct WhatsApp error:', err);
      alert((isMr ? 'WhatsApp उघडताना त्रुटी आली: ' : 'Error opening WhatsApp: ') + (err.message || 'Error'));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 2. Download/Save the REAL COLOR BILL as an HD image file to Phone / PC
  const handleDownloadPhoto = async () => {
    try {
      setIsGeneratingImage(true);
      setGeneratingMsg(isMr ? 'रंगीत फोटो सेव्ह होत आहे...' : isHi ? 'बिल फोटो सेव हो रहा है...' : 'Saving HD bill photo...');
      const canvas = await generateBillCanvas();
      if (!canvas) return;

      const cleanStore = (invoice.billTo?.firmName || 'Medical_Store').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `ANIMEX_Bill_${masterInvoiceNo}_${cleanStore}.png`;

      // Native Android App: Save to Documents directory
      if (isNative) {
        const base64Data = canvas.toDataURL('image/png', 0.95).split(',')[1];
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });
        alert(isMr ? `रंगीत बिल फोटो सेव्ह झाला आहे!\nफाईल: ${fileName}\n(Documents फोल्डरमध्ये उपलब्ध)` : `Bill photo saved successfully!\nFile: ${fileName}\n(Saved to Documents folder)`);
        return;
      }

      // Web Browser
      const dataUrl = canvas.toDataURL('image/png', 0.95);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download photo error:', err);
      alert((isMr ? 'फोटो सेव्ह करताना त्रुटी आली: ' : 'Failed to save photo: ') + (err.message || 'Failed'));
    } finally {
      setIsGeneratingImage(false);
      setGeneratingMsg('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-700 dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full p-3 sm:p-6 space-y-4 my-auto border border-slate-600 max-h-[95vh] overflow-y-auto">
        
        {/* Action Header Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 no-print border-b border-slate-600 pb-3 text-white">
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-base sm:text-lg">Official Medical Store Invoice</h3>
              {invoice.globalBillId && (
                <span className="bg-slate-900 text-amber-300 text-xs font-black px-2.5 py-0.5 rounded-full border border-slate-700">
                  Sr No: #{invoice.globalBillId}
                </span>
              )}
              <span className="bg-animex-orange-500 text-white text-xs font-black px-3 py-0.5 rounded-full">
                Invoice No: {masterInvoiceNo}
              </span>
            </div>

            <button
              onClick={onClose}
              className="sm:hidden bg-slate-600 hover:bg-slate-500 text-white font-bold p-1.5 rounded-xl text-xs transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Buttons: Exactly 3 options requested by User: 1. WhatsApp, 2. Save Photo, 3. Print */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
            {/* 1. WhatsApp Button - Direct Instant WhatsApp share */}
            <button
              type="button"
              onClick={handleDirectWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 sm:px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 active:scale-95"
              title={isMr ? 'WhatsApp वर थेट बिल पाठवा' : 'Direct Instant WhatsApp'}
            >
              <MessageSquare className="w-4 h-4 text-emerald-200 fill-emerald-200/20" />
              <span>WhatsApp</span>
            </button>

            {/* 2. Save Photo Button */}
            <button
              type="button"
              onClick={handleDownloadPhoto}
              disabled={isGeneratingImage}
              className="bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-black px-3 sm:px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 active:scale-95"
              title={isMr ? 'रंगीत बिल फोटो सेव्ह करा' : 'Save Photo'}
            >
              <Download className="w-4 h-4 text-sky-200" />
              <span>Save Photo</span>
            </button>

            {/* 3. Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingImage}
              className="bg-animex-blue-600 hover:bg-animex-blue-700 disabled:opacity-60 text-white font-black px-3 sm:px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 active:scale-95"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:block bg-slate-600 hover:bg-slate-500 text-white font-bold p-2 rounded-xl text-xs transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress notification banner during image rendering */}
        {isGeneratingImage && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse no-print">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>{generatingMsg || (isMr ? 'मूळ रंगीत बिल तयार होत आहे...' : isHi ? 'बिल तैयार हो रहा है...' : 'Preparing bill image...')}</span>
          </div>
        )}

        {/* PRINTABLE BILL AREA */}
        <div className="overflow-x-auto p-1">
          <div
            id="printable-bill-area"
            className="bg-white text-[#1e293b] p-3 sm:p-8 font-sans max-w-[850px] w-full mx-auto border-2 border-[#1e293b] shadow-2xl text-xs rounded-lg relative overflow-hidden min-w-[700px]"
          >
            {/* Top Brand Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#0F4C81] via-[#F97316] to-[#166534]"></div>

            {/* Main Title Banner */}
            <div className="border-b-2 border-[#0F4C81] pb-2 mb-3 pt-1 text-center">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-[#0F4C81] uppercase">
                Bill of Supply
              </h1>
            </div>

            {/* Master Outer Container Box */}
            <div className="border-2 border-[#1e293b] bg-white rounded-lg overflow-hidden">
              {/* 1. Header Box with Logo & Company Details */}
              <div className="border-b-2 border-[#1e293b] p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-5 bg-gradient-to-r from-slate-50 to-white text-center sm:text-left">
                {/* Logo Area */}
                <div className="w-28 sm:w-36 h-16 sm:h-24 flex items-center justify-center shrink-0 bg-white p-1.5 border border-slate-200 rounded-xl shadow-sm">
                  <img
                    src="/images/logo.png"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/logo image.jpg';
                    }}
                    alt="ANIMEX Official Logo"
                    className="max-h-14 sm:max-h-20 max-w-full object-contain"
                  />
                </div>

                {/* Company Info */}
                <div className="flex-grow">
                  <h2 className="text-base sm:text-xl font-black tracking-tight text-[#0F4C81] uppercase leading-tight">
                    {companyProfile.companyName}
                  </h2>
                  <p className="text-[10px] sm:text-xs font-bold text-[#334155] mt-0.5">
                    {companyProfile.address}
                  </p>
                  <div className="text-[10px] sm:text-xs font-extrabold text-[#0F4C81] mt-1.5 flex flex-wrap justify-center sm:justify-start gap-x-4 sm:gap-x-6 gap-y-0.5">
                    <span>
                      Helpline: <strong className="text-[#F97316]">8799883858 / 9146133858</strong>
                    </span>
                    <span>
                      Email: <strong>{companyProfile.email}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Bill To & Invoice Details Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-2 border-b-2 border-[#1e293b] bg-[#f8fafc] text-xs">
                <div className="p-2.5 sm:p-3">
                  <span className="font-extrabold text-[#64748b] uppercase tracking-wider text-[9px] sm:text-[10px] block">
                    {invoice.billTo?.customerType === 'customer' ? 'Billed To (Customer):' : 'Billed To (Medical Store):'}
                  </span>
                  <div className="font-black text-xs sm:text-sm text-[#0F4C81] mt-0.5">
                    {invoice.billTo?.firmName || 'Valued Customer'}
                  </div>
                  {invoice.billTo?.customerType !== 'customer' && invoice.billTo?.contactName && (
                    <div className="text-[11px] sm:text-xs font-bold text-[#334155] mt-0.5">
                      Proprietor: {invoice.billTo.contactName}
                    </div>
                  )}
                  {invoice.billTo?.address && (
                    <div className="text-[10px] sm:text-[11px] font-medium text-[#475569] mt-0.5">
                      📍 {invoice.billTo.address}, {invoice.billTo.district}, {invoice.billTo.state}
                    </div>
                  )}
                  {invoice.billTo?.phone && (
                    <div className="text-[10px] sm:text-[11px] font-bold text-[#F97316] mt-0.5">
                      📞 Ph: +91 {invoice.billTo.phone}
                    </div>
                  )}
                </div>

                <div className="p-2.5 sm:p-3 flex flex-col justify-between">
                  <div>
                    <span className="font-extrabold text-[#64748b] uppercase tracking-wider text-[9px] sm:text-[10px] block">
                      Invoice Specifications:
                    </span>
                    <div className="font-bold text-xs mt-0.5">
                      Invoice No: <strong className="font-black text-sm sm:text-base text-[#0F4C81] ml-1">{masterInvoiceNo}</strong>
                    </div>
                    <div className="font-bold text-xs mt-0.5">
                      Date: <strong className="text-[#334155]">{invoice.date}</strong>
                    </div>
                    <div className="font-bold text-xs mt-0.5">
                      Payment Mode: <strong className="text-[#0F4C81]">{invoice.paymentType || 'UPI'}</strong>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase border shadow-sm ${statusBadge.badgeClass}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      <span>{statusBadge.label} {invoice.balanceAmount > 0 && invoice.receivedAmount > 0 ? `(₹${invoice.receivedAmount.toFixed(0)} Paid)` : ''}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Itemized Products Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] sm:text-xs text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-[#f1f5f9] text-[#0F4C81] font-black uppercase text-[10px] sm:text-[11px] border-b-2 border-[#0F4C81]">
                      <th className="p-1.5 sm:p-2 border-r border-[#cbd5e1] w-7 text-center">#</th>
                      <th className="p-1.5 sm:p-2 border-r border-[#cbd5e1]">Product Description</th>
                      <th className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-right w-16 sm:w-20">Quantity</th>
                      <th className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-center w-14 sm:w-16">Unit</th>
                      <th className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-right w-20 sm:w-24">MRP (₹)</th>
                      <th className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-right w-24 sm:w-28">Rate / Unit (₹)</th>
                      <th className="p-1.5 sm:p-2 text-right w-24 sm:w-28">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#cbd5e1]">
                    {invoice.items.map((item, idx) => (
                      <tr key={item.id} className="even:bg-slate-50/70 font-bold">
                        <td className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-center font-extrabold text-slate-900">{idx + 1}</td>
                        <td className="p-1.5 sm:p-2 border-r border-[#cbd5e1] font-black text-[#0F4C81]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.itemName}</span>
                            {(item.isFree || item.isScheme) && (
                              <span className="text-[9px] sm:text-[10px] bg-emerald-50 text-emerald-800 font-black px-1.5 py-0.5 rounded border border-emerald-300 uppercase tracking-wider whitespace-nowrap">
                                FREE SCHEME
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-right font-black text-slate-900">{item.quantity}</td>
                        <td className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-900">{item.unit}</td>
                        <td className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-right font-bold text-slate-900">
                          {item.mrp ? `₹ ${item.mrp.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-right font-bold text-slate-900">
                          {(item.isFree || item.isScheme) ? (
                            <span>₹ 0.00</span>
                          ) : (
                            `₹ ${item.pricePerUnit.toFixed(2)}`
                          )}
                        </td>
                        <td className="p-1.5 sm:p-2 text-right font-black text-slate-950">
                          {(item.isFree || item.isScheme) ? (
                            <span>₹ 0.00</span>
                          ) : (
                            `₹ ${item.amount.toFixed(2)}`
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Total Quantity & Subtotal Row */}
                    <tr className="bg-[#f1f5f9] font-black border-t-2 border-[#1e293b]">
                      <td colSpan={2} className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-right uppercase text-slate-700">
                        Total Items Quantity
                      </td>
                      <td className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-right text-xs sm:text-sm text-[#F97316]">
                        {invoice.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </td>
                      <td colSpan={2} className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-right uppercase text-slate-700">
                        Subtotal
                      </td>
                      <td className="p-1.5 sm:p-2 text-right text-xs sm:text-sm text-[#0F4C81]" colSpan={2}>
                        ₹ {invoice.subTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. Subtotal, Words, Bank Details & Balance Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-12 border-t-2 border-[#1e293b] bg-white divide-y sm:divide-y-0">
                {/* Bank Details For Payment Transfer */}
                <div className="sm:col-span-7 sm:border-r-2 border-[#1e293b] p-2.5 sm:p-3 flex flex-col justify-between bg-slate-50/50">
                  <div className="space-y-1.5">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-[#0F4C81] block">
                      ✓ Bank Details For Payment Transfer (RTGS / NEFT / UPI):
                    </span>
                    <div className="text-[10px] font-medium text-slate-700 grid grid-cols-2 gap-x-2 gap-y-0.5 bg-white p-2 rounded border border-slate-200">
                      <div>Bank: <strong>{companyProfile.bankName}</strong></div>
                      <div>A/C No: <strong className="font-mono">{companyProfile.accountNo}</strong></div>
                      <div>IFSC: <strong className="font-mono">{companyProfile.ifscCode}</strong></div>
                      <div>Instant UPI ID: <strong className="font-mono text-[#F97316]">{companyProfile.upiId}</strong></div>
                    </div>

                    <p className="text-[9px] text-slate-600 leading-relaxed font-medium pt-1">
                      Veterinary formulations manufactured under sterile GMP & ISO 9001:2015 certified plants.
                    </p>
                  </div>

                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 italic border-t border-slate-200 pt-1 mt-2">
                    Thank you for your valued partnership with ANIMEX ANIMAL HEALTH CARE PVT LTD.
                  </div>
                </div>

                {/* Totals Summary Column */}
                <div className="sm:col-span-5 text-xs font-bold divide-y divide-[#cbd5e1]">
                  <div className="flex justify-between p-2">
                    <span className="text-slate-600">Sub Total</span>
                    <span className="font-extrabold text-slate-900">: ₹ {invoice.subTotal.toFixed(2)}</span>
                  </div>

                  {invoice.discount !== undefined && invoice.discount > 0 && (
                    <div className="flex justify-between p-2 text-red-600 bg-red-50/50">
                      <span>{isMr ? 'सूट (Discount)' : 'Trade Discount'}</span>
                      <span className="font-bold">: - ₹ {invoice.discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between p-2 font-black text-xs sm:text-sm bg-[#f8fafc] text-[#0F4C81]">
                    <span>Total Net Amount</span>
                    <span>: ₹ {invoice.totalAmount.toFixed(2)}</span>
                  </div>

                  {/* Amount in Words Box */}
                  <div className="p-2 sm:p-2.5 bg-[#eff6ff] border-l-4 border-l-[#0F4C81]">
                    <div className="text-[9px] uppercase font-black text-[#0F4C81]">
                      Invoice Amount In Words:
                    </div>
                    <div className="font-black text-[11px] sm:text-xs text-[#F97316] mt-0.5 italic">
                      "{invoice.amountInWords}"
                    </div>
                  </div>

                  <div className="flex justify-between p-2 text-slate-700">
                    <span>Received Amount ({invoice.paymentType || 'UPI'})</span>
                    <span>: ₹ {invoice.receivedAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between p-2 font-black text-xs bg-[#fef2f2] text-red-700">
                    <span>{isMr ? 'बाकी रक्कम (Balance Due)' : 'Balance Due'}</span>
                    <span>: ₹ {invoice.balanceAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 5. Terms & Conditions Box */}
              <div className="border-t-2 border-[#1e293b] p-2.5 sm:p-3 text-xs bg-slate-50">
                <span className="font-extrabold uppercase text-[#0F4C81] text-[9px] sm:text-[10px]">
                  Terms And Conditions:
                </span>
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-700 mt-0.5">
                  {invoice.termsAndConditions}
                </p>
              </div>

              {/* 6. Authorized Signatory Footer */}
              <div className="border-t-2 border-[#1e293b] flex justify-end bg-white">
                <div className="w-full sm:w-80 sm:border-l-2 border-[#1e293b] p-2.5 sm:p-3 text-center min-h-[90px] sm:min-h-[110px] flex flex-col justify-between bg-slate-50/40">
                  <div className="font-black text-[11px] sm:text-xs text-[#0F4C81]">
                    For ANIMEX ANIMAL HEALTH CARE PVT LTD:
                  </div>
                  <div className="pt-6 sm:pt-8">
                    <div className="w-28 sm:w-32 mx-auto border-b border-slate-400 mb-1"></div>
                    <div className="font-extrabold text-[10px] sm:text-[11px] text-slate-700">
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
