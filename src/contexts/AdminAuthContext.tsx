import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api'

// Define the admin user type (customize as needed)
interface AdminUser {
  id: number;
  email: string;
  name?: string;
  // Add other fields as needed
}

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminUser: AdminUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

  useEffect(() => {
    if (token) {
      api.get('/api/admin/me')
        .then(res => setAdminUser(res.data))
        .catch(() => setAdminUser(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/admin/login', { email, password });
      localStorage.setItem('adminToken', res.data.token);
      const me = await api.get('/api/admin/me');
      setAdminUser(me.data);
      setLoading(false);
      return true;
    } catch (err) {
      setError('Invalid credentials');
      setAdminUser(null);
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setAdminUser(null);
  };

  return (
    <AdminAuthContext.Provider value={{ isAdminAuthenticated: !!adminUser, adminUser, login, logout, loading, error }}>
      {children}
    </AdminAuthContext.Provider>
  );
}; 