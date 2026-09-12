// API Client for ANIMEX BILLING APP
// Connected to dedicated 24/7 live backend on Render & Neon PostgreSQL Database
export const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://animex-billing-backend.onrender.com';

export const PERMANENT_CLIENT_ID = 'c1111111-1111-1111-1111-111111111111';
export const PERMANENT_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImMxMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsIm5hbWUiOiJBTklNRVggQW5pbWFsIEhlYWx0aCBDYXJlIiwiZW1haWwiOiJhZG1pbkBhbmltZXguY29tIiwicm9sZSI6ImJ1c2luZXNzb3duZXIiLCJpYXQiOjE3ODkyMTQwODYsImV4cCI6MjEwNDU3NDA4Nn0.zvJzszksQr9T48Gkww0orH90HP5Sp6jClpYHY-WvSt8';

const getAuthHeaders = () => {
  let token = localStorage.getItem('animex_auth_token');
  if (!token || token === 'demo_jwt_token_animex' || token.startsWith('offline_jwt')) {
    token = PERMANENT_JWT_TOKEN;
    localStorage.setItem('animex_auth_token', token);
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

const getClientId = (): string => {
  try {
    const userStr = localStorage.getItem('animex_auth_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.clientId && user.clientId !== 'client-demo-01' && user.clientId !== 'demo-client') {
        return user.clientId;
      }
    }
  } catch {}
  return PERMANENT_CLIENT_ID;
};

// ─── Fetch All Medical Stores from Neon DB ────────────────────────────────────
export const fetchStoresFromBackend = async (): Promise<any[]> => {
  try {
    const clientId = getClientId();
    const res = await fetch(`${API_BASE}/medical-store/client/${clientId}/medical-stores`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data.map((s: any) => ({
        id: s.id,
        firmName: s.firm_name,
        contactName: s.contact_person_name || '',
        phone: s.phone_number || '',
        district: s.district || 'Maharashtra',
        address: s.address || '',
        state: 'Maharashtra',
      }));
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
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data.map((inv: any) => {
        const rawItems = Array.isArray(inv.items) ? inv.items : [];
        const items = rawItems.map((it: any, idx: number) => ({
          id: `item-${idx}-${Date.now()}`,
          productId: it.productId || `p-${idx}`,
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
        return {
          id: inv.id,
          invoiceNo: inv.company_invoice_number || (inv.invoice_number ? Number(inv.invoice_number.replace(/\D/g, '')) : 1),
          invoiceNumber: inv.invoice_number || `#${inv.company_invoice_number || 1}`,
          globalBillId: inv.global_bill_id ? Number(inv.global_bill_id) : undefined,
          date: inv.date ? inv.date.split('T')[0] : new Date().toISOString().split('T')[0],
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
          totalAmount: Number(inv.grand_total || 0),
          paymentType: inv.payment_type || 'UPI',
          receivedAmount: Number(inv.received_amount || 0),
          balanceAmount: Number(inv.balance_due || 0),
          status: inv.status?.toUpperCase() || 'PENDING',
          notes: inv.notes || '',
          termsAndConditions: inv.notes || 'Goods once sold will not be taken back.',
          createdAt: inv.created_at || new Date().toISOString(),
        };
      });
    }
  } catch (e) {
    console.warn('Failed to fetch invoices from cloud backend:', e);
  }
  return [];
};

// ─── Save / Sync Medical Store to Neon DB ─────────────────────────────────────
export const syncStoreToBackend = async (store: any): Promise<any> => {
  try {
    const clientId = getClientId();
    const res = await fetch(`${API_BASE}/medical-store/client/${clientId}/medical-stores`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        firm_name: store.firmName,
        contact_person_name: store.contactName || '',
        phone_number: store.phone || '',
        district: store.district || 'Maharashtra',
        address: store.address || '',
        status: true,
      }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
  } catch (e) {
    console.warn('Store sync failed, saved locally:', e);
  }
  return null;
};

// ─── Delete Medical Store from Neon DB ─────────────────────────────────────────
export const deleteStoreFromBackend = async (id: string) => {
  try {
    const clientId = getClientId();
    await fetch(`${API_BASE}/medical-store/client/${clientId}/medical-stores/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  } catch (e) {
    console.warn('Store delete failed, saved locally:', e);
  }
};

// ─── Save / Sync Invoice to Neon DB ───────────────────────────────────────────
export const syncInvoiceToBackend = async (invoice: any): Promise<any> => {
  try {
    const clientId = getClientId();
    const itemsPayload = (invoice.items || []).map((item: any) => ({
      product_title: item.itemName || item.name,
      quantity: Number(item.quantity || 1),
      unit: item.unit || 'Ltr',
      mrp: Number(item.mrp || 0),
      selling_price: (item.isFree || item.isScheme) ? 0 : Number(item.pricePerUnit || item.price || 0),
      is_free: Boolean(item.isFree || item.isScheme),
    }));

    let isoDate = invoice.date;
    if (invoice.date && /^\d{2}-\d{2}-\d{4}$/.test(invoice.date)) {
      const [d, m, y] = invoice.date.split('-');
      isoDate = `${y}-${m}-${d}`;
    }

    // Ensure medical_store_id is a valid UUID
    let storeId = invoice.billTo?.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!storeId || !uuidRegex.test(storeId)) {
      if (invoice.billTo) {
        const createdStore = await syncStoreToBackend(invoice.billTo);
        if (createdStore?.id) {
          storeId = createdStore.id;
        }
      }
    }

    if (!storeId) {
      console.warn('Cannot sync invoice: missing valid medical_store_id');
      return null;
    }

    const res = await fetch(`${API_BASE}/client/${clientId}/invoices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        medical_store_id: storeId,
        date: isoDate,
        discount: invoice.discount || 0,
        received_amount: invoice.receivedAmount || 0,
        payment_type: invoice.paymentType || 'UPI',
        notes: invoice.termsAndConditions || 'Invoice generated via ANIMEX Billing',
        items: itemsPayload,
      }),
    });
    const json = await res.json();
    return json.data || null;
  } catch (e) {
    console.warn('Backend sync failed, saved locally:', e);
    return null;
  }
};

// ─── Delete Invoice from Neon DB ──────────────────────────────────────────────
export const deleteInvoiceFromBackend = async (id: string) => {
  try {
    const clientId = getClientId();
    await fetch(`${API_BASE}/client/${clientId}/invoices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  } catch (e) {
    console.warn('Backend delete failed, saved locally:', e);
  }
};
