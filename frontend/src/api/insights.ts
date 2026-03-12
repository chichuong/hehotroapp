import api from "./client";
import type { MarketOverviewResponse, PriceDistributionResponse, SuburbInsightItem } from "../types";

export const insightsApi = {
  getMarketOverview: async (): Promise<MarketOverviewResponse> => {
    const res = await api.get<MarketOverviewResponse>("/insights/market-overview");
    return res.data;
  },

  getSuburbs: async (): Promise<SuburbInsightItem[]> => {
    const res = await api.get<SuburbInsightItem[]>("/insights/suburbs");
    return res.data;
  },

  getPriceDistribution: async (): Promise<PriceDistributionResponse> => {
    const res = await api.get<PriceDistributionResponse>("/insights/price-distribution");
    return res.data;
  },
};