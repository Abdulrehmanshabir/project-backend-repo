import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import http from '../../services/http';

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
    const res = await http.post(import.meta.env.VITE_AUTH_LOGIN_PATH || '/auth/login', { email, password });
    const tk = res.data?.token || res.data?.accessToken;
    if (!tk) throw new Error('Token not returned');
    localStorage.setItem('accessToken', tk);
    setToken(tk);
  };

  const register = async (email, password, name) => {
    await http.post(import.meta.env.VITE_AUTH_REGISTER_PATH || '/auth/register', { email, password, name });
  };

  const logout = () => { localStorage.removeItem('accessToken'); setToken(null); setUser(null); };

  const value = useMemo(() => ({ user, token, login, register, logout }), [user, token]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(){ return useContext(AuthCtx); }
