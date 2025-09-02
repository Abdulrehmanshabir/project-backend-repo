import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const AuthCtx = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken') || null);

  useEffect(() => {
    if (!token) return setUser(null);
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || 'e30='));
      setUser({
        id: payload?.id || payload?.sub,
        name: payload?.name,
        email: payload?.email || payload?.sub || 'user',
        role: payload?.role || 'manager',
        branches: payload?.branches || '*',
      });
    } catch { setUser({ email: 'user' }); }
  }, [token]);

  const login = async (email, password) => {
    const raw = import.meta?.env?.VITE_API_URL;
    let base = typeof raw === 'string' ? raw.trim() : '';
    if (!base || base === 'undefined' || base === 'null' || base === '/') {
      try { const ls = localStorage.getItem('apiBaseUrl'); if (ls) base = ls.trim(); } catch {}
    }
    base = base.replace(/\/+$/, '');
    const url = base ? `${base}${import.meta.env.VITE_AUTH_LOGIN_PATH || '/auth/login'}` : (import.meta.env.VITE_AUTH_LOGIN_PATH || '/auth/login');
    const res = await axios.post(url, { email, password });
    const tk = res.data?.token || res.data?.accessToken;
    if (!tk) throw new Error('Token not returned');
    localStorage.setItem('accessToken', tk);
    setToken(tk);
  };

  const register = async (email, password, name) => {
    const raw = import.meta?.env?.VITE_API_URL;
    let base = typeof raw === 'string' ? raw.trim() : '';
    if (!base || base === 'undefined' || base === 'null' || base === '/') {
      try { const ls = localStorage.getItem('apiBaseUrl'); if (ls) base = ls.trim(); } catch {}
    }
    base = base.replace(/\/+$/, '');
    const url = base ? `${base}${import.meta.env.VITE_AUTH_REGISTER_PATH || '/auth/register'}` : (import.meta.env.VITE_AUTH_REGISTER_PATH || '/auth/register');
    await axios.post(url, { email, password, name });
  };

  const logout = () => { localStorage.removeItem('accessToken'); setToken(null); setUser(null); };

  const value = useMemo(() => ({ user, token, login, register, logout }), [user, token]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(){ return useContext(AuthCtx); }
