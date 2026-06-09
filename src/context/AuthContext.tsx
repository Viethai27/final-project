import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, UserRole } from '../types';
import { MOCK_USERS, DEMO_CREDENTIALS } from '../data/mockData';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginAsDemo: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('mediflow_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (username: string, password: string) => {
    const cred = DEMO_CREDENTIALS[username];
    if (!cred) return { success: false, message: 'Tài khoản không tồn tại' };
    if (cred.password !== password) return { success: false, message: 'Mật khẩu không đúng' };
    const foundUser = MOCK_USERS.find(u => u.id === cred.userId);
    if (!foundUser) return { success: false, message: 'Lỗi hệ thống' };
    setUser(foundUser);
    sessionStorage.setItem('mediflow_user', JSON.stringify(foundUser));
    return { success: true };
  }, []);

  const loginAsDemo = useCallback((role: UserRole) => {
    const roleMap: Record<UserRole, string> = {
      ADMIN: 'u1',
      RECEPTIONIST: 'u2',
      COORDINATOR: 'u3',
      DOCTOR: 'u4',
      LAB_STAFF: 'u7',
      MANAGER: 'u8',
    };
    const foundUser = MOCK_USERS.find(u => u.id === roleMap[role]);
    if (foundUser) {
      setUser(foundUser);
      sessionStorage.setItem('mediflow_user', JSON.stringify(foundUser));
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('mediflow_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, loginAsDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
