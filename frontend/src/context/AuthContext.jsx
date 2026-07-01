import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cfm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [ready, setReady] = useState(!localStorage.getItem('cfm_token'));

  useEffect(() => {
    const token = localStorage.getItem('cfm_token');
    if (!token) return;
    api.get('/auth/me')
      .then(({ data }) => {
        localStorage.setItem('cfm_user', JSON.stringify(data.user));
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('cfm_token');
        localStorage.removeItem('cfm_user');
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('cfm_token', data.token);
    localStorage.setItem('cfm_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('cfm_token');
    localStorage.removeItem('cfm_user');
    setUser(null);
  }

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
