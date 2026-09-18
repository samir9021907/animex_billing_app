import React, { useState } from 'react';
import { MedicalStore } from '../types';
import { Store, Plus, Phone, MapPin, Search, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { cleanPhoneNumber, validatePhone, validateName } from '../utils/validators';

interface MedicalStoresDirectoryProps {
  stores: MedicalStore[];
  onAddStore: (newStore: MedicalStore) => void;
  onUpdateStore: (updatedStore: MedicalStore) => void;
  onDeleteStore: (storeId: string) => void;
}

export const MedicalStoresDirectory: React.FC<MedicalStoresDirectoryProps> = ({
  stores,
  onAddStore,
  onUpdateStore,
  onDeleteStore
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<MedicalStore | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [firmName, setFirmName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('Ahmednagar');
  const [state] = useState('Maharashtra');
  const [address, setAddress] = useState('');

  const handleOpenAddModal = () => {
    setEditingStore(null);
    setFirmName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setDistrict('Ahmednagar');
    setAddress('');
    setFormError(null);
    setIsSubmitting(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (st: MedicalStore) => {
    setEditingStore(st);
    setFirmName(st.firmName);
    setContactName(st.contactName || '');
    setPhone(st.phone || '');
    setEmail(st.email || '');
    setDistrict(st.district || 'Ahmednagar');
    setAddress(st.address || '');
    setFormError(null);
    setIsSubmitting(false);
    setShowModal(true);
  };

  const filteredStores = stores.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.firmName.toLowerCase().includes(q) || s.district.toLowerCase().includes(q) || s.phone.includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // 1. Validate Firm Name
    const firmNameErr = validateName(firmName, 'मेडिकल स्टोअरचे नाव (Firm Name)', 2);
    if (firmNameErr) {
      setFormError(firmNameErr);
      return;
    }

    // Duplicate check for firm name
    const cleanFirm = firmName.trim().toLowerCase();
    const isDuplicate = stores.some(s => 
      s.firmName.trim().toLowerCase() === cleanFirm && (!editingStore || s.id !== editingStore.id)
    );
    if (isDuplicate) {
      setFormError(`'${firmName.trim()}' नावाचे मेडिकल स्टोअर आधीपासून जोडलेले आहे. कृपया वेगळे नाव द्या.`);
      return;
    }

    // 2. Validate Phone (must be strictly 10 digits starting with 6, 7, 8, 9)
    const phoneErr = validatePhone(phone, 'मोबाईल नंबर (Phone Number)');
    if (phoneErr) {
      setFormError(phoneErr);
      return;
    }

    // 3. Validate Contact Person (if entered)
    if (contactName.trim() && contactName.trim().length < 2) {
      setFormError('कॉन्टॅक्ट पर्सनचे नाव किमान २ अक्षरांचे असणे आवश्यक आहे.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      if (editingStore) {
        const updated: MedicalStore = {
          ...editingStore,
          firmName: firmName.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          district,
          state,
          address: address.trim()
        };
        await onUpdateStore(updated);
      } else {
        const created: MedicalStore = {
          id: `store-${Date.now()}`,
          firmName: firmName.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          district,
          state,
          address: address.trim()
        };
        await onAddStore(created);
      }
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (st: MedicalStore) => {
    if (window.confirm(`Are you sure you want to delete ${st.firmName}?`)) {
      onDeleteStore(st.id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-animex-orange-500" />
            <span>Medical Stores & Dealers Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage your registered medical store customers for quick 1-click billing.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-animex-orange-500 hover:bg-animex-orange-600 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Medical Store</span>
        </button>
      </div>

      {/* Search & Grid */}
      <div className="space-y-4">
        
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search medical stores by name, district, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-animex-orange-500 outline-none shadow-sm"
          />
        </div>

        {filteredStores.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/40 text-orange-600 rounded-2xl flex items-center justify-center mx-auto">
              <Store className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {searchQuery ? 'No stores matching your search' : 'No Medical Stores Registered Yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Try searching with another keyword or phone number.'
                : 'Add your first medical store to start generating customized bills & invoices.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-2 bg-animex-orange-500 hover:bg-animex-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medical Store</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStores.map(st => (
              <div key={st.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 space-y-3 transition-all">
                
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-animex-blue-50 dark:bg-slate-800 text-animex-blue-900 dark:text-sky-300 flex items-center justify-center font-black text-base border border-animex-blue-100 dark:border-slate-700">
                    {st.firmName.charAt(0)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(st)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-animex-blue-50 text-slate-600 hover:text-animex-blue-600 transition-colors"
                      title="Edit Store"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(st)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                      title="Delete Store"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {st.firmName}
                  </h4>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                    Prop: {st.contactName}
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-animex-blue-900 dark:text-sky-300">
                    <Phone className="w-3.5 h-3.5" />
                    <span>+91 {st.phone}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{st.address} ({st.district}, {st.state})</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* Add / Edit Medical Store Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 border border-slate-200 dark:border-slate-800">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {editingStore ? 'Edit Medical Store Details' : 'Add New Medical Store'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs font-bold">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Firm Name (Medical Store Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="Medical Name"
                  value={firmName}
                  onChange={(e) => {
                    setFirmName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Contact Person Name</label>
                <input
                  type="text"
                  placeholder="Person Name"
                  value={contactName}
                  onChange={(e) => {
                    setContactName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => {
                      setPhone(cleanPhoneNumber(e.target.value));
                      if (formError) setFormError(null);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">District</label>
                  <input
                    type="text"
                    placeholder="District"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <textarea
                  rows={2}
                  placeholder="Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-animex-orange-500 hover:bg-animex-orange-600 disabled:opacity-50 text-white font-black px-5 py-2 rounded-xl text-xs shadow-md"
                >
                  {isSubmitting ? 'Saving...' : (editingStore ? 'Save Store Changes' : 'Save Medical Store')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
