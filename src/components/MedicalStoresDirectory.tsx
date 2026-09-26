import React, { useState } from 'react';
import { MedicalStore } from '../types';
import { Store, Plus, Phone, MapPin, Search, Edit2, Trash2, AlertCircle, User, UserPlus } from 'lucide-react';
import { cleanPhoneNumber, validatePhone, validateName } from '../utils/validators';
import { useLanguage } from '../context/LanguageContext';

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
  const { language } = useLanguage();
  const isMr = language === 'mr';
  const isHi = language === 'hi';

  const [filterType, setFilterType] = useState<'ALL' | 'STORE' | 'CUSTOMER'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'store' | 'customer'>('store');
  const [editingStore, setEditingStore] = useState<MedicalStore | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [firmName, setFirmName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [state] = useState('Maharashtra');
  const [address, setAddress] = useState('');

  const handleOpenAddStore = () => {
    setModalType('store');
    setEditingStore(null);
    setFirmName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setDistrict('');
    setAddress('');
    setFormError(null);
    setIsSubmitting(false);
    setShowModal(true);
  };

  const handleOpenAddCustomer = () => {
    setModalType('customer');
    setEditingStore(null);
    setFirmName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setDistrict('');
    setAddress('');
    setFormError(null);
    setIsSubmitting(false);
    setShowModal(true);
  };

  const handleOpenEdit = (st: MedicalStore) => {
    setModalType(st.customerType === 'customer' ? 'customer' : 'store');
    setEditingStore(st);
    setFirmName(st.firmName);
    setContactName(st.contactName || '');
    setPhone(st.phone || '');
    setEmail(st.email || '');
    setDistrict(st.district || '');
    setAddress(st.address || '');
    setFormError(null);
    setIsSubmitting(false);
    setShowModal(true);
  };

  const storeCount = stores.filter(s => s.customerType !== 'customer').length;
  const customerCount = stores.filter(s => s.customerType === 'customer').length;

  const filteredStores = stores.filter(s => {
    if (filterType === 'STORE' && s.customerType === 'customer') return false;
    if (filterType === 'CUSTOMER' && s.customerType !== 'customer') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.firmName.toLowerCase().includes(q) ||
      (s.contactName && s.contactName.toLowerCase().includes(q)) ||
      s.district.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const isCustomer = modalType === 'customer';

    // 1. Validate Name / Title
    const nameLabel = isCustomer
      ? (isMr ? 'ग्राहकाचे नाव' : isHi ? 'ग्राहक का नाम' : 'Customer Name')
      : (isMr ? 'मेडिकल स्टोअरचे नाव' : isHi ? 'मेडिकल स्टोर का नाम' : 'Store / Firm Name');

    const nameErr = validateName(firmName, nameLabel, 2);
    if (nameErr) {
      setFormError(nameErr);
      return;
    }

    // Duplicate check
    const cleanFirm = firmName.trim().toLowerCase();
    const isDuplicate = stores.some(s => 
      s.firmName.trim().toLowerCase() === cleanFirm && (!editingStore || s.id !== editingStore.id)
    );
    if (isDuplicate) {
      setFormError(
        isCustomer
          ? (isMr ? `'${firmName.trim()}' नावाचा ग्राहक आधीपासून जोडलेला आहे.` : `Customer '${firmName.trim()}' already exists.`)
          : (isMr ? `'${firmName.trim()}' नावाचे मेडिकल स्टोअर आधीपासून जोडलेले आहे. कृपया वेगळे नाव द्या.` : `Store '${firmName.trim()}' already exists. Please enter a different name.`)
      );
      return;
    }

    // 2. Validate Phone (must be strictly 10 digits starting with 6, 7, 8, 9)
    const phoneLabel = isMr ? 'मोबाईल नंबर' : isHi ? 'मोबाइल नंबर' : 'Phone Number';
    const phoneErr = validatePhone(phone, phoneLabel);
    if (phoneErr) {
      setFormError(phoneErr);
      return;
    }

    // 3. Validate Contact Person (only for stores, if entered)
    if (!isCustomer && contactName.trim() && contactName.trim().length < 2) {
      setFormError(
        isMr
          ? 'कॉन्टॅक्ट पर्सनचे नाव किमान २ अक्षरांचे असणे आवश्यक आहे.'
          : isHi
          ? 'संपर्क व्यक्ति का नाम कम से कम 2 अक्षरों का होना चाहिए।'
          : 'Contact person name must be at least 2 characters.'
      );
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      if (editingStore) {
        const updated: MedicalStore = {
          ...editingStore,
          firmName: firmName.trim(),
          contactName: isCustomer ? (contactName.trim() || firmName.trim()) : contactName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          district: district.trim(),
          state,
          address: address.trim(),
          customerType: modalType,
        };
        await onUpdateStore(updated);
      } else {
        const created: MedicalStore = {
          id: isCustomer ? `cust-${Date.now()}` : `store-${Date.now()}`,
          firmName: firmName.trim(),
          contactName: isCustomer ? (contactName.trim() || firmName.trim()) : contactName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          district: district.trim(),
          state,
          address: address.trim(),
          customerType: modalType,
        };
        await onAddStore(created);
      }
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (st: MedicalStore) => {
    const isCust = st.customerType === 'customer';
    const confirmMsg = isMr
      ? `तुम्हाला खात्री आहे का? '${st.firmName}' ${isCust ? 'ग्राहक' : 'मेडिकल स्टोअर'} डिलीट करायचे आहे का?`
      : `Are you sure you want to delete ${st.firmName}?`;
    if (window.confirm(confirmMsg)) {
      onDeleteStore(st.id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-6">
      
      {/* Top Banner Card with BOTH Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-md border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-animex-orange-500" />
            <span>{isMr ? 'मेडिकल स्टोअर्स व ग्राहक यादी' : isHi ? 'मेडिकल स्टोर्स और ग्राहक सूची' : 'Medical Stores & Customer Directory'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isMr
              ? 'झटपट १-क्लिक बिलिंगसाठी आपले नोंदणीकृत मेडिकल स्टोअर्स आणि थेट ग्राहक व्यवस्थापित करा.'
              : isHi
              ? 'त्वरित 1-क्लिक बिलिंग के लिए अपने पंजीकृत मेडिकल स्टोर और सीधे ग्राहक प्रबंधित करें।'
              : 'Manage your registered medical stores and direct customer buyers for quick 1-click billing.'}
          </p>
        </div>

        {/* Action Buttons: 1. Add Medical Store, 2. Add Customer */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Button 1: Add Medical Store (Original) */}
          <button
            type="button"
            onClick={handleOpenAddStore}
            className="bg-animex-orange-500 hover:bg-animex-orange-600 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            <Store className="w-4 h-4" />
            <span>{isMr ? '+ मेडिकल स्टोअर जोडा' : isHi ? '+ मेडिकल स्टोर जोड़ें' : '+ Add New Medical Store'}</span>
          </button>

          {/* Button 2: Add Direct Customer (New Separate Option) */}
          <button
            type="button"
            onClick={handleOpenAddCustomer}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isMr ? '+ थेट ग्राहक जोडा' : isHi ? '+ नया ग्राहक जोड़ें' : '+ Add New Customer'}</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Category Filter Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={isMr ? 'नाव, गाव, जिल्हा किंवा मोबाईल नंबरने शोधा...' : isHi ? 'नाम, शहर, जिला या मोबाइल से खोजें...' : 'Search by store name, customer, district, phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-animex-orange-500 outline-none shadow-sm"
          />
        </div>

        {/* Category Filters: [All] [Stores] [Customers] */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>{isMr ? 'सर्व' : isHi ? 'सभी' : 'All'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black">
              {stores.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('STORE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterType === 'STORE'
                ? 'bg-white dark:bg-slate-900 text-animex-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{isMr ? 'मेडिकल स्टोअर्स' : isHi ? 'मेडिकल स्टोर्स' : 'Stores'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-black">
              {storeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('CUSTOMER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterType === 'CUSTOMER'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{isMr ? 'थेट ग्राहक' : isHi ? 'ग्राहक' : 'Customers'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black">
              {customerCount}
            </span>
          </button>
        </div>
      </div>

      {/* Directory Grid or Empty State */}
      <div className="space-y-4">
        {filteredStores.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/40 text-orange-600 rounded-2xl flex items-center justify-center mx-auto">
              <Store className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {searchQuery
                ? (isMr ? 'शोध जुळणारे रेकॉर्ड सापडले नाही' : 'No records matching your search')
                : (isMr ? 'अद्याप कोणतेही स्टोअर किंवा ग्राहक जोडलेले नाहीत' : 'No Stores or Customers Registered Yet')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? (isMr ? 'कृपया इतर शब्द किंवा नंबरने शोधा.' : 'Try searching with another keyword or phone number.')
                : (isMr ? 'बिलिंग सुरू करण्यासाठी पहिले मेडिकल स्टोअर किंवा थेट ग्राहक जोडा.' : 'Add your first medical store or direct customer to start generating 1-click bills.')}
            </p>
            {!searchQuery && (
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenAddStore}
                  className="bg-animex-orange-500 hover:bg-animex-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2 shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isMr ? '+ मेडिकल स्टोअर' : '+ Add Medical Store'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddCustomer}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2 shadow cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isMr ? '+ थेट ग्राहक' : '+ Add Direct Customer'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStores.map(st => {
              const isCust = st.customerType === 'customer';
              return (
                <div key={st.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 space-y-3 transition-all">
                  
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base border ${
                        isCust
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-animex-blue-50 dark:bg-slate-800 text-animex-blue-900 dark:text-sky-300 border-animex-blue-100 dark:border-slate-700'
                      }`}>
                        {isCust ? <User className="w-5 h-5" /> : st.firmName.charAt(0)}
                      </div>
                      <div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block mb-0.5 border ${
                          isCust
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                            : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                        }`}>
                          {isCust ? (isMr ? '👤 थेट ग्राहक' : isHi ? '👤 ग्राहक' : '👤 Customer') : (isMr ? '🏬 मेडिकल स्टोअर' : isHi ? '🏬 मेडिकल स्टोर' : '🏬 Medical Store')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(st)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-animex-blue-50 text-slate-600 hover:text-animex-blue-600 transition-colors"
                        title={isCust ? 'Edit Customer' : 'Edit Store'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(st)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                        title={isCust ? 'Delete Customer' : 'Delete Store'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                      {st.firmName}
                    </h4>
                    {!isCust && st.contactName && (
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                        Prop: {st.contactName}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 font-bold text-animex-blue-900 dark:text-sky-300">
                      <Phone className="w-3.5 h-3.5" />
                      <span>+91 {st.phone}</span>
                    </div>
                    {st.address && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{st.address}{st.district ? ` (${st.district})` : ''}</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal (Dynamically switches fields between Store and Customer) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 border border-slate-200 dark:border-slate-800">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {modalType === 'customer' ? (
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                )}
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {modalType === 'customer'
                    ? (editingStore ? (isMr ? 'ग्राहक माहिती अपडेट करा' : 'Edit Customer Details') : (isMr ? 'नवीन थेट ग्राहक जोडा' : 'Add New Direct Customer'))
                    : (editingStore ? (isMr ? 'स्टोअर माहिती अपडेट करा' : 'Edit Medical Store Details') : (isMr ? 'नवीन मेडिकल स्टोअर जोडा' : 'Add New Medical Store'))}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs font-bold">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Field 1: Name */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                  {modalType === 'customer'
                    ? (isMr ? 'ग्राहकाचे / शेतकऱ्याचे पूर्ण नाव *' : isHi ? 'ग्राहक / किसान का नाम *' : 'Customer / Farmer Full Name *')
                    : (isMr ? 'मेडिकल स्टोअरचे नाव (Firm Name) *' : isHi ? 'मेडिकल स्टोर का नाम *' : 'Firm Name (Medical Store Name) *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={modalType === 'customer' ? (isMr ? 'ग्राहकाचे नाव' : isHi ? 'ग्राहक का नाम' : 'Customer Name') : (isMr ? 'मेडिकल स्टोअरचे नाव' : isHi ? 'मेडिकल स्टोर का नाम' : 'Medical Store Name')}
                  value={firmName}
                  onChange={(e) => {
                    setFirmName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              {/* Field 2: Contact Person Name (Only for Medical Store) */}
              {modalType === 'store' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    {isMr ? 'प्रोप्रायटर / संपर्क व्यक्तीचे नाव' : 'Contact Person / Proprietor Name'}
                  </label>
                  <input
                    type="text"
                    placeholder={isMr ? 'संपर्क व्यक्तीचे नाव' : isHi ? 'संपर्क व्यक्ति का नाम' : 'Contact Person Name'}
                    value={contactName}
                    onChange={(e) => {
                      setContactName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Field 3: Phone & District */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    {isMr ? 'मोबाईल नंबर *' : 'Phone Number *'}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    placeholder={isMr ? 'मोबाईल नंबर' : isHi ? 'मोबाइल नंबर' : 'Phone Number'}
                    value={phone}
                    onChange={(e) => {
                      setPhone(cleanPhoneNumber(e.target.value));
                      if (formError) setFormError(null);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    {isMr ? 'जिल्हा' : 'District'}
                  </label>
                  <input
                    type="text"
                    placeholder={isMr ? 'जिल्हा' : isHi ? 'जिला' : 'District'}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Field 4: Village / Address */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                  {modalType === 'customer'
                    ? (isMr ? 'गाव / सविस्तर पत्ता' : 'Village / Full Address')
                    : (isMr ? 'पत्ता' : 'Address')}
                </label>
                <textarea
                  rows={2}
                  placeholder={isMr ? 'पत्ता' : isHi ? 'पता' : 'Address'}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
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
                  disabled={isSubmitting}
                  className={`text-white font-black px-5 py-2 rounded-xl text-xs shadow-md disabled:opacity-50 cursor-pointer ${
                    modalType === 'customer'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-animex-orange-500 hover:bg-animex-orange-600'
                  }`}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingStore
                    ? (isMr ? 'बदल सेव्ह करा' : 'Save Changes')
                    : modalType === 'customer'
                    ? (isMr ? 'ग्राहक सेव्ह करा' : 'Save Customer')
                    : (isMr ? 'स्टोअर सेव्ह करा' : 'Save Medical Store')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
