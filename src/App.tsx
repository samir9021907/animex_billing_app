import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoicePreviewModal } from './components/InvoicePreviewModal';
import { InvoiceHistory } from './components/InvoiceHistory';
import { MedicalStoresDirectory } from './components/MedicalStoresDirectory';
import { ProductsManager } from './components/ProductsManager';
import { ProfileManager } from './components/ProfileManager';
import { SettingsScreen } from './components/SettingsScreen';
import { LoginScreen } from './components/LoginScreen';
import { PurchasesManager } from './components/PurchasesManager';
import { Invoice, MedicalStore, Product, PurchaseInvoice } from './types';
import { INITIAL_INVOICES, INITIAL_PRODUCTS, INITIAL_STORES, INITIAL_PURCHASES } from './data/seedData';
import { convertNumberToWords } from './utils/numberToWords';
import {
  syncInvoiceToBackend,
  deleteInvoiceFromBackend,
  syncStoreToBackend,
  deleteStoreFromBackend,
  fetchStoresFromBackend,
  fetchInvoicesFromBackend,
  fetchProductsFromBackend,
  syncProductToBackend,
  deleteProductFromBackend,
  fetchUnifiedSyncFromBackend,
  warmupBackendConnection,
} from './utils/api';
import { authService, UserSession } from './services/authService';
import { useLanguage } from './context/LanguageContext';

