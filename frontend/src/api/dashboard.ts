import api from "./client";
import type { UserDashboardInsightsResponse, UserDashboardSummaryResponse } from "../types";

export const dashboardApi = {
  getSummary: async (): Promise<UserDashboardSummaryResponse> => {
    const res = await api.get<UserDashboardSummaryResponse>("/dashboard/user-summary");
    return res.data;
  },

  getInsights: async (): Promise<UserDashboardInsightsResponse> => {
    const res = await api.get<UserDashboardInsightsResponse>("/dashboard/user-insights");
    return res.data;
  },
};