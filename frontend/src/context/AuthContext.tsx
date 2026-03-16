import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "../types";
import { authApi } from "../api/auth";
import { setApiAccessToken } from "../api/client";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "../utils/authStorage";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  initialized: boolean;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  initialized: false,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    clearAccessToken();
    setApiAccessToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      clearAuthState();
      setLoading(false);
      return;
    }

    setToken(accessToken);
    setApiAccessToken(accessToken);

    authApi
      .getMe()
      .then((u) => setUser(u))
      .catch(() => clearAuthState())
      .finally(() => setLoading(false));
  }, [clearAuthState]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthState();
      setLoading(false);
    };

    window.addEventListener("app:auth-unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("app:auth-unauthorized", handleUnauthorized);
    };
  }, [clearAuthState]);

  const login = (token: string, userData: User) => {
    setAccessToken(token);
    setApiAccessToken(token);
    setToken(token);
    setUser(userData);
    setLoading(false);
  };

  const logout = () => {
    clearAuthState();
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      initialized: !loading,
      loading,
      login,
      logout,
    }),
    [user, token, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
