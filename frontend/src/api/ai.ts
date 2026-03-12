import api from "./client";
import type {
  ModelListResponse,
  ModelVersion,
  TrainRequest,
  TrainResponse,
  ValuationResponse,
  AIHealthResponse,
} from "../types";

export const aiApi = {
  // --- Health ---
  health: async (): Promise<AIHealthResponse> => {
    const res = await api.get<AIHealthResponse>("/ai/health");
    return res.data;
  },

  // --- Models ---
  listModels: async (): Promise<ModelListResponse> => {
    const res = await api.get<ModelListResponse>("/ai/models");
    return res.data;
  },

  activateModel: async (modelId: number): Promise<ModelVersion> => {
    const res = await api.post<ModelVersion>(`/ai/models/${modelId}/activate`);
    return res.data;
  },

  // --- Training ---
  train: async (params?: TrainRequest): Promise<TrainResponse> => {
    const res = await api.post<TrainResponse>("/ai/train", params || {});
    return res.data;
  },

  // --- Valuation ---
  getValuation: async (propertyId: number): Promise<ValuationResponse> => {
    const res = await api.get<ValuationResponse>(
      `/ai/properties/${propertyId}/valuation`
    );
    return res.data;
  },

  computeValuation: async (propertyId: number): Promise<ValuationResponse> => {
    const res = await api.post<ValuationResponse>(
      `/ai/properties/${propertyId}/valuation`
    );
    return res.data;
  },
};
