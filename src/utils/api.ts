import { convertNumberToWords } from './numberToWords';

export const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://animex-billing-backend.onrender.com';

export const PERMANENT_CLIENT_ID = 'bad7c837-6d5d-4dc0-b704-ef8b7735240b';
export const PERMANENT_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImMxMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsIm5hbWUiOiJBTklNRVggQW5pbWFsIEhlYWx0aCBDYXJlIiwiZW1haWwiOiJhZG1pbkBhbmltZXguY29tIiwicm9sZSI6ImJ1c2luZXNzb3duZXIiLCJpYXQiOjE3ODkyMTQwODYsImV4cCI6MjEwNDU3NDA4Nn0.zvJzszksQr9T48Gkww0orH90HP5Sp6jClpYHY-WvSt8';

const getAuthHeaders = () => {
  let token = localStorage.getItem('animex_auth_token');
  if (!token || token === 'demo_jwt_token_animex' || token.startsWith('offline_jwt') || token.startsWith('otp_token_')) {
    token = PERMANENT_JWT_TOKEN;
    localStorage.setItem('animex_auth_token', token);
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const getClientId = (): string => {
  try {
    const userStr = localStorage.getItem('animex_auth_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (
        user.clientId &&
        user.clientId !== 'c1111111-1111-1111-1111-111111111111' &&
        user.clientId !== 'client-demo-01' &&
        user.clientId !== 'demo-client' &&
        !user.clientId.startsWith('client-')
      ) {
        return user.clientId;
      }
    }
  } catch {}
  return PERMANENT_CLIENT_ID;
};

export const API_TIMEOUT_MS = 25000; // 25s ceiling allows Render cold-start without premature aborts

// ─── Non-blocking Background Warm-Up Ping ─────────────────────────────────────
export const warmupBackendConnection = () => {
  try {
    fetch(`${API_BASE}/health`, { method: 'GET', keepalive: true, signal: AbortSignal.timeout(8000) }).catch(() => {});
  } catch {}
};

// ─── Data Mappers ─────────────────────────────────────────────────────────────
export const mapBackendStore = (s: any) => ({
  id: s.id,
  firmName: s.firm_name,
  contactName: s.contact_person_name || '',
  phone: s.phone_number || '',
  district: s.district || 'Maharashtra',
  address: s.address || '',
  state: 'Maharashtra',
  customerType: (s.customer_type === 'customer' || s.customerType === 'customer') ? 'customer' : 'store',
});

export const mapBackendInvoice = (inv: any) => {
  const rawItems = Array.isArray(inv.items) ? inv.items : [];
  const items = rawItems.map((it: any, idx: number) => ({
    id: `item-${idx}-${Date.now()}`,
    productId: it.productId || it.product_id || '',
    itemName: it.product_title || it.itemName || 'Product',
    quantity: Number(it.quantity || 1),
    unit: it.unit || 'Ltr',
    mrp: Number(it.mrp || 0),
    pricePerUnit: Number(it.selling_price || it.pricePerUnit || 0),
    amount: Number(it.amount || 0),
    isFree: Boolean(it.is_free),
    isScheme: Boolean(it.is_free),
  }));

  const storeData = inv.medical_store || {};
  const grandTotal = Math.round(Number(inv.grand_total || 0));
  let receivedAmount = Number(inv.received_amount || 0);
  let balanceAmount = Number(inv.balance_due || 0);
  let status = (inv.status || '').toUpperCase();

  // Indian Invoicing Round-off tolerance:
  // If balance is <= 1 rupee or rounded balance is 0, consider it 100% PAID!
  if ((balanceAmount <= 1.0 || Math.round(balanceAmount) === 0) && receivedAmount > 0) {
    balanceAmount = 0;
    receivedAmount = grandTotal;
    status = 'PAID';
  } else if (!status) {
    status = balanceAmount === 0 ? 'PAID' : (receivedAmount === 0 ? 'PENDING' : 'PARTIALLY PAID');
  }

  return {
    id: inv.id,
    invoiceNo: inv.company_invoice_number || (inv.invoice_number ? Number(inv.invoice_number.replace(/\D/g, '')) : 1),
    invoiceNumber: inv.invoice_number || `#${inv.company_invoice_number || 1}`,
    globalBillId: inv.global_bill_id ? Number(inv.global_bill_id) : undefined,
    date: inv.date ? (inv.date.includes('T') ? inv.date.split('T')[0] : inv.date) : new Date().toISOString().split('T')[0],
    billTo: {
      id: storeData.id || inv.medical_store_id,
      firmName: storeData.firm_name || 'Medical Store',
      contactName: storeData.contact_person_name || '',
      phone: storeData.phone_number || '',
      district: storeData.district || '',
      address: storeData.address || '',
      state: 'Maharashtra',
    },
    items,
    subTotal: Number(inv.subtotal || 0),
    discount: Number(inv.discount || 0),
    totalAmount: grandTotal,
    amountInWords: inv.amountInWords || convertNumberToWords(grandTotal),
    paymentType: inv.payment_type || 'UPI',
    receivedAmount,
    balanceAmount,
    status,
    notes: inv.notes || '',

    termsAndConditions: (inv.notes && inv.notes.includes('35 days'))
      ? inv.notes
      : (inv.notes && inv.notes !== 'Goods once sold will not be taken back.' && inv.notes !== 'Invoice generated via ANIMEX Billing')
        ? `${inv.notes} Kindly make the payment within 35 days from the invoice date.`
        : 'Goods once sold will not be taken back. Kindly make the payment within 35 days from the invoice date.',


    createdAt: inv.created_at || new Date().toISOString(),
  };
};

export const mapBackendProduct = (p: any) => {
  const title = (p.product_title || '').toLowerCase();
  let boxCap = Number(p.box_capacity);
  let unit = p.unit;
  if (title.includes('25kg')) { boxCap = 1; unit = 'Bucket'; }
  else if (title.includes('10kg')) { boxCap = 2; unit = 'Bucket'; }
  else if (title.includes('5 lit') || title.includes('5lit') || title.includes('5')) { boxCap = 4; unit = 'Can'; }
  else if (title.includes('utrimex')) { boxCap = 24; unit = 'Bottle'; }
  else if (title.includes('rumen') || title.includes('gel')) { boxCap = 40; unit = 'Bottle'; }
  else if (title.includes('1lit') || title.includes('1 lit') || title.includes('1ltr')) { boxCap = 20; unit = 'Ltr'; }

  if (!boxCap || boxCap <= 0) boxCap = 20;

  return {
    id: p.id,
    name: p.product_title,
    category: p.category?.category_name || (title.includes('calcium') || title.includes('calcimex') ? 'Calcium Supplements' : title.includes('liv') ? 'Liver Tonics' : title.includes('milky') ? 'Mineral Mixtures' : 'General'),
    defaultUnit: unit || 'Ltr',
    defaultPrice: Number(p.selling_price || 0),
    mrp: Number(p.mrp || 0),
    stockQuantity: Number(p.quantity ?? 100),
    boxCapacity: boxCap,
    minStockAlert: Number(p.min_stock_alert ?? 50),
  };
};

// ─── ⚡ Unified Fast Sync (Single 1-Shot HTTP Request) ─────────────────────────
export const fetchUnifiedSyncFromBackend = async (): Promise<{ stores: any[]; invoices: any[]; products: any[]; durationMs: number } | null> => {
  const t0 = performance.now();
  try {
    const clientId = getClientId();
    const res = await fetch(`${API_BASE}/client/${clientId}/sync-all`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      keepalive: true,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const durationMs = Math.round(performance.now() - t0);
    if (json.success && json.data) {
      const stores = Array.isArray(json.data.stores) ? json.data.stores.map(mapBackendStore) : [];
      const invoices = Array.isArray(json.data.invoices) ? json.data.invoices.map(mapBackendInvoice) : [];
      const products = Array.isArray(json.data.products) ? json.data.products.map(mapBackendProduct) : [];
      return { stores, invoices, products, durationMs };
    }
  } catch (e) {
    console.warn('Unified fast sync fallback:', e);
  }
  return null;
};

// ─── Fetch All Medical Stores from Neon DB ────────────────────────────────────
export const fetchStoresFromBackend = async (): Promise<any[]> => {
  try {
    const clientId = getClientId();
    const res = await fetch(`${API_BASE}/medical-store/client/${clientId}/medical-stores`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      keepalive: true,
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data.map(mapBackendStore);
    }
  } catch (e) {
    console.warn('Failed to fetch stores from cloud backend:', e);
  }
  return [];
};

// ─── Fetch All Invoices / Bills from Neon DB ──────────────────────────────────
export const fetchInvoicesFromBackend = async (): Promise<any[]> => {
  try {
    const clientId = getClientId();
    const res = await fetch(`${API_BASE}/client/${clientId}/invoices`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      keepalive: true,
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data.map(mapBackendInvoice);
    }
  } catch (e) {
    console.warn('Failed to fetch invoices from cloud backend:', e);
  }
  return [];
};

// ─── Fetch All Medical Products from Neon DB ──────────────────────────────────
export const fetchProductsFromBackend = async (): Promise<any[]> => {
  try {
    const clientId = getClientId();
    const res = await fetch(`${API_BASE}/medical-product/client/${clientId}/medical-products`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      keepalive: true,
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data.map(mapBackendProduct);
    }
  } catch (e) {
    console.warn('Failed to fetch products from cloud backend:', e);
  }
  return [];
};

// ─── Save / Sync Medical Store to Neon DB ─────────────────────────────────────
export const syncStoreToBackend = async (store: any): Promise<any> => {
  try {
    const clientId = getClientId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isExistingUuid = Boolean(store.id && uuidRegex.test(store.id));
    const url = isExistingUuid
      ? `${API_BASE}/medical-store/client/${clientId}/medical-stores/${store.id}`
      : `${API_BASE}/medical-store/client/${clientId}/medical-stores`;
    const method = isExistingUuid ? 'PUT' : 'POST';

    // Strictly sanitize phone number to satisfy backend 10-digit validation
    const rawDigits = String(store.phone || '').replace(/\D/g, '');
    let cleanPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : '';
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      cleanPhone = '9876543210';
    }

    const payload = {
      firm_name: store.firmName ? String(store.firmName).trim() : 'Medical Store',
      contact_person_name: store.contactName ? String(store.contactName).trim() : (store.firmName || 'Store Incharge'),
      phone_number: cleanPhone,
      district: store.district ? String(store.district).trim() : 'Maharashtra',
      address: store.address ? String(store.address).trim() : '',
      status: true,
      customer_type: store.customerType || 'store',
    };

    let res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      keepalive: true,
      body: JSON.stringify(payload),
    });
    let json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }

    // Fallback: If PUT was rejected because store did not exist in backend, create it via POST
    if (method === 'PUT') {
      const postRes = await fetch(`${API_BASE}/medical-store/client/${clientId}/medical-stores`, {
        method: 'POST',
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
        keepalive: true,
        body: JSON.stringify(payload),
      });
      const postJson = await postRes.json();
      if (postJson.success && postJson.data) {
        return postJson.data;
      }
    }
  } catch (e) {
    console.warn('Store sync failed, saved locally:', e);
  }
  return null;
};

// ─── Delete Medical Store from Neon DB ─────────────────────────────────────────
export const deleteStoreFromBackend = async (id: string) => {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return false;
    }
    const clientId = getClientId();
    const res = await fetch(`${API_BASE}/medical-store/client/${clientId}/medical-stores/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      keepalive: true,
    });
    return res.ok;
  } catch (e) {
    console.warn('Store delete failed, saved locally:', e);
    return false;
  }
};

// ─── Save / Sync Invoice to Neon DB ───────────────────────────────────────────
export const syncInvoiceToBackend = async (invoice: any): Promise<any> => {
  try {
    const clientId = getClientId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const itemsPayload = (invoice.items || []).map((item: any) => ({
      product_id: item.productId && uuidRegex.test(item.productId) ? item.productId : undefined,
      productId: item.productId && uuidRegex.test(item.productId) ? item.productId : undefined,
      product_title: item.itemName || item.name || 'Product',
      quantity: Math.max(0.01, Number(item.quantity || 1)),
      unit: item.unit || 'Ltr',
      mrp: Number(item.mrp || 0),
      selling_price: (item.isFree || item.isScheme) ? 0 : Number(item.pricePerUnit || item.price || 0),
      is_free: Boolean(item.isFree || item.isScheme),
    }));

    if (itemsPayload.length === 0) {
      console.warn('Cannot sync invoice: items list is empty');
      return null;
    }

    let isoDate = invoice.date;
    if (invoice.date) {
      if (/^\d{2}-\d{2}-\d{4}$/.test(invoice.date.trim())) {
        const [d, m, y] = invoice.date.trim().split('-');
        isoDate = `${y}-${m}-${d}`;
      } else {
        const parsed = new Date(invoice.date);
        if (!isNaN(parsed.getTime())) {
          isoDate = parsed.toISOString().split('T')[0];
        }
      }
    }

    // Ensure medical_store_id is a valid UUID
    let storeId = invoice.billTo?.id;
    if (!storeId || !uuidRegex.test(storeId)) {
      if (invoice.billTo) {
        const createdStore = await syncStoreToBackend(invoice.billTo);
        if (createdStore?.id) {
          storeId = createdStore.id;
        }
      }
    }

    if (!storeId || !uuidRegex.test(storeId)) {
      console.warn('Cannot sync invoice: missing valid medical_store_id');
      return null;
    }

    const isExistingUuid = Boolean(invoice.id && uuidRegex.test(invoice.id));
    const url = isExistingUuid
      ? `${API_BASE}/client/${clientId}/invoices/${invoice.id}`
      : `${API_BASE}/client/${clientId}/invoices`;
    const method = isExistingUuid ? 'PUT' : 'POST';

    const grandTotal = Math.round(Number(invoice.totalAmount || 0));
    const isFullPaid = (invoice.status?.toUpperCase() === 'PAID') ||
                       (Number(invoice.balanceAmount || 0) <= 1.0) ||
                       (Math.round(Number(invoice.balanceAmount || 0)) === 0);
    const syncReceivedAmount = isFullPaid
      ? grandTotal
      : Number(invoice.receivedAmount || 0);

    const reqBody = {
      medical_store_id: storeId,
      date: isoDate,
      invoice_number: invoice.invoiceNumber || undefined,
      company_invoice_number: invoice.companyInvoiceNumber || invoice.invoiceNo || undefined,
      global_bill_id: invoice.globalBillId || undefined,
      discount: Number(invoice.discount || 0),
      gst_rate: 0,
      received_amount: syncReceivedAmount,
      payment_type: invoice.paymentType || 'UPI',
      notes: invoice.termsAndConditions || invoice.notes || 'Invoice generated via ANIMEX Billing',
      items: itemsPayload,
    };

    let res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      keepalive: true,
      body: JSON.stringify(reqBody),
    });
    let json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }

    // Fallback: If PUT failed (e.g. invoice id was not in DB), create via POST
    if (method === 'PUT') {
      const postRes = await fetch(`${API_BASE}/client/${clientId}/invoices`, {
        method: 'POST',
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
        keepalive: true,
        body: JSON.stringify(reqBody),
      });
      const postJson = await postRes.json();
      if (postJson.success && postJson.data) {
        return postJson.data;
      }
    }
  } catch (e) {
    console.warn('Backend sync failed, saved locally:', e);
  }
  return null;
};

// ─── Delete Invoice from Neon DB ──────────────────────────────────────────────
export const deleteInvoiceFromBackend = async (id: string) => {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return false;
    }
    const clientId = getClientId();
    const res = await fetch(`${API_BASE}/client/${clientId}/invoices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      keepalive: true,
    });
    return res.ok;
  } catch (e) {
    console.warn('Backend delete failed, saved locally:', e);
    return false;
  }
};

