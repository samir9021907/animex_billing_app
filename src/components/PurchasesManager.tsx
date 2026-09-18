import React, { useState } from 'react';
import {
  Factory,
  Plus,
  Search,
  Calendar,
  Building2,
  Trash2,
  Printer,
  X,
  CheckCircle2,
  Clock,
  Boxes,
  AlertCircle,
} from 'lucide-react';
import { Product, PurchaseInvoice, PurchaseItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { cleanPhoneNumber, validatePhone, validateName } from '../utils/validators';

interface PurchasesManagerProps {
  purchases: PurchaseInvoice[];
  products: Product[];
  onSavePurchase: (purchase: PurchaseInvoice, newProductsCreated?: Product[]) => void;
  onDeletePurchase: (purchaseId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const PurchasesManager: React.FC<PurchasesManagerProps> = ({
  purchases,
  products,
  onSavePurchase,
  onDeletePurchase,
  onNavigateTab,
}) => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL');

  // New Purchase Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewPurchase, setPreviewPurchase] = useState<PurchaseInvoice | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [billNo, setBillNo] = useState(`MFG-${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState('Apex Pharma Laboratories Pvt. Ltd.');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierCity, setSupplierCity] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [notes, setNotes] = useState('Third-party manufacturing inward batch');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Items in inward bill
  const [items, setItems] = useState<Array<{
    productId: string;
    productName: string;
    isCustomNewProduct: boolean;
    newProductCategory: string;
    newProductUnit: string;
    newProductMrp: number;
    newProductSellingPrice: number;
    batchNo: string;
    mfgDate: string;
    expDate: string;
    boxes: number;
    unitsPerBox: number;
    looseUnits: number;
    costPerUnit: number;
  }>>([
    {
      productId: products[4]?.id || products[0]?.id || 'p5',
      productName: products[4]?.name || products[0]?.name || 'Rumen mex (300ml)',
      isCustomNewProduct: false,
      newProductCategory: 'Rumen & Gut Health',
      newProductUnit: 'Ml',
      newProductMrp: 240,
      newProductSellingPrice: 210,
      batchNo: `RN-${Math.floor(2000 + Math.random() * 9000)}`,
      mfgDate: '09/2026',
      expDate: '08/2028',
      boxes: 15,
      unitsPerBox: products[4]?.boxCapacity || 100,
      looseUnits: 0,
      costPerUnit: 110,
    },
  ]);

  // Financial calculations
  const totalAmount = items.reduce((sum, it) => {
    const totalUnits = (Number(it.boxes) || 0) * (Number(it.unitsPerBox) || 0) + (Number(it.looseUnits) || 0);
    return sum + totalUnits * (Number(it.costPerUnit) || 0);
  }, 0);

  const balanceAmount = Math.max(0, totalAmount - (Number(paidAmount) || 0));

  const handleOpenAddModal = () => {
    setBillNo(`MFG-${Math.floor(100 + Math.random() * 900)}`);
    setDate(new Date().toISOString().split('T')[0]);
    setSupplierName('Apex Pharma Laboratories Pvt. Ltd.');
    setSupplierPhone('9822334455');
    setSupplierCity('Ahmedabad, Gujarat');
    setSupplierGstin('24AAACA1234F1Z5');
    setNotes('Third-party manufacturing inward batch');

    const defaultProd = products[4] || products[0];
    const defaultBoxCap = defaultProd?.boxCapacity || 100;

    setItems([
      {
        productId: defaultProd?.id || 'p5',
        productName: defaultProd?.name || 'Rumen mex (300ml)',
        isCustomNewProduct: false,
        newProductCategory: defaultProd?.category || 'Rumen & Gut Health',
        newProductUnit: defaultProd?.defaultUnit || 'Ml',
        newProductMrp: defaultProd?.mrp || 240,
        newProductSellingPrice: defaultProd?.defaultPrice || 210,
        batchNo: `RN-${Math.floor(2000 + Math.random() * 9000)}`,
        mfgDate: '09/2026',
        expDate: '08/2028',
        boxes: 15,
        unitsPerBox: defaultBoxCap,
        looseUnits: 0,
        costPerUnit: 110,
      },
    ]);

    const initialTotal = 15 * defaultBoxCap * 110;
    setPaidAmount(initialTotal);
    setShowAddModal(true);
  };

  const handleAddItemRow = () => {
    const firstProd = products[0];
    setItems([
      ...items,
      {
        productId: firstProd?.id || `p-${Date.now()}`,
        productName: firstProd?.name || 'ANIMEX Product',
        isCustomNewProduct: false,
        newProductCategory: firstProd?.category || 'Calcium Supplements',
        newProductUnit: firstProd?.defaultUnit || 'Ltr',
        newProductMrp: firstProd?.mrp || 350,
        newProductSellingPrice: firstProd?.defaultPrice || 300,
        batchNo: `BT-${Math.floor(1000 + Math.random() * 9000)}`,
        mfgDate: '09/2026',
        expDate: '08/2028',
        boxes: 10,
        unitsPerBox: firstProd?.boxCapacity || 50,
        looseUnits: 0,
        costPerUnit: 150,
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (items.length === 1) {
      alert('कमीत कमी १ उत्पादन असणे आवश्यक आहे.');
      return;
    }
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleProductSelect = (index: number, pId: string) => {
    const updated = [...items];
    if (pId === 'NEW_PRODUCT') {
      updated[index] = {
        ...updated[index],
        productId: `p-${Date.now()}-${Math.floor(Math.random() * 100)}`,
        productName: '',
        isCustomNewProduct: true,
        boxes: 10,
        unitsPerBox: 100,
        costPerUnit: 100,
      };
    } else {
      const prod = products.find((p) => p.id === pId);
      if (prod) {
        updated[index] = {
          ...updated[index],
          productId: prod.id,
          productName: prod.name,
          isCustomNewProduct: false,
          unitsPerBox: prod.boxCapacity || 50,
          newProductUnit: prod.defaultUnit,
          newProductMrp: prod.mrp || 0,
          newProductSellingPrice: prod.defaultPrice,
        };
      }
    }
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Supplier Name
    const suppErr = validateName(supplierName, 'सप्लायर / कंपनीचे नाव (Supplier Name)', 2);
    if (suppErr) {
      setFormError(suppErr);
      return;
    }

    // 2. Validate Bill No
    const billErr = validateName(billNo, 'खरेदी बिल नंबर (Bill No)', 2);
    if (billErr) {
      setFormError(billErr);
      return;
    }

    // 3. Validate Supplier Phone if entered (must be 10 digits starting with 6-9)
    if (supplierPhone && supplierPhone.trim()) {
      const phoneErr = validatePhone(supplierPhone, 'सप्लायर फोन नंबर (Phone)', false);
      if (phoneErr) {
        setFormError(phoneErr);
        return;
      }
    }

    // 4. Validate items
    if (!items || items.length === 0) {
      setFormError('किमान एक औषध (Medicine Item) जोडणे आवश्यक आहे.');
      return;
    }

    for (const it of items) {
      const totalUnits = (Number(it.boxes) || 0) * (Number(it.unitsPerBox) || 0) + (Number(it.looseUnits) || 0);
      if (totalUnits <= 0) {
        setFormError(`'${it.productName || 'Item'}' साठी संख्या (नग / बॉक्सेस) ० पेक्षा जास्त असावी.`);
        return;
      }
      if (Number(it.costPerUnit) <= 0) {
        setFormError(`'${it.productName || 'Item'}' साठी खरेदी दर (Cost per Unit) ० पेक्षा जास्त असावा.`);
        return;
      }
    }

    setFormError(null);

    const newCreatedProducts: Product[] = [];

    const purchaseItems: PurchaseItem[] = items.map((it) => {
      let finalProdId = it.productId;
      let finalProdName = it.productName.trim();

      // If this is a newly launched product, register it
      if (it.isCustomNewProduct) {
        if (!finalProdName) {
          finalProdName = 'New ANIMEX Medicine';
        }
        const newProd: Product = {
          id: finalProdId,
          name: finalProdName,
          category: it.newProductCategory || 'General Veterinary',
          defaultUnit: it.newProductUnit || 'Ml',
          mrp: Number(it.newProductMrp) || 0,
          defaultPrice: Number(it.newProductSellingPrice) || Number(it.costPerUnit) * 1.5,
          boxCapacity: Number(it.unitsPerBox) || 50,
          stockQuantity: 0,
          minStockAlert: 50,
        };
        newCreatedProducts.push(newProd);
      }

      const existingProd = products.find((p) => p.id === finalProdId);
      const prevStock = existingProd?.stockQuantity ?? 0;
      const totalUnits = (Number(it.boxes) || 0) * (Number(it.unitsPerBox) || 0) + (Number(it.looseUnits) || 0);
      const totalCost = totalUnits * (Number(it.costPerUnit) || 0);

      return {
        id: `pi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        productId: finalProdId,
        productName: finalProdName,
        batchNo: it.batchNo.trim() || 'STD-01',
        mfgDate: it.mfgDate.trim(),
        expDate: it.expDate.trim(),
        boxes: Number(it.boxes) || 0,
        unitsPerBox: Number(it.unitsPerBox) || 0,
        looseUnits: Number(it.looseUnits) || 0,
        totalUnits,
        costPerUnit: Number(it.costPerUnit) || 0,
        totalCost,
        previousStock: prevStock,
        newStock: prevStock + totalUnits,
      };
    });

    const status: 'PAID' | 'PARTIAL' | 'UNPAID' =
      paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

    const formattedDate = date.split('-').reverse().join('-');

    const newPurchase: PurchaseInvoice = {
      id: `pur-${Date.now()}`,
      billNo: billNo.trim(),
      date: formattedDate,
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim(),
      supplierCity: supplierCity.trim(),
      supplierGstin: supplierGstin.trim(),
      items: purchaseItems,
      totalAmount,
      paidAmount: Number(paidAmount) || 0,
      balanceAmount,
      paymentStatus: status,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSavePurchase(newPurchase, newCreatedProducts.length > 0 ? newCreatedProducts : undefined);
    setShowAddModal(false);
  };

  const handleDelete = (pur: PurchaseInvoice) => {
    const confirmMsg = language === 'en'
      ? `Warning! Deleting this purchase bill (${pur.billNo} - ${pur.supplierName}) will automatically reverse and deduct the received stock from your godown.\n\nAre you sure you want to proceed?`
      : language === 'hi'
      ? `सावधान! यह खरीद बिल (${pur.billNo} - ${pur.supplierName}) हटाने पर गोदाम में जुड़ा हुआ स्टॉक अपने आप कम हो जाएगा। क्या आप वाकई हटाना चाहते हैं?`
      : `सावधान! हे खरेदी बिल (${pur.billNo} - ${pur.supplierName}) डिलीट केल्यास या बिलातून गोदामात जमा झालेला साठा आपोआप मायनस होईल.\n\nतुम्हाला खात्री आहे का?`;

    if (window.confirm(confirmMsg)) {
      onDeletePurchase(pur.id);
    }
  };

  // Filtered purchases
  const filteredPurchases = purchases.filter((pur) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      pur.billNo.toLowerCase().includes(q) ||
      pur.supplierName.toLowerCase().includes(q) ||
      pur.items.some((it) => it.productName.toLowerCase().includes(q) || it.batchNo.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || pur.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI calculations
  const totalSpend = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalPaid = purchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalPending = Math.max(0, totalSpend - totalPaid);
  const totalBatches = purchases.reduce((sum, p) => sum + p.items.length, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 md:pb-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0D2A4D] to-[#1E3A8A] rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-amber-300">
              {t('pur.badge')}
            </span>
            <span className="text-slate-300 text-xs font-semibold">
              {t('pur.subtitleBadge')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t('pur.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {t('pur.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={() => onNavigateTab('products')}
            className="bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold px-4 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 border border-white/15 transition-all cursor-pointer"
          >
            <Boxes className="w-4 h-4 text-emerald-300" />
            <span>{t('pur.checkStock')}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="bg-gradient-to-r from-[#FF7A00] to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-black px-5 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pur.recordNew')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">{t('pur.totalSpend')}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Factory className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            ₹{totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-blue-600 font-semibold">{purchases.length} {language === 'en' ? 'Inward Bills' : language === 'hi' ? 'खरीद बिल' : 'मॅन्युफॅक्चरिंग बिले'}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">{t('pur.paidAmount')}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">Paid Amount</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">{t('pur.balancePending')}</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400">
            ₹{totalPending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-red-500 font-semibold">Pending Balance</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">{t('pur.totalBatches')}</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
            {totalBatches}
          </p>
          <span className="text-[10px] text-purple-600 font-semibold">Inward Batches</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={t('pur.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['ALL', 'PAID', 'PARTIAL', 'UNPAID'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Invoices List */}
      <div className="space-y-4">
        {filteredPurchases.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
            <Factory className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              {t('pur.emptyState')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'en'
                ? 'Click "+ Record Purchase Bill" above to inward new stock from manufacturers.'
                : language === 'hi'
                ? 'फैक्ट्री से नया माल आवक दर्ज करने के लिए ऊपर दिए गए "+ नया खरीद बिल दर्ज करें" बटन का उपयोग करें।'
                : 'नवीन मालाची आवक नोंदवण्यासाठी वरील "+ नवीन खरेदी बिल नोंदवा" बटण वापरा.'}
            </p>
          </div>
        ) : (
          filteredPurchases.map((pur) => {
            const totalUnitsInBill = pur.items.reduce((s, it) => s + it.totalUnits, 0);

            return (
              <div
                key={pur.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 text-animex-blue-600 flex items-center justify-center shrink-0">
                      <Factory className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          #{pur.billNo}
                        </span>
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                          {pur.supplierName}
                        </h3>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            pur.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pur.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {pur.paymentStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{t('pur.date')}: {pur.date}</span>
                        </span>
                        {pur.supplierCity && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{pur.supplierCity}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setPreviewPurchase(pur)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? 'View Voucher / Print' : language === 'hi' ? 'वाउचर देखें / प्रिंट' : 'बिल पहा / प्रिंट'}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(pur)}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                      title="Delete Bill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items in this purchase */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-400 font-bold uppercase border-b border-slate-100 dark:border-slate-800 pb-2">
                        <th className="py-2">{t('pur.itemsReceived')}</th>
                        <th className="py-2 text-center">{t('pur.batchNo')} & Exp</th>
                        <th className="py-2 text-center">{t('pur.boxesCount')}</th>
                        <th className="py-2 text-center">{t('pur.unitsCalculated')}</th>
                        <th className="py-2 text-right">{t('pur.unitRate')}</th>
                        <th className="py-2 text-right">{t('pur.totalCost')}</th>
                        <th className="py-2 text-right">{t('pur.stockAudit')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                      {pur.items.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                            {it.productName}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {it.batchNo}
                            </span>
                            {it.expDate && (
                              <span className="block text-[10px] text-slate-400 mt-0.5">Exp: {it.expDate}</span>
                            )}
                          </td>
                          <td className="py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                            {it.boxes} {language === 'en' ? 'Boxes' : language === 'hi' ? 'बॉक्स' : 'खोके'}{' '}
                            <span className="text-[10px] text-slate-400">
                              ({it.unitsPerBox}/{language === 'en' ? 'Box' : language === 'hi' ? 'बॉक्स' : 'खोका'})
                            </span>
                          </td>
                          <td className="py-2.5 text-center font-black text-slate-900 dark:text-white">
                            +{it.totalUnits.toLocaleString('en-IN')} Units
                          </td>
                          <td className="py-2.5 text-right font-medium text-slate-600 dark:text-slate-300">
                            ₹{it.costPerUnit.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-black text-slate-900 dark:text-white">
                            ₹{it.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 text-right">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md font-bold">
                              <span>{it.previousStock ?? 0}</span>
                              <span>➔</span>
                              <span className="font-black">{it.newStock ?? it.totalUnits}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer summary */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-slate-500 font-medium">
                    <span>{language === 'en' ? 'Total Volume:' : language === 'hi' ? 'कुल मात्रा:' : 'एकूण माल:'} </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {totalUnitsInBill.toLocaleString('en-IN')} Units
                    </strong>
                    {pur.notes && <span> • {pur.notes}</span>}
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">{language === 'en' ? 'Paid Amount:' : language === 'hi' ? 'भुगतान:' : 'दिलेली रक्कम:'} </span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ₹{pur.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium">{language === 'en' ? 'Total Bill:' : language === 'hi' ? 'कुल बिल:' : 'एकूण बिल:'} </span>
                      <strong className="text-base font-black text-slate-900 dark:text-white">
                        ₹{pur.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Purchase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-2xl max-w-4xl w-full space-y-4 border border-slate-200 dark:border-slate-800 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {t('pur.modalTitle')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {t('pur.modalSub')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Manufacturer / Supplier Information */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-[11px] uppercase font-black text-slate-500">
                  1. {t('pur.supplierInfo')}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                      {t('pur.supplierNameLabel')} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t('pur.supplierNamePlaceholder')}
                      value={supplierName}
                      onChange={(e) => {
                        setSupplierName(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                      {t('pur.billNo')} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MFG-884"
                      value={billNo}
                      onChange={(e) => {
                        setBillNo(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">{t('pur.date')} *</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">{t('pur.city')}</label>
                    <input
                      type="text"
                      placeholder="e.g. Ahmedabad, Gujarat"
                      value={supplierCity}
                      onChange={(e) => setSupplierCity(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-700 dark:text-slate-300">{t('pur.phone')}</label>
                      <span className={`text-[10px] font-mono font-bold ${supplierPhone.length === 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {supplierPhone.length}/10 {supplierPhone.length === 10 ? '✓' : ''}
                      </span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="उदा. 9822334455 (10 अंक)"
                      value={supplierPhone}
                      onChange={(e) => {
                        setSupplierPhone(cleanPhoneNumber(e.target.value));
                        if (formError) setFormError(null);
                      }}
                      className={`w-full bg-white dark:bg-slate-900 border ${supplierPhone.length === 10 ? 'border-emerald-500' : 'border-slate-300 dark:border-slate-700'} rounded-xl p-2.5 text-slate-900 dark:text-white font-mono`}
                    />
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-black text-slate-500">
                    2. {t('pur.medicineDetails')}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-blue-600 hover:text-blue-700 font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('pur.addItem')}</span>
                  </button>
                </div>

                {items.map((item, idx) => {
                  const totalUnits =
                    (Number(item.boxes) || 0) * (Number(item.unitsPerBox) || 0) + (Number(item.looseUnits) || 0);
                  const lineTotalCost = totalUnits * (Number(item.costPerUnit) || 0);
                  const existingProd = products.find((p) => p.id === item.productId);
                  const prevStock = existingProd?.stockQuantity ?? 0;
                  const newStock = prevStock + totalUnits;

                  return (
                    <div
                      key={idx}
                      className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="bg-slate-900 text-white font-black text-[11px] px-2 py-0.5 rounded">
                          Item #{idx + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.isCustomNewProduct}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].isCustomNewProduct = e.target.checked;
                                setItems(updated);
                              }}
                              className="w-4 h-4 text-orange-500 rounded"
                            />
                            <span className="text-[11px] text-orange-600 font-bold">{t('pur.launchNew')}</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Product Selector or New Product Inputs */}
                      {!item.isCustomNewProduct ? (
                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 mb-1">
                            {t('pur.selectMedicine')} *
                          </label>
                          <select
                            value={item.productId}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-bold"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({language === 'en' ? 'Stock:' : language === 'hi' ? 'स्टॉक:' : 'शिल्लक:'} {p.stockQuantity ?? 0} {p.defaultUnit} | Box: {p.boxCapacity || 50})
                              </option>
                            ))}
                            <option value="NEW_PRODUCT">{t('pur.launchNew')}...</option>
                          </select>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
                          <div className="text-[10px] uppercase font-black text-amber-800 dark:text-amber-300">
                            ✨ {t('pur.launchNew')} (Catalog Registration)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-2">
                              <label className="block text-slate-700 dark:text-slate-300 mb-1">{t('pur.newMedName')} *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Animex Mastiguard (500ml)"
                                value={item.productName}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].productName = e.target.value;
                                  setItems(updated);
                                }}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-700 dark:text-slate-300 mb-1">{t('pur.newMedCategory')}</label>
                              <input
                                type="text"
                                placeholder="e.g. Udder & Mastitis Care"
                                value={item.newProductCategory}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].newProductCategory = e.target.value;
                                  setItems(updated);
                                }}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Batch & Manufacturing Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 mb-1">
                            {t('pur.batchNo')} *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. RN-2601"
                            value={item.batchNo}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].batchNo = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 mb-1">{t('pur.mfgDate')}</label>
                          <input
                            type="text"
                            placeholder="e.g. 09/2026"
                            value={item.mfgDate}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].mfgDate = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 mb-1">{t('pur.expDate')}</label>
                          <input
                            type="text"
                            placeholder="e.g. 08/2028"
                            value={item.expDate}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].expDate = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Boxes, Capacity, Loose, Rate */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 mb-1">
                            {language === 'en' ? 'No. of Boxes *' : language === 'hi' ? 'बॉक्स संख्या *' : 'खोके किती आले? *'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={item.boxes}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].boxes = Number(e.target.value);
                              setItems(updated);
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-black text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 mb-1">
                            {language === 'en' ? 'Units / Box *' : language === 'hi' ? 'प्रति बॉक्स बोतलें *' : '१ खोक्यात किती? *'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.unitsPerBox}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].unitsPerBox = Number(e.target.value);
                              setItems(updated);
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-black text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 mb-1">
                            {language === 'en' ? 'Loose Units' : language === 'hi' ? 'खुली बोतलें' : 'सुट्या बाटल्या'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.looseUnits}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].looseUnits = Number(e.target.value);
                              setItems(updated);
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-black text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 mb-1">
                            {t('pur.unitRate')} (₹) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={item.costPerUnit}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].costPerUnit = Number(e.target.value);
                              setItems(updated);
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-black text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                      </div>

                      {/* Line Summary & Stock Audit Preview */}
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="text-slate-600 dark:text-slate-300 font-bold">
                          <span>{t('pur.unitsCalculated')}: </span>
                          <span className="font-black text-slate-900 dark:text-white">
                            +{totalUnits.toLocaleString('en-IN')} Units
                          </span>
                          <span className="text-slate-400">
                            {' '}
                            ({item.boxes} {language === 'en' ? 'Boxes' : language === 'hi' ? 'बॉक्स' : 'खोके'} × {item.unitsPerBox} + {item.looseUnits})
                          </span>
                          <span className="ml-2 font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {language === 'en' ? 'Stock:' : language === 'hi' ? 'स्टॉक:' : 'साठा:'} {prevStock} ➔ {newStock}
                          </span>
                        </div>

                        <div className="font-black text-sm text-slate-900 dark:text-white self-end sm:self-auto">
                          {language === 'en' ? 'Total:' : language === 'hi' ? 'कुल:' : 'खर्च:'} ₹{lineTotalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total & Payment Details */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-[11px] uppercase font-black text-slate-500">
                  3. {t('pur.paymentDetails')}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                      {t('pur.totalBill')}
                    </label>
                    <div className="text-xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                      {t('pur.paidSoFar')} (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-black text-emerald-600 dark:text-emerald-400 text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                      {t('pur.balanceDue')} (₹)
                    </label>
                    <div className="text-xl font-black text-red-600 dark:text-red-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      ₹{balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    {t('pur.notes')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Inward transport received via Tempo Express • LR No. 4501"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  {t('action.cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('pur.saveBill')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Purchase Receipt Preview Modal */}
      {previewPurchase && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl max-w-3xl w-full space-y-6 my-8 max-h-[92vh] overflow-y-auto print:p-0 print:shadow-none">
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  MANUFACTURING INWARD & PURCHASE RECEIPT
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  ANIMEX ANIMAL HEALTH CARE PVT. LTD.
                </h2>
                <p className="text-xs text-slate-500">
                  Kopargaon, Ahmednagar, Maharashtra • Contact: 9307990811
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 font-bold">Inward Bill No:</span>
                <div className="text-xl font-mono font-black text-blue-900">#{previewPurchase.billNo}</div>
                <div className="text-xs text-slate-500 mt-1">Date: {previewPurchase.date}</div>
              </div>
            </div>

            {/* Supplier Information Card */}
            <div className="bg-slate-50 p-4 rounded-xl border text-xs space-y-1">
              <div className="font-bold text-slate-500 uppercase text-[10px]">
                MANUFACTURER / SUPPLIER DETAILS (कारखाना):
              </div>
              <div className="text-sm font-black text-slate-900">{previewPurchase.supplierName}</div>
              {previewPurchase.supplierCity && <div className="text-slate-600">📍 {previewPurchase.supplierCity}</div>}
              {previewPurchase.supplierPhone && <div className="text-slate-600">📞 Phone: {previewPurchase.supplierPhone}</div>}
              {previewPurchase.supplierGstin && <div className="text-slate-600">GSTIN: {previewPurchase.supplierGstin}</div>}
            </div>

            {/* Items Table */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 font-extrabold uppercase text-slate-700 border-b">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-center">Batch No</th>
                    <th className="p-2.5 text-center">Exp</th>
                    <th className="p-2.5 text-center">Boxes</th>
                    <th className="p-2.5 text-center">Total Units</th>
                    <th className="p-2.5 text-right">Cost/Unit</th>
                    <th className="p-2.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-semibold">
                  {previewPurchase.items.map((it, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold text-slate-900">{it.productName}</td>
                      <td className="p-2.5 text-center font-mono">{it.batchNo}</td>
                      <td className="p-2.5 text-center">{it.expDate || '-'}</td>
                      <td className="p-2.5 text-center">
                        {it.boxes} ({it.unitsPerBox}/box)
                      </td>
                      <td className="p-2.5 text-center font-black">+{it.totalUnits}</td>
                      <td className="p-2.5 text-right">₹{it.costPerUnit.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-black">
                        ₹{it.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
              <div className="text-xs text-slate-600 max-w-sm">
                <div className="font-bold text-slate-800 mb-1">Remarks & Inward Notes:</div>
                <p className="bg-slate-50 p-2 rounded-lg border">{previewPurchase.notes || 'No extra remarks'}</p>
              </div>

              <div className="w-full sm:w-64 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-slate-600">
                  <span>Gross Purchase Amount:</span>
                  <span>₹{previewPurchase.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>Paid Amount:</span>
                  <span>₹{previewPurchase.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 border-t pt-2">
                  <span>Balance Due:</span>
                  <span className={previewPurchase.balanceAmount > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    ₹{previewPurchase.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t print:hidden">
              <button
                onClick={() => setPreviewPurchase(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="bg-animex-blue-600 hover:bg-animex-blue-700 text-white font-black px-5 py-2 rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Inward Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
