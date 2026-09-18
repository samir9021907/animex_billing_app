import React, { useState } from 'react';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Edit3,
  LogOut,
  ShieldCheck,
  Save,
  X,
  Store,
  Package,
  Receipt,
  Smartphone,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { CompanyProfile } from '../types';
import { UserSession } from '../services/authService';
import { cleanPhoneNumber, validatePhone, validateName, cleanPincode, isValidPincode, cleanGstin } from '../utils/validators';

interface ProfileManagerProps {
  user: UserSession | null;
  onLogout: () => void;
  invoicesCount: number;
  storesCount: number;
  productsCount: number;
}

const DEFAULT_PROFILE: CompanyProfile = {
  companyName: 'ANIMEX ANIMAL HEALTH CARE PVT. LTD.',
  tagline: 'Veterinary Pharmaceuticals & Animal Healthcare Products',
  contactPerson: 'Admin Officer',
  email: 'contact@animexanimalhealthcare.com',
  phone: '+91 98765 43210',
  gstin: '24AAKCA9988Z1Z5',
  drugLicenseNo: 'GJ-SUR-2026-10492',
  panNumber: 'AAKCA9988Z',
  address: 'Plot No. 12, GIDC Industrial Estate, Adajan',
  city: 'Surat',
  state: 'Gujarat',
  pincode: '395009',
  bankName: 'State Bank of India',
  accountNo: '389920194821',
  ifscCode: 'SBIN0004123',
  upiId: 'animex@sbi',
};

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  user,
  onLogout,
  invoicesCount,
  storesCount,
  productsCount,
}) => {
  const [profile, setProfile] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem('animex_company_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      ...DEFAULT_PROFILE,
      contactPerson: user?.name || DEFAULT_PROFILE.contactPerson,
      email: user?.email || DEFAULT_PROFILE.email,
      phone: user?.phone || DEFAULT_PROFILE.phone,
      city: user?.city || DEFAULT_PROFILE.city,
      address: user?.address || DEFAULT_PROFILE.address,
    };
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<CompanyProfile>(profile);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateName(formData.companyName, 'Company Name', 2);
    if (nameErr) {
      setFormError(nameErr);
      return;
    }

    const phoneErr = validatePhone(formData.phone, 'Phone Number');
    if (phoneErr) {
      setFormError(phoneErr);
      return;
    }

    if (formData.pincode && !isValidPincode(formData.pincode)) {
      setFormError('Pincode must be exactly 6 digits (६ अंकी पिनकोड आवश्यक आहे)');
      return;
    }

    setFormError(null);
    setProfile(formData);
    try {
      localStorage.setItem('animex_company_profile', JSON.stringify(formData));
    } catch {}
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-8">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-animex-blue-900 via-slate-800 to-[#0B1526] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-animex-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-lg">
              <img
                src="/images/logo image.jpg"
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.png'; }}
                alt="Company Logo"
                className="h-16 sm:h-20 w-auto object-contain rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {profile.companyName}
                </h1>
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-emerald-400/40">
                  <ShieldCheck className="w-3 h-3" /> REGISTERED
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                {profile.tagline}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1 font-mono bg-white/10 px-2 py-0.5 rounded">
                  GST: {profile.gstin}
                </span>
                <span className="flex items-center gap-1 font-mono bg-white/10 px-2 py-0.5 rounded">
                  DL No: {profile.drugLicenseNo}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                setFormData(profile);
                setIsEditing(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-animex-orange-500 hover:bg-animex-orange-600 text-white font-bold rounded-xl shadow-lg transition-all text-xs cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border border-red-500/30 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Company profile details updated successfully!</span>
        </div>
      )}

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-animex-blue-900 rounded-xl">
            <Receipt className="w-6 h-6 text-[#0D2A4D]" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoices Issued</p>
            <h3 className="text-2xl font-black text-slate-900">{invoicesCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Medical Stores</p>
            <h3 className="text-2xl font-black text-slate-900">{storesCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Medicines / Stock</p>
            <h3 className="text-2xl font-black text-slate-900">{productsCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Location Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold">
            <Building2 className="w-5 h-5 text-animex-orange-500" />
            <h2 className="text-base font-bold">Headquarters & Contact Information</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-slate-400 block">Authorized Contact</span>
                <span className="font-semibold text-slate-800">{profile.contactPerson}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-slate-400 block">Email Address</span>
                <span className="font-semibold text-slate-800">{profile.email}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-slate-400 block">Phone / Mobile</span>
                <span className="font-semibold text-slate-800">{profile.phone}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-slate-400 block">Registered Address</span>
                <span className="font-semibold text-slate-800">
                  {profile.address}, {profile.city}, {profile.state} - {profile.pincode}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Banking & Invoicing Configuration */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold">
            <CreditCard className="w-5 h-5 text-animex-orange-500" />
            <h2 className="text-base font-bold">Bank Details (Printed on Invoices)</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Building2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-slate-400 block">Bank Name</span>
                <span className="font-semibold text-slate-800">{profile.bankName}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-slate-400 block">Account Number</span>
                <span className="font-mono font-bold text-slate-900">{profile.accountNo}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-slate-400 block">RTGS / NEFT IFSC Code</span>
                <span className="font-mono font-bold text-slate-900">{profile.ifscCode}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Smartphone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-slate-400 block">Instant UPI Payment ID</span>
                <span className="font-mono font-bold text-animex-orange-600">{profile.upiId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-lg text-slate-900">
                <Edit3 className="w-5 h-5 text-animex-orange-500" />
                <span>Edit Company & Invoicing Profile</span>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => {
                    setFormData({ ...formData, companyName: e.target.value });
                    if (formError) setFormError(null);
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-animex-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Tagline / Subtitle</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-animex-orange-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => {
                      setFormData({ ...formData, contactPerson: e.target.value });
                      if (formError) setFormError(null);
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-animex-orange-500 outline-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Phone Number *</label>
                    <span className={`text-[10px] font-mono font-bold ${formData.phone.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {formData.phone.length}/10 {formData.phone.length === 10 ? '✓' : ''}
                    </span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: cleanPhoneNumber(e.target.value) });
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. 9822012345 (10 digits)"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-animex-orange-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">GSTIN</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: cleanGstin(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-animex-orange-500 outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Drug License No</label>
                  <input
                    type="text"
                    value={formData.drugLicenseNo || ''}
                    onChange={(e) => setFormData({ ...formData, drugLicenseNo: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-animex-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-animex-orange-500 outline-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">PIN Code</label>
                    <span className={`text-[10px] font-mono font-bold ${formData.pincode?.length === 6 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {formData.pincode?.length || 0}/6 {formData.pincode?.length === 6 ? '✓' : ''}
                    </span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={6}
                    value={formData.pincode || ''}
                    onChange={(e) => setFormData({ ...formData, pincode: cleanPincode(e.target.value) })}
                    placeholder="e.g. 423601"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-animex-orange-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Factory / Office Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-animex-orange-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Banking & UPI</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bankName || ''}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">A/C Number</label>
                    <input
                      type="text"
                      value={formData.accountNo || ''}
                      onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={formData.ifscCode || ''}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">UPI ID</label>
                    <input
                      type="text"
                      value={formData.upiId || ''}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-animex-orange-500 hover:bg-animex-orange-600 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
