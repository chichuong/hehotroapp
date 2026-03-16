import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { compareApi } from "../api/compare";
import type { ComparisonPropertyItem } from "../types";
import { useAuth } from "./AuthContext";

interface CompareContextValue {
  items: ComparisonPropertyItem[];
  maxItems: number;
  loading: boolean;
  isCompared: (propertyId: number) => boolean;
  refresh: () => Promise<void>;
  addToCompare: (propertyId: number) => Promise<{ ok: boolean; error?: string }>;
  removeFromCompare: (propertyId: number) => Promise<void>;
  toggleCompare: (propertyId: number) => Promise<{ added: boolean; error?: string }>;
}

const CompareContext = createContext<CompareContextValue>({
  items: [],
  maxItems: 4,
  loading: false,
  isCompared: () => false,
  refresh: async () => {},
  addToCompare: async () => ({ ok: false }),
  removeFromCompare: async () => {},
  toggleCompare: async () => ({ added: false }),
});

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { detail?: string } | undefined)?.detail || fallback;
  }
  return fallback;
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, initialized } = useAuth();
  const [items, setItems] = useState<ComparisonPropertyItem[]>([]);
  const [maxItems, setMaxItems] = useState(4);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!initialized || !isAuthenticated) {
      setItems([]);
      setMaxItems(4);
      return;
    }
    setLoading(true);
    try {
      const data = await compareApi.list();
      setItems(data.items);
      setMaxItems(data.max_items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized) return;
    refresh().catch(() => {
      setItems([]);
      setMaxItems(4);
    });
  }, [initialized, isAuthenticated]);

  const addToCompare = async (propertyId: number) => {
    if (!isAuthenticated) {
      return {
        ok: false,
        error: "Vui lòng đăng nhập để sử dụng tính năng so sánh.",
      };
    }

    try {
      const data = await compareApi.add(propertyId);
      setItems(data.items);
      setMaxItems(data.max_items);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: getErrorMessage(error, "Không thể thêm bất động sản vào danh sách so sánh."),
      };
    }
  };

  const removeFromCompare = async (propertyId: number) => {
    if (!isAuthenticated) {
      setItems([]);
      setMaxItems(4);
      return;
    }

    const data = await compareApi.remove(propertyId);
    setItems(data.items);
    setMaxItems(data.max_items);
  };

  const toggleCompare = async (propertyId: number) => {
    const existed = items.some((item) => item.property_id === propertyId);
    if (existed) {
      await removeFromCompare(propertyId);
      return { added: false };
    }
    const result = await addToCompare(propertyId);
    return { added: result.ok, error: result.error };
  };

  return (
    <CompareContext.Provider
      value={{
        items,
        maxItems,
        loading,
        isCompared: (propertyId: number) => items.some((item) => item.property_id === propertyId),
        refresh,
        addToCompare,
        removeFromCompare,
        toggleCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  return useContext(CompareContext);
}