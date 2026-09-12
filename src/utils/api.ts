// API Client for ANIMEX BILLING APP
// Connected to dedicated 24/7 live backend on Render
export const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://animex-billing-backend.onrender.com';

const getAuthHeaders = () => {
  const token = localStorage.getItem('animex_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getClientId = (): string => {
  try {
    const userStr = localStorage.getItem('animex_auth_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.clientId || user.id || 'demo-client';
    }
  } catch {}
  return 'demo-client';
};

export const syncInvoiceToBackend = async (invoice: any) => {
  try {
    const clientId = getClientId();
    const itemsPayload = (invoice.items || []).map((item: any) => ({
      product_title: item.itemName || item.name,
      quantity: item.quantity,
      unit: item.unit || 'Ltr',
      mrp: item.mrp || 0,
      selling_price: (item.isFree || item.isScheme) ? 0 : (item.pricePerUnit || item.price),
      is_free: Boolean(item.isFree || item.isScheme),
    }));

    await fetch(`${API_BASE}/client/${clientId}/invoices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        medical_store_id: invoice.billTo?.id || '',
        date: invoice.date,
        discount: invoice.discount || 0,
        received_amount: invoice.receivedAmount || 0,
        payment_type: invoice.paymentType || 'UPI',
        notes: invoice.termsAndConditions || 'Invoice generated via ANIMEX Billing',
        items: itemsPayload,
      }),
    });
  } catch (e) {
    // Offline or server asleep, data safely stored in local state
    console.warn('Backend sync failed, saved locally:', e);
  }
};

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

export const syncStoreToBackend = async (store: any) => {
  try {
    const clientId = getClientId();
    await fetch(`${API_BASE}/medical-store/client/${clientId}/medical-stores`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        firm_name: store.firmName,
        contact_person_name: store.contactName,
        phone_number: store.phone,
        district: store.district,
        address: store.address,
        status: true,
      }),
    });
  } catch (e) {
    console.warn('Store sync failed, saved locally:', e);
  }
};

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
