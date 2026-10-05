import React, { useState, useEffect, useRef } from 'react';
import { Invoice } from '../types';
import { Printer, X, CheckCircle2, Loader2, MessageSquare, Download, ExternalLink, Copy, Check } from 'lucide-react';
import { getStatusBadgeConfig } from '../utils/invoiceUtils';
import html2canvas from 'html2canvas';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useLanguage } from '../context/LanguageContext';

interface PreRenderedData {
  canvas: HTMLCanvasElement;
  base64Data: string;
  blob: Blob;
  file: File;
}

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
  const rawBal = Number(invoice.balanceAmount ?? 0);
  const isPaid = rawBal <= 1.0 || Math.round(rawBal) === 0;
  const resolvedStatus = invoice.status?.toUpperCase() === 'CANCELLED'
    ? 'CANCELLED'
    : isPaid
    ? 'PAID'
    : (Number(invoice.receivedAmount || 0) === 0 ? 'PENDING' : 'PARTIALLY PAID');
  const statusBadge = getStatusBadgeConfig(resolvedStatus);
  const effectiveBalance = isPaid ? 0 : rawBal;
  const effectiveReceived = isPaid ? Number(invoice.totalAmount || 0) : Number(invoice.receivedAmount || 0);

  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatingMsg, setGeneratingMsg] = useState<string>('');
  const [showDesktopGuideModal, setShowDesktopGuideModal] = useState<boolean>(false);
  const [desktopWebUrl, setDesktopWebUrl] = useState<string>('');
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [lastCaption, setLastCaption] = useState<string>('');
  const preRenderedDataRef = useRef<PreRenderedData | null>(null);
  const isPreRenderingRef = useRef<boolean>(false);

  const isNative = Capacitor.isNativePlatform();

  // Fetch company profile for bank details
  const companyProfile = (() => {
    try {
      const saved = localStorage.getItem('animex_company_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.accountNo === '389920194821' || parsed.bankName === 'State Bank of India') {
          parsed.bankName = 'Indian Overseas Bank';
          parsed.accountNo = '083602000001131';
          parsed.ifscCode = 'IOBA0000836';
          parsed.branch = 'POHEGAON';
          try { localStorage.setItem('animex_company_profile', JSON.stringify(parsed)); } catch {}
        }
        return parsed;
      }
    } catch {}
    return {
      companyName: 'ANIMEX ANIMAL HEALTH CARE PVT LTD',
      address: '0208/RVN Bahadurpur, Kopargaon Dist - A.Nagar 423605 Maharashtra',
      phone: '8799883858',
      email: 'animexanimalhealthcare@gmail.com',
      bankName: 'Indian Overseas Bank',
      accountNo: '083602000001131',
      ifscCode: 'IOBA0000836',
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

  // Helper to render the original color bill into a Canvas with Ultra-HD 2.4x resolution
  const generateBillCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const billElement = document.getElementById('printable-bill-area');
    if (!billElement) return null;

    // 2.4x Scale ensures high-density ~300 DPI Ultra-HD resolution
    // Text, tables, borders, and numbers appear razor-sharp and NEVER blurry ("bhurka")!
    const renderScale = 2.4;

    return await html2canvas(billElement, {
      scale: renderScale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 850,
      imageTimeout: 5000,
      onclone: (clonedDoc) => {
        const clonedBill = clonedDoc.getElementById('printable-bill-area');
        if (clonedBill) {
          // Lock cloned element to full standard printable width so it never wraps or shrinks on mobile
          clonedBill.style.width = '850px';
          clonedBill.style.maxWidth = '850px';
          clonedBill.style.minWidth = '850px';
          clonedBill.style.margin = '0 auto';
          clonedBill.style.transform = 'none';
        }
      },
    });
  };

  // Background Pre-Rendering to ensure 0ms instantaneous WhatsApp sharing!
  const doPreRender = async (): Promise<PreRenderedData | null> => {
    if (preRenderedDataRef.current) return preRenderedDataRef.current;
    if (isPreRenderingRef.current) {
      let waited = 0;
      while (isPreRenderingRef.current && waited < 4000) {
        await new Promise((r) => setTimeout(r, 100));
        waited += 100;
        if (preRenderedDataRef.current) return preRenderedDataRef.current;
      }
    }
    isPreRenderingRef.current = true;
    try {
      const canvas = await generateBillCanvas();
      if (!canvas) return null;

      const base64Data = canvas.toDataURL('image/png', 1.0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return null;

      const cleanStore = (invoice.billTo?.firmName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `ANIMEX_Bill_${masterInvoiceNo}_${cleanStore}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      const data: PreRenderedData = {
        canvas,
        base64Data,
        blob,
        file,
      };
      preRenderedDataRef.current = data;
      return data;
    } catch (e) {
      console.warn('Pre-render bill image error:', e);
      return null;
    } finally {
      isPreRenderingRef.current = false;
    }
  };

  useEffect(() => {
    preRenderedDataRef.current = null;
    // 350ms delay lets fonts, styles, and logos render fully in the DOM
    const timer = setTimeout(() => {
      doPreRender();
    }, 350);
    return () => clearTimeout(timer);
  }, [invoice.id, invoice.invoiceNo, masterInvoiceNo]);

  // 1. DIRECT INSTANT ORIGINAL BILL SHARE TO WHATSAPP (Sends the actual colorful Bill Image!)
  const handleDirectWhatsApp = async () => {
    try {
      let billData = preRenderedDataRef.current;
      if (!billData) {
        setIsGeneratingImage(true);
        setGeneratingMsg(isMr ? 'मूळ रंगीत बिल WhatsApp साठी तयार होत आहे...' : isHi ? 'WhatsApp के लिए बिल तैयार हो रहा है...' : 'Preparing bill image for WhatsApp...');
        billData = await doPreRender();
        setIsGeneratingImage(false);
      }

      if (!billData) {
        alert(isMr ? 'बिल फोटो तयार करण्यात त्रुटी आली.' : 'Failed to prepare bill image.');
        return;
      }

      const cleanPhone = getCleanCustomerPhone();
      const cleanStore = (invoice?.billTo?.firmName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `ANIMEX_Bill_${masterInvoiceNo}_${cleanStore}.png`;
      const caption = 
        `🏢 *${companyProfile?.companyName || 'ANIMEX ANIMAL HEALTH CARE PVT LTD'}*\n` +
        `📄 *Tax Invoice / Bill: #${masterInvoiceNo}*\n` +
        `🏥 *Customer:* ${invoice?.billTo?.firmName || 'Valued Customer'}\n` +
        `💰 *Total:* ₹${safeNum(invoice?.totalAmount).toFixed(2)}\n` +
        `📌 *Balance:* ${effectiveBalance > 0 ? `₹${effectiveBalance.toFixed(2)}` : '✓ PAID'}`;

      setLastCaption(caption);

      // A. On Native Android Mobile App (Capacitor):
      if (isNative) {
        try {
          // Send strictly the single bill image (which has the receipt details attached directly underneath)
          // Do NOT pass separate text parameter, so WhatsApp NEVER sends a separate text message first!
          await WhatsAppOpener.openWhatsAppWithImage({
            imageBase64: billData.base64Data,
            fileName: fileName,
          });
          return;
        } catch (pluginErr) {
          console.warn('Native openWhatsAppWithImage failed, fallback to Share:', pluginErr);
          try {
            await Share.share({
              title: `ANIMEX Bill #${masterInvoiceNo}`,
              dialogTitle: isMr ? 'WhatsApp निवडा' : 'Select WhatsApp',
            });
            return;
          } catch (e) {
            console.error('Share fallback error:', e);
            return;
          }
        }
      }

      // B. On Web / Desktop PC / Laptop Browser:
      // 1. Immediately copy the real bill image to clipboard
      try {
        if (billData.blob && navigator.clipboard && (window as any).ClipboardItem) {
          const item = new (window as any).ClipboardItem({ 'image/png': billData.blob });
          await navigator.clipboard.write([item]);
        }
      } catch (clipErr) {
        console.warn('Clipboard image write error:', clipErr);
      }

      // 2. If Web Share API supports file sharing:
      if (typeof navigator !== 'undefined' && (navigator as any).canShare && (navigator as any).canShare({ files: [billData.file] })) {
        try {
          await (navigator as any).share({
            files: [billData.file],
            title: `ANIMEX Bill #${masterInvoiceNo}`,
          });
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return;
          console.warn('Web file share error:', shareErr);
        }
      }

      // 3. Auto-download the HD Bill PNG so the file is ready on PC
      try {
        const downloadLink = document.createElement('a');
        downloadLink.href = billData.base64Data;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } catch (dlErr) {
        console.warn('Auto download error:', dlErr);
      }

      // 4. Desktop PC / Mobile Browser WhatsApp Launch:
      const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobileDevice) {
        // Direct WhatsApp chat without separate text, so both bill + receipt go in the single image!
        const targetUrl = cleanPhone
          ? `https://api.whatsapp.com/send?phone=${cleanPhone}`
          : `https://api.whatsapp.com/send`;
        window.location.href = targetUrl;
      } else {
        // Desktop PC (Windows): Launch WhatsApp Desktop cleanly
        const desktopProtocolUrl = cleanPhone
          ? `whatsapp://send?phone=${cleanPhone}`
          : `whatsapp://send`;

        const webUrl = cleanPhone
          ? `https://web.whatsapp.com/send?phone=${cleanPhone}`
          : `https://web.whatsapp.com`;
        
        setDesktopWebUrl(webUrl);

        try {
          window.location.href = desktopProtocolUrl;
        } catch (e) {
          console.warn('Desktop protocol launch error:', e);
        }

        // Show guide popup with Ctrl+V instruction
        setShowDesktopGuideModal(true);
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
      
      let billData = preRenderedDataRef.current;
      if (!billData) {
        billData = await doPreRender();
      }
      if (!billData) return;

      const cleanStore = (invoice.billTo?.firmName || 'Medical_Store').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `ANIMEX_Bill_${masterInvoiceNo}_${cleanStore}.png`;

      // Native Android App: Save to Documents directory
      if (isNative) {
        const base64Raw = billData.base64Data.split(',')[1];
        await Filesystem.writeFile({
          path: fileName,
          data: base64Raw,
          directory: Directory.Documents,
        });
        alert(isMr ? `रंगीत बिल फोटो सेव्ह झाला आहे!\nफाईल: ${fileName}\n(Documents फोल्डरमध्ये उपलब्ध)` : `Bill photo saved successfully!\nFile: ${fileName}\n(Saved to Documents folder)`);
        return;
      }

      // Web Browser
      const a = document.createElement('a');
      a.href = billData.base64Data;
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
            style={{
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textRendering: 'optimizeLegibility',
            }}
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

                  <div className="pt-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase border ${statusBadge.badgeClass}`}>
                      ● {statusBadge.label} {effectiveBalance > 0 && effectiveReceived > 0 ? `(₹${effectiveReceived.toFixed(0)} Paid)` : ''}
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
                      <th className="p-1.5 sm:p-2 border-r border-[#cbd5e1] text-right w-24 sm:w-28">Price / Unit (₹)</th>
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

              {/* 4. Subtotal, Words, Bank Details & Balance Summary (Equal 50/50 split matching signature boxes) */}
              <div className="border-t-2 border-[#1e293b] grid grid-cols-2 divide-x-2 divide-[#1e293b] bg-white">
                {/* Bank Details For Payment Transfer (50% Width) */}
                <div className="p-2.5 sm:p-3 flex flex-col justify-between bg-slate-50/50">
                  <div className="space-y-2">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-[#0F4C81] block">
                      ✓ Bank Details For Payment Transfer (RTGS / NEFT / UPI):
                    </span>
                    <div className="text-[10px] sm:text-[11px] font-medium text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5 shadow-xs">
                      <div className="text-center font-bold text-slate-900 pb-1 border-b border-slate-100 text-xs sm:text-[12px]">
                        Bank: <span className="font-extrabold text-[#0F4C81]">{companyProfile.bankName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-0.5 px-1">
                        <div>
                          IFSC: <strong className="font-mono font-bold text-slate-900">{companyProfile.ifscCode}</strong>
                        </div>
                        <div>
                          A/C No: <strong className="font-mono font-bold text-slate-900">{companyProfile.accountNo}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 italic border-t border-slate-200 pt-2 mt-3">
                    Thank you for your valued partnership with ANIMEX ANIMAL HEALTH CARE PVT LTD.
                  </div>
                </div>

                {/* Totals Summary Column (50% Width) */}
                <div className="text-xs font-bold divide-y divide-[#cbd5e1] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between p-2">
                      <span className="text-slate-600">Sub Total</span>
                      <span className="font-extrabold text-slate-900">: ₹ {invoice.subTotal.toFixed(2)}</span>
                    </div>

                    {invoice.discount !== undefined && invoice.discount > 0 && (
                      <div className="flex justify-between p-2 text-red-600 bg-red-50/50">
                        <span>{isMr ? 'सूट' : 'Trade Discount'}</span>
                        <span className="font-bold">: - ₹ {invoice.discount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between p-2 font-black text-xs sm:text-sm bg-[#f8fafc] text-[#0F4C81]">
                      <span>Total Net Amount</span>
                      <span>: ₹ {invoice.totalAmount.toFixed(2)}</span>
                    </div>

                    {/* Amount in Words Box */}
                    <div className="p-2 sm:p-2.5 bg-[#eff6ff] rounded-md border border-blue-100 mx-2 my-1">
                      <div className="text-[9px] uppercase font-black text-[#0F4C81]">
                        Invoice Amount In Words:
                      </div>
                      <div className="font-black text-[11px] sm:text-xs text-[#F97316] mt-0.5 italic">
                        "{invoice.amountInWords}"
                      </div>
                    </div>

                    <div className="flex justify-between p-2 text-slate-700">
                      <span>Received Amount ({invoice.paymentType || 'UPI'})</span>
                      <span>: ₹ {effectiveReceived.toFixed(2)}</span>
                    </div>
                  </div>

                  {effectiveBalance > 0 ? (
                    <div className="flex justify-between p-2 font-black text-xs bg-[#fef2f2] text-red-700 border-t border-[#cbd5e1]">
                      <span>{isMr ? 'बाकी रक्कम' : 'Balance Due'}</span>
                      <span>: ₹ {effectiveBalance.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between p-2 font-black text-xs bg-[#ecfdf5] text-emerald-700 border-t border-[#cbd5e1]">
                      <span>{isMr ? 'पेमेंट स्थिती' : 'Payment Status'}</span>
                      <span>: ✓ {isMr ? 'पूर्ण जमा (PAID)' : 'PAID IN FULL'}</span>
                    </div>
                  )}
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

              {/* 6. Dual Signatory Footer: Left = Receiver's Signature, Right = Authorized Signatory */}
              <div className="border-t-2 border-[#1e293b] grid grid-cols-2 divide-x-2 divide-[#1e293b] bg-white">
                {/* Left: Receiver's Signature */}
                <div className="p-2.5 sm:p-3 text-center min-h-[90px] sm:min-h-[110px] flex flex-col justify-between bg-slate-50/20">
                  <div className="font-black text-[11px] sm:text-xs text-[#0F4C81]">
                    Receiver's Signature:
                  </div>
                  <div className="pt-6 sm:pt-8">
                    <div className="w-28 sm:w-36 mx-auto border-b border-slate-400 mb-1"></div>
                    <div className="font-extrabold text-[10px] sm:text-[11px] text-slate-600">
                      Customer Signature
                    </div>
                  </div>
                </div>

                {/* Right: Company Authorized Signatory */}
                <div className="p-2.5 sm:p-3 text-center min-h-[90px] sm:min-h-[110px] flex flex-col justify-between bg-slate-50/40">
                  <div className="font-black text-[11px] sm:text-xs text-[#0F4C81]">
                    For ANIMEX ANIMAL HEALTH CARE PVT LTD:
                  </div>
                  <div className="pt-6 sm:pt-8">
                    <div className="w-28 sm:w-36 mx-auto border-b border-slate-400 mb-1"></div>
                    <div className="font-extrabold text-[10px] sm:text-[11px] text-slate-700">
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attached WhatsApp Bill Receipt Summary Strip directly under the Bill (Matches WhatsApp Card Format) */}
            <div className="mt-3 p-3.5 bg-[#d9fdd3] border border-[#86efac] rounded-xl text-left space-y-1 print:mt-1 print:p-2 shadow-xs font-sans">
              <div className="font-black text-xs sm:text-sm text-slate-950 flex items-center gap-1.5 uppercase tracking-wide">
                <span>🏢</span>
                <span>{companyProfile?.companyName || 'ANIMEX ANIMAL HEALTH CARE PVT LTD'}</span>
              </div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>📄</span>
                <span>Tax Invoice / Bill: <strong>#{masterInvoiceNo}</strong></span>
              </div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>🏥</span>
                <span>Customer: <strong>{invoice?.billTo?.firmName || 'Valued Customer'}</strong></span>
              </div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>💰</span>
                <span>Total: <strong>₹{safeNum(invoice?.totalAmount).toFixed(2)}</strong></span>
              </div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>📌</span>
                <span>Balance: <strong>{effectiveBalance <= 0 ? '✓ PAID' : `₹${effectiveBalance.toFixed(2)}`}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop WhatsApp Quick Helper Modal/Toast */}
        {showDesktopGuideModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
            <div className="bg-slate-800 border-2 border-emerald-500 text-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-base">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>{isMr ? 'WhatsApp उघडत आहे!' : 'WhatsApp Opening!'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDesktopGuideModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-200">
                <div className="bg-emerald-950/60 border border-emerald-700/60 rounded-xl p-3 flex items-start gap-2.5">
                  <span className="text-xl shrink-0">📋</span>
                  <div>
                    <p className="font-black text-emerald-300">
                      {isMr ? 'मूळ Ultra-HD बिल फोटो Clipboard वर कॉपी झाला आहे!' : 'Original Ultra-HD bill image copied to Clipboard!'}
                    </p>
                    <p className="text-[11px] text-slate-200 mt-1">
                      {isMr
                        ? 'WhatsApp मध्ये ज्या व्यक्तीला बिल पाठवायचे आहे त्यांचे नाव सर्च करा आणि फक्त '
                        : 'In WhatsApp, search contact name and simply press '}
                      <kbd className="bg-slate-900 border border-emerald-400 text-emerald-300 px-1.5 py-0.5 rounded font-black text-[11px]">
                        Ctrl + V
                      </kbd>
                      {isMr ? ' (Paste) दाबा व Send करा!' : ' (Paste) and hit Send!'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-slate-300">
                  <span className="text-xl shrink-0">📥</span>
                  <div>
                    <p className="font-bold text-white">
                      {isMr ? 'HD बिल फोटो Downloads फोल्डरमध्येही सेव्ह झाला आहे.' : 'HD bill file also saved to Downloads folder.'}
                    </p>
                    <p className="text-slate-400 mt-0.5">
                      {isMr ? 'हवे असल्यास तुम्ही डाऊनलोड झालेला फोटो थेट WhatsApp मध्ये ड्रॅग करू शकता.' : 'You can also drag-drop the downloaded image directly into chat.'}
                    </p>
                  </div>
                </div>

                {lastCaption && (
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">
                        {isMr ? 'बिलाखालील कॅप्शन (Caption):' : 'Caption below the Bill:'}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(lastCaption);
                            setCopiedCaption(true);
                            setTimeout(() => setCopiedCaption(false), 2000);
                          } catch (e) {
                            console.warn('Copy caption error:', e);
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                      >
                        {copiedCaption ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-white" />}
                        <span>{copiedCaption ? (isMr ? 'कॉपी झाले!' : 'Copied!') : (isMr ? 'कॅप्शन कॉपी करा' : 'Copy Caption')}</span>
                      </button>
                    </div>
                    <pre className="text-[10px] text-emerald-300 font-mono whitespace-pre-wrap bg-slate-950 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                      {lastCaption}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700">
                {desktopWebUrl && (
                  <a
                    href={desktopWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-sky-400 hover:text-sky-300 underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isMr ? 'WhatsApp Web उघडा' : 'Open WhatsApp Web'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setShowDesktopGuideModal(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer ml-auto"
                >
                  {isMr ? 'समजले (OK)' : 'Got It (OK)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