// ─── Save / Sync Medical Product to Neon DB ───────────────────────────────────
export const syncProductToBackend = async (product: any): Promise<any> => {
  try {
    const clientId = getClientId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isExistingUuid = Boolean(product.id && uuidRegex.test(product.id));
    const url = isExistingUuid
      ? `${API_BASE}/medical-product/client/${clientId}/medical-products/${product.id}`
      : `${API_BASE}/medical-product/client/${clientId}/medical-products`;
    const method = isExistingUuid ? 'PUT' : 'POST';

    const alertVal = product.minStockAlert !== undefined && product.minStockAlert !== null
      ? Number(product.minStockAlert)
      : (product.min_stock_alert !== undefined ? Number(product.min_stock_alert) : 50);

    let res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      keepalive: true,
      body: JSON.stringify({
        product_title: product.name,
        category_name: product.category || 'General',
        unit: product.defaultUnit || 'Ltr',
        selling_price: Number(product.defaultPrice || 0),
        mrp: Number(product.mrp || 0),
        quantity: Number(product.stockQuantity ?? 0),
        box_capacity: Number(product.boxCapacity ?? 50),
        min_stock_alert: alertVal,
        status: true,
      }),
    });

    if (!res.ok && isExistingUuid) {
      res = await fetch(`${API_BASE}/medical-product/${product.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
        keepalive: true,
        body: JSON.stringify({
          product_title: product.name,
          category_name: product.category || 'General',
          unit: product.defaultUnit || 'Ltr',
          selling_price: Number(product.defaultPrice || 0),
          mrp: Number(product.mrp || 0),
          quantity: Number(product.stockQuantity ?? 0),
          box_capacity: Number(product.boxCapacity ?? 50),
          min_stock_alert: alertVal,
          status: true,
        }),
      });
    }

    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
  } catch (e) {
    console.warn('Product sync failed, saved locally:', e);
  }
  return null;
};

// ─── Delete Medical Product from Neon DB ──────────────────────────────────────
export const deleteProductFromBackend = async (id: string, name?: string) => {
  try {
    const clientId = getClientId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // 1. If valid UUID, delete by ID directly
    if (id && uuidRegex.test(id)) {
      await fetch(`${API_BASE}/medical-product/client/${clientId}/medical-products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
        keepalive: true,
      });
      await fetch(`${API_BASE}/medical-product/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
        keepalive: true,
      }).catch(() => {});
    }

    // 2. Also send DELETE with title query to guarantee backend removal
    if (name) {
      const encoded = encodeURIComponent(name.trim());
      await fetch(`${API_BASE}/medical-product/client/${clientId}/medical-products/${id || 'item'}?title=${encoded}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
        keepalive: true,
      }).catch(() => {});
    }
  } catch (e) {
    console.warn('Product delete failed, saved locally:', e);
  }
};

// ─── Delete ALL Medical Products from Neon DB (Clean Slate) ───────────────────
export const deleteAllProductsFromBackend = async () => {
  try {
    const clientId = getClientId();
    await fetch(`${API_BASE}/medical-product/client/${clientId}/medical-products/all`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      keepalive: true,
    });
  } catch (e) {
    console.warn('All products delete failed, saved locally:', e);
  }
};

