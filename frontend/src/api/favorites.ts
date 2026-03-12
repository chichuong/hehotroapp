import api from "./client";
import type {
  FavoriteResponse,
  FavoriteCheckResponse,
  PropertyListItem,
} from "../types";

export const favoritesApi = {
  add: async (propertyId: number): Promise<FavoriteResponse> => {
    const res = await api.post<FavoriteResponse>(`/favorites/${propertyId}`);
    return res.data;
  },

  remove: async (propertyId: number): Promise<FavoriteResponse> => {
    const res = await api.delete<FavoriteResponse>(`/favorites/${propertyId}`);
    return res.data;
  },

  check: async (propertyId: number): Promise<FavoriteCheckResponse> => {
    const res = await api.get<FavoriteCheckResponse>(`/favorites/check/${propertyId}`);
    return res.data;
  },

  list: async (): Promise<PropertyListItem[]> => {
    const res = await api.get<PropertyListItem[]>("/favorites");
    return res.data;
  },
};
