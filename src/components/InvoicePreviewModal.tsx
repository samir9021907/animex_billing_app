import React, { useState } from 'react';
import { Invoice } from '../types';
import { Printer, Share2, X, CheckCircle2, Loader2, ExternalLink, Copy, Check, MessageSquare, Download } from 'lucide-react';
import { getStatusBadgeConfig } from '../utils/invoiceUtils';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface InvoicePreviewModalProps {
  invoice: Invoice;
  allInvoices?: Invoice[];
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  onClose,
}) => {
  // Master continuous Bill Number matching animex_frontend
  const masterInvoiceNo = invoice.companyInvoiceNumber || invoice.invoiceNo;
  const statusBadge = getStatusBadgeConfig(
    invoice.status || (invoice.balanceAmount === 0 ? 'PAID' : invoice.receivedAmount === 0 ? 'PENDING' : 'PARTIALLY PAID')
  );

  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatingMsg, setGeneratingMsg] = useState<string>('');
  const [showWhatsAppWebModal, setShowWhatsAppWebModal] = useState<boolean>(false);
  const [whatsAppWebUrl, setWhatsAppWebUrl] = useState<string>('');
  const [copiedToClipboard, setCopiedToClipboard] = useState<boolean>(false);
  const [lastGeneratedBlob, setLastGeneratedBlob] = useState<Blob | null>(null);

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
      phone: '9307990811',
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
    if (!invoice.billTo?.phone) return '';
    let digits = invoice.billTo.phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.substring(1);
    }
    if (digits.length === 10) {
      return '91' + digits;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits;
    }
    return digits;
  };



  // Helper to render the original color bill into a Canvas with optimized mobile performance
  const generateBillCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const billElement = document.getElementById('printable-bill-area');
    if (!billElement) return null;

    // Fast scale: on mobile 1.25x produces crisp HD image in ~200ms (50% faster than 1.8x)
    const renderScale = isMobile ? 1.25 : 1.6;

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

  const handleReCopyImage = async () => {
    if (!lastGeneratedBlob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': lastGeneratedBlob }),
        ]);
        setCopiedToClipboard(true);
        setTimeout(() => setCopiedToClipboard(false), 3000);
      } else {
        alert('फोटो Clipboard वर कॉपी करण्यास सपोर्ट नाही. डाऊनलोड झालेला फोटो वापरा.');
      }
    } catch (e) {
      console.warn('Re-copy failed:', e);
      alert('फोटो कॉपी करण्यात अडचण आली. डाऊनलोड झालेला फोटो वापरा.');
    }
  };

  // 2. Share the REAL COLOR BILL IMAGE directly to WhatsApp / Android Share Sheet
  const handleWhatsAppPhotoShare = async () => {
    try {
      setIsGeneratingImage(true);
      setGeneratingMsg('रंगीत बिलाचा फोटो तयार होत आहे (Processing)...');

      const canvas = await generateBillCanvas();
      if (!canvas) {
        throw new Error('Bill area not found.');
      }

      const cleanStore = (invoice.billTo?.firmName || 'Medical_Store').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `ANIMEX_Bill_${masterInvoiceNo}_${cleanStore}.png`;
      const cleanPhone = getCleanCustomerPhone();
      const captionText = `*ANIMEX ANIMAL HEALTH CARE PVT LTD*\n📄 *Bill / Invoice No:* #${masterInvoiceNo}\n🏥 *Customer:* ${invoice.billTo?.firmName || 'Medical Store'}\n💰 *Net Total:* ₹${(invoice.totalAmount || 0).toFixed(2)}\n📌 *Balance Due:* ₹${(invoice.balanceAmount || 0).toFixed(2)}\n\n✅ *मूळ रंगीत बिल (Original Color Bill)*`;

      // NATIVE ANDROID MOBILE (Capacitor App)
      if (isNative) {
        setGeneratingMsg('WhatsApp उघडत आहे (Opening WhatsApp)...');
        // Extract pure base64 data
        const base64Data = canvas.toDataURL('image/png', 0.95).split(',')[1];

        // Save image to Cache directory
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        // Trigger native Android share sheet (shares original PNG image into WhatsApp)
        await Share.share({
          title: `ANIMEX Bill #${masterInvoiceNo} - ${invoice.billTo?.firmName || 'Store'}`,
          text: captionText,
          files: [savedFile.uri],
          dialogTitle: 'WhatsApp निवडा (Select WhatsApp)',
        });
        return;
      }

      // MOBILE WEB BROWSER
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
      });

      if (!blob) {
        throw new Error('Failed to generate image file.');
      }
      setLastGeneratedBlob(blob);

      const file = new File([blob], fileName, { type: 'image/png' });

      // If mobile browser supports Web Share Level 2 file sharing
      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        setGeneratingMsg('WhatsApp उघडत आहे...');
        await navigator.share({
          files: [file],
          title: `ANIMEX Bill #${masterInvoiceNo} - ${invoice.billTo?.firmName || 'Store'}`,
          text: captionText,
        });
        return;
      }

      // DESKTOP BROWSER (Chrome / Edge):
      // 1. Copy image directly to Clipboard for instant Ctrl+V in WhatsApp Web
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopiedToClipboard(true);
          setTimeout(() => setCopiedToClipboard(false), 4000);
        } catch (clipErr) {
          console.warn('Clipboard image copy failed:', clipErr);
        }
      }

      // 2. Download HD image file to Downloads folder
      setGeneratingMsg('रंगीत फोटो डाऊनलोड होत आहे...');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 3. Open WhatsApp Web directly
      const targetUrl = cleanPhone
        ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(captionText)}`
        : `https://web.whatsapp.com/send?text=${encodeURIComponent(captionText)}`;

      window.open(targetUrl, '_blank');
      setWhatsAppWebUrl(targetUrl);
      setShowWhatsAppWebModal(true);

    } catch (err: any) {
      if (err.name !== 'AbortError' && !err.message?.toLowerCase().includes('cancel')) {
        console.error('WhatsApp share error:', err);
        alert('WhatsApp शेअर करताना त्रुटी आली: ' + (err.message || 'कृपया Save Photo वापरा.'));
      }
    } finally {
      setIsGeneratingImage(false);
      setGeneratingMsg('');
    }
  };

  // 3. Download the REAL COLOR BILL as an HD image file to Phone / PC
  const handleDownloadPhoto = async () => {
    try {
      setIsGeneratingImage(true);
      setGeneratingMsg('रंगीत फोटो सेव्ह होत आहे (Saving HD Photo)...');
      const canvas = await generateBillCanvas();
      if (!canvas) return;

      const cleanStore = (invoice.billTo?.firmName || 'Medical_Store').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `ANIMEX_Bill_${masterInvoiceNo}_${cleanStore}.png`;

      // Native Android App: Save to Documents directory or trigger share
      if (isNative) {
        const base64Data = canvas.toDataURL('image/png', 0.95).split(',')[1];
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });
        alert(`रंगीत बिल फोटो सेव्ह झाला आहे!\nफाईल: ${fileName}\n(Documents फोल्डरमध्ये उपलब्ध)`);
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
      alert('फोटो सेव्ह करताना त्रुटी आली: ' + (err.message || 'Failed'));
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
            {/* 1. WhatsApp Button - Shares Original Colorful Bill directly */}
            <button
              type="button"
              onClick={handleWhatsAppPhotoShare}
              disabled={isGeneratingImage}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black px-3.5 sm:px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 active:scale-95"
              title="WhatsApp वर ओरिजिनल बिल पाठवा (Share Original Bill on WhatsApp)"
            >
              {isGeneratingImage ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
              ) : (
                <MessageSquare className="w-4 h-4 text-emerald-200 fill-emerald-200/20" />
              )}
              <span>WhatsApp</span>
            </button>

            {/* 2. Save Photo Button */}
            <button
              type="button"
              onClick={handleDownloadPhoto}
              disabled={isGeneratingImage}
              className="bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-black px-3 sm:px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 active:scale-95"
              title="रंगीत बिल फोटो सेव्ह करा (Save Photo)"
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
            <span>{generatingMsg || 'मूळ रंगीत बिल तयार होत आहे...'}</span>
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
            <div className="flex items-center justify-between border-b-2 border-[#0F4C81] pb-2.5 mb-3 pt-2">
              <div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#F97316] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                  OFFICIAL TAX INVOICE / BILL OF SUPPLY
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0F4C81] uppercase mt-0.5">
                  Bill of Supply
                </h1>
              </div>

              <div className="text-right">
                <span className="bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider inline-block">
                  ISO 9001:2015 & GMP CERTIFIED
                </span>
              </div>
            </div>

            {/* Master Outer Container Box */}
            <div className="border-2 border-[#1e293b] bg-white rounded-lg overflow-hidden">
              {/* 1. Header Box with Logo & Company Details */}
              <div className="border-b-2 border-[#1e293b] p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-5 bg-gradient-to-r from-slate-50 to-white text-center sm:text-left">
                {/* Logo Area */}
                <div className="w-28 sm:w-36 h-16 sm:h-24 flex items-center justify-center shrink-0 bg-white p-1.5 border border-slate-200 rounded-xl shadow-sm">
                  <img
                    src="/images/logo image.jpg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/logo.png';
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
                      Helpline: <strong className="text-[#F97316]">9307990811 / 8999323908</strong>
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
                    Bill To (Medical Store):
                  </span>
                  <div className="font-black text-xs sm:text-sm text-[#0F4C81] mt-0.5">
                    {invoice.billTo?.firmName || 'Valued Customer'}
                  </div>
                  {invoice.billTo?.contactName && (
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
                      ● {statusBadge.label} {invoice.balanceAmount > 0 && invoice.receivedAmount > 0 ? `(₹${invoice.receivedAmount.toFixed(0)} Paid)` : ''}
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
                      <span>Trade Discount (सवलत)</span>
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
                    <span>Balance Due (बाकी)</span>
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

      {/* WhatsApp Web Guidance Modal on Desktop */}
      {showWhatsAppWebModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900 dark:text-white">WhatsApp Web (Chrome)</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">रंगीत बिल शेअरिंग मार्गदर्शन</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsAppWebModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl p-3.5 space-y-1.5">
                <div className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>रंगीत बिल आपोआप Copy (कॉपी) झाले आहे!</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                  Chrome मधील WhatsApp Web चॅट उघडल्यावर फक्त <span className="font-black bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-white px-2 py-0.5 rounded text-[11px]">Ctrl + V</span> दाबा (Paste करा) आणि पाठवून द्या!
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  💡 माहिती:
                </div>
                <p>
                  • तुमच्या कॉम्प्युटरवर डाऊनलोड फोल्डरमध्येही रंगीत फोटो सेव्ह झाला आहे.
                </p>
                <p>
                  • जर WhatsApp Web आपोआप उघडले नसेल तर खालील हिरव्या बटणावर क्लिक करा.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {whatsAppWebUrl && (
                <a
                  href={whatsAppWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>WhatsApp Web चॅट उघडा (Open WhatsApp Web)</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleReCopyImage}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-300 dark:border-slate-600"
              >
                {copiedToClipboard ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">फोटो पुन्हा क्लिपबोर्डवर कॉपी झाला!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    <span>रंगीत फोटो पुन्हा Copy करा</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowWhatsAppWebModal(false)}
                className="w-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold text-xs py-1.5 text-center transition-colors cursor-pointer"
              >
                बंद करा (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
