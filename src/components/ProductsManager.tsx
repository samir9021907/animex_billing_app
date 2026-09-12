import React, { useState } from 'react';
import { Product } from '../types';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Boxes,
  ArrowDownToLine,
  CheckCircle2,
  AlertTriangle,
  Layers,
  X,
} from 'lucide-react';

interface ProductsManagerProps {
  products: Product[];
  onAddProduct: (prod: Product) => void;
  onUpdateProduct: (prod: Product) => void;
  onDeleteProduct: (prodId: string) => void;
  onInwardStock?: (productId: string, boxes: number, unitsPerBox: number, looseUnits: number) => void;
}

export const ProductsManager: React.FC<ProductsManagerProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onInwardStock,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Stock Inward Modal State
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [inwardProductId, setInwardProductId] = useState<string>('');
  const [inwardBoxes, setInwardBoxes] = useState<number>(15);
  const [inwardUnitsPerBox, setInwardUnitsPerBox] = useState<number>(100);
  const [inwardLooseUnits, setInwardLooseUnits] = useState<number>(0);
  const [inwardNote, setInwardNote] = useState<string>('');

  // Product Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Calcium Supplements');
  const [defaultUnit, setDefaultUnit] = useState('Ltr');
  const [mrp, setMrp] = useState<number>(350);
  const [defaultPrice, setDefaultPrice] = useState<number>(300);
  const [boxCapacity, setBoxCapacity] = useState<number>(100);
  const [stockQuantity, setStockQuantity] = useState<number>(1500);
  const [minStockAlert, setMinStockAlert] = useState<number>(50);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Calcium Supplements');
    setDefaultUnit('Ltr');
    setMrp(350);
    setDefaultPrice(300);
    setBoxCapacity(100);
    setStockQuantity(500);
    setMinStockAlert(50);
    setShowModal(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category || 'Calcium Supplements');
    setDefaultUnit(p.defaultUnit || 'Ltr');
    setMrp(p.mrp || 0);
    setDefaultPrice(p.defaultPrice || 0);
    setBoxCapacity(p.boxCapacity || 50);
    setStockQuantity(p.stockQuantity ?? 0);
    setMinStockAlert(p.minStockAlert || 50);
    setShowModal(true);
  };

  const handleOpenInwardModal = (p?: Product) => {
    const target = p || products[0];
    if (!target) return;
    setInwardProductId(target.id);
    setInwardBoxes(15);
    setInwardUnitsPerBox(target.boxCapacity || 100);
    setInwardLooseUnits(0);
    setInwardNote('गोदाम आवक (Stock Inward)');
    setShowInwardModal(true);
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && defaultPrice) {
      if (editingProduct) {
        const updated: Product = {
          ...editingProduct,
          name,
          category,
          defaultUnit,
          mrp,
          defaultPrice,
          boxCapacity: Number(boxCapacity) || 50,
          stockQuantity: Number(stockQuantity) >= 0 ? Number(stockQuantity) : 0,
          minStockAlert: Number(minStockAlert) || 50,
        };
        onUpdateProduct(updated);
      } else {
        const created: Product = {
          id: `p-${Date.now()}`,
          name,
          category,
          defaultUnit,
          mrp,
          defaultPrice,
          boxCapacity: Number(boxCapacity) || 50,
          stockQuantity: Number(stockQuantity) >= 0 ? Number(stockQuantity) : 0,
          minStockAlert: Number(minStockAlert) || 50,
        };
        onAddProduct(created);
      }
      setShowModal(false);
    }
  };

  const handleConfirmInward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inwardProductId) return;
    if (onInwardStock) {
      onInwardStock(
        inwardProductId,
        Number(inwardBoxes) || 0,
        Number(inwardUnitsPerBox) || 0,
        Number(inwardLooseUnits) || 0
      );
    }
    setShowInwardModal(false);
  };

  const handleDelete = (p: Product) => {
    if (window.confirm(`Are you sure you want to delete ${p.name}?`)) {
      onDeleteProduct(p.id);
    }
  };

  // Format stock display into Boxes and Loose
  const formatStockText = (stock: number = 0, capacity: number = 50, unit: string = 'Ltr') => {
    if (capacity <= 1) {
      return `${stock.toLocaleString('en-IN')} ${unit}`;
    }
    const boxes = Math.floor(stock / capacity);
    const loose = stock % capacity;

    if (boxes === 0) {
      return `${loose.toLocaleString('en-IN')} ${unit} (सुट्या)`;
    }
    if (loose === 0) {
      return `${boxes} खोके (${stock.toLocaleString('en-IN')} ${unit})`;
    }
    return `${boxes} खोके + ${loose} ${unit} (एकूण ${stock.toLocaleString('en-IN')})`;
  };

  const selectedInwardProduct = products.find((p) => p.id === inwardProductId);
  const totalInwardAdded = (Number(inwardBoxes) || 0) * (Number(inwardUnitsPerBox) || 0) + (Number(inwardLooseUnits) || 0);
  const newProjectedStock = (selectedInwardProduct?.stockQuantity || 0) + totalInwardAdded;

  // Inventory Overview Stats
  const totalStockUnits = products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
  const lowStockProductsCount = products.filter(
    (p) => (p.stockQuantity || 0) <= (p.minStockAlert || p.boxCapacity || 50)
  ).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-animex-blue-600" />
            <span>ANIMEX Products & Godown Stock</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            कंपनीतील सर्व उत्पादनांचा दर, खोके पॅकिंग आणि ऑटोमॅटिक शिल्लक स्टॉक व्यवस्थापन.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenInwardModal()}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>माल जमा करा (+ खोके)</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="bg-animex-blue-600 hover:bg-animex-blue-700 active:scale-95 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>नवीन उत्पादन जोडा</span>
          </button>
        </div>
      </div>

      {/* Stock Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:bg-slate-800/80 p-4 rounded-2xl border border-blue-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-700 uppercase">एकूण उत्पादने (Total Items)</span>
            <div className="text-2xl font-black text-blue-900 dark:text-sky-300 mt-0.5">
              {products.length}
            </div>
          </div>
          <Boxes className="w-8 h-8 text-blue-500/80" />
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:bg-slate-800/80 p-4 rounded-2xl border border-emerald-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase">गोदामातील एकूण माल (Total Units)</span>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-300 mt-0.5">
              {totalStockUnits.toLocaleString('en-IN')}
            </div>
          </div>
          <Layers className="w-8 h-8 text-emerald-500/80" />
        </div>

        <div
          onClick={() => setShowLowStockModal(true)}
          className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:bg-slate-800/80 p-4 rounded-2xl border border-amber-200 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-amber-400 active:scale-[0.98] transition-all"
          title="Click to view Low Stock Details & Notifications"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-amber-700 uppercase">Low Stock Alerts</span>
              <span className="text-[9px] font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded-md">Details 👆</span>
            </div>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-300 mt-0.5">
              {lowStockProductsCount} Products
            </div>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-500/80" />
        </div>
      </div>

      {/* Search & Grid */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search products by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-animex-orange-500 outline-none shadow-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const stock = p.stockQuantity ?? 0;
            const capacity = p.boxCapacity || 50;
            const minAlert = p.minStockAlert || capacity;
            const isOutOfStock = stock <= 0;
            const isLowStock = !isOutOfStock && stock <= minAlert;

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3 relative group hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Category & Actions */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-animex-blue-600 bg-animex-blue-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-animex-blue-100 dark:border-slate-700">
                      {p.category}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenInwardModal(p)}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                        title="माल जमा करा (+ खोके)"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-animex-blue-50 text-slate-600 hover:text-animex-blue-600 transition-colors"
                        title="Edit Product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug">
                    {p.name}
                  </h4>

                  {/* Pricing info */}
                  <div className="flex items-center justify-between pt-1.5 text-xs">
                    <span className="text-slate-500 font-bold">
                      Unit: {p.defaultUnit} | MRP: ₹{p.mrp ? p.mrp.toFixed(2) : '-'}
                    </span>
                    <span className="font-black text-base text-animex-orange-600 dark:text-amber-400">
                      ₹ {p.defaultPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Stock Details Box */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-bold">पॅकिंग क्षमता (Box Size):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      📦 {capacity} {p.defaultUnit}/खोका
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-extrabold">शिल्लक गोदामात:</span>
                    <span
                      className={`font-black ${
                        isOutOfStock
                          ? 'text-red-600'
                          : isLowStock
                          ? 'text-amber-600'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {formatStockText(stock, capacity, p.defaultUnit)}
                    </span>
                  </div>

                  {/* Stock Status Badge */}
                  <div className="flex items-center justify-between pt-1">
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3" /> स्टॉक संपला (Out of stock)
                      </span>
                    ) : isLowStock ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        <AlertTriangle className="w-3 h-3" /> कमी स्टॉक (Low stock)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> उपलब्ध (In stock)
                      </span>
                    )}

                    <button
                      onClick={() => handleOpenInwardModal(p)}
                      className="text-[11px] font-black text-animex-blue-600 hover:text-animex-blue-800 underline cursor-pointer"
                    >
                      + माल भरा
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stock Inward Modal (माल गोदामात जमा करा) */}
      {showInwardModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ArrowDownToLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    गोदामात माल जमा करा (Stock Inward)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    खोके आणि सुट्या बाटल्यांची आवक नोंदवा.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInwardModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmInward} className="space-y-3.5 text-xs font-bold">
              {/* Product Select */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                  उत्पादन निवडा (Select Product) *
                </label>
                <select
                  value={inwardProductId}
                  onChange={(e) => {
                    const sel = products.find((p) => p.id === e.target.value);
                    setInwardProductId(e.target.value);
                    if (sel) {
                      setInwardUnitsPerBox(sel.boxCapacity || 100);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (सध्या शिल्लक: {p.stockQuantity ?? 0} {p.defaultUnit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Stock Banner */}
              {selectedInwardProduct && (
                <div className="bg-blue-50 dark:bg-slate-800 p-3 rounded-xl border border-blue-100 dark:border-slate-700 text-xs text-blue-900 dark:text-blue-300 flex items-center justify-between">
                  <span>सध्या गोदामात शिल्लक:</span>
                  <span className="font-black">
                    {formatStockText(
                      selectedInwardProduct.stockQuantity || 0,
                      selectedInwardProduct.boxCapacity || 50,
                      selectedInwardProduct.defaultUnit
                    )}
                  </span>
                </div>
              )}

              {/* Inward Inputs: Boxes & Units per Box & Loose */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    खोके किती आले? (Boxes) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={inwardBoxes}
                    onChange={(e) => setInwardBoxes(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-black text-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">उदा. 15 खोके</span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    १ खोक्यात किती? (Per Box) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={inwardUnitsPerBox}
                    onChange={(e) => setInwardUnitsPerBox(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-black text-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">उदा. 50, 70, 100</span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    सुट्या बाटल्या (Loose)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={inwardLooseUnits}
                    onChange={(e) => setInwardLooseUnits(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-black text-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">सुटी संख्या असल्यास</span>
                </div>
              </div>

              {/* Inward Calculation Preview */}
              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <span>हिशोब:</span>
                  <span className="font-mono font-bold">
                    ({inwardBoxes} खोके × {inwardUnitsPerBox}) + {inwardLooseUnits} = +{totalInwardAdded} {selectedInwardProduct?.defaultUnit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-extrabold text-emerald-900 dark:text-emerald-200 pt-1 border-t border-emerald-200/60 dark:border-emerald-800">
                  <span>नवीन एकूण शिल्लक स्टॉक होईल:</span>
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {newProjectedStock.toLocaleString('en-IN')} {selectedInwardProduct?.defaultUnit}
                  </span>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                  टीप / बॅच माहिती (Optional Note)
                </label>
                <input
                  type="text"
                  placeholder="उदा. लॉट नं. 45 / नवीन सप्लाय"
                  value={inwardNote}
                  onChange={(e) => setInwardNote(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>स्टॉकमध्ये जमा करा</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {editingProduct ? 'Edit ANIMEX Product' : 'Add New ANIMEX Product'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Calcimex Gel Advance (300ml)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                >
                  <option value="Calcium Supplements">Calcium Supplements</option>
                  <option value="Mineral Mixtures">Mineral Mixtures</option>
                  <option value="Liver Tonics">Liver Tonics</option>
                  <option value="Rumen & Gut Health">Rumen & Gut Health</option>
                  <option value="Uterine & Fertility Boosters">Uterine & Fertility Boosters</option>
                  <option value="Herbal Veterinary Products">Herbal Veterinary Products</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Unit</label>
                  <select
                    value={defaultUnit}
                    onChange={(e) => setDefaultUnit(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white"
                  >
                    <option value="Ltr">Ltr</option>
                    <option value="Ml">Ml</option>
                    <option value="Bucket">Bucket</option>
                    <option value="Kg">Kg</option>
                    <option value="Can">Can</option>
                    <option value="Pack">Pack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={mrp}
                    onChange={(e) => setMrp(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Stock & Box Packaging Settings */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-[11px] font-extrabold text-animex-blue-900 dark:text-sky-300">
                  📦 इन्व्हेंटरी आणि खोके पॅकिंग (Stock Settings)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      खोक्यात प्रमाण (Per Box)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={boxCapacity}
                      onChange={(e) => setBoxCapacity(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                      placeholder="उदा. 100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      Current Stock (Units)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-black"
                      placeholder="e.g. 1500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      Min Stock Alert Limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minStockAlert}
                      onChange={(e) => setMinStockAlert(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                      placeholder="e.g. 50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-animex-blue-600 hover:bg-animex-blue-700 text-white font-black px-5 py-2 rounded-xl text-xs shadow-md cursor-pointer"
                >
                  {editingProduct ? 'Save Product Changes' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Low Stock Alert Details Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-fadeIn">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <AlertTriangle className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Low Stock Alert Details & Notifications</h3>
                  <p className="text-[11px] text-amber-100">Live Godown Stock Alerts & Threshold Limits</p>
                </div>
              </div>
              <button
                onClick={() => setShowLowStockModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              
              <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                📌 <strong>Stock Alert Information:</strong> When godown stock falls below the minimum alert limit, the system automatically triggers an alert so you can replenish inventory in time.
              </div>

              {/* Breakdown List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  All Products Stock & Alert Limits:
                </h4>

                <div className="space-y-2">
                  {products.map((p) => {
                    const stock = p.stockQuantity ?? 0;
                    const limit = p.minStockAlert || p.boxCapacity || 50;
                    const isLow = stock <= limit;
                    const deficit = Math.max(0, limit - stock);

                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isLow
                            ? 'bg-red-50/60 dark:bg-red-950/30 border-red-300 dark:border-red-900/60 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {isLow && (
                                <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md animate-pulse">
                                  ⚠️ Low Stock Alert!
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {p.category} • 1 Box Capacity: {p.boxCapacity || 50} {p.defaultUnit}
                            </div>
                          </div>

                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            isLow
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300'
                          }`}>
                            {isLow ? 'Low Stock' : 'Safe Stock'}
                          </span>
                        </div>

                        {/* Stock metrics */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Available Stock:</span>
                            <span className={`font-black text-xs ${isLow ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>
                              {stock} {p.defaultUnit}
                            </span>
                          </div>

                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Alert Limit:</span>
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                              {limit} {p.defaultUnit}
                            </span>
                          </div>

                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Deficit / Shortage:</span>
                            <span className={`font-black text-xs ${deficit > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {deficit > 0 ? `-${deficit} ${p.defaultUnit}` : 'OK (Safe)'}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 mt-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowLowStockModal(false);
                              handleOpenInwardModal(p);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                            <span>Inward Stock (+ Boxes)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLowStockModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-md"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
