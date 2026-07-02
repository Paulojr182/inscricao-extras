import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Usuario, Estudante } from '@/types';
import { findEstudanteById, checkSeed, ensureUsuariosExist, syncWithBackend, setAdminToken } from '@/lib/dataStore';

interface AuthContextType {
  usuario: Usuario | null;
  estudante: Estudante | null;
  login: (email: string, senha: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isAdmin: boolean;
  isEstudante: boolean;
  hasPermission: (tab: string, level?: 'read' | 'write') => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'optativas_session';
const TOKEN_KEY = 'optativas_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [estudante, setEstudante] = useState<Estudante | null>(null);

  useEffect(() => {
    const init = async () => {
      await syncWithBackend();
      await checkSeed();
      await ensureUsuariosExist();

      const saved = sessionStorage.getItem(SESSION_KEY);
      const savedToken = sessionStorage.getItem(TOKEN_KEY);

      if (saved) {
        try {
          const u = JSON.parse(saved) as Usuario;
          setUsuario(u);
          // Restore the auth token for admin users
          if (savedToken && u.tipo === 'admin') {
            setAdminToken(savedToken);
          }
          if (u.estudanteId) {
            const est = await findEstudanteById(u.estudanteId);
            setEstudante(est || null);
          }
        } catch (e) {
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(TOKEN_KEY);
        }
      }
    };
    init();
  }, []);

  const login = async (email: string, senha: string) => {
    try {
      const res = await fetch('api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const result = await res.json();

      if (!res.ok) return { success: false, message: result.message || 'Erro ao realizar login' };

      const u = result.user as Usuario;
      setUsuario(u);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));

      // Save and activate the session token for admin users
      if (result.token && u.tipo === 'admin') {
        sessionStorage.setItem(TOKEN_KEY, result.token);
        setAdminToken(result.token);
      }

      if (u.estudanteId) {
        const est = await findEstudanteById(u.estudanteId);
        setEstudante(est || null);
      }
      return { success: true, message: 'Login realizado!' };
    } catch (err) {
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  };

  const logout = async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      // Notify server to invalidate the token
      try {
        await fetch('api/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_) {}
    }
    setAdminToken(null);
    setUsuario(null);
    setEstudante(null);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  };

  const hasPermission = (tab: string, level: 'read' | 'write' = 'read') => {
    if (!usuario || usuario.tipo !== 'admin') return false;
    if (!usuario.permissoes || usuario.permissoes.includes('*')) return true;

    if (level === 'write') {
      return usuario.permissoes.includes(`${tab}:write`);
    }
    return usuario.permissoes.includes(`${tab}:read`) || usuario.permissoes.includes(`${tab}:write`);
  };

  return (
    <AuthContext.Provider value={{
      usuario,
      estudante,
      login,
      logout,
      isAdmin: usuario?.tipo === 'admin',
      isEstudante: usuario?.tipo === 'estudante',
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
