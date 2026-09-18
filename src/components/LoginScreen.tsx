import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RotateCw,
  CheckCircle2,
  Store,
  Phone,
  MapPin,
  Building,
  Rocket,
  Loader2,
  MessageSquare,
  UserPlus,
  LogIn,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { authService, UserSession } from '../services/authService';
import { cleanPhoneNumber, validatePhone, validateName } from '../utils/validators';

interface LoginScreenProps {
  onLoginSuccess: (user: UserSession) => void;
}

type AuthMode = 'login' | 'otp' | 'signup';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState<string>('admin@animex.com');
  const [loginPassword, setLoginPassword] = useState<string>('admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // OTP form state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpPhone, setOtpPhone] = useState<string>('+91 98XXXXXX89');
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [otpToast, setOtpToast] = useState<string | null>(null);

  // Signup form state
  const [clientName, setClientName] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPhone, setSignupPhone] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(true);

  // Shared UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer for OTP countdown
  useEffect(() => {
    let timer: any = null;
    if (mode === 'otp' && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mode, secondsLeft]);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = await authService.login(loginEmail, loginPassword);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Handle OTP submission
  const handleVerifyOtp = async () => {
    const otpCode = otpDigits.join('');
    if (otpCode.length < 6) {
      setErrorMessage('Please enter all 6 digits of the OTP.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = await authService.verifyOtp(otpPhone, otpCode);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = () => {
    setIsResending(true);
    setSecondsLeft(30);
    setOtpToast('New 6-digit OTP has been resent to your phone');
    setTimeout(() => {
      setIsResending(false);
      setTimeout(() => setOtpToast(null), 3000);
    }, 600);
  };

  // Handle Client Sign Up
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateName(clientName, 'Client / Firm Name', 2);
    if (nameErr) {
      setErrorMessage(nameErr);
      return;
    }
    if (!signupEmail.trim()) {
      setErrorMessage('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(signupEmail)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    const phoneErr = validatePhone(signupPhone, 'Phone Number');
    if (phoneErr) {
      setErrorMessage(phoneErr);
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('You must agree to the Terms & Conditions');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = await authService.signup({
        name: clientName,
        email: signupEmail,
        phone: signupPhone,
        address,
        city,
      });
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setErrorMessage(null);
    setMode(newMode);
    if (newMode === 'otp') {
      setSecondsLeft(30);
      setOtpDigits(['', '', '', '', '', '']);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none font-sans">
      {/* Flutter AppBackground Orbs */}
      <div className="absolute -top-16 -right-12 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[#FF7A00]/12 blur-2xl pointer-events-none" />
      <div className="absolute bottom-16 -left-20 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#0D2A4D]/10 blur-3xl pointer-events-none" />
      <div className="absolute top-44 left-8 w-32 h-32 rounded-full bg-[#FF7A00]/08 blur-xl pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col items-center justify-center">
        
        {/* App Logo Header - Matches Flutter AppLogo */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-[0_8px_20px_rgba(13,42,77,0.08)] border border-slate-100 flex items-center justify-center p-2.5 flex-shrink-0">
            <img
              src="/images/logo image.jpg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/logo.png';
              }}
              alt="ANIMEX Logo"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[1.4px] text-[#0D2A4D] leading-none">
              ANIMEX
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#6B7A90] mt-1 tracking-wide">
              Billing Suite
            </p>
          </div>
        </div>

        {/* Card Container */}
        <div className="w-full max-w-[480px]">
          <div className="bg-white rounded-[28px] shadow-[0_16px_36px_rgba(13,42,77,0.07)] border border-[#E2E8F0] p-6 sm:p-8 transition-all duration-300">

            {/* Error Message Display */}
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-red-50/90 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-700 text-xs font-medium animate-fadeIn">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* OTP Toast Notification */}
            {otpToast && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-700 text-xs font-semibold animate-fadeIn">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{otpToast}</span>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* VIEW 1: LOGIN (Welcome back)                                  */}
            {/* ------------------------------------------------------------- */}
            {mode === 'login' && (
              <div>
                <h2 className="text-[28px] font-extrabold text-[#132238] tracking-tight leading-tight">
                  Welcome back
                </h2>
                <p className="text-[13px] text-[#6B7A90] mt-1.5 mb-6 font-medium leading-relaxed">
                  Sign in to continue managing bills, products, and stores.
                </p>

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        disabled={isLoading}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.g. contact@apollopharmacy.com"
                        className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-sm text-[#132238] font-medium placeholder-slate-400 focus:outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        disabled={isLoading}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-11 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-sm text-[#132238] font-medium placeholder-slate-400 focus:outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center pt-0.5">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#FF7A00] focus:ring-[#FF7A00] accent-[#FF7A00] cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-[#132238]">
                        Remember Me
                      </span>
                    </label>
                  </div>

                  {/* Primary Button: Login */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 bg-[#FF7A00] hover:bg-[#EA6C00] active:scale-[0.99] text-white font-bold rounded-2xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Logging in...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Login</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Secondary Button: Continue with OTP */}
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => switchMode('otp')}
                    className="w-full py-3 px-4 bg-white border border-[#E2E8F0] hover:bg-slate-50 active:scale-[0.99] text-[#132238] font-semibold rounded-2xl flex items-center justify-center gap-2 text-sm transition-all shadow-sm cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-slate-500" />
                    <span>Continue with OTP</span>
                  </button>

                  {/* Secondary Button: Sign Up */}
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => switchMode('signup')}
                    className="w-full py-3 px-4 bg-white border border-[#E2E8F0] hover:bg-slate-50 active:scale-[0.99] text-[#132238] font-semibold rounded-2xl flex items-center justify-center gap-2 text-sm transition-all shadow-sm cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-slate-500" />
                    <span>Sign Up</span>
                  </button>
                </form>

                {/* Quick Auto-Fill Demo Credentials */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Demo Login:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('admin@animex.com');
                      setLoginPassword('admin123');
                    }}
                    className="font-mono text-orange-600 hover:text-orange-700 font-semibold cursor-pointer underline"
                  >
                    admin@animex.com / admin123
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* VIEW 2: OTP VERIFICATION (Verify your phone)                  */}
            {/* ------------------------------------------------------------- */}
            {mode === 'otp' && (
              <div>
                <h2 className="text-[28px] font-extrabold text-[#132238] tracking-tight leading-tight">
                  Verify your phone
                </h2>
                <div className="flex items-center justify-between mt-1.5 mb-6">
                  <p className="text-[13px] text-[#6B7A90] font-medium leading-relaxed">
                    Enter the 6 digit OTP sent to{' '}
                    <span className="text-slate-800 font-semibold">{otpPhone}</span>.
                  </p>
                </div>

                {/* Optional Phone Number customizer */}
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(cleanPhoneNumber(e.target.value))}
                      placeholder="98XXXXXX89 (10 digits)"
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-[#FF7A00] font-mono"
                    />
                  </div>
                </div>

                {/* 6 OTP Digit Inputs */}
                <div className="flex items-center justify-between gap-2 sm:gap-2.5 my-5">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-13 sm:w-14 sm:h-14 text-center text-xl font-extrabold rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#132238] focus:outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 focus:bg-white shadow-sm transition-all"
                    />
                  ))}
                </div>

                {/* Resend Countdown Label */}
                <div className="flex justify-end items-center mb-3">
                  <span className="text-xs font-semibold text-[#6B7A90]">
                    {secondsLeft === 0
                      ? 'Code expired'
                      : `Resend in 00:${secondsLeft.toString().padStart(2, '0')}`}
                  </span>
                </div>

                {/* Secondary Button: Resend OTP */}
                <button
                  type="button"
                  disabled={isLoading || isResending}
                  onClick={handleResendOtp}
                  className="w-full py-3 px-4 bg-white border border-[#E2E8F0] hover:bg-slate-50 active:scale-[0.99] text-[#132238] font-semibold rounded-2xl flex items-center justify-center gap-2 text-sm transition-all shadow-sm cursor-pointer mb-3"
                >
                  <RotateCw className={`w-4 h-4 text-slate-500 ${isResending ? 'animate-spin' : ''}`} />
                  <span>Resend OTP</span>
                </button>

                {/* Primary Button: Verify */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleVerifyOtp}
                  className="w-full py-3.5 px-4 bg-[#FF7A00] hover:bg-[#EA6C00] active:scale-[0.99] text-white font-bold rounded-2xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer mb-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify</span>
                    </>
                  )}
                </button>

                {/* Link Button: Back to Login */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF7A00] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Login</span>
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* VIEW 3: REGISTER CLIENT (Sign Up)                            */}
            {/* ------------------------------------------------------------- */}
            {mode === 'signup' && (
              <div>
                <h2 className="text-[28px] font-extrabold text-[#132238] tracking-tight leading-tight">
                  Register Client
                </h2>
                <p className="text-[13px] text-[#6B7A90] mt-1.5 mb-5 font-medium leading-relaxed">
                  Set up your client profile for your pharmacy business.
                </p>

                <form onSubmit={handleSignup} className="space-y-3.5">
                  {/* Client / Firm Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Client / Firm Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Store className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        disabled={isLoading}
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. Apollo Pharmacy"
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-sm text-[#132238] font-medium placeholder-slate-400 focus:outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        disabled={isLoading}
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="e.g. contact@apollopharmacy.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-sm text-[#132238] font-medium placeholder-slate-400 focus:outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Phone Number *
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${signupPhone.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {signupPhone.length}/10 {signupPhone.length === 10 ? '✓' : ''}
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        required
                        disabled={isLoading}
                        value={signupPhone}
                        onChange={(e) => {
                          setSignupPhone(cleanPhoneNumber(e.target.value));
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="e.g. 9876543210 (10 digits)"
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-sm text-[#132238] font-medium placeholder-slate-400 focus:outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 focus:bg-white transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      City
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        disabled={isLoading}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Pune"
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-sm text-[#132238] font-medium placeholder-slate-400 focus:outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Street Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Street Address
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-0 pl-3.5 flex items-start pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <textarea
                        rows={2}
                        disabled={isLoading}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter street or landmark"
                        className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-sm text-[#132238] font-medium placeholder-slate-400 focus:outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 focus:bg-white transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Terms & Conditions Checkbox */}
                  <div className="flex items-center pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#FF7A00] focus:ring-[#FF7A00] accent-[#FF7A00] cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-[#132238]">
                        I Agree to Terms & Conditions
                      </span>
                    </label>
                  </div>

                  {/* Primary Button: Register Client */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 bg-[#FF7A00] hover:bg-[#EA6C00] active:scale-[0.99] text-white font-bold rounded-2xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Registering Client...</span>
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4" />
                          <span>Register Client</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Footer: Already registered? Login */}
                  <div className="pt-2 text-center text-sm font-medium text-[#6B7A90]">
                    <span>Already registered? </span>
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-[#FF7A00] font-bold hover:underline cursor-pointer ml-0.5"
                    >
                      Login
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>

          {/* Footer branding */}
          <p className="text-center text-xs text-[#6B7A90] mt-5 font-medium">
            Modern, premium billing UI built for ANIMEX.
          </p>
        </div>

      </div>
    </div>
  );
};
