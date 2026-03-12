import api from "./client";
import type { PropertyExplainabilityResponse } from "../types";

export const dssExplainApi = {
  getPropertyExplainability: async (propertyId: number): Promise<PropertyExplainabilityResponse> => {
    const res = await api.get<PropertyExplainabilityResponse>(`/dss/properties/${propertyId}/explain`);
    return res.data;
  },
};