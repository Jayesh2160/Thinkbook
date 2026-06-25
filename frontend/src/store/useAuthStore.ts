import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'Admin' | 'Project Manager' | 'Member';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: 'Admin' | 'Project Manager' | 'Member') => Promise<boolean>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

const API_URL = 'http://localhost:5000/api';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('thinkbook_token'),
  role: null,
  isAuthenticated: !!localStorage.getItem('thinkbook_token'),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('thinkbook_token', data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  register: async (name, email, password, role) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      localStorage.setItem('thinkbook_token', data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('thinkbook_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('thinkbook_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Session expired');

      set({
        user: data,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      localStorage.removeItem('thinkbook_token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
