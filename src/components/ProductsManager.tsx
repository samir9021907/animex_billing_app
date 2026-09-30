import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  AlertCircle,
  Layers,
  X,
  Clock,
} from 'lucide-react';
import { validateName } from '../utils/validators';
import { useLanguage } from '../context/LanguageContext';
import { parsePackVolume, formatDetailedStockText } from '../utils/volumeParser';

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
  const { language } = useLanguage();
  const isMr = language === 'mr';
  const isHi = language === 'hi';

  const [showModal, setShowModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Stock Inward Modal State
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [inwardProductId, setInwardProductId] = useState<string>('');
  const [inwardMode, setInwardMode] = useState<'loose' | 'box'>('box');
  const [inwardBoxes, setInwardBoxes] = useState<number>(0);
  const [inwardUnitsPerBox, setInwardUnitsPerBox] = useState<number>(0);
  const [inwardLooseUnits, setInwardLooseUnits] = useState<number>(0);

  // Persistent removal of unwanted suggestions
  const [hiddenProdSuggestions, setHiddenProdSuggestions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('animex_hidden_prod_suggestions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [hiddenCatSuggestions, setHiddenCatSuggestions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('animex_hidden_cat_suggestions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleRemoveProductSuggestion = (itemToRemove: string) => {
    setHiddenProdSuggestions((prev) => {
      const updated = Array.from(new Set([...prev, itemToRemove]));
      try {
        localStorage.setItem('animex_hidden_prod_suggestions', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const handleRemoveCategorySuggestion = (itemToRemove: string) => {
    setHiddenCatSuggestions((prev) => {
      const updated = Array.from(new Set([...prev, itemToRemove]));
      try {
        localStorage.setItem('animex_hidden_cat_suggestions', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  // Dynamic list of categories for auto-suggestions
  const availableCategories = useMemo(() => {
    const defaultList = [
      'Calcium Supplements',
      'Mineral Mixtures',
      'Liver Tonics',
      'Rumen & Gut Health',
      'Uterine & Fertility Boosters',
      'Herbal Veterinary Products',
      'Antibiotics',
      'Dewormers & Bolus',
      'Injections & Tonics',
      'Feed Supplements',
      'Wound & Skin Care',
    ];
    const fromProducts = products.map((p) => p.category?.trim()).filter(Boolean) as string[];
    const all = Array.from(new Set([...defaultList, ...fromProducts]));
    const hiddenSet = new Set(hiddenCatSuggestions.map((s) => s.toLowerCase()));
    return all.filter((c) => !hiddenSet.has(c.toLowerCase()));
  }, [products, hiddenCatSuggestions]);

  // Dynamic list of products for auto-suggestions
  const availableProductNames = useMemo(() => {
    const defaultProducts = [
      'Animex Liv 1lit',
      'Animex Liv 5lit',
      'Animex Liv 500ml',
      'Calcimex Gold 1lit',
      'Calcimex Gold (5 lit)',
      'Calcimex gel advance (300ml)',
      'Utrimex (500ml)',
      'Rumen mex (300ml)',
      'Milkymex DS (10kg)',
      'Milkymex DS (25kg)',
    ];
    const fromExisting = products.map((p) => p.name?.trim()).filter(Boolean) as string[];
    const all = Array.from(new Set([...fromExisting, ...defaultProducts]));
    const hiddenSet = new Set(hiddenProdSuggestions.map((s) => s.toLowerCase()));
    return all.filter((p) => !hiddenSet.has(p.toLowerCase()));
  }, [products, hiddenProdSuggestions]);

  // Suggestion Dropdown States
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showCatSuggestions, setShowCatSuggestions] = useState(false);

  const nameInputRef = useRef<HTMLDivElement>(null);
  const catInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nameInputRef.current && !nameInputRef.current.contains(e.target as Node)) {
        setShowNameSuggestions(false);
      }
      if (catInputRef.current && !catInputRef.current.contains(e.target as Node)) {
        setShowCatSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Product Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [defaultUnit, setDefaultUnit] = useState('Ltr');
  const [mrp, setMrp] = useState<number>(350);
  const [defaultPrice, setDefaultPrice] = useState<number>(300);
  const [isLoosePackaging, setIsLoosePackaging] = useState<boolean>(false);
  const [boxCapacity, setBoxCapacity] = useState<number>(100);
  const [initialBoxes, setInitialBoxes] = useState<number>(10);
  const [initialLooseUnits, setInitialLooseUnits] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(1500);
  const [minStockAlert, setMinStockAlert] = useState<number>(50);

  const filteredProductNames = useMemo(() => {
    if (!name.trim()) return availableProductNames;
    return availableProductNames.filter((p) =>
      p.toLowerCase().includes(name.trim().toLowerCase())
    );
  }, [availableProductNames, name]);

  const filteredCategories = useMemo(() => {
    if (!category.trim()) return availableCategories;
    return availableCategories.filter((c) =>
      c.toLowerCase().includes(category.trim().toLowerCase())
    );
  }, [availableCategories, category]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('');
    setDefaultUnit('Ltr');
    setMrp(350);
    setDefaultPrice(300);
    setIsLoosePackaging(false);
    setBoxCapacity(50);
    setInitialBoxes(10);
    setInitialLooseUnits(0);
    setStockQuantity(500);
    setMinStockAlert(50);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category || '');
    setDefaultUnit(p.defaultUnit || 'Ltr');
    setMrp(p.mrp || 0);
    setDefaultPrice(p.defaultPrice || 0);
    const isLoose = (p.boxCapacity || 1) <= 1 || (p.defaultUnit === 'Bucket' && (p.boxCapacity || 1) <= 1);
    setIsLoosePackaging(isLoose);
    const cap = isLoose ? 1 : (p.boxCapacity || 50);
    setBoxCapacity(cap);
    const totalSt = p.stockQuantity ?? 0;
    setStockQuantity(totalSt);
    if (!isLoose && cap > 1) {
      setInitialBoxes(Math.floor(totalSt / cap));
      setInitialLooseUnits(totalSt % cap);
    } else {
      setInitialBoxes(0);
      setInitialLooseUnits(totalSt);
    }
    const defaultAlert = (p.boxCapacity && p.boxCapacity > 1) ? p.boxCapacity : (p.defaultUnit === 'Bucket' ? 2 : 10);
    setMinStockAlert(p.minStockAlert !== undefined && p.minStockAlert !== null ? p.minStockAlert : defaultAlert);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenInwardModal = (p?: Product) => {
    const target = p || products[0];
    if (!target) return;
    setInwardProductId(target.id);
    const isLoose = (target.boxCapacity || 1) <= 1 || (target.defaultUnit === 'Bucket' && (target.boxCapacity || 1) <= 1);
    setInwardMode(isLoose ? 'loose' : 'box');
    setInwardBoxes(0);
    setInwardUnitsPerBox(0);
    setInwardLooseUnits(0);
    setShowInwardModal(true);
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Product Title
    const nameLabel = isMr ? 'प्रॉडक्टचे नाव' : isHi ? 'उत्पाद का नाम' : 'Product Title';
    const nameErr = validateName(name, nameLabel, 2);
    if (nameErr) {
      setFormError(nameErr);
      return;
    }

    // Duplicate check (case-insensitive)
    const clean = name.trim().toLowerCase();
    const isDuplicate = products.some(p => 
      p.name.trim().toLowerCase() === clean && (!editingProduct || p.id !== editingProduct.id)
    );
    if (isDuplicate) {
      setFormError(isMr 
        ? `'${name.trim()}' नावाचे प्रॉडक्ट आधीपासून अस्तित्वात आहे. कृपया वेगळे नाव द्या.` 
        : isHi 
        ? `'${name.trim()}' नाम का उत्पाद पहले से मौजूद है।` 
        : `Product '${name.trim()}' already exists. Please enter a different title.`
      );
      return;
    }

    // 2. Validate Selling Price
    if (!defaultPrice || Number(defaultPrice) <= 0) {
      setFormError(isMr ? 'विक्री किंमत ० पेक्षा जास्त असणे आवश्यक आहे.' : isHi ? 'बिक्री मूल्य 0 से अधिक होना चाहिए।' : 'Selling price must be greater than 0.');
      return;
    }

    // 3. Validate MRP vs Selling Price
    if (mrp && Number(mrp) > 0 && Number(mrp) < Number(defaultPrice)) {
      setFormError(isMr ? 'MRP ही विक्री किंमतीपेक्षा कमी असू शकत नाही.' : isHi ? 'MRP बिक्री मूल्य से कम नहीं हो सकती।' : 'MRP cannot be less than selling price.');
      return;
    }

    // 4. Validate Box Capacity
    const finalBoxCap = isLoosePackaging ? 1 : (Number(boxCapacity) || 1);
    if (finalBoxCap < 1) {
      setFormError(isMr ? 'खोक्यात प्रमाण किमान १ असावे.' : isHi ? 'बॉक्स क्षमता कम से कम 1 होनी चाहिए।' : 'Box capacity must be at least 1.');
      return;
    }

    // 5. Validate Stock Quantity
    if (Number(stockQuantity) < 0) {
      setFormError(isMr ? 'स्टॉक संख्या निगेटिव्ह असू शकत नाही.' : isHi ? 'स्टॉक मात्रा नकारात्मक नहीं हो सकती।' : 'Stock quantity cannot be negative.');
      return;
    }

    setFormError(null);

    const finalCategory = category.trim() || 'General';

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        name: name.trim(),
        category: finalCategory,
        defaultUnit,
        mrp: Number(mrp) || 0,
        defaultPrice: Number(defaultPrice),
        boxCapacity: finalBoxCap,
        stockQuantity: Number(stockQuantity) >= 0 ? Number(stockQuantity) : 0,
        minStockAlert: Number(minStockAlert) >= 0 ? Number(minStockAlert) : 5,
      };
      onUpdateProduct(updated);
    } else {
      const created: Product = {
        id: `p-${Date.now()}`,
        name: name.trim(),
        category: finalCategory,
        defaultUnit,
        mrp: Number(mrp) || 0,
        defaultPrice: Number(defaultPrice),
        boxCapacity: finalBoxCap,
        stockQuantity: Number(stockQuantity) >= 0 ? Number(stockQuantity) : 0,
        minStockAlert: Number(minStockAlert) >= 0 ? Number(minStockAlert) : 5,
      };
      onAddProduct(created);
    }
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleConfirmInward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inwardProductId) return;
    if (inwardMode === 'box' && inwardBoxes > 0 && inwardUnitsPerBox <= 0) {
      alert(isMr ? 'कृपया एका खोक्यात किती नग आहेत (Units per Box) ते टाका.' : isHi ? 'कृपया एक बॉक्स में कितने नग हैं वह दर्ज करें।' : 'Please enter units per box.');
      return;
    }
    if (totalInwardAdded <= 0) {
      alert(isMr ? 'कृपया आवक मालाची संख्या टाका.' : isHi ? 'कृपया आवक मात्रा दर्ज करें।' : 'Please enter a valid stock inward quantity.');
      return;
    }
    if (onInwardStock) {
      if (inwardMode === 'loose') {
        onInwardStock(
          inwardProductId,
          0,
          1,
          totalInwardAdded
        );
      } else {
        onInwardStock(
          inwardProductId,
          Number(inwardBoxes) || 0,
          Number(inwardUnitsPerBox) || 0,
          Number(inwardLooseUnits) || 0
        );
      }
    }
    setShowInwardModal(false);
  };

  const handleDelete = (p: Product) => {
    if (window.confirm(`Are you sure you want to delete ${p.name}?`)) {
      onDeleteProduct(p.id);
    }
  };

  // Format stock display into exact breakdown requested by user:
  // e.g.: "20 खोके (20 × 50 = 1,000) + 3 सुटे = 1,003 बाटल्या • एकूण 1,003 Ltr"
  const formatStockText = (
    stock: number = 0,
    capacity: number = 50,
    unit: string = 'Ltr',
    productName: string = ''
  ) => {
    return formatDetailedStockText(stock, capacity, unit, productName, language).fullOneLiner;
  };

  const selectedInwardProduct = products.find((p) => p.id === inwardProductId);
  const totalInwardAdded = inwardMode === 'loose'
    ? (Number(inwardLooseUnits) || 0)
    : (Number(inwardBoxes) || 0) * (Number(inwardUnitsPerBox) || 0) + (Number(inwardLooseUnits) || 0);
  const newProjectedStock = (selectedInwardProduct?.stockQuantity || 0) + totalInwardAdded;

  // Inventory Overview Stats
  const totalStockUnits = products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
  const lowStockProductsCount = products.filter((p) => {
    const stock = p.stockQuantity ?? 0;
    const capacity = p.boxCapacity || 1;
    const defaultMinAlert = capacity > 1 ? capacity : (p.defaultUnit === 'Bucket' ? 2 : 10);
    const minAlert = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : defaultMinAlert;
    return stock > 0 && stock <= minAlert;
  }).length;

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
            {isMr
              ? 'कंपनीतील सर्व उत्पादनांचा दर, खोके पॅकिंग आणि ऑटोमॅटिक शिल्लक साठा व्यवस्थापन.'
              : isHi
              ? 'कंपनी के सभी उत्पादों के मूल्य, बॉक्स पैकिंग और इन्वेंट्री स्टॉक प्रबंधन।'
              : 'Manage company products, rates, box packaging, and inventory stock.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenInwardModal()}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <Boxes className="w-4 h-4" />
            <span>{isMr ? 'माल जमा करा (+ खोके)' : isHi ? 'माल जमा करें (+ बॉक्स)' : 'Inward Stock (+ Boxes)'}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="bg-animex-blue-600 hover:bg-animex-blue-700 active:scale-95 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isMr ? 'नवीन उत्पादन जोडा' : isHi ? 'नया उत्पाद जोड़ें' : 'Add New Product'}</span>
          </button>
        </div>
      </div>

      {/* Stock Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:bg-slate-800/80 p-4 rounded-2xl border border-blue-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-700 uppercase">
              {isMr ? 'एकूण उत्पादने' : isHi ? 'कुल उत्पाद' : 'Total Products'}
            </span>
            <div className="text-2xl font-black text-blue-900 dark:text-sky-300 mt-0.5">
              {products.length}
            </div>
          </div>
          <Boxes className="w-8 h-8 text-blue-500/80" />
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:bg-slate-800/80 p-4 rounded-2xl border border-emerald-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase">
              {isMr ? 'गोदामातील एकूण साठा' : isHi ? 'गोदाम में कुल स्टॉक' : 'Total Godown Stock'}
            </span>
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
            const capacity = p.boxCapacity || 1;
            const defaultMinAlert = capacity > 1 ? capacity : (p.defaultUnit === 'Bucket' ? 2 : 10);
            const minAlert = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : defaultMinAlert;
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
                    <span className="text-slate-500 font-bold">
                      {isMr ? 'पॅकिंग:' : isHi ? 'पैकिंग:' : 'Packaging:'}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {capacity <= 1 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                          {p.defaultUnit === 'Bucket'
                            ? (isMr ? '🪣 सुटी बकेट (खोके नाहीत)' : isHi ? '🪣 खुली बकेट' : '🪣 Loose Bucket')
                            : (isMr ? '📦 सुटे नग (खोके नाहीत)' : isHi ? '📦 खुले नग' : '📦 Loose Units')}
                        </span>
                      ) : (
                        <span>
                          📦 {capacity} {p.defaultUnit}/{isMr ? 'खोका' : isHi ? 'बॉक्स' : 'Box'}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Stock Calculation & Breakdown */}
                  {(() => {
                    const details = formatDetailedStockText(stock, capacity, p.defaultUnit, p.name, language);
                    const isBox = capacity > 1;

                    return (
                      <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        {/* Line 1: In Stock label on the left, Box breakdown pulled all the way to the right */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-600 dark:text-slate-400 font-extrabold shrink-0 whitespace-nowrap">
                            {isMr ? 'शिल्लक गोदामात:' : isHi ? 'उपलब्ध स्टॉक:' : 'In Stock:'}
                          </span>
                          <span
                            className={`font-black text-right ml-auto ${
                              isOutOfStock
                                ? 'text-red-600'
                                : isLowStock
                                ? 'text-amber-600'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {details.boxBreakdown}
                          </span>
                        </div>

                        {/* Line 2: Status badge on left, and on the far right: Bottles & Total Litres (no box) */}
                        <div className="flex items-end justify-between gap-2 pt-0.5">
                          {/* Left: Stock Status Badge */}
                          <div className="shrink-0">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                                <AlertTriangle className="w-3 h-3" />
                                {isMr ? 'स्टॉक संपला' : isHi ? 'स्टॉक समाप्त' : 'Out of Stock'}
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3 h-3" />
                                {isMr ? 'कमी स्टॉक' : isHi ? 'कम स्टॉक' : 'Low Stock'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                {isMr ? 'उपलब्ध' : isHi ? 'स्टॉक में उपलब्ध' : 'In Stock'}
                              </span>
                            )}
                          </div>

                          {/* Right: Clean, spacious details at the right edge without any box */}
                          <div className="flex flex-col items-end text-right text-[11px] font-black leading-tight ml-auto">
                            {isBox && (
                              <span className="text-animex-blue-700 dark:text-sky-300">
                                • {details.pieceName} : {stock.toLocaleString('en-IN')}
                              </span>
                            )}
                            {details.volumeSummary && (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                • {isMr ? 'एकूण' : isHi ? 'कुल' : 'Total'} : {details.volumeSummary.replace(/^(एकूण|कुल|Total)\s*/, '')}
                              </span>
                            )}
                            {!details.volumeSummary && !isBox && (
                              <span className="text-animex-blue-700 dark:text-sky-300">
                                • {details.pieceName} : {stock.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
                    {isMr ? 'गोदामात माल जमा करा' : isHi ? 'गोदाम में माल जमा करें' : 'Stock Inward & Receiving'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isMr
                      ? 'खोके किंवा सुट्या बकेट्स / नगांची आवक नोंदवा.'
                      : isHi
                      ? 'बॉक्स या खुले नग की आवक दर्ज करें।'
                      : 'Record inward boxes or loose unit additions to stock.'}
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
                  {isMr ? 'उत्पादन निवडा (Select Product) *' : isHi ? 'उत्पाद चुनें *' : 'Select Product *'}
                </label>
                <select
                  value={inwardProductId}
                  onChange={(e) => {
                    const sel = products.find((p) => p.id === e.target.value);
                    setInwardProductId(e.target.value);
                    if (sel) {
                      const isLoose = (sel.boxCapacity || 1) <= 1 || (sel.defaultUnit === 'Bucket' && (sel.boxCapacity || 1) <= 1);
                      setInwardMode(isLoose ? 'loose' : 'box');
                      setInwardUnitsPerBox(0);
                      setInwardBoxes(0);
                      setInwardLooseUnits(0);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                >
                  {products.map((p) => {
                    const vol = parsePackVolume(p.name, p.stockQuantity ?? 0, p.defaultUnit);
                    const showVol = !!(vol && p.defaultUnit.toLowerCase() !== vol.unit.toLowerCase());
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({isMr ? 'सध्या शिल्लक' : isHi ? 'वर्तमान शेष' : 'Stock'}: {p.stockQuantity ?? 0} {p.defaultUnit}{showVol ? ` • ${vol.totalDisplay}` : ''})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Current Godown Stock Banner */}
              {selectedInwardProduct && (
                <div className="bg-blue-50 dark:bg-slate-800/80 p-3 rounded-xl border border-blue-200 dark:border-slate-700 text-xs text-blue-950 dark:text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-sm">
                  <span className="font-extrabold text-slate-600 dark:text-slate-300">
                    {isMr ? '📦 सध्या गोदामात शिल्लक साठा:' : isHi ? '📦 वर्तमान में गोदाम में शेष स्टॉक:' : '📦 Current Godown Stock:'}
                  </span>
                  <span className="font-black text-animex-blue-700 dark:text-sky-300">
                    {formatStockText(
                      selectedInwardProduct.stockQuantity || 0,
                      selectedInwardProduct.boxCapacity || 50,
                      selectedInwardProduct.defaultUnit,
                      selectedInwardProduct.name
                    )}
                  </span>
                </div>
              )}

              {/* Inward Mode Switcher (2 Buttons like Product modal) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInwardMode('box');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    inwardMode === 'box'
                      ? 'bg-animex-blue-600 text-white border-animex-blue-700 shadow-md ring-2 ring-animex-blue-200 dark:ring-animex-blue-900'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>{isMr ? '📦 खोके पॅकिंग' : isHi ? '📦 बॉक्स पैकिंग' : '📦 Box Packaging'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInwardMode('loose');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    inwardMode === 'loose'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-900'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>
                    {isMr
                      ? `🪣 सुटी बकेट / सुटे नग`
                      : isHi
                      ? `🪣 खुली बकेट / खुले नग`
                      : `🪣 Loose Units / Bucket`}
                  </span>
                </button>
              </div>

              {/* Inward Inputs: Direct Loose vs Box Packaging */}
              {inwardMode === 'loose' ? (
                <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border-2 border-dashed border-emerald-300 dark:border-emerald-700/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-emerald-900 dark:text-emerald-200 text-xs font-black">
                      {isMr
                        ? `किती ${selectedInwardProduct?.defaultUnit || 'बकेट'} आले? (Inward Count) *`
                        : isHi
                        ? `कितने ${selectedInwardProduct?.defaultUnit || 'बकेट'} आए? *`
                        : `Inward Count (${selectedInwardProduct?.defaultUnit || 'Bucket'}) *`}
                    </label>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 rounded-full font-extrabold">
                      {isMr ? 'सुटी आवक (खोके नाहीत)' : isHi ? 'खुली आवक (कोई बॉक्स नहीं)' : 'Loose Inward (No Box)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      required
                      value={inwardLooseUnits || ''}
                      onChange={(e) => setInwardLooseUnits(Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className="w-full bg-white dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-600 rounded-xl p-3 text-slate-900 dark:text-white font-black text-lg focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                    />
                    <span className="text-sm font-black text-emerald-800 dark:text-emerald-200 px-3.5 py-3 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl border border-emerald-300 dark:border-emerald-700 shrink-0">
                      {selectedInwardProduct?.defaultUnit || 'Bucket'}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                    {isMr
                      ? '✨ 25kg च्या मोठ्या बकेट्स किंवा सुटे नग खोक्यात येत नाहीत. त्यांची थेट आवक संख्या येथे टाका.'
                      : isHi
                      ? '✨ 25kg के बड़े बकेट्स या खुले नग बॉक्स में नहीं आते। उनकी संख्या सीधे यहां दर्ज करें।'
                      : '✨ Large 25kg buckets or loose units do not come in packaging boxes. Enter direct inward units here.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                      {isMr ? 'खोके किती आले? (No. of Boxes)' : 'No. of Boxes'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inwardBoxes || ''}
                      onChange={(e) => setInwardBoxes(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-black text-sm"
                      placeholder="0"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {isMr ? 'खोक्यांची संख्या' : 'No. of boxes'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                      {isMr ? '१ खोक्यात किती? (Units/Box)' : 'Units per Box'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inwardUnitsPerBox || ''}
                      onChange={(e) => setInwardUnitsPerBox(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-black text-sm"
                      placeholder="0"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {isMr ? 'उदा. 20, 50, 100' : 'e.g. 20, 50, 100'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                      {isMr
                        ? `सुटे ${selectedInwardProduct?.defaultUnit || 'नग'} (Loose Units)`
                        : `Loose ${selectedInwardProduct?.defaultUnit || 'Units'}`}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inwardLooseUnits || ''}
                      onChange={(e) => setInwardLooseUnits(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-black text-sm"
                      placeholder="0"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {isMr ? 'सुटी संख्या असल्यास' : 'Loose units if any'}
                    </span>
                  </div>
                </div>
              )}

              {/* Inward Calculation Preview */}
              {(() => {
                const projDetails = selectedInwardProduct
                  ? formatDetailedStockText(
                      newProjectedStock,
                      selectedInwardProduct.boxCapacity || 50,
                      selectedInwardProduct.defaultUnit,
                      selectedInwardProduct.name,
                      language
                    )
                  : null;

                const pieceName = projDetails
                  ? projDetails.pieceName
                  : (selectedInwardProduct?.defaultUnit || (isMr ? 'नग' : isHi ? 'नग' : 'Units'));

                const incomingVol = selectedInwardProduct
                  ? parsePackVolume(selectedInwardProduct.name, totalInwardAdded, selectedInwardProduct.defaultUnit)
                  : null;

                const projectedVol = selectedInwardProduct
                  ? parsePackVolume(selectedInwardProduct.name, newProjectedStock, selectedInwardProduct.defaultUnit)
                  : null;

                const boxWord = isMr ? 'खोके' : isHi ? 'बॉक्स' : inwardBoxes === 1 ? 'Box' : 'Boxes';
                const looseWord = isMr ? 'सुटे' : isHi ? 'खुले' : 'Loose';
                const totalWord = isMr ? 'एकूण' : isHi ? 'कुल' : 'Total';

                const showIncomingVol = !!(
                  incomingVol &&
                  pieceName.toLowerCase() !== incomingVol.unit.toLowerCase()
                );
                const showProjVol = !!(
                  projectedVol &&
                  pieceName.toLowerCase() !== projectedVol.unit.toLowerCase()
                );

                return (
                  <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                      <span className="font-bold">{isMr ? '१. नवीन आलेला माल (Incoming Inward):' : '1. Incoming Inward:'}</span>
                      <span className="font-mono font-black">
                        {inwardMode === 'loose'
                          ? (totalInwardAdded > 0
                              ? `+${totalInwardAdded} ${pieceName}${showIncomingVol ? ` • ${totalWord}: +${incomingVol.totalDisplay}` : ''}`
                              : `0 ${pieceName}${showIncomingVol ? ` • ${totalWord}: 0 ${incomingVol.unit}` : ''}`)
                          : (totalInwardAdded > 0
                              ? `+${inwardBoxes} ${boxWord} × ${inwardUnitsPerBox} + ${inwardLooseUnits} ${looseWord} = +${totalInwardAdded} ${pieceName}${showIncomingVol ? ` • ${totalWord}: +${incomingVol.totalDisplay}` : ''}`
                              : `+${inwardBoxes} ${boxWord} × ${inwardUnitsPerBox} + ${inwardLooseUnits} ${looseWord} = 0 ${pieceName}${showIncomingVol ? ` • ${totalWord}: 0 ${incomingVol.unit}` : ''}`)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-black text-emerald-900 dark:text-emerald-200 pt-1.5 border-t border-emerald-200/80 dark:border-emerald-800">
                      <span>{isMr ? '२. गोदामातील नवीन एकूण साठा (Projected Total Stock):' : '2. Projected Total Stock:'}</span>
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                        {newProjectedStock.toLocaleString('en-IN')} {pieceName}
                        {showProjVol ? ` • ${totalWord}: ${projectedVol.totalDisplay}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer hover:bg-slate-300 transition-all"
                >
                  {isMr ? 'रद्द करा' : isHi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isMr ? 'साठ्यात जमा करा' : isHi ? 'स्टॉक में जोड़ें' : 'Add to Stock'}</span>
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
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Product Title with YouTube-style suggestions */}
              <div ref={nameInputRef} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 dark:text-slate-300">
                    {isMr ? 'प्रॉडक्ट नाव (Product Title) *' : isHi ? 'उत्पाद नाम (Product Title) *' : 'Product Title *'}
                  </label>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {isMr ? 'सूचीमधून निवडा किंवा नवीन टाईप करा' : isHi ? 'सूची से चुनें या नया टाइप करें' : 'Select or type custom'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder={isMr ? "प्रॉडक्ट नाव" : isHi ? "उत्पाद नाम" : "Product Name"}
                    value={name}
                    onFocus={() => setShowNameSuggestions(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setName(val);
                      setShowNameSuggestions(true);
                      if (formError) setFormError(null);
                      const matched = products.find((p) => p.name.trim().toLowerCase() === val.trim().toLowerCase());
                      if (matched && matched.id !== editingProduct?.id) {
                        if (matched.category) setCategory(matched.category);
                        if (matched.defaultUnit) setDefaultUnit(matched.defaultUnit);
                        if (matched.mrp) setMrp(matched.mrp);
                        if (matched.defaultPrice) setDefaultPrice(matched.defaultPrice);
                        if (matched.boxCapacity) setBoxCapacity(matched.boxCapacity);
                      } else {
                        const lower = val.toLowerCase();
                        if (lower.includes('bucket') || lower.includes('25kg')) {
                          setDefaultUnit('Bucket');
                          setIsLoosePackaging(true);
                          setBoxCapacity(1);
                        } else if (lower.includes('10kg')) {
                          setDefaultUnit('Bucket');
                          setIsLoosePackaging(false);
                          setBoxCapacity(2);
                        } else if (lower.includes('can') || lower.includes('5 lit') || lower.includes('5lit') || lower.includes('5 ltr') || lower.includes('5l')) {
                          setDefaultUnit('Can');
                          setIsLoosePackaging(false);
                          setBoxCapacity(4);
                        } else if (lower.includes('500ml') || lower.includes('500 ml')) {
                          setDefaultUnit('Bottle');
                          setIsLoosePackaging(false);
                          setBoxCapacity(24);
                        } else if (lower.includes('300ml') || lower.includes('300 ml')) {
                          setDefaultUnit('Bottle');
                          setIsLoosePackaging(false);
                          setBoxCapacity(40);
                        } else if (lower.includes('1lit') || lower.includes('1 lit') || lower.includes('1 ltr')) {
                          setDefaultUnit('Ltr');
                          setIsLoosePackaging(false);
                          setBoxCapacity(20);
                        } else if (lower.includes('bolus') || lower.includes('pack')) {
                          setDefaultUnit('Pack');
                        }
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 pr-8 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                  />
                  {name && (
                    <button
                      type="button"
                      onClick={() => setName('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      title={isMr ? "साफ करा" : "Clear"}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* YouTube Style Autocomplete Dropdown */}
                {showNameSuggestions && filteredProductNames.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-black uppercase text-slate-400 flex items-center justify-between">
                      <span>{isMr ? 'सुचवलेली प्रॉडक्ट्स (Suggestions)' : 'Product Suggestions'}</span>
                      <span className="text-[9px] lowercase font-normal">{isMr ? '❌ दाबून सूचीमधून हटवा' : 'click ❌ to remove'}</span>
                    </div>
                    {filteredProductNames.map((prodName) => (
                      <div
                        key={prodName}
                        onClick={() => {
                          setName(prodName);
                          setShowNameSuggestions(false);
                          const matched = products.find((p) => p.name.trim().toLowerCase() === prodName.trim().toLowerCase());
                          if (matched && matched.id !== editingProduct?.id) {
                            if (matched.category) setCategory(matched.category);
                            if (matched.defaultUnit) setDefaultUnit(matched.defaultUnit);
                            if (matched.mrp) setMrp(matched.mrp);
                            if (matched.defaultPrice) setDefaultPrice(matched.defaultPrice);
                            if (matched.boxCapacity) setBoxCapacity(matched.boxCapacity);
                          } else {
                            const lower = prodName.toLowerCase();
                            if (lower.includes('bucket') || lower.includes('25kg')) {
                              setDefaultUnit('Bucket');
                              setIsLoosePackaging(true);
                              setBoxCapacity(1);
                            } else if (lower.includes('10kg')) {
                              setDefaultUnit('Bucket');
                              setIsLoosePackaging(false);
                              setBoxCapacity(2);
                            } else if (lower.includes('can') || lower.includes('5 lit') || lower.includes('5lit') || lower.includes('5 ltr') || lower.includes('5l')) {
                              setDefaultUnit('Can');
                              setIsLoosePackaging(false);
                              setBoxCapacity(4);
                            } else if (lower.includes('500ml') || lower.includes('500 ml')) {
                              setDefaultUnit('Bottle');
                              setIsLoosePackaging(false);
                              setBoxCapacity(24);
                            } else if (lower.includes('300ml') || lower.includes('300 ml')) {
                              setDefaultUnit('Bottle');
                              setIsLoosePackaging(false);
                              setBoxCapacity(40);
                            } else if (lower.includes('1lit') || lower.includes('1 lit') || lower.includes('1 ltr')) {
                              setDefaultUnit('Ltr');
                              setIsLoosePackaging(false);
                              setBoxCapacity(20);
                            } else if (lower.includes('bolus') || lower.includes('pack')) {
                              setDefaultUnit('Pack');
                            }
                          }
                        }}
                        className="flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 text-xs font-semibold truncate">
                          <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-animex-blue-500 shrink-0" />
                          <span className="truncate">{prodName}</span>
                        </div>
                        <button
                          type="button"
                          title={isMr ? "सूचीमधून काढून टाका" : "Remove from suggestions"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveProductSuggestion(prodName);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Category with YouTube-style suggestions */}
              <div ref={catInputRef} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 dark:text-slate-300">
                    {isMr ? 'कॅटेगरी (Category)' : isHi ? 'कैटेगरी (Category)' : 'Category'}
                  </label>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {isMr ? 'निवडा किंवा नवीन नाव टाईप करा' : isHi ? 'चुनें या नया नाम टाइप करें' : 'Select or type custom'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isMr ? "कॅटेगरी नाव" : isHi ? "कैटेगरी नाम" : "Category Name"}
                    value={category}
                    onFocus={() => setShowCatSuggestions(true)}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setShowCatSuggestions(true);
                      if (formError) setFormError(null);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 pr-8 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                  />
                  {category && (
                    <button
                      type="button"
                      onClick={() => setCategory('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      title={isMr ? "साफ करा" : "Clear"}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* YouTube Style Autocomplete Dropdown */}
                {showCatSuggestions && filteredCategories.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-black uppercase text-slate-400 flex items-center justify-between">
                      <span>{isMr ? 'सुचवलेल्या कॅटेगरीज (Suggestions)' : 'Category Suggestions'}</span>
                      <span className="text-[9px] lowercase font-normal">{isMr ? '❌ दाबून सूचीमधून हटवा' : 'click ❌ to remove'}</span>
                    </div>
                    {filteredCategories.map((catName) => (
                      <div
                        key={catName}
                        onClick={() => {
                          setCategory(catName);
                          setShowCatSuggestions(false);
                        }}
                        className="flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 text-xs font-semibold truncate">
                          <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-animex-blue-500 shrink-0" />
                          <span className="truncate">{catName}</span>
                        </div>
                        <button
                          type="button"
                          title={isMr ? "सूचीमधून काढून टाका" : "Remove from suggestions"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCategorySuggestion(catName);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    {isMr ? 'युनिट (Unit) *' : isHi ? 'यूनिट (Unit) *' : 'Unit *'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="unit-options-list"
                      required
                      value={defaultUnit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDefaultUnit(val);
                        const lower = val.toLowerCase();
                        if (lower.includes('5 lit') || lower.includes('5lit') || lower.includes('5 ltr')) {
                          if (boxCapacity === 50 || boxCapacity === 20) setBoxCapacity(4);
                        } else if (lower.includes('300ml') || lower.includes('300 ml')) {
                          if (boxCapacity === 50 || boxCapacity === 20) setBoxCapacity(40);
                        } else if (lower.includes('500ml') || lower.includes('500 ml')) {
                          if (boxCapacity === 50 || boxCapacity === 20) setBoxCapacity(24);
                        } else if (lower.includes('25kg') || lower.includes('25 kg')) {
                          setIsLoosePackaging(true);
                          setBoxCapacity(1);
                        } else if (lower.includes('10kg') || lower.includes('10 kg')) {
                          setBoxCapacity(2);
                        }
                      }}
                      placeholder={isMr ? "उदा. 1 Ltr, 5 Ltr, 300 ml" : "e.g. 1 Ltr, 5 Ltr, 300 ml"}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-bold"
                    />
                    <datalist id="unit-options-list">
                      <option value="1 Ltr">{isMr ? '1 Ltr (१ लिटर बाटली)' : '1 Ltr (1 Litre Bottle)'}</option>
                      <option value="5 Ltr">{isMr ? '5 Ltr (५ लिटर कॅन)' : '5 Ltr (5 Litre Can)'}</option>
                      <option value="550 ml">{isMr ? '550 ml (५५० मिली बाटली)' : '550 ml Bottle'}</option>
                      <option value="500 ml">{isMr ? '500 ml (५०० मिली बाटली)' : '500 ml Bottle'}</option>
                      <option value="300 ml">{isMr ? '300 ml (३०० मिली बाटली)' : '300 ml Bottle'}</option>
                      <option value="250 ml">{isMr ? '250 ml (२५० मिली बाटली)' : '250 ml Bottle'}</option>
                      <option value="100 ml">{isMr ? '100 ml (१०० मिली बाटली)' : '100 ml Bottle'}</option>
                      <option value="250 gm">{isMr ? '250 gm (२५० ग्रॅम पावडर पुडा)' : '250 gm Powder Pouch'}</option>
                      <option value="300 gm">{isMr ? '300 gm (३०० ग्रॅम पावडर पुडा)' : '300 gm Powder Pouch'}</option>
                      <option value="500 gm">{isMr ? '500 gm (५०० ग्रॅम पावडर पुडा)' : '500 gm Powder Pouch'}</option>
                      <option value="1 Kg">{isMr ? '1 Kg (१ किलो पॅक)' : '1 Kg Pack'}</option>
                      <option value="10 Kg">{isMr ? '10 Kg (१० किलो बकेट)' : '10 Kg Bucket'}</option>
                      <option value="25 Kg">{isMr ? '25 Kg (२५ किलो बकेट)' : '25 Kg Bucket'}</option>
                      <option value="Bottle">{isMr ? 'Bottle (बाटली)' : 'Bottle'}</option>
                      <option value="Can">{isMr ? 'Can (कॅन)' : 'Can'}</option>
                      <option value="Bucket">{isMr ? 'Bucket (बकेट)' : 'Bucket'}</option>
                      <option value="Pouch">{isMr ? 'Pouch (पुडा / पाकीट)' : 'Pouch'}</option>
                      <option value="Box">{isMr ? 'Box (खोका)' : 'Box'}</option>
                      <option value="Pack">{isMr ? 'Pack (पॅक)' : 'Pack'}</option>
                      <option value="Ltr">{isMr ? 'Ltr (लिटर)' : 'Ltr'}</option>
                      <option value="Kg">{isMr ? 'Kg (किलो)' : 'Kg'}</option>
                      <option value="Ml">{isMr ? 'Ml (मिली)' : 'Ml'}</option>
                      <option value="gm">{isMr ? 'gm (ग्रॅम)' : 'gm'}</option>
                    </datalist>
                  </div>
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
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    {isMr ? 'किंमत (Price ₹) *' : isHi ? 'मूल्य (Price ₹) *' : 'Price (₹) *'}
                  </label>
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
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="text-[11px] font-extrabold text-animex-blue-900 dark:text-sky-300">
                  {isMr ? '📦 इन्व्हेंटरी आणि पॅकिंग सेटिंग्ज' : isHi ? '📦 इन्वेंट्री और पैकिंग सेटिंग्स' : '📦 Packaging & Stock Settings'}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      {isMr ? 'पॅकिंग प्रकार' : isHi ? 'पैकिंग प्रकार' : 'Packaging Type'}
                    </label>
                    <select
                      value={isLoosePackaging ? 'loose' : 'box'}
                      onChange={(e) => {
                        const loose = e.target.value === 'loose';
                        setIsLoosePackaging(loose);
                        if (loose) {
                          setBoxCapacity(1);
                          setInitialBoxes(0);
                          const cur = (stockQuantity > 0 && stockQuantity !== 500) ? stockQuantity : 9;
                          setInitialLooseUnits(cur);
                          setStockQuantity(cur);
                          if (minStockAlert >= 10) setMinStockAlert(2);
                        } else {
                          const cap = boxCapacity > 1 ? boxCapacity : 50;
                          setBoxCapacity(cap);
                          setInitialBoxes(10);
                          setInitialLooseUnits(0);
                          setStockQuantity(10 * cap);
                          if (minStockAlert === 2) setMinStockAlert(cap);
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-bold text-xs"
                    >
                      <option value="box">{isMr ? '📦 खोके पॅकिंग' : isHi ? '📦 बॉक्स पैकिंग' : '📦 Box Packaging'}</option>
                      <option value="loose">{isMr ? '🪣 सुटी बकेट (खोके नाहीत)' : isHi ? '🪣 खुली बकेट' : '🪣 Loose Units / Buckets'}</option>
                    </select>
                  </div>

                  {!isLoosePackaging ? (
                    <div>
                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                        {isMr ? 'खोक्यात प्रमाण (Per Box) *' : isHi ? 'प्रति बॉक्स मात्रा *' : 'Units per Box *'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={boxCapacity}
                        onChange={(e) => {
                          const cap = Number(e.target.value);
                          setBoxCapacity(cap);
                          setStockQuantity((initialBoxes * cap) + initialLooseUnits);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white text-xs"
                        placeholder={isMr ? 'उदा. 20, 50, 100' : isHi ? 'उदा. 20, 50, 100' : 'e.g. 20, 50, 100'}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center pt-4 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                      <span>{isMr ? '✓ सुटी बकेट (खोके नाहीत)' : isHi ? '✓ खुली बकेट (कोई बॉक्स नहीं)' : '✓ Loose Bucket (No Box)'}</span>
                    </div>
                  )}
                </div>

                {/* Initial Stock based on Boxes & Loose, or Direct for Loose Packaging */}
                {isLoosePackaging ? (
                  <div className="p-2.5 bg-white dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 font-bold mb-1">
                      {isMr ? '📦 सुरुवातीला गोदामात हजर माल (Opening Stock)' : '📦 Initial Warehouse Stock'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={stockQuantity}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value));
                          setStockQuantity(val);
                          setInitialBoxes(0);
                          setInitialLooseUnits(val);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 pr-16 text-slate-900 dark:text-white font-bold text-xs"
                        placeholder="0"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">
                        {defaultUnit.toLowerCase().includes('bucket') || defaultUnit.toLowerCase().includes('kg') ? (isMr ? 'बकेट' : 'Bucket') : defaultUnit}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-white dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {isMr ? '📦 सुरुवातीला गोदामात हजर माल (Opening Stock)' : '📦 Initial Warehouse Stock'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                          {isMr ? 'खोक्यांची संख्या (Boxes)' : 'Boxes'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={initialBoxes}
                          onChange={(e) => {
                            const b = Math.max(0, Number(e.target.value));
                            setInitialBoxes(b);
                            setStockQuantity((b * boxCapacity) + initialLooseUnits);
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-bold text-xs"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                          {isMr ? 'सुटे नग (Loose Units)' : 'Loose Units'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={initialLooseUnits}
                          onChange={(e) => {
                            const l = Math.max(0, Number(e.target.value));
                            setInitialLooseUnits(l);
                            setStockQuantity((initialBoxes * boxCapacity) + l);
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-bold text-xs"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3 Summary Boxes as requested in User's Diagram 1, 2, 3 */}
                {(() => {
                  const vol = parsePackVolume(name, stockQuantity, defaultUnit);
                  const isBox = !isLoosePackaging && boxCapacity > 1;
                  const boxTotal = initialBoxes * boxCapacity;
                  
                  let pieceLabel = isMr ? 'बाटल्या' : isHi ? 'बोतलें' : 'Bottles';
                  const lowerUnit = defaultUnit.toLowerCase();
                  const lowerName = name.toLowerCase();
                  if (lowerUnit.includes('can') || lowerName.includes('can') || lowerName.includes('5 lit') || lowerName.includes('5lit')) {
                    pieceLabel = 'Can';
                  } else if (lowerUnit.includes('bucket') || lowerName.includes('bucket') || lowerUnit.includes('25kg') || lowerUnit.includes('25 kg') || lowerUnit.includes('10kg') || lowerUnit.includes('10 kg') || lowerName.includes('25kg') || lowerName.includes('25 kg') || lowerName.includes('10kg') || lowerName.includes('10 kg') || isLoosePackaging) {
                    pieceLabel = isMr ? 'बकेट' : 'Bucket';
                  } else if (lowerUnit.includes('gm') || lowerName.includes('gm') || lowerUnit.includes('pouch') || lowerUnit.includes('pude') || lowerName.includes('powder') || lowerUnit.includes('powder')) {
                    pieceLabel = isMr ? 'पुडे' : 'Pouches';
                  } else if (lowerUnit.includes('pack') || lowerName.includes('bolus')) {
                    pieceLabel = 'Pack';
                  } else if (lowerUnit.includes('box')) {
                    pieceLabel = 'Box';
                  }

                  const volumeDisplay = vol ? vol.totalDisplay : `${stockQuantity} ${defaultUnit}`;

                  return (
                    <div className="space-y-2 pt-1">
                      {/* 3 Uniform Fields: Total Bottles/Bucket, Total Ltr/Kg, Min Stock Alert */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Box 1: Total Pieces (Bottles / Cans / Buckets) */}
                        <div>
                          <label className="block text-[11px] text-slate-800 dark:text-slate-200 font-extrabold mb-1">
                            {`Total ${pieceLabel}`}
                          </label>
                          <div className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-black text-xs flex items-center min-h-[38px]">
                            <span>{stockQuantity.toLocaleString('en-IN')} {pieceLabel}</span>
                          </div>
                        </div>

                        {/* Box 2: Total Volume (Ltr / Kg / ml) */}
                        <div>
                          <label className="block text-[11px] text-slate-800 dark:text-slate-200 font-extrabold mb-1">
                            {vol ? `Total ${vol.unit}` : (lowerUnit.includes('kg') ? 'Total Kg' : 'Total Ltr')}
                          </label>
                          <div className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-black text-xs flex items-center min-h-[38px]">
                            <span>{volumeDisplay}</span>
                          </div>
                        </div>

                        {/* Box 3: Min Stock Alert (Entered by hand) */}
                        <div>
                          <label className="block text-[11px] text-slate-800 dark:text-slate-200 font-extrabold mb-1">
                            {isMr ? 'Min Stock Alert' : 'Min Stock Alert'}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={minStockAlert}
                              onChange={(e) => setMinStockAlert(Number(e.target.value))}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 pr-12 text-slate-900 dark:text-white text-xs font-black min-h-[38px]"
                              placeholder="50"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">
                              {pieceLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Formula explanation line */}
                      {isBox ? (
                        <div className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          👉 {initialBoxes} {isMr ? 'खोके' : 'Boxes'} ({initialBoxes} × {boxCapacity} = {boxTotal.toLocaleString('en-IN')}) + {initialLooseUnits} {isMr ? 'सुटे' : 'loose'} = {stockQuantity} {pieceLabel}
                          {vol ? ` • एकूण ${vol.totalDisplay}` : ''}
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          👉 {stockQuantity} {pieceLabel} {vol ? `• एकूण ${vol.totalDisplay}` : ''}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                    const capacity = p.boxCapacity || 1;
                    const defaultMinAlert = capacity > 1 ? capacity : (p.defaultUnit === 'Bucket' ? 2 : 10);
                    const limit = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : defaultMinAlert;
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
                              {(() => {
                                const v = parsePackVolume(p.name, stock);
                                return v && p.defaultUnit.toLowerCase() !== v.unit.toLowerCase() ? ` (${v.totalDisplay})` : '';
                              })()}
                            </span>
                          </div>

                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Alert Limit:</span>
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                              {limit} {p.defaultUnit}
                              {(() => {
                                const v = parsePackVolume(p.name, limit);
                                return v && p.defaultUnit.toLowerCase() !== v.unit.toLowerCase() ? ` (${v.totalDisplay})` : '';
                              })()}
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
