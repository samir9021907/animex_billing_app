import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceItem, MedicalStore, Product, BillStatus } from '../types';
import { convertNumberToWords } from '../utils/numberToWords';
import { formatInvoiceNumber } from '../utils/invoiceUtils';
import { Plus, Trash2, CheckCircle2, Store, Phone, MapPin, RotateCcw } from 'lucide-react';

interface InvoiceFormProps {
  products: Product[];
  stores: MedicalStore[];
  invoices?: Invoice[];
  onSaveInvoice: (newInvoice: Invoice) => void;
  nextInvoiceNo: number;
}

// Helper to format currency for display with Indian commas and proper 2-decimals if fraction exists
const formatCurrencyDisplay = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const rounded = Math.round((val + Number.EPSILON) * 100) / 100;
  if (rounded % 1 !== 0) {
    return rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return rounded.toLocaleString('en-IN');
};

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  products,
  stores,
  invoices = [],
  onSaveInvoice,
  nextInvoiceNo = 1
}) => {
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Helper to compute next invoice number for the selected medical store
  const getStoreNextInvoiceNo = (storeId: string): number => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return 1;
    const storeInvoices = (invoices || []).filter(
      inv => inv.billTo?.id === storeId || 
      (store.firmName && inv.billTo?.firmName?.trim().toLowerCase() === store.firmName.trim().toLowerCase())
    );
    if (storeInvoices.length === 0) return 1;
    const maxStoreNo = Math.max(...storeInvoices.map(i => i.companyInvoiceNumber || i.invoiceNo || 0));
    return maxStoreNo + 1;
  };

  // Master continuous sequential serial number across ALL invoices
  const nextGlobalSrNo = (invoices && invoices.length > 0)
    ? Math.max(...invoices.map(i => i.globalBillId || 0)) + 1
    : nextInvoiceNo;

  const [invoiceNo, setInvoiceNo] = useState<number>(() => getStoreNextInvoiceNo(stores[0]?.id || ''));

  // Sync store-specific invoice number whenever selected store or invoices change
  useEffect(() => {
    if (selectedStoreId) {
      setInvoiceNo(getStoreNextInvoiceNo(selectedStoreId));
    }
  }, [selectedStoreId, invoices]);

  // Sync selectedStoreId when stores list changes or on load
  useEffect(() => {
    if (!selectedStoreId && stores.length > 0) {
      setSelectedStoreId(stores[0].id);
    } else if (selectedStoreId && !stores.some(s => s.id === selectedStoreId)) {
      setSelectedStoreId(stores[0]?.id || '');
    }
  }, [stores, selectedStoreId]);

  const createInitialItems = (): InvoiceItem[] => [
    {
      id: `item-${Date.now()}`,
      productId: products[0]?.id || '',
      itemName: products[0]?.name || '',
      quantity: 10,
      unit: products[0]?.defaultUnit || 'Ltr',
      mrp: products[0]?.mrp || 0,
      pricePerUnit: products[0]?.defaultPrice || 300,
      amount: (products[0]?.defaultPrice || 300) * 10,
      isFree: false,
      isScheme: false
    }
  ];

  // Billing line items
  const [items, setItems] = useState<InvoiceItem[]>(createInitialItems);

  const [discount, setDiscount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<string>('UPI');
  const [isFullPaid, setIsFullPaid] = useState<boolean>(true);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [termsAndConditions, setTermsAndConditions] = useState<string>('Goods once sold will not be taken back.');

  // Automatically refresh and reset products & payment details when customer store changes
  const handleStoreChange = (newStoreId: string) => {
    if (newStoreId === selectedStoreId) return;

    setSelectedStoreId(newStoreId);
    setInvoiceNo(getStoreNextInvoiceNo(newStoreId));
    
    // Refresh / Reset products and totals for the new medical store
    setItems(createInitialItems());
    setDiscount(0);
    setPaymentType('UPI');
    setIsFullPaid(true);
    setReceivedAmount(0);
  };

  const selectedStoreObj = stores.find(s => s.id === selectedStoreId) || stores[0];

  // Calculate totals matching animex_frontend logic
  const subTotal = items.reduce((sum, i) => sum + i.amount, 0);
  const totalAmount = Math.max(0, subTotal - discount);
  const amountInWords = convertNumberToWords(totalAmount);
  const balanceAmount = Math.max(0, totalAmount - receivedAmount);
  const status: BillStatus = balanceAmount === 0 ? 'PAID' : (receivedAmount === 0 ? 'PENDING' : 'PARTIALLY PAID');
  const invoiceCode = formatInvoiceNumber(invoiceNo, date);

  // Auto-sync received amount based on paymentType & isFullPaid
  useEffect(() => {
    if (paymentType === 'Credit') {
      setIsFullPaid(false);
      setReceivedAmount(0);
    } else if (isFullPaid) {
      setReceivedAmount(totalAmount);
    }
  }, [totalAmount, isFullPaid, paymentType]);

  // Handlers
  const handleAddItemRow = () => {
    const defaultProd = products[0];
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      productId: defaultProd?.id || '',
      itemName: defaultProd?.name || '',
      quantity: 1,
      unit: defaultProd?.defaultUnit || 'Ltr',
      mrp: defaultProd?.mrp || 0,
      pricePerUnit: defaultProd?.defaultPrice || 0,
      amount: defaultProd?.defaultPrice || 0,
      isFree: false,
      isScheme: false
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (items.length === 1) {
      alert('Invoice must contain at least 1 product line item.');
      return;
    }
    setItems(items.filter(i => i.id !== id));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const selectedProd = products.find(p => p.id === productId);
    if (!selectedProd) return;

    const updated = [...items];
    const cur = updated[index];
    const isFree = cur.isFree || cur.isScheme || false;
    const price = isFree ? 0 : selectedProd.defaultPrice;

    updated[index] = {
      ...cur,
      productId: selectedProd.id,
      itemName: selectedProd.name,
      unit: selectedProd.defaultUnit,
      mrp: selectedProd.mrp || 0,
      pricePerUnit: price,
      amount: cur.quantity * price,
      isFree,
      isScheme: isFree
    };
    setItems(updated);
  };

  const handleMrpChange = (index: number, mrp: number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      mrp: mrp
    };
    setItems(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...items];
    const cur = updated[index];
    const q = Math.max(0, qty);
    updated[index] = {
      ...cur,
      quantity: q,
      amount: q * cur.pricePerUnit
    };
    setItems(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...items];
    const cur = updated[index];
    const p = Math.max(0, price);
    updated[index] = {
      ...cur,
      pricePerUnit: p,
      amount: cur.quantity * p
    };
    setItems(updated);
  };

  const handleUnitChange = (index: number, unit: string) => {
    const updated = [...items];
    updated[index].unit = unit;
    setItems(updated);
  };

  const handleToggleFree = (index: number, isFree: boolean) => {
    const updated = [...items];
    const cur = updated[index];
    const selectedProd = products.find(p => p.id === cur.productId);
    const price = isFree ? 0 : (selectedProd?.defaultPrice || cur.pricePerUnit);

    updated[index] = {
      ...cur,
      isFree,
      isScheme: isFree,
      pricePerUnit: price,
      amount: cur.quantity * price
    };
    setItems(updated);
  };

  const handleSubmitInvoice = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if any product quantity exceeds available stock
    const overStockItems = items.filter((it) => {
      const p = products.find((prod) => prod.id === it.productId);
      return p && it.quantity > (p.stockQuantity ?? 0);
    });

    if (overStockItems.length > 0) {
      const warningDetails = overStockItems
        .map((it) => {
          const p = products.find((prod) => prod.id === it.productId);
          return `• ${it.itemName}: Requested ${it.quantity}, Available: ${p?.stockQuantity ?? 0}`;
        })
        .join('\n');

      const confirmProceed = window.confirm(
        `⚠️ Warning! Low godown stock for the following items:\n\n${warningDetails}\n\nDo you want to proceed and deduct from godown stock?`
      );
      if (!confirmProceed) return;
    }

    const selectedStore = stores.find((s) => s.id === selectedStoreId) || stores[0];
    if (!selectedStore) {
      alert('Please add a Medical Store in the Medical Stores directory first before creating a bill.');
      return;
    }
    const formattedDate = date.split('-').reverse().join('-');

    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      globalBillId: nextGlobalSrNo,
      invoiceNo,
      companyInvoiceNumber: invoiceNo,
      invoiceNumber: formatInvoiceNumber(invoiceNo, date),
      date: formattedDate,
      billTo: selectedStore,
      items: items.map(it => ({
        ...it,
        isFree: it.isFree || it.isScheme || false,
        isScheme: it.isFree || it.isScheme || false,
        pricePerUnit: (it.isFree || it.isScheme) ? 0 : it.pricePerUnit,
        amount: (it.isFree || it.isScheme) ? 0 : (it.quantity * it.pricePerUnit)
      })),
      subTotal,
      discount,
      totalAmount,
      paymentType,
      status,
      amountInWords,
      receivedAmount,
      balanceAmount,
      termsAndConditions,
      createdAt: new Date().toISOString()
    };

    onSaveInvoice(newInv);

    // Reset / Refresh form items for next invoice
    setItems(createInitialItems());
    setDiscount(0);
    setPaymentType('UPI');
    setIsFullPaid(true);
    setReceivedAmount(0);
  };

  return (
    <form onSubmit={handleSubmitInvoice} className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-6">
      
      {/* Title Banner */}
      <div className="bg-gradient-to-r from-animex-blue-900 via-animex-blue-800 to-animex-orange-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-amber-300 inline-block border border-white/10">
            Official Bill Builder
          </span>
          <h2 className="text-lg sm:text-xl md:text-2xl font-black mt-1 tracking-tight">
            Create Bill of Supply
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-200/90 mt-0.5 hidden sm:block">
            Fill in medical store details and product lines to generate printable ANIMEX invoice.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl py-2 px-5 border border-white/20 text-center min-w-[120px] shadow-sm shrink-0">
          <div className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Invoice / Bill No #</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 leading-tight">#{invoiceNo}</div>
          <div className="text-[9px] font-mono text-slate-300 font-semibold">{invoiceCode}</div>
        </div>
      </div>

      {/* 1. Customer & Metadata Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-md border border-slate-300 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Bill To Medical Store Selector */}
        <div className="md:col-span-2 space-y-3">
          <label className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Store className="w-4 h-4 text-animex-blue-600" />
            <span>Select Medical Store (Customer) *</span>
          </label>
          <select
            value={selectedStoreId}
            onChange={(e) => handleStoreChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-animex-orange-500 outline-none"
          >
            {stores.length === 0 ? (
              <option value="">-- No Medical Stores Found! Please add a store first --</option>
            ) : (
              stores.map(st => (
                <option key={st.id} value={st.id}>
                  {st.firmName} ({st.district}, {st.state}) - Ph: {st.phone}
                </option>
              ))
            )}
          </select>

          {stores.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200 font-bold">
              ⚠️ No medical store registered yet. Please add your first medical store from the "Medical Stores" directory to generate a bill.
            </div>
          )}

          {selectedStoreObj && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <Store className="w-4 h-4 text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Firm / Contact</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{selectedStoreObj.firmName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{selectedStoreObj.contactName}</div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Phone</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">+91 {selectedStoreObj.phone}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">Active Client</div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Location</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{selectedStoreObj.district}, {selectedStoreObj.state}</div>
                  <div className="text-[10px] text-slate-500 truncate">{selectedStoreObj.address}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Date & Number */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 block mb-1">
              Invoice Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-animex-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 block mb-1">
              Invoice No #
            </label>
            <input
              type="number"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 dark:text-white"
            />
          </div>
        </div>

      </div>

      {/* 2. Itemized Product Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-md border border-slate-300 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <span>Product Line Items</span>
            <span className="bg-animex-orange-100 text-animex-orange-600 text-xs font-black px-2 py-0.5 rounded-full">
              {items.length} Lines
            </span>
          </h3>

          <div className="flex items-center gap-2">
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all product lines and start fresh?')) {
                    setItems(createInitialItems());
                    setDiscount(0);
                  }
                }}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-all border border-slate-300 dark:border-slate-700 cursor-pointer"
                title="Reset product items"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddItemRow}
              className="bg-animex-blue-600 hover:bg-animex-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product Row</span>
            </button>
          </div>
        </div>

        {/* Mobile Product Cards View (Visible on mobile screens < md) */}
        <div className="md:hidden space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="bg-animex-blue-900 text-white font-black px-2.5 py-0.5 rounded-md text-xs">
                  Item #{idx + 1}
                </span>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-300">
                    <input
                      type="checkbox"
                      checked={item.isFree || item.isScheme || false}
                      onChange={(e) => handleToggleFree(idx, e.target.checked)}
                      className="w-4 h-4 text-animex-orange-500 rounded focus:ring-animex-orange-500"
                    />
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold">FREE SCHEME</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(item.id)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Product Select Dropdown (Full Width) */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Select ANIMEX Product:
                </label>
                <select
                  value={item.productId}
                  onChange={(e) => handleProductSelect(idx, e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-black text-slate-900 dark:text-white"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Default: ₹{p.defaultPrice.toFixed(2)})
                    </option>
                  ))}
                </select>

                {(() => {
                  const sel = products.find(p => p.id === item.productId);
                  const stock = sel?.stockQuantity ?? 0;
                  const cap = sel?.boxCapacity || 50;
                  const b = Math.floor(stock / cap);
                  const l = stock % cap;
                  const isOver = item.quantity > stock;

                  return (
                    <div className="flex items-center justify-between mt-1 text-[11px] px-1">
                      <span className={isOver ? 'text-red-600 font-black' : 'text-emerald-700 dark:text-emerald-400 font-bold'}>
                        📦 In Stock: {stock} {item.unit} ({b} Boxes{l > 0 ? ` + ${l} loose` : ''})
                      </span>
                      {isOver && (
                        <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black text-[10px]">
                          Low Stock!
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Controls Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-black text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Unit:</label>
                  <select
                    value={item.unit}
                    onChange={(e) => handleUnitChange(idx, e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Ltr">Ltr</option>
                    <option value="Ml">Ml</option>
                    <option value="Bucket">Bucket</option>
                    <option value="Kg">Kg</option>
                    <option value="Can">Can</option>
                    <option value="Pack">Pack</option>
                    <option value="-">-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">MRP (₹):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="MRP"
                    value={item.mrp || ''}
                    onChange={(e) => handleMrpChange(idx, Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Price / Unit (₹):</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={item.isScheme}
                    value={item.pricePerUnit}
                    onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 font-black ${
                      item.isScheme
                        ? 'bg-slate-200 text-slate-500 border-slate-300'
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700'
                    }`}
                  />
                </div>
              </div>

              {/* Total Amount Footer */}
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60 pt-2">
                <span className="text-xs font-extrabold text-slate-500">Row Total Amount:</span>
                <span className="font-black text-base text-animex-blue-900 dark:text-sky-300">
                  ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View (Hidden on mobile < md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                <th className="p-2.5 w-10 text-center">#</th>
                <th className="p-2.5">ANIMEX Product</th>
                <th className="p-2.5 w-24 text-center">Scheme</th>
                <th className="p-2.5 w-24">Qty</th>
                <th className="p-2.5 w-24">Unit</th>
                <th className="p-2.5 w-28">MRP (₹)</th>
                <th className="p-2.5 w-32">Price/Unit (₹)</th>
                <th className="p-2.5 w-32 text-right">Amount (₹)</th>
                <th className="p-2.5 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
              {items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-2.5 text-center font-extrabold text-slate-500">{idx + 1}</td>
                  
                  {/* Select Product */}
                  <td className="p-2.5">
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Default: ₹{p.defaultPrice.toFixed(2)})
                        </option>
                      ))}
                    </select>

                    {(() => {
                      const sel = products.find((p) => p.id === item.productId);
                      const stock = sel?.stockQuantity ?? 0;
                      const cap = sel?.boxCapacity || 50;
                      const b = Math.floor(stock / cap);
                      const l = stock % cap;
                      const isOver = item.quantity > stock;

                      return (
                        <div className="mt-1 text-[10px] flex items-center justify-between">
                          <span className={isOver ? 'text-red-600 font-extrabold' : 'text-emerald-700 dark:text-emerald-400 font-bold'}>
                            📦 शिल्लक: {stock} ({b} खोके{l > 0 ? ` + ${l}` : ''})
                          </span>
                          {isOver && (
                            <span className="bg-red-100 text-red-700 px-1 py-0.2 rounded font-black text-[9px]">
                              कमी!
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Free Product Checkbox */}
                  <td className="p-2.5 text-center">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isFree || item.isScheme || false}
                        onChange={(e) => handleToggleFree(idx, e.target.checked)}
                        className="w-4 h-4 text-animex-orange-500 rounded focus:ring-animex-orange-500"
                      />
                      <span className="text-[10px] text-emerald-600 font-extrabold">FREE SCHEME</span>
                    </label>
                  </td>

                  {/* Quantity */}
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-black text-slate-900 dark:text-white"
                    />
                  </td>

                  {/* Unit */}
                  <td className="p-2.5">
                    <select
                      value={item.unit}
                      onChange={(e) => handleUnitChange(idx, e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="Ltr">Ltr</option>
                      <option value="Ml">Ml</option>
                      <option value="Bucket">Bucket</option>
                      <option value="Kg">Kg</option>
                      <option value="Can">Can</option>
                      <option value="Pack">Pack</option>
                      <option value="-">-</option>
                    </select>
                  </td>

                  {/* MRP */}
                  <td className="p-2.5">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="MRP"
                      value={item.mrp || ''}
                      onChange={(e) => handleMrpChange(idx, Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </td>

                  {/* Price Per Unit */}
                  <td className="p-2.5">
                    <input
                      type="number"
                      step="0.01"
                      disabled={item.isScheme}
                      value={item.pricePerUnit}
                      onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                      className={`w-full border rounded-lg p-2 text-xs font-black ${
                        item.isScheme
                          ? 'bg-slate-200 text-slate-500 border-slate-300'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700'
                      }`}
                    />
                  </td>

                  {/* Total Amount */}
                  <td className="p-2.5 text-right font-black text-sm text-animex-blue-900 dark:text-sky-300">
                    ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Delete Row */}
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(item.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Totals Summary & Words */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-6 shadow-md border border-slate-300 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Amount In Words & Terms */}
        <div className="space-y-4">
          <div className="bg-animex-blue-50 dark:bg-slate-800/80 p-3.5 sm:p-4 rounded-xl border border-animex-blue-100 dark:border-slate-700">
            <span className="text-[10px] font-black uppercase text-animex-blue-900 dark:text-sky-300 block mb-1">
              Invoice Amount In Words:
            </span>
            <p className="text-xs font-black text-animex-orange-600 dark:text-amber-400 italic">
              "{amountInWords}"
            </p>
          </div>

          <div>
            <label className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 block mb-1">
              Terms & Conditions
            </label>
            <input
              type="text"
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Calculations Column */}
        <div className="bg-slate-50 dark:bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Sub Total:</span>
            <span>₹ {formatCurrencyDisplay(subTotal)}</span>
          </div>

          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700/60">
            <span>Trade Discount / सवलत (₹):</span>
            <div className="w-28 sm:w-32">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={discount || ''}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-1.5 text-right font-black text-xs text-red-600 dark:text-red-400 focus:ring-1 focus:ring-animex-orange-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2.5 border-t-2 border-slate-200 dark:border-slate-700">
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
              Total Payable Amount:
            </span>
            <span className="text-base sm:text-lg font-black text-[#FF7A00] tracking-tight">
              ₹{formatCurrencyDisplay(totalAmount)}
            </span>
          </div>

          {/* Payment Type Selection (Cash, UPI, Card, Credit, Cheque) */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
              Payment Mode (देयक पद्धत) *
            </span>
            <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
              {[
                { id: 'Cash', label: 'Cash', icon: '💵' },
                { id: 'UPI', label: 'UPI', icon: '📱' },
                { id: 'Card', label: 'Card', icon: '💳' },
                { id: 'Credit', label: 'Credit', icon: '📜' },
                { id: 'Cheque', label: 'Cheque', icon: '🏦' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setPaymentType(mode.id);
                    if (mode.id === 'Credit') {
                      setIsFullPaid(false);
                      setReceivedAmount(0);
                    } else if (isFullPaid) {
                      setReceivedAmount(totalAmount);
                    }
                  }}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center transition-all border cursor-pointer ${
                    paymentType === mode.id
                      ? 'bg-animex-blue-900 text-white border-animex-blue-900 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-sm sm:text-base leading-none">{mode.icon}</span>
                  <span className="text-[10px] sm:text-xs font-bold mt-1 tracking-tight">{mode.label}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsFullPaid(true);
                  setReceivedAmount(totalAmount);
                  if (paymentType === 'Credit') setPaymentType('UPI');
                }}
                className={`py-2 px-2 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm ${
                  isFullPaid && Math.abs(receivedAmount - totalAmount) < 0.01
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <span>✅ Full Paid</span>
                <span className="text-[11px] font-semibold opacity-90">(₹{formatCurrencyDisplay(totalAmount)})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentType('Credit');
                  setIsFullPaid(false);
                  setReceivedAmount(0);
                }}
                className={`py-2 px-2 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm ${
                  paymentType === 'Credit'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                    : 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border-amber-300 hover:bg-amber-50'
                }`}
              >
                <span>⏳ Credit / उधारी</span>
                <span className="text-[11px] font-semibold opacity-90">(₹0)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 text-xs font-bold pt-1 items-end">
            {/* Row 1: Left Label */}
            <label className="block text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 leading-tight">
              Received (₹) <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">(जमा रक्कम)</span>
            </label>

            {/* Row 1: Right Label */}
            <label className="block text-[10px] uppercase font-bold text-slate-500 leading-tight text-right sm:text-left">
              Balance Due (बाकी रक्कम)
            </label>

            {/* Row 2: Left Input Box */}
            <div className="relative h-10">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 pointer-events-none">
                ₹
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={receivedAmount > 0 ? formatCurrencyDisplay(receivedAmount) : (receivedAmount === 0 ? '0' : '')}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                  const val = raw === '' ? 0 : Number(raw);
                  setReceivedAmount(val);
                  setIsFullPaid(Math.abs(val - totalAmount) < 0.01);
                }}
                className="w-full h-full bg-emerald-50/30 dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-700/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl pl-7 pr-2.5 font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 outline-none transition-all flex items-center"
              />
            </div>

            {/* Row 2: Right Balance Due Box */}
            <div className={`w-full h-10 flex items-center justify-end px-3 rounded-xl font-bold text-sm sm:text-base border ${
              balanceAmount <= 0.001
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                : 'bg-amber-50 dark:bg-amber-950/40 text-[#FF7A00] border-amber-300 dark:border-amber-700'
            }`}>
              ₹{formatCurrencyDisplay(balanceAmount)}
            </div>
          </div>

        </div>

      </div>

      {/* Action Submit Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payable:</span>
          <span className="text-base sm:text-lg font-black text-[#FF7A00] tracking-tight">
            ₹{formatCurrencyDisplay(totalAmount)}
          </span>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto justify-center bg-gradient-to-r from-animex-orange-500 to-animex-orange-600 hover:from-animex-orange-600 hover:to-animex-orange-700 text-white font-bold px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm tracking-wide shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Generate & Preview Official Bill</span>
        </button>
      </div>

    </form>
  );
};
