import api from "./client";
import type { ComparisonListResponse } from "../types";

export const compareApi = {
  list: async (): Promise<ComparisonListResponse> => {
    const res = await api.get<ComparisonListResponse>("/compare");
    return res.data;
  },

  add: async (propertyId: number): Promise<ComparisonListResponse> => {
    const res = await api.post<ComparisonListResponse>("/compare", {
      property_id: propertyId,
    });
    return res.data;
  },

  remove: async (propertyId: number): Promise<ComparisonListResponse> => {
    const res = await api.delete<ComparisonListResponse>(`/compare/${propertyId}`);
    return res.data;
  },
};