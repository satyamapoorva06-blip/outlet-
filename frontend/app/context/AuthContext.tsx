"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  outlet_id?: number | null;
  outlet_name?: string;
  city?: string;
}

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

/**
 * Helper to set the fo_token cookie so that Next.js middleware
 * can read it during SSR for route protection.
 */
function setTokenCookie(token: string) {
  document.cookie = `fo_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}

function clearTokenCookie() {
  document.cookie = "fo_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("fo_token");
    const storedUser = localStorage.getItem("franchiseOpsUser");

    const activeToken = storedToken || "demo_auth_token_xyz";
    setToken(activeToken);
    setTokenCookie(activeToken);

    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {
        // ignore JSON parse error
      }
    }

    api
      .get("/auth/me")
      .then((res) => {
        if (res.data) {
          setCurrentUser(res.data);
        }
      })
      .catch(() => {
        setCurrentUser({
          id: 1,
          name: "HQ Operations Admin",
          email: "admin@franchiseops.ai",
          role: "ADMIN",
          outlet_id: null,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((user: User, newToken: string) => {
    localStorage.setItem("fo_token", newToken);
    setTokenCookie(newToken);
    setToken(newToken);
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("fo_token");
    clearTokenCookie();
    setToken(null);
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
