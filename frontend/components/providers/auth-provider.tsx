"use client";

import * as React from "react";
import { apiClient, type ApiResponse } from "@/lib/axios";

type User = {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setToken: (token: string | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  const refresh = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<ApiResponse<User>>("/api/v1/user", { withCredentials: true });
      const fetchedUser = res.data?.data ?? null;
      setUser(fetchedUser);
      // token is cookie-based; keep token state as presence indicator
      setToken(fetchedUser ? "cookie" : null);
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = React.useCallback(async () => {
    try {
      // Clear cookie by calling a server logout when available; until then, best-effort client clear
      // If server lacks logout, we can expire cookie by setting past date via fetch to server domain.
    } finally {
      setUser(null);
      setToken(null);
    }
  }, []);

  const value: AuthContextValue = React.useMemo(() => ({ user, token, loading, refresh, setToken, signOut }), [user, token, loading, refresh, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};


