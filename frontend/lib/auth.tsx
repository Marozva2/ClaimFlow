"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { AuthResponse, User } from "@/types";

const TOKEN_KEY = "claimflow_token";
const USER_KEY = "claimflow_user";

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.email === "string" &&
    typeof candidate.first_name === "string" &&
    typeof candidate.last_name === "string" &&
    typeof candidate.created_at === "string" &&
    (candidate.role === "customer" ||
      candidate.role === "claims_officer" ||
      candidate.role === "admin")
  );
}

function readSession() {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = sessionStorage.getItem(TOKEN_KEY);
  const rawUser = sessionStorage.getItem(USER_KEY);
  if (!token || !rawUser) return { token: null, user: null };
  try {
    const value: unknown = JSON.parse(rawUser);
    if (isUser(value)) {
      return { token, user: value };
    }
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
  return { token: null, user: null };
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signInWithGoogle: (credential: string) => Promise<User>;
  register: (payload: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [initialSession] = useState(readSession);
  const [token, setToken] = useState<string | null>(initialSession.token);
  const [user, setUser] = useState<User | null>(initialSession.user);
  const [ready, setReady] = useState(false);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      clearSession();
      router.replace("/login");
    };
    window.addEventListener("claimflow:unauthorized", onUnauthorized);
    return () =>
      window.removeEventListener("claimflow:unauthorized", onUnauthorized);
  }, [clearSession, router]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      auth: false,
    });
    sessionStorage.setItem(TOKEN_KEY, response.access_token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }, []);

  const signInWithGoogle = useCallback(async (credential: string) => {
    const response = await apiRequest<AuthResponse>("/api/v1/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: credential }),
      auth: false,
    });
    sessionStorage.setItem(TOKEN_KEY, response.access_token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(
    async (payload: {
      first_name: string;
      last_name: string;
      email: string;
      password: string;
    }) => {
      await apiRequest("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
        auth: false,
      });
    },
    [],
  );

  const signOut = useCallback(async () => {
    let serverLogoutFailed = false;
    try {
      if (token) {
        await apiRequest("/api/v1/auth/logout", { method: "POST" });
      }
    } catch {
      serverLogoutFailed = true;
    } finally {
      clearSession();
      router.replace(serverLogoutFailed ? "/login?logout=failed" : "/login");
    }
  }, [clearSession, router, token]);

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      signIn,
      signInWithGoogle,
      register,
      signOut,
      clearSession,
    }),
    [clearSession, ready, register, signIn, signInWithGoogle, signOut, token, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
