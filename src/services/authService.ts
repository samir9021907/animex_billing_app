// Authentication Service for ANIMEX BILLING APP
// Mirrors and connects to the backend API from animex_frontend

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://animex-billing-backend.onrender.com';
const TOKEN_KEY = 'animex_auth_token';
const USER_KEY = 'animex_auth_user';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  clientId?: string;
}

export interface LoginResponse {
  token: string;
  user: UserSession;
}

export const authService = {
  // Login with live API or offline demo credentials
  async login(email: string, password: string): Promise<UserSession> {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // 1. Offline / Demo Credentials Support
    if (
      (trimmedEmail === 'admin@animex.com' && trimmedPassword === 'admin123') ||
      (trimmedEmail === 'demo' && trimmedPassword === 'demo')
    ) {
      const demoUser: UserSession = {
        id: 'client-demo-01',
        name: 'Animex Animal Health Care',
        email: trimmedEmail,
        phone: '+91 98765 43210',
        city: 'Ahmedabad',
        clientId: 'client-demo-01',
      };
      this.saveSession('demo_jwt_token_animex', demoUser);
      return demoUser;
    }

    // 2. Live Backend API Request
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Invalid credentials or server error.');
      }

      const token = data.token || '';
      const clientMap = data.client || data.user || {};

      const user: UserSession = {
        id: clientMap.id || clientMap.client_id || 'user-1',
        name: clientMap.name || 'Animex User',
        email: clientMap.email || trimmedEmail,
        phone: clientMap.phone || '',
        address: clientMap.address || '',
        city: clientMap.city || '',
        clientId: clientMap.client_id || clientMap.id || '',
      };

      this.saveSession(token, user);
      return user;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Server connection timed out. Please check your internet connection.');
      }
      throw new Error(error.message || 'Login failed. Please verify your credentials.');
    }
  },

  // Client Registration / Sign Up
  async signup(params: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
  }): Promise<UserSession> {
    const trimmedName = params.name.trim();
    const trimmedEmail = params.email.trim();
    const trimmedPhone = params.phone.trim();
    const trimmedAddress = (params.address || '').trim();
    const trimmedCity = (params.city || '').trim();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          address: trimmedAddress,
          city: trimmedCity,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Registration failed.');
      }

      const token = data.token || 'reg_token_' + Date.now();
      const clientMap = data.client || data.user || {};

      const user: UserSession = {
        id: clientMap.id || clientMap.client_id || `client-${Date.now()}`,
        name: clientMap.name || trimmedName,
        email: clientMap.email || trimmedEmail,
        phone: clientMap.phone || trimmedPhone,
        address: clientMap.address || trimmedAddress,
        city: clientMap.city || trimmedCity,
        clientId: clientMap.client_id || clientMap.id || `client-${Date.now()}`,
      };

      this.saveSession(token, user);
      return user;
    } catch (error: any) {
      // Offline fallback: create local profile so users are never blocked
      console.warn('Backend signup error/offline fallback:', error.message);
      const user: UserSession = {
        id: `client-${Date.now()}`,
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        address: trimmedAddress,
        city: trimmedCity,
        clientId: `client-${Date.now()}`,
      };
      this.saveSession(`offline_jwt_${Date.now()}`, user);
      return user;
    }
  },

  // Verify OTP for phone login / verification
  async verifyOtp(phone: string, otp: string): Promise<UserSession> {
    const trimmedPhone = phone.trim() || '+91 98765 43289';
    const trimmedOtp = otp.trim();

    if (trimmedOtp.length !== 6) {
      throw new Error('Please enter a valid 6-digit verification code.');
    }

    // In UI mode or offline, accept 6-digit OTP and create/fetch session
    const user: UserSession = {
      id: `client-otp-${Date.now()}`,
      name: 'ANIMEX Verified Client',
      email: 'client@animex.com',
      phone: trimmedPhone,
      city: 'Pune',
      clientId: `client-otp-${Date.now()}`,
    };

    this.saveSession(`otp_token_${Date.now()}`, user);
    return user;
  },

  // Save session to localStorage
  saveSession(token: string, user: UserSession) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  },

  // Retrieve current logged in user
  getCurrentUser(): UserSession | null {
    try {
      const savedUser = localStorage.getItem(USER_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (savedUser && token) {
        return JSON.parse(savedUser);
      }
    } catch {}
    return null;
  },

  // Retrieve current auth token
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Logout and clear session
  logout() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  },
};
