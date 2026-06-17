import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/authApi';
import { clearAuthToken, getAuthToken, setAuthToken } from '../services/http';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authApi.me();
        if (active) {
          setUser(response.data.user as User);
        }
      } catch {
        clearAuthToken();
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await authApi.login({ username, password });
      setAuthToken(response.data.token);
      setUser(response.data.user as User);
      return { success: true };
    } catch (error) {
      clearAuthToken();
      setUser(null);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Đăng nhập thất bại.',
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAuthToken()) {
        await authApi.logout();
      }
    } catch (error) {
      console.warn('[AUTH] logout failed, clearing local session anyway', error);
    } finally {
      clearAuthToken();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
