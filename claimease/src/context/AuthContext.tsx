/**
 * AuthContext — stores the current user + JWT token, persists to localStorage.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  ckyc?: string;
  aadhaarLast4?: string;
  pan?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  nomineePhone?: string;
  memberTier?: string;
  digilockerSynced?: boolean;
  mparivahanSynced?: boolean;
  abhaSynced?: boolean;
  nicrSynced?: boolean;
  isActive: boolean;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'claimease_token';
const USER_KEY  = 'claimease_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser  = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {}
    }
    setIsLoading(false);
  }, []);

  const persist = (t: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed. Please check your credentials.');
    }
    const data = await res.json();
    persist(data.access_token, data.user);
  };

  const demoLogin = async () => {
    const res = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Demo login failed. Please try again.');
    }
    const data = await res.json();
    persist(data.access_token, data.user);
  };

  const register = async (email: string, password: string, fullName: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed. Please try again.');
    }
    const data = await res.json();
    persist(data.access_token, data.user);
  };

  const updateProfile = async (updates: Partial<AuthUser>): Promise<AuthUser> => {
    const currentToken = token || localStorage.getItem(TOKEN_KEY);
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {})
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update profile.');
    }
    const updatedUser: AuthUser = await res.json();
    if (currentToken) {
      persist(currentToken, updatedUser);
    } else {
      setUser(updatedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    }
    return updatedUser;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, demoLogin, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