export const App: React.FC = () => {
  const { language } = useLanguage();
  const isMr = language === 'mr';
  const isHi = language === 'hi';
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // One-time clean-up migration to remove old dummy medical stores and bills
  // Ensures fresh start without deleting product inventory or purchases
  const CLEAN_SLATE_KEY = 'animex_clean_slate_v2';
  try {
    if (localStorage.getItem(CLEAN_SLATE_KEY) !== 'true') {
      localStorage.removeItem('animex_invoices');
      localStorage.removeItem('animex_medical_stores');
      localStorage.setItem(CLEAN_SLATE_KEY, 'true');
    }
  } catch (e) {
    console.warn('Storage reset warning:', e);
  }

  // Persistent state initialized from seedData / localStorage
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem('animex_invoices');
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return INITIAL_INVOICES;
    } catch {
      return INITIAL_INVOICES;
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('animex_billing_products');
      if (saved !== null) {
        const parsed: Product[] = JSON.parse(saved);
        // Ensure every product has stockQuantity and boxCapacity from defaults
        return parsed.map(p => {
          const defaultSeed = INITIAL_PRODUCTS.find(sp => sp.id === p.id);
          let boxCap = p.boxCapacity !== undefined ? p.boxCapacity : (defaultSeed?.boxCapacity ?? 50);
          // Large 25kg buckets do not come in boxes; they are loose buckets
          if (p.name.includes('25kg') || (p.defaultUnit === 'Bucket' && (boxCap === 2 || p.id === 'p8'))) {
            boxCap = 1;
          }
          return {
            ...p,
            stockQuantity: p.stockQuantity !== undefined ? p.stockQuantity : (defaultSeed?.stockQuantity ?? 100),
            boxCapacity: boxCap,
            minStockAlert: p.minStockAlert !== undefined ? p.minStockAlert : (defaultSeed?.minStockAlert ?? 50),
          };
        });
      }
      return INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [stores, setStores] = useState<MedicalStore[]>(() => {
    try {
      const saved = localStorage.getItem('animex_medical_stores');
      const list = saved !== null ? JSON.parse(saved) : INITIAL_STORES;
      if (Array.isArray(list)) {
        const uniqueMap = new Map<string, MedicalStore>();
        for (const s of list) {
          const key = s.firmName?.trim().toLowerCase();
          if (key && !uniqueMap.has(key)) {
            uniqueMap.set(key, s);
          }
        }
        return Array.from(uniqueMap.values());
      }
      return INITIAL_STORES;
    } catch {
      return INITIAL_STORES;
    }
  });

  const [selectedPreviewInvoice, setSelectedPreviewInvoice] = useState<Invoice | null>(null);

  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncNotice, setSyncNotice] = useState<string>('');

  const storesRef = useRef(stores);
  storesRef.current = stores;
  const invoicesRef = useRef(invoices);
  invoicesRef.current = invoices;
  const productsRef = useRef(products);
  productsRef.current = products;
  const isSyncingRef = useRef(false);

  // ─── ⚡ Ultra-Fast Bidirectional Cloud Neon Database Sync ────────────────────
  const syncCloudData = useCallback(async (isManual: boolean = false) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncingCloud(true);
    if (isManual) setSyncNotice(isMr ? 'सिंक सुरू आहे...' : isHi ? 'सिंक हो रहा है...' : 'Syncing with cloud...');
    const syncStart = performance.now();

    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // 1. FAST FETCH: Try unified single-request sync first
      let cloudStores: MedicalStore[] = [];
      let cloudInvoices: Invoice[] = [];
      let cloudProducts: Product[] = [];
      let fastSyncDuration: number | null = null;

      const unifiedResult = await fetchUnifiedSyncFromBackend();
      if (unifiedResult) {
        cloudStores = unifiedResult.stores;
        cloudInvoices = unifiedResult.invoices;
        cloudProducts = unifiedResult.products;
        fastSyncDuration = unifiedResult.durationMs;
      } else {
        // Fallback only if unified endpoint was unavailable
        const [storesData, invoicesData, productsData] = await Promise.all([
          fetchStoresFromBackend(),
          fetchInvoicesFromBackend(),
          fetchProductsFromBackend(),
        ]);
        cloudStores = storesData;
        cloudInvoices = invoicesData;
        cloudProducts = productsData;
      }

      // 2. PROCESS STORES (Local-First Merge + Parallel Upload)
      const storeMap = new Map<string, MedicalStore>();
      for (const s of cloudStores) {
        const key = s.firmName?.trim().toLowerCase();
        if (key && !storeMap.has(key)) {
          storeMap.set(key, s);
        }
      }

      const currentStores = storesRef.current;
      const unsyncedStores = currentStores.filter(
        (ls) => !uuidRegex.test(ls.id) &&
                !storeMap.has(ls.firmName.trim().toLowerCase())
      );

      if (unsyncedStores.length > 0) {
        const storeUploads = await Promise.allSettled(
          unsyncedStores.map(unsynced => syncStoreToBackend(unsynced))
        );
        storeUploads.forEach(res => {
          if (res.status === 'fulfilled' && res.value && res.value.id) {
            const created = res.value;
            const syncedStore: MedicalStore = {
              id: created.id,
              firmName: created.firm_name,
              contactName: created.contact_person_name || '',
              phone: created.phone_number || '',
              district: created.district || 'Maharashtra',
              address: created.address || '',
              state: 'Maharashtra',
            };
            storeMap.set(syncedStore.firmName.trim().toLowerCase(), syncedStore);
          }
        });
      }
      const finalStores = Array.from(storeMap.values());

      // 3. PROCESS INVOICES (Local-First Merge + Parallel Upload)
      const currentInvoices = invoicesRef.current;
      const unsyncedInvoices = currentInvoices.filter(
        (li) => !uuidRegex.test(li.id) &&
                !cloudInvoices.some((ci) => ci.id === li.id || (ci.globalBillId && ci.globalBillId === li.globalBillId))
      );

      if (unsyncedInvoices.length > 0) {
        const invoiceUploads = await Promise.allSettled(
          unsyncedInvoices.map(unsynced => syncInvoiceToBackend(unsynced))
        );
        invoiceUploads.forEach((res, idx) => {
          if (res.status === 'fulfilled' && res.value && res.value.id) {
            const created = res.value;
            const unsynced = unsyncedInvoices[idx];
            const rawItems = Array.isArray(created.items) ? created.items : [];
            const items = rawItems.map((it: any, i: number) => ({
              id: `item-${i}-${Date.now()}`,
              productId: it.productId || `p-${i}`,
              itemName: it.product_title || it.itemName || 'Product',
              quantity: Number(it.quantity || 1),
              unit: it.unit || 'Ltr',
              mrp: Number(it.mrp || 0),
              pricePerUnit: Number(it.selling_price || it.pricePerUnit || 0),
              amount: Number(it.amount || 0),
              isFree: Boolean(it.is_free),
              isScheme: Boolean(it.is_free),
            }));
            const storeData = created.medical_store || unsynced.billTo || {};
            cloudInvoices.unshift({
              id: created.id,
              invoiceNo: created.company_invoice_number || unsynced.invoiceNo,
              invoiceNumber: created.invoice_number || unsynced.invoiceNumber,
              globalBillId: created.global_bill_id ? Number(created.global_bill_id) : unsynced.globalBillId,
              date: created.date ? created.date.split('T')[0] : unsynced.date,
              billTo: {
                id: storeData.id || created.medical_store_id,
                firmName: storeData.firm_name || storeData.firmName || 'Medical Store',
                contactName: storeData.contact_person_name || storeData.contactName || '',
                phone: storeData.phone_number || storeData.phone || '',
                district: storeData.district || '',
                address: storeData.address || '',
                state: 'Maharashtra',
              },
              items,
              subTotal: Number(created.subtotal || 0),
              discount: Number(created.discount || 0),
              totalAmount: Number(created.grand_total || 0),
              amountInWords: unsynced.amountInWords || convertNumberToWords(Number(created.grand_total || unsynced.totalAmount || 0)),
              paymentType: created.payment_type || 'UPI',
              receivedAmount: Number(created.received_amount || 0),
              balanceAmount: Number(created.balance_due || 0),
              status: created.status?.toUpperCase() || 'PENDING',
              notes: created.notes || '',
              termsAndConditions: created.notes || 'Goods once sold will not be taken back.',
              createdAt: created.created_at || new Date().toISOString(),
            });
          }
        });
      }

      // 4. PROCESS PRODUCTS (Local-First Merge + Parallel Upload)
      const prodMap = new Map<string, Product>();
      for (const p of cloudProducts) {
        const key = p.name?.trim().toLowerCase();
        if (key && !prodMap.has(key)) {
          prodMap.set(key, p);
        }
      }

      const currentProducts = productsRef.current;
      const unsyncedProducts = currentProducts.filter(
        (lp) => !uuidRegex.test(lp.id) &&
                !prodMap.has(lp.name.trim().toLowerCase())
      );

      if (unsyncedProducts.length > 0) {
        const productUploads = await Promise.allSettled(
          unsyncedProducts.map(unsynced => syncProductToBackend(unsynced))
        );
        productUploads.forEach((res, idx) => {
          if (res.status === 'fulfilled' && res.value && res.value.id) {
            const created = res.value;
            const unsynced = unsyncedProducts[idx];
            const syncedProduct: Product = {
              id: created.id,
              name: created.product_title || unsynced.name,
              category: created.category?.category_name || unsynced.category || 'General',
              defaultUnit: created.unit || unsynced.defaultUnit || 'Ltr',
              defaultPrice: Number(created.selling_price ?? unsynced.defaultPrice ?? 0),
              mrp: Number(created.mrp ?? unsynced.mrp ?? 0),
              stockQuantity: Number(created.quantity ?? unsynced.stockQuantity ?? 100),
              boxCapacity: Number(created.box_capacity ?? unsynced.boxCapacity ?? 50),
              minStockAlert: Number(created.min_stock_alert ?? unsynced.minStockAlert ?? 50),
            };
            prodMap.set(syncedProduct.name.trim().toLowerCase(), syncedProduct);
          }
        });
      }
      const finalProducts = Array.from(prodMap.values());

      // 5. BATCH SINGLE STATE UPDATE (prevents UI re-render jitter)
      if (finalStores.length > 0) setStores(finalStores);
      if (cloudInvoices.length > 0) setInvoices(cloudInvoices);
      if (finalProducts.length > 0) setProducts(finalProducts);
      setLastSyncTime(new Date());

      const totalDuration = Math.round(performance.now() - syncStart);
      const displayDuration = fastSyncDuration || totalDuration;
      const secText = (displayDuration / 1000).toFixed(1);
      setSyncNotice(isMr ? `✓ सिंक पूर्ण (${secText}s)` : isHi ? `✓ सिंक सफल (${secText}s)` : `✓ Synced (${secText}s)`);
      setTimeout(() => setSyncNotice(''), 3500);

      console.log(`⚡ Fast Cloud Sync finished in ${totalDuration}ms`);

    } catch (e) {
      console.warn('Background cloud sync notice:', e);
      setSyncNotice(isMr ? 'ऑफलाईन मोड' : isHi ? 'ऑफ़लाइन मोड' : 'Offline Mode');
      setTimeout(() => setSyncNotice(''), 3000);
    } finally {
      isSyncingRef.current = false;
      setIsSyncingCloud(false);
    }
  }, [isMr, isHi]);

  // Set up listeners for real-time multi-device sync (only when user is logged in)
  useEffect(() => {
    // 0. Instant non-blocking connection warm-up
    warmupBackendConnection();

    if (!currentUser) return;

    let lastAutoSync = Date.now();

    // 1. Initial mount sync
    syncCloudData();

    // 2. Tab / Window focus (with 30-second cooldown to prevent repeated calls)
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastAutoSync > 30000) {
        lastAutoSync = now;
        syncCloudData();
      }
    };
    window.addEventListener('focus', handleFocus);

    // 3. Screen visibility change (un-minimizing app on phone or laptop)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastAutoSync > 30000) {
          lastAutoSync = now;
          syncCloudData();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Gentle background auto-sync interval every 45 seconds
    const intervalId = setInterval(() => {
      lastAutoSync = Date.now();
      syncCloudData();
    }, 45000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [currentUser, syncCloudData]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('animex_invoices', JSON.stringify(invoices));
    } catch {}
  }, [invoices]);

  useEffect(() => {
    try {
      localStorage.setItem('animex_billing_products', JSON.stringify(products));
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('animex_medical_stores', JSON.stringify(stores));
    } catch {}
  }, [stores]);

  const [purchases, setPurchases] = useState<PurchaseInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('animex_purchase_invoices');
      return saved !== null ? JSON.parse(saved) : INITIAL_PURCHASES;
    } catch {
      return INITIAL_PURCHASES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('animex_purchase_invoices', JSON.stringify(purchases));
    } catch {}
  }, [purchases]);

  const handleSavePurchase = (newPurchase: PurchaseInvoice, newProductsCreated?: Product[]) => {
    setPurchases([newPurchase, ...purchases]);

    setProducts((prevProducts) => {
      let baseList = prevProducts;
      if (newProductsCreated && newProductsCreated.length > 0) {
        const uniqueNew = newProductsCreated.filter((np) => !prevProducts.some((p) => p.id === np.id));
        baseList = [...prevProducts, ...uniqueNew];
      }

      return baseList.map((prod) => {
        const matchingItems = newPurchase.items.filter((it) => it.productId === prod.id);
        if (matchingItems.length === 0) return prod;

        const totalInwardQty = matchingItems.reduce((sum, it) => sum + (Number(it.totalUnits) || 0), 0);
        const lastUnitsPerBox = matchingItems[matchingItems.length - 1].unitsPerBox;

        return {
          ...prod,
          stockQuantity: (prod.stockQuantity ?? 0) + totalInwardQty,
          boxCapacity: lastUnitsPerBox > 0 ? lastUnitsPerBox : prod.boxCapacity || 50,
        };
      });
    });
  };

  const handleDeletePurchase = (purchaseId: string) => {
    const purToDelete = purchases.find((p) => p.id === purchaseId);
    setPurchases(purchases.filter((p) => p.id !== purchaseId));

    if (purToDelete) {
      setProducts((prevProducts) => {
        return prevProducts.map((prod) => {
          const matchingItems = purToDelete.items.filter((it) => it.productId === prod.id);
          if (matchingItems.length === 0) return prod;

          const totalInwardQty = matchingItems.reduce((sum, it) => sum + (Number(it.totalUnits) || 0), 0);
          return {
            ...prod,
            stockQuantity: Math.max(0, (prod.stockQuantity ?? 0) - totalInwardQty),
          };
        });
      });
    }
  };

  const handleSaveInvoice = (newInvoice: Invoice) => {
    const nextGlobal = invoices.length > 0 ? Math.max(...invoices.map(i => i.globalBillId || 0)) + 1 : 1;
    const finalInvoice: Invoice = {
      ...newInvoice,
      globalBillId: newInvoice.globalBillId || nextGlobal
    };

    // 1. Add invoice to history & open preview immediately (0ms UI latency!)
    setInvoices([finalInvoice, ...invoices]);
    setSelectedPreviewInvoice(finalInvoice);

    // 2. Immediate local stock deduction for each billed product & check low stock
    const newlyLowStock: string[] = [];
    const billedMap = new Map<string, number>();
    for (const item of finalInvoice.items) {
      const id = item.productId;
      const name = item.itemName?.trim().toLowerCase();
      const qty = Number(item.quantity || 0);
      if (id) billedMap.set(id, (billedMap.get(id) || 0) + qty);
      if (name) billedMap.set(name, (billedMap.get(name) || 0) + qty);
    }

    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        const billedQty = billedMap.get(prod.id) || billedMap.get(prod.name.trim().toLowerCase()) || 0;
        if (billedQty === 0) return prod;

        const currentStock = prod.stockQuantity ?? 0;
        const newStock = Math.max(0, currentStock - billedQty);
        const limit = prod.minStockAlert || prod.boxCapacity || 50;

        if (newStock <= limit) {
          newlyLowStock.push(`• ${prod.name}: Only ${newStock} ${prod.defaultUnit} left (Alert Limit: ${limit} ${prod.defaultUnit})`);
        }

        return {
          ...prod,
          stockQuantity: newStock,
        };
      });
    });

    // 3. Sync invoice to cloud Neon DB in the background
    // (Note: Backend's createInvoice automatically deducts stock in PostgreSQL DB)
    syncInvoiceToBackend(finalInvoice).then(cloudInv => {
      if (cloudInv && cloudInv.id) {
        setInvoices(prev => prev.map(inv => inv.id === finalInvoice.id ? {
          ...inv,
          id: cloudInv.id,
          globalBillId: cloudInv.global_bill_id ? Number(cloudInv.global_bill_id) : inv.globalBillId,
          companyInvoiceNumber: cloudInv.company_invoice_number || inv.companyInvoiceNumber,
          invoiceNo: cloudInv.company_invoice_number || inv.invoiceNo,
        } : inv));
      }
    });

    if (newlyLowStock.length > 0) {
      setTimeout(() => {
        alert(
          `⚠️ Low Stock Alert Notification!\n\n` +
          `The following product(s) have fallen below the minimum alert limit due to this bill:\n\n` +
          `${newlyLowStock.join('\n')}\n\n` +
          `Please replenish godown stock in time.`
        );
      }, 500);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const invToDelete = invoices.find(inv => inv.id === invoiceId);
    const confirmMsg = isMr
      ? 'तुम्हाला हे बिल कायमचे डिलीट करायचे आहे का?\n(या बिलातील सर्व उत्पादनांचा स्टॉक पुन्हा गोदामात जमा केला जाईल.)'
      : isHi
      ? 'क्या आप इस बिल को हटाना चाहते हैं?\n(इस बिल के सभी उत्पादों का स्टॉक गोदाम में वापस जोड़ दिया जाएगा।)'
      : 'Are you sure you want to delete this bill from history?\n(All product stock from this bill will be restored to your inventory.)';
    if (!window.confirm(confirmMsg)) {
      return;
    }

    // 1. Remove from invoices state immediately (0ms UI latency!)
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));

    // 2. Automatic stock restoration back to products
    if (invToDelete && Array.isArray(invToDelete.items)) {
      const restoreMap = new Map<string, number>();
      for (const item of invToDelete.items) {
        const id = item.productId;
        const name = item.itemName?.trim().toLowerCase();
        const qty = Number(item.quantity || 0);
        if (id) restoreMap.set(id, (restoreMap.get(id) || 0) + qty);
        if (name) restoreMap.set(name, (restoreMap.get(name) || 0) + qty);
      }

      setProducts(prevProducts => {
        return prevProducts.map(prod => {
          const restoredQty = restoreMap.get(prod.id) || restoreMap.get(prod.name.trim().toLowerCase()) || 0;
          if (restoredQty === 0) return prod;

          return {
            ...prod,
            stockQuantity: (prod.stockQuantity ?? 0) + restoredQty,
          };
        });
      });
    }

    // 3. Delete invoice from cloud backend (backend also automatically restores stock in PostgreSQL DB)
    deleteInvoiceFromBackend(invoiceId).then(() => {
      // Refresh cloud data after a short breath
      setTimeout(() => {
        syncCloudData();
      }, 1000);
    });
  };

  // Add inward stock entry (Boxes * UnitsPerBox + LooseUnits)
  const handleInwardStock = (productId: string, boxes: number, unitsPerBox: number, looseUnits: number) => {
    const totalAdded = (boxes * unitsPerBox) + looseUnits;
    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        if (prod.id !== productId) return prod;
        const currentStock = prod.stockQuantity ?? 0;
        const updated = {
          ...prod,
          stockQuantity: currentStock + totalAdded,
          boxCapacity: unitsPerBox > 1 ? unitsPerBox : (prod.boxCapacity || 1),
        };
        syncProductToBackend(updated);
        return updated;
      });
    });
  };

  const handleAddStore = async (newStore: MedicalStore) => {
    const cleanName = newStore.firmName.trim().toLowerCase();
    setStores(prev => {
      if (prev.some(s => s.firmName.trim().toLowerCase() === cleanName)) {
        return prev;
      }
      return [newStore, ...prev];
    });

    try {
      const cloudStore = await syncStoreToBackend(newStore);
      if (cloudStore && cloudStore.id) {
        setStores(prev => {
          const seen = new Set<string>();
          const updatedList: MedicalStore[] = [];

          for (const s of prev) {
            const isMatch = s.id === newStore.id || s.firmName.trim().toLowerCase() === cleanName;
            const item: MedicalStore = isMatch ? {
              ...s,
              id: cloudStore.id,
              firmName: cloudStore.firm_name || s.firmName,
              contactName: cloudStore.contact_person_name || s.contactName,
              phone: cloudStore.phone_number || s.phone,
              district: cloudStore.district || s.district,
              address: cloudStore.address || s.address,
              state: 'Maharashtra',
            } : s;

            const key = item.firmName.trim().toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              updatedList.push(item);
            }
          }
          return updatedList;
        });
      }
    } catch (e) {
      console.error('Failed to sync store to backend:', e);
    }
  };

  const handleUpdateStore = (updatedStore: MedicalStore) => {
    setStores(stores.map(s => s.id === updatedStore.id ? updatedStore : s));
    syncStoreToBackend(updatedStore);
  };

  const handleDeleteStore = (storeId: string) => {
    setStores(stores.filter(s => s.id !== storeId));
    deleteStoreFromBackend(storeId);
  };

  const handleAddProduct = async (newProduct: Product) => {
    const cleanName = newProduct.name.trim().toLowerCase();
    setProducts(prev => {
      if (prev.some(p => p.name.trim().toLowerCase() === cleanName)) {
        return prev;
      }
      return [newProduct, ...prev];
    });

    try {
      const cloudProd = await syncProductToBackend(newProduct);
      if (cloudProd && cloudProd.id) {
        setProducts(prev => {
          const seen = new Set<string>();
          const updatedList: Product[] = [];

          for (const p of prev) {
            const isMatch = p.id === newProduct.id || p.name.trim().toLowerCase() === cleanName;
            const item: Product = isMatch ? {
              ...p,
              id: cloudProd.id,
              name: cloudProd.product_title || p.name,
              category: cloudProd.category?.category_name || p.category || 'General',
              defaultUnit: cloudProd.unit || p.defaultUnit,
              defaultPrice: Number(cloudProd.selling_price ?? p.defaultPrice),
              mrp: Number(cloudProd.mrp ?? p.mrp ?? 0),
              stockQuantity: Number(cloudProd.quantity ?? p.stockQuantity ?? 0),
              boxCapacity: Number(cloudProd.box_capacity ?? p.boxCapacity ?? 50),
              minStockAlert: Number(cloudProd.min_stock_alert ?? p.minStockAlert ?? 50),
            } : p;

            const key = item.name.trim().toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              updatedList.push(item);
            }
          }
          return updatedList;
        });
      }
    } catch (e) {
      console.error('Failed to sync product to backend:', e);
    }
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    syncProductToBackend(updatedProduct);
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(products.filter(p => p.id !== productId));
    deleteProductFromBackend(productId);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of Animex Billing?')) {
      authService.logout();
      setCurrentUser(null);
    }
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const nextInvoiceNo = invoices.length > 0
    ? Math.max(...invoices.map(i => i.companyInvoiceNumber || i.invoiceNo || 0)) + 1
    : 1;

  return (
    <div className="min-h-screen bg-slate-200 dark:bg-slate-950 flex flex-col antialiased font-sans">
      
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        invoicesCount={invoices.length}
        products={products}
        user={currentUser}
        onLogout={handleLogout}
        isSyncingCloud={isSyncingCloud}
        onSyncCloud={() => syncCloudData(true)}
        lastSyncTime={lastSyncTime}
        syncNotice={syncNotice}
      />

      {/* Main View Router */}
      <main className="flex-grow p-4 sm:p-6 md:p-8 pb-20 lg:pb-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            invoices={invoices}
            stores={stores}
            products={products}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectInvoice={(inv) => setSelectedPreviewInvoice(inv)}
          />
        )}

        {activeTab === 'new-invoice' && (
          <InvoiceForm
            products={products}
            stores={stores}
            invoices={invoices}
            onSaveInvoice={handleSaveInvoice}
            nextInvoiceNo={nextInvoiceNo}
          />
        )}

        {activeTab === 'history' && (
          <InvoiceHistory
            invoices={invoices}
            onSelectInvoice={(inv) => setSelectedPreviewInvoice(inv)}
            onDeleteInvoice={handleDeleteInvoice}
          />
        )}

        {activeTab === 'stores' && (
          <MedicalStoresDirectory
            stores={stores}
            onAddStore={handleAddStore}
            onUpdateStore={handleUpdateStore}
            onDeleteStore={handleDeleteStore}
          />
        )}

        {activeTab === 'products' && (
          <ProductsManager
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onInwardStock={handleInwardStock}
          />
        )}

        {activeTab === 'purchases' && (
          <PurchasesManager
            purchases={purchases}
            products={products}
            onSavePurchase={handleSavePurchase}
            onDeletePurchase={handleDeletePurchase}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileManager
            user={currentUser}
            onLogout={handleLogout}
            invoicesCount={invoices.length}
            storesCount={stores.length}
            productsCount={products.length}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            onNavigateTab={(tab) => setActiveTab(tab)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Printable Invoice Modal Replica */}
      {selectedPreviewInvoice && (
        <InvoicePreviewModal
          invoice={selectedPreviewInvoice}
          allInvoices={invoices}
          onClose={() => setSelectedPreviewInvoice(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-animex-blue-900 text-slate-300 py-4 text-center text-xs font-semibold border-t border-slate-800 mb-16 lg:mb-0">
        ANIMEX ANIMAL HEALTH CARE PRIVATE LIMITED • Kopargaon, Ahmednagar • Helpline: 8799883858 / 9146133858
      </footer>

    </div>
  );
};

export default App;
