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
import {
  API_BASE,
  getClientId,
  syncInvoiceToBackend,
  deleteInvoiceFromBackend,
  syncStoreToBackend,
  deleteStoreFromBackend,
  syncProductToBackend,
  deleteProductFromBackend,
  fetchUnifiedSyncFromBackend,
  warmupBackendConnection,
  mapBackendStore,
  mapBackendInvoice,
} from './utils/api';
import { authService, UserSession } from './services/authService';
import { useLanguage } from './context/LanguageContext';

const getDeletedInvoiceIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem('animex_deleted_invoices');
    if (raw) {
      const arr = JSON.parse(raw);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (Array.isArray(arr)) {
        // Strictly filter to valid UUIDs only! Never block sequential numbers (gbid-*)
        return new Set(arr.filter(id => typeof id === 'string' && uuidRegex.test(id)));
      }
    }
  } catch {}
  return new Set();
};

const addDeletedInvoiceId = (id: string) => {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) return; // Only store unique invoice UUIDs!
    const set = getDeletedInvoiceIds();
    set.add(id);
    const arr = Array.from(set).slice(-100);
    localStorage.setItem('animex_deleted_invoices', JSON.stringify(arr));
  } catch {}
};

const getDeletedStoreIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem('animex_deleted_stores');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
};

const addDeletedStoreId = (id: string) => {
  try {
    const set = getDeletedStoreIds();
    set.add(id);
    const arr = Array.from(set).slice(-100);
    localStorage.setItem('animex_deleted_stores', JSON.stringify(arr));
  } catch {}
};

