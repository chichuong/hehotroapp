import api from "./client";
import type {
  AdminDataStatusResponse,
  AdminModelStatusResponse,
  AdminSystemSummaryResponse,
} from "../types";

export const adminApi = {
  getModelStatus: async (): Promise<AdminModelStatusResponse> => {
    const res = await api.get<AdminModelStatusResponse>("/admin/models/status");
    return res.data;
  },

  getDataStatus: async (): Promise<AdminDataStatusResponse> => {
    const res = await api.get<AdminDataStatusResponse>("/admin/data/status");
    return res.data;
  },

  getSystemSummary: async (): Promise<AdminSystemSummaryResponse> => {
    const res = await api.get<AdminSystemSummaryResponse>("/admin/system/summary");
    return res.data;
  },
};