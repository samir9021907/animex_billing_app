import React, { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  Bell,
  Globe,
  Shield,
  FileText,
  Info,
  Smartphone,
  Headphones,
  ChevronRight,
  X,
  Phone,
  Mail,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';

interface SettingsScreenProps {
  onNavigateTab: (tab: string) => void;
  onLogout?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigateTab,
  onLogout,
}) => {
  const { language, setLanguage, t } = useLanguage();

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('animex_theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    } catch {
      return false;
    }
  });

  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('animex_notifications');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Active modal for settings detail sheets
  const [activeModal, setActiveModal] = useState<
    'language' | 'privacy' | 'terms' | 'about' | 'support' | null
  >(null);

  // Apply dark mode to document
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('animex_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('animex_theme', 'light');
      }
    } catch {}
  }, [isDarkMode]);

  // Save notifications
  const handleToggleNotifications = (val: boolean) => {
    setNotificationsEnabled(val);
    try {
      localStorage.setItem('animex_notifications', JSON.stringify(val));
    } catch {}
  };

  const handleSelectLanguage = (code: Language) => {
    setLanguage(code);
    setActiveModal(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('set.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('set.subtitle')}
          </p>
        </div>
        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-3 py-1 rounded-full text-xs border border-amber-500/20">
          v1.0.0
        </span>
      </div>

      {/* Card 1: Preferences & Appearance */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/40">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Preferences & Appearance
          </h2>
        </div>

        {/* Dark Mode Switch */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'mr' ? 'डार्क मोड' : language === 'hi' ? 'डार्क थीम' : 'Dark Mode'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isDarkMode
                  ? 'Dark theme is currently active'
                  : 'Switch between light and dark theme'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isDarkMode}
              onChange={(e) => setIsDarkMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
          </label>
        </div>

        {/* Notifications Switch */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'mr' ? 'सूचना' : language === 'hi' ? 'सूचनाएं' : 'Notifications'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Receive UI alerts, bill creation reminders and payment dues
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => handleToggleNotifications(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
          </label>
        </div>
      </div>

      {/* Card 2: General & Information */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/40">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Application & Legal
          </h2>
        </div>

        {/* Language */}
        <button
          onClick={() => setActiveModal('language')}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('set.language')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'en' ? 'English' : language === 'hi' ? 'Hindi (हिंदी)' : 'Marathi (मराठी)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full">
              {language === 'en' ? 'EN' : language === 'hi' ? 'हिंदी' : 'मराठी'}
            </span>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </button>

        {/* Company Profile & Bank Quick Link */}
        <button
          onClick={() => onNavigateTab('profile')}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Company Profile & SBI Bank
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Edit DL No, GSTIN, Bank A/C & UPI QR on invoices
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>

        {/* Privacy Policy */}
        <button
          onClick={() => setActiveModal('privacy')}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'mr' ? 'गोपनीयता धोरण' : language === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Read how we handle and protect billing records
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>

        {/* Terms of Service */}
        <button
          onClick={() => setActiveModal('terms')}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'mr' ? 'सेवा अटी' : language === 'hi' ? 'सेवा की शर्तें' : 'Terms of Service'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review pharmaceutical billing terms and conditions
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>

        {/* About */}
        <button
          onClick={() => setActiveModal('about')}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'mr' ? 'ॲप विषयी माहिती' : language === 'hi' ? 'ऐप विवरण' : 'About ANIMEX'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ANIMEX Billing Suite • Animal Health Care Pvt. Ltd.
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>

        {/* App Version */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'mr' ? 'ॲप व्हर्जन' : language === 'hi' ? 'ऐप संस्करण' : 'App Version'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                1.0.0 (Capacitor Android & Web Build)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            Latest
          </span>
        </div>

        {/* Support */}
        <button
          onClick={() => setActiveModal('support')}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'mr' ? 'मदत व संपर्क' : language === 'hi' ? 'सहायता व हेल्पलाइन' : 'Support & Helpline'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Contact the ANIMEX technical support team
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Logout button at bottom of settings */}
      {onLogout && (
        <div className="pt-2">
          <button
            onClick={onLogout}
            className="w-full py-3.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{language === 'mr' ? 'खात्यातून बाहेर पडा' : language === 'hi' ? 'लॉगआउट करें' : 'Log Out'}</span>
          </button>
        </div>
      )}

      {/* ── MODALS / SHEETS ────────────────────────────────────────── */}

      {/* Language Modal */}
      {activeModal === 'language' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-500" />
                {t('set.selectLanguage')}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { code: 'en' as Language, label: 'English', desc: 'System standard language' },
                { code: 'hi' as Language, label: 'हिंदी (Hindi)', desc: 'हिंदी भाषा में उपयोग करें' },
                { code: 'mr' as Language, label: 'मराठी (Marathi)', desc: 'मराठी भाषेत ॲप वापरा' },
              ].map((item) => (
                <button
                  key={item.code}
                  onClick={() => handleSelectLanguage(item.code)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    language === item.code
                      ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-bold">{item.label}</p>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </div>
                  {language === item.code && (
                    <CheckCircle2 className="w-5 h-5 text-orange-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {activeModal === 'privacy' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-500" />
                Privacy Policy
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                ANIMEX ANIMAL HEALTH CARE PVT. LTD. - Data Protection Policy
              </p>
              <p>
                All your customer records, billing invoices, product pricing, and ledger transactions
                are stored locally on this device and synchronized with our secure encrypted backend server.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li>Your customer medical store details remain strictly confidential.</li>
                <li>Invoice PDFs and WhatsApp shares are generated on-demand under your direct control.</li>
                <li>No financial or tax data is shared with unauthorized third-party advertisers.</li>
              </ul>
              <p className="pt-2 text-xs text-slate-400">
                Last updated: September 2026 • Kopargaon, Maharashtra
              </p>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="mt-6 w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {language === 'mr' ? 'बंद करा' : language === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {activeModal === 'terms' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                Terms of Service
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                ANIMEX Veterinary Pharmaceutical Billing Terms
              </p>
              <ul className="list-decimal pl-5 space-y-2 text-xs">
                <li>Goods once sold will not be accepted back unless specifically authorized.</li>
                <li>Any discrepancies in delivery, breakage, or shortage must be reported within 24 hours of invoice receipt.</li>
                <li>Credit payments must be settled within the agreed credit window as per company policy.</li>
                <li>All disputes are subject to Kopargaon / Ahmednagar jurisdiction.</li>
              </ul>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="mt-6 w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {language === 'mr' ? 'बंद करा' : language === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* About Modal */}
      {activeModal === 'about' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-orange-500" />
                About ANIMEX Billing
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-2 space-y-2">
              <img
                src="/images/logo image.jpg"
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.png'; }}
                alt="ANIMEX Logo"
                className="h-16 mx-auto rounded-xl bg-white p-1 shadow-sm border border-slate-200"
              />
              <h4 className="text-base font-black text-slate-900 dark:text-white pt-1">
                ANIMEX ANIMAL HEALTH CARE PVT. LTD.
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Premium veterinary pharmaceutical billing system
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-left space-y-1 text-xs text-slate-600 dark:text-slate-300 mt-3 border border-slate-200/80 dark:border-slate-700/60">
                <p><strong>CIN:</strong> U24230MH2021PTC355555</p>
                <p><strong>D.L. No:</strong> MH-TZ4-412211 / 412212</p>
                <p><strong>GSTIN:</strong> 27AAQCA1234F1Z5</p>
                <p><strong>Location:</strong> Kopargaon, Ahmednagar, Maharashtra</p>
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="mt-4 w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {language === 'mr' ? 'बंद करा' : language === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {activeModal === 'support' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Headphones className="w-5 h-5 text-orange-500" />
                ANIMEX Technical Support
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <a
                href="tel:8799883858"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-500/10 dark:hover:bg-orange-500/10 border border-slate-200 dark:border-slate-700/60 transition-all text-slate-800 dark:text-white"
              >
                <Phone className="w-5 h-5 text-orange-500" />
                <div className="flex-1">
                  <p className="text-xs font-bold">Helpline 1</p>
                  <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">+91 8799883858</p>
                </div>
              </a>

              <a
                href="tel:9146133858"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-500/10 dark:hover:bg-orange-500/10 border border-slate-200 dark:border-slate-700/60 transition-all text-slate-800 dark:text-white"
              >
                <Phone className="w-5 h-5 text-orange-500" />
                <div className="flex-1">
                  <p className="text-xs font-bold">Helpline 2</p>
                  <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">+91 9146133858</p>
                </div>
              </a>

              <a
                href="mailto:animexpharma@gmail.com"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-500/10 dark:hover:bg-orange-500/10 border border-slate-200 dark:border-slate-700/60 transition-all text-slate-800 dark:text-white"
              >
                <Mail className="w-5 h-5 text-orange-500" />
                <div className="flex-1">
                  <p className="text-xs font-bold">Email Support</p>
                  <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">animexpharma@gmail.com</p>
                </div>
              </a>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="mt-6 w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {language === 'mr' ? 'बंद करा' : language === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