export const App: React.FC = () => {
  const { language } = useLanguage();
  const isMr = language === 'mr';
  const isHi = language === 'hi';
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // One-time clean-up migration: purge old offline orphan ghost bills and legacy deleted tokens
  const CLEAN_SLATE_KEY = 'animex_clean_slate_v5';
  try {
    if (localStorage.getItem(CLEAN_SLATE_KEY) !== 'true') {
      localStorage.removeItem('animex_invoices');
      localStorage.removeItem('animex_deleted_invoices');
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

  const isOfficialProductName = (name?: string): boolean => {
    const n = (name || '').trim().toLowerCase();
    if (!n) return false;
    if (n === 'liver' || (n.startsWith('liver') && !n.includes('animex')) || n.includes('(1kg)') || n.includes(' 1kg')) {
      return false;
    }
    return (
      (n.includes('animex') && n.includes('liv')) ||
      (n.includes('calcimex') && n.includes('gold') && (n.includes('1lit') || n.includes('1 lit') || n.includes('1ltr') || n.includes('1 ltr') || (n.includes('1') && !n.includes('5')))) ||
      (n.includes('calcimex') && n.includes('gold') && (n.includes('5 lit') || n.includes('5lit') || n.includes('5 ltr') || n.includes('5ltr') || n.includes('5'))) ||
      (n.includes('calcimex') && n.includes('gel')) ||
      n.includes('utrimex') ||
      n.includes('rumen') ||
      (n.includes('milky') && n.includes('10')) ||
      (n.includes('milky') && n.includes('25'))
    );
  };

  const PRODUCTS_8ITEMS_MIGRATION_KEY = 'animex_products_sync_8items_v5';
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('animex_billing_products');
      let existingMap = new Map<string, Product>();
      if (saved) {
        try {
          const oldList: Product[] = JSON.parse(saved);
          oldList.forEach(p => {
            const cleanName = p.name?.trim().toLowerCase();
            if (cleanName && isOfficialProductName(cleanName)) {
              existingMap.set(cleanName, p);
            }
          });
        } catch {}
      }

      const synced: Product[] = INITIAL_PRODUCTS.map(seed => {
        const sName = seed.name.toLowerCase();
        let existing: Product | undefined;
        for (const [k, v] of existingMap.entries()) {
          if (
            (sName.includes('25kg') && k.includes('25kg')) ||
            (sName.includes('10kg') && k.includes('10kg')) ||
            (sName.includes('5 lit') && (k.includes('5 lit') || k.includes('5lit') || k.includes('5'))) ||
            (sName.includes('gel') && k.includes('gel')) ||
            (sName.includes('utrimex') && k.includes('utrimex')) ||
            (sName.includes('rumen') && k.includes('rumen')) ||
            (sName.includes('animex') && k.includes('animex')) ||
            (sName.includes('calcimex gold 1') && k.includes('calcimex') && k.includes('gold') && !k.includes('5'))
          ) {
            existing = v;
            break;
          }
        }
        let stock = existing?.stockQuantity !== undefined ? existing.stockQuantity : seed.stockQuantity;
        if (sName.includes('25kg')) {
          stock = 9;
        }
        return {
          ...seed,
          stockQuantity: stock ?? seed.stockQuantity ?? 0,
          boxCapacity: existing?.boxCapacity || seed.boxCapacity,
          defaultUnit: existing?.defaultUnit || seed.defaultUnit,
          minStockAlert: (existing?.minStockAlert !== undefined && existing?.minStockAlert !== null) ? existing.minStockAlert : seed.minStockAlert,
          defaultPrice: existing?.defaultPrice || seed.defaultPrice,
          mrp: existing?.mrp || seed.mrp,
        };
      });

      localStorage.setItem('animex_billing_products', JSON.stringify(synced));
      localStorage.setItem(PRODUCTS_8ITEMS_MIGRATION_KEY, 'true');
      return synced;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  useEffect(() => {
    // Ensure products list is strictly the 8 official products on mount
    setProducts(prev => {
      const filtered = prev.filter(p => isOfficialProductName(p.name));
      if (filtered.length === 8) {
        return filtered;
      }
      return INITIAL_PRODUCTS;
    });
  }, []);

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
  const uploadingStoreKeys = useRef<Set<string>>(new Set());
  const uploadingInvoiceKeys = useRef<Set<string>>(new Set());
  const recentProductUpdatesRef = useRef<Map<string, { product: Product; timestamp: number }>>(new Map());

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
      const unifiedResult = await fetchUnifiedSyncFromBackend();
      if (!unifiedResult) {
        // Backend offline or unreachable: keep local data safely without wiping
        return;
      }

      const { stores: cloudStores, invoices: cloudInvoices, products: cloudProducts, durationMs: fastSyncDuration } = unifiedResult;
      const deletedInvoiceIds = getDeletedInvoiceIds();
      const deletedStoreIds = getDeletedStoreIds();

      // 2. PROCESS STORES (Cloud SSOT + Upload Unsynced Local Stores)
      // Never attempt to re-upload any store that is currently in-flight
      const unsyncedStores = storesRef.current.filter(
        ls => !uuidRegex.test(ls.id) &&
              !deletedStoreIds.has(ls.id) &&
              !uploadingStoreKeys.current.has(ls.firmName.trim().toLowerCase()) &&
              !cloudStores.some(cs => cs.firmName.trim().toLowerCase() === ls.firmName.trim().toLowerCase())
      );

      let newlyUploadedStores: MedicalStore[] = [];
      if (unsyncedStores.length > 0) {
        unsyncedStores.forEach(s => uploadingStoreKeys.current.add(s.firmName.trim().toLowerCase()));
        try {
          const storeUploads = await Promise.allSettled(
            unsyncedStores.map(unsynced => syncStoreToBackend(unsynced))
          );
          storeUploads.forEach((res, idx) => {
            if (res.status === 'fulfilled' && res.value && res.value.id) {
              const original = unsyncedStores[idx];
              newlyUploadedStores.push({
                ...mapBackendStore(res.value),
                customerType: original.customerType || 'store',
              });
            }
          });
        } finally {
          unsyncedStores.forEach(s => uploadingStoreKeys.current.delete(s.firmName.trim().toLowerCase()));
        }
      }

      // Deduplicate stores strictly by normalized firmName AND preserve customerType
      const storeMapByName = new Map<string, MedicalStore>();

      // 2a. Add cloud stores (primary source of truth from Neon DB)
      for (const cs of cloudStores) {
        if (!deletedStoreIds.has(cs.id)) {
          const key = cs.firmName.trim().toLowerCase();
          const existingLocal = storesRef.current.find(
            ls => ls.id === cs.id || ls.firmName.trim().toLowerCase() === key
          );
          const isCustomer = cs.customerType === 'customer' || existingLocal?.customerType === 'customer';
          const finalType: 'customer' | 'store' = isCustomer ? 'customer' : 'store';
          
          const normalizedStore: MedicalStore = {
            ...cs,
            customerType: finalType,
          };

          if (!storeMapByName.has(key)) {
            storeMapByName.set(key, normalizedStore);
          } else {
            const existing = storeMapByName.get(key)!;
            // Always prefer valid UUID over non-UUID
            if (uuidRegex.test(cs.id) && !uuidRegex.test(existing.id)) {
              storeMapByName.set(key, {
                ...cs,
                customerType: (existing.customerType === 'customer' || finalType === 'customer') ? 'customer' : 'store',
              });
            }
          }
        }
      }

      // 2b. Add newly uploaded stores
      for (const ns of newlyUploadedStores) {
        if (!deletedStoreIds.has(ns.id)) {
          const key = ns.firmName.trim().toLowerCase();
          if (!storeMapByName.has(key)) {
            storeMapByName.set(key, ns);
          } else {
            const existing = storeMapByName.get(key)!;
            if (uuidRegex.test(ns.id) && !uuidRegex.test(existing.id)) {
              storeMapByName.set(key, {
                ...ns,
                customerType: (existing.customerType === 'customer' || ns.customerType === 'customer') ? 'customer' : 'store',
              });
            }
          }
        }
      }

      // 2c. Retain in-flight local stores that are currently uploading so UI doesn't flicker
      for (const ls of storesRef.current) {
        if (!deletedStoreIds.has(ls.id)) {
          const key = ls.firmName.trim().toLowerCase();
          if (!storeMapByName.has(key) && (uploadingStoreKeys.current.has(key) || !uuidRegex.test(ls.id))) {
            storeMapByName.set(key, ls);
          }
        }
      }

      const finalStores = Array.from(storeMapByName.values());
      setStores(finalStores);

      // 3. PROCESS INVOICES (Cloud SSOT + Upload Unsynced Local Invoices)
      // An invoice is truly pending upload ONLY if it was newly created locally with _pendingCloudSync: true
      const unsyncedInvoices = invoicesRef.current.filter(
        li => Boolean((li as any)._pendingCloudSync) &&
              !uuidRegex.test(li.id) &&
              !deletedInvoiceIds.has(li.id) &&
              !uploadingInvoiceKeys.current.has(li.id) &&
              !cloudInvoices.some(ci => ci.id === li.id || (ci.globalBillId && li.globalBillId && Number(ci.globalBillId) === Number(li.globalBillId)))
      );

      let newlyUploadedInvoices: Invoice[] = [];
      if (unsyncedInvoices.length > 0) {
        unsyncedInvoices.forEach(i => uploadingInvoiceKeys.current.add(i.id));
        try {
          const preppedInvoices = unsyncedInvoices.map(unsynced => {
            const storeNameKey = unsynced.billTo?.firmName?.trim().toLowerCase();
            const matchedStore = storeNameKey ? finalStores.find(s => s.firmName.trim().toLowerCase() === storeNameKey) : undefined;
            if (matchedStore && uuidRegex.test(matchedStore.id)) {
              return {
                ...unsynced,
                billTo: {
                  ...unsynced.billTo,
                  id: matchedStore.id,
                }
              };
            }
            return unsynced;
          });

          const invoiceUploads = await Promise.allSettled(
            preppedInvoices.map(unsynced => syncInvoiceToBackend(unsynced))
          );
          invoiceUploads.forEach((res) => {
            if (res.status === 'fulfilled' && res.value && res.value.id) {
              newlyUploadedInvoices.push(mapBackendInvoice(res.value));
            }
          });
        } finally {
          unsyncedInvoices.forEach(i => uploadingInvoiceKeys.current.delete(i.id));
        }
      }

      // Valid active invoices: ground truth from Neon DB (excluding any local delete)
      // plus any newly uploaded invoices, deduplicated by globalBillId or id
      const invoiceMap = new Map<string, Invoice>();
      for (const ci of cloudInvoices) {
        if (!deletedInvoiceIds.has(ci.id)) {
          const key = ci.globalBillId ? `gbid-${ci.globalBillId}` : ci.id;
          invoiceMap.set(key, ci);
        }
      }
      for (const ni of newlyUploadedInvoices) {
        if (!deletedInvoiceIds.has(ni.id)) {
          const key = ni.globalBillId ? `gbid-${ni.globalBillId}` : ni.id;
          invoiceMap.set(key, ni);
        }
      }

      // Retain in-flight invoices
      for (const li of invoicesRef.current) {
        if (!deletedInvoiceIds.has(li.id)) {
          const key = li.globalBillId ? `gbid-${li.globalBillId}` : li.id;
          if (!invoiceMap.has(key) && (uploadingInvoiceKeys.current.has(li.id) || !uuidRegex.test(li.id))) {
            invoiceMap.set(key, li);
          }
        }
      }

      const finalInvoices = Array.from(invoiceMap.values()).sort(
        (a, b) => (Number(b.globalBillId) || 0) - (Number(a.globalBillId) || 0)
      );

      // Unconditionally set ground truth from cloud (if DB has 0 invoices, this properly sets 0 invoices!)
      setInvoices(finalInvoices);

      // 4. PROCESS PRODUCTS
      // Track any pending deductions for invoices not yet confirmed in cloud DB
      const pendingBilledMap = new Map<string, number>();
      for (const li of finalInvoices) {
        if (Boolean((li as any)._pendingCloudSync) || !uuidRegex.test(li.id)) {
          for (const item of (li.items || [])) {
            const id = item.productId;
            const name = item.itemName?.trim().toLowerCase();
            const qty = Number(item.quantity || 0);
            if (id) pendingBilledMap.set(id, (pendingBilledMap.get(id) || 0) + qty);
            if (name) pendingBilledMap.set(name, (pendingBilledMap.get(name) || 0) + qty);
          }
        }
      }

      const prodMap = new Map<string, Product>();
      for (const p of cloudProducts) {
        const key = p.name?.trim().toLowerCase();
        if (!key) continue;

        // If an unwanted item arrives from cloud, purge from DB and skip
        if (!isOfficialProductName(key)) {
          if (p.id) {
            deleteProductFromBackend(p.id).catch(() => {});
          }
          continue;
        }

        if (!prodMap.has(key)) {
          // 🛡️ CRITICAL: Check if this product was updated recently by the user locally
          const recentEdit = recentProductUpdatesRef.current.get(key) || (p.id ? recentProductUpdatesRef.current.get(p.id) : undefined);
          const isRecentlyEditedLocally = Boolean(recentEdit && (Date.now() - recentEdit.timestamp < 45000));

          if (isRecentlyEditedLocally && recentEdit) {
            prodMap.set(key, recentEdit.product);
            continue;
          }

          const pendingDeduction = pendingBilledMap.get(p.id) || pendingBilledMap.get(key) || 0;
          let adjustedStock = Math.max(0, (p.stockQuantity ?? 0) - pendingDeduction);
          if (key.includes('25kg') && adjustedStock === 0) {
            adjustedStock = 9;
          }

          let boxCap = p.boxCapacity;
          let defUnit = p.defaultUnit;
          if (key.includes('25kg')) { boxCap = 1; defUnit = 'Bucket'; }
          else if (key.includes('10kg')) { boxCap = 2; defUnit = 'Bucket'; }
          else if (key.includes('5 lit') || key.includes('5lit') || key.includes('5')) { boxCap = 4; defUnit = 'Can'; }
          else if (key.includes('utrimex')) { boxCap = 24; defUnit = 'Bottle'; }
          else if (key.includes('rumen') || key.includes('gel')) { boxCap = 40; defUnit = 'Bottle'; }
          else if (key.includes('1lit') || key.includes('1 lit') || key.includes('1ltr')) { boxCap = 20; defUnit = 'Ltr'; }

          // Sensible default minStockAlert per product type
          const defaultAlert = boxCap > 1 ? boxCap : (defUnit === 'Bucket' ? 2 : 10);
          const minAlert = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : defaultAlert;

          prodMap.set(key, {
            ...p,
            stockQuantity: adjustedStock,
            boxCapacity: boxCap,
            defaultUnit: defUnit,
            minStockAlert: minAlert,
          });
        }
      }

      // Ensure all 8 official products are present
      for (const seed of INITIAL_PRODUCTS) {
        const sName = seed.name.toLowerCase();
        let matched = false;
        for (const [k] of prodMap.entries()) {
          if (
            (sName.includes('25kg') && k.includes('25kg')) ||
            (sName.includes('10kg') && k.includes('10kg')) ||
            (sName.includes('5 lit') && (k.includes('5 lit') || k.includes('5lit') || k.includes('5'))) ||
            (sName.includes('gel') && k.includes('gel')) ||
            (sName.includes('utrimex') && k.includes('utrimex')) ||
            (sName.includes('rumen') && k.includes('rumen')) ||
            (sName.includes('animex') && k.includes('animex')) ||
            (sName.includes('calcimex gold 1') && k.includes('calcimex') && k.includes('gold') && !k.includes('5'))
          ) {
            matched = true;
            break;
          }
        }
        if (!matched) {
          prodMap.set(sName, seed);
          if (cloudProducts.length === 0) {
            syncProductToBackend(seed).catch(() => {});
          }
        }
      }

      const finalProducts = Array.from(prodMap.values()).filter(p => isOfficialProductName(p.name));
      if (finalProducts.length > 0) {
        setProducts(finalProducts);
        try {
          localStorage.setItem('animex_billing_products', JSON.stringify(finalProducts));
        } catch {}
      }

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

    // 1. Initial mount sync (immediate!)
    syncCloudData();

    // 2. Tab / Window focus (immediate sync when user switches to app on phone or laptop)
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastAutoSync > 2000) {
        lastAutoSync = now;
        syncCloudData();
      }
    };
    window.addEventListener('focus', handleFocus);

    // 3. Screen visibility change (un-minimizing app or unlocking phone)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastAutoSync > 2000) {
          lastAutoSync = now;
          syncCloudData();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Online event (when device reconnects to Wi-Fi/cellular)
    const handleOnline = () => {
      syncCloudData();
    };
    window.addEventListener('online', handleOnline);

    // 5. Cross-tab Broadcast Channel for instant sync across tabs on same device
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('animex_live_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'FORCE_SYNC') {
          syncCloudData();
        }
      };
    } catch {}

    // 6. Adaptive background auto-sync: 3.5s when app is active/visible, 12s when backgrounded
    const activeIntervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        lastAutoSync = Date.now();
        syncCloudData();
      }
    }, 3500);

    const idleIntervalId = setInterval(() => {
      if (document.visibilityState !== 'visible') {
        lastAutoSync = Date.now();
        syncCloudData();
      }
    }, 12000);

    // 7. Live Real-Time Server-Sent Events (SSE) for sub-second cross-device push
    let eventSource: EventSource | null = null;
    let sseRetryTimer: any = null;

    const connectSSE = () => {
      try {
        if (typeof EventSource === 'undefined') return;
        const clientId = getClientId();
        const sseUrl = `${API_BASE}/client/${clientId}/realtime-stream`;
        eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'DATA_CHANGED') {
              console.log('⚡ Realtime SSE instant sync triggered:', data);
              syncCloudData();
            }
          } catch {}
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          clearTimeout(sseRetryTimer);
          sseRetryTimer = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        console.warn('Realtime SSE notice:', err);
      }
    };

    connectSSE();

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      if (channel) channel.close();
      if (eventSource) eventSource.close();
      clearTimeout(sseRetryTimer);
      clearInterval(activeIntervalId);
      clearInterval(idleIntervalId);
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
      globalBillId: newInvoice.globalBillId || nextGlobal,
      _pendingCloudSync: true,
    };

    // 1. Add invoice to history & open preview immediately (0ms UI latency!)
    const updatedInvoices = [finalInvoice, ...invoices];
    setInvoices(updatedInvoices);
    setSelectedPreviewInvoice(finalInvoice);
    try {
      localStorage.setItem('animex_invoices', JSON.stringify(updatedInvoices));
    } catch {}

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
      const nextProds = prevProducts.map(prod => {
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
      try {
        localStorage.setItem('animex_billing_products', JSON.stringify(nextProds));
      } catch {}
      return nextProds;
    });

    // 3. Sync invoice to cloud Neon DB in the background with mutex protection
    // (Note: Backend's createInvoice automatically deducts stock in PostgreSQL DB)
    const invKey = finalInvoice.id;
    if (!uploadingInvoiceKeys.current.has(invKey)) {
      uploadingInvoiceKeys.current.add(invKey);
      syncInvoiceToBackend(finalInvoice).then(cloudInv => {
        if (cloudInv && cloudInv.id) {
          setInvoices(prev => prev.map(inv => (inv.id === finalInvoice.id || (inv.globalBillId && inv.globalBillId === finalInvoice.globalBillId)) ? {
            ...inv,
            id: cloudInv.id,
            globalBillId: cloudInv.global_bill_id ? Number(cloudInv.global_bill_id) : inv.globalBillId,
            companyInvoiceNumber: cloudInv.company_invoice_number || inv.companyInvoiceNumber,
            invoiceNo: cloudInv.company_invoice_number || inv.invoiceNo,
            _pendingCloudSync: false,
          } : inv));
        }
        try {
          const bc = new BroadcastChannel('animex_live_sync');
          bc.postMessage({ type: 'FORCE_SYNC' });
          bc.close();
        } catch {}
        syncCloudData();
      }).finally(() => {
        uploadingInvoiceKeys.current.delete(invKey);
      });
    }

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

    // 1. Mark as deleted in storage immediately so background sync never resurrects it
    addDeletedInvoiceId(invoiceId);

    // 2. Remove from invoices state immediately (0ms UI latency!)
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));

    // 3. Automatic stock restoration back to products
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

    // 4. Await backend deletion so database has committed before any sync can read it!
    await deleteInvoiceFromBackend(invoiceId);

    // 5. Broadcast to other tabs & devices
    try {
      const bc = new BroadcastChannel('animex_live_sync');
      bc.postMessage({ type: 'FORCE_SYNC' });
      bc.close();
    } catch {}

    // 6. Refresh cloud data
    await syncCloudData();
  };

  // Add inward stock entry (Boxes * UnitsPerBox + LooseUnits)
  const handleInwardStock = (productId: string, boxes: number, unitsPerBox: number, looseUnits: number) => {
    const totalAdded = (boxes * unitsPerBox) + looseUnits;
    setProducts(prevProducts => {
      const updatedList = prevProducts.map(prod => {
        if (prod.id !== productId) return prod;
        const currentStock = prod.stockQuantity ?? 0;
        const updated = {
          ...prod,
          stockQuantity: currentStock + totalAdded,
          boxCapacity: unitsPerBox > 1 ? unitsPerBox : (prod.boxCapacity || 1),
        };
        const key = updated.name.trim().toLowerCase();
        const now = Date.now();
        recentProductUpdatesRef.current.set(key, { product: updated, timestamp: now });
        if (updated.id) recentProductUpdatesRef.current.set(updated.id, { product: updated, timestamp: now });
        syncProductToBackend(updated).catch(() => {});
        return updated;
      });
      try {
        localStorage.setItem('animex_billing_products', JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });
  };

  const handleAddStore = async (newStore: MedicalStore) => {
    const cleanName = newStore.firmName.trim().toLowerCase();
    if (uploadingStoreKeys.current.has(cleanName)) {
      return;
    }
    uploadingStoreKeys.current.add(cleanName);

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
              customerType: newStore.customerType || 'store',
            } : s;

            const nameKey = item.firmName.trim().toLowerCase();
            if (!seen.has(item.id) && !seen.has(nameKey)) {
              seen.add(item.id);
              seen.add(nameKey);
              updatedList.push(item);
            }
          }
          return updatedList;
        });
      }
      try {
        const bc = new BroadcastChannel('animex_live_sync');
        bc.postMessage({ type: 'FORCE_SYNC' });
        bc.close();
      } catch {}
      await syncCloudData();
    } catch (e) {
      console.error('Failed to sync store to backend:', e);
    } finally {
      uploadingStoreKeys.current.delete(cleanName);
    }
  };

  const handleUpdateStore = async (updatedStore: MedicalStore) => {
    setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
    await syncStoreToBackend(updatedStore);
    try {
      const bc = new BroadcastChannel('animex_live_sync');
      bc.postMessage({ type: 'FORCE_SYNC' });
      bc.close();
    } catch {}
    syncCloudData();
  };

  const handleDeleteStore = async (storeId: string) => {
    addDeletedStoreId(storeId);
    setStores(prev => prev.filter(s => s.id !== storeId));
    await deleteStoreFromBackend(storeId);
    try {
      const bc = new BroadcastChannel('animex_live_sync');
      bc.postMessage({ type: 'FORCE_SYNC' });
      bc.close();
    } catch {}
    await syncCloudData();
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

  const handleUpdateProduct = async (updatedProduct: Product) => {
    const key = updatedProduct.name.trim().toLowerCase();
    const idKey = updatedProduct.id;
    const now = Date.now();
    recentProductUpdatesRef.current.set(key, { product: updatedProduct, timestamp: now });
    if (idKey) recentProductUpdatesRef.current.set(idKey, { product: updatedProduct, timestamp: now });

    // ⚡ 1. INSTANT ZERO-MILLISECOND UI & LOCAL STORAGE UPDATE
    setProducts(prev => {
      const next = prev.map(p => (
        p.id === updatedProduct.id ||
        p.name.trim().toLowerCase() === key
      ) ? updatedProduct : p);
      try {
        localStorage.setItem('animex_billing_products', JSON.stringify(next));
      } catch {}
      return next;
    });

    // ⚡ 2. BACKGROUND CLOUD SYNC (NEVER BLOCKS OR REVERTS UI)
    try {
      const result = await syncProductToBackend(updatedProduct);
      if (result) {
        const confirmed: Product = {
          ...updatedProduct,
          id: result.id || updatedProduct.id,
          minStockAlert: result.min_stock_alert !== undefined ? Number(result.min_stock_alert) : updatedProduct.minStockAlert,
          stockQuantity: result.quantity !== undefined ? Number(result.quantity) : updatedProduct.stockQuantity,
        };
        const updateNow = Date.now();
        recentProductUpdatesRef.current.set(key, { product: confirmed, timestamp: updateNow });
        if (confirmed.id) recentProductUpdatesRef.current.set(confirmed.id, { product: confirmed, timestamp: updateNow });
      }
    } catch (e) {
      console.warn('Update product backend sync warning:', e);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setProducts(prev => {
      const next = prev.filter(p => p.id !== productId);
      try {
        localStorage.setItem('animex_billing_products', JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      await deleteProductFromBackend(productId);
    } catch (e) {
      console.warn('Delete product backend sync warning:', e);
    }
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
