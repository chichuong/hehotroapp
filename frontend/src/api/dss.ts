import api from "./client";
import type {
  UserProfile,
  UserProfileInput,
  DSSCriteria,
  CriteriaPreferencesResponse,
  CriteriaPreferenceInput,
  PropertyFitResponse,
  AHPMatrixEntry,
  AHPMatrixResponse,
  AHPWeightsResponse,
  AHPConsistencyResponse,
  PropertyAHPScoreResponse,
  RankingResponse,
  PropertyDSSScoreResponse,
  RecommendationsResponse,
  RecommendationRefreshResponse,
  RecommendationsSummaryResponse,
  RecommendationFilters,
} from "../types";

export const dssApi = {
  // --- Profile ---
  getProfile: async (): Promise<UserProfile> => {
    const res = await api.get<UserProfile>("/dss/profile");
    return res.data;
  },

  createProfile: async (data: UserProfileInput): Promise<UserProfile> => {
    const res = await api.post<UserProfile>("/dss/profile", data);
    return res.data;
  },

  updateProfile: async (data: UserProfileInput): Promise<UserProfile> => {
    const res = await api.put<UserProfile>("/dss/profile", data);
    return res.data;
  },

  // --- Criteria ---
  getCriteria: async (): Promise<DSSCriteria[]> => {
    const res = await api.get<DSSCriteria[]>("/dss/criteria");
    return res.data;
  },

  // --- Preferences ---
  getPreferences: async (): Promise<CriteriaPreferencesResponse> => {
    const res = await api.get<CriteriaPreferencesResponse>("/dss/preferences");
    return res.data;
  },

  updatePreferences: async (
    preferences: CriteriaPreferenceInput[]
  ): Promise<CriteriaPreferencesResponse> => {
    const res = await api.put<CriteriaPreferencesResponse>("/dss/preferences", {
      preferences,
    });
    return res.data;
  },

  // --- Property Fit ---
  getPropertyFit: async (propertyId: number): Promise<PropertyFitResponse> => {
    const res = await api.get<PropertyFitResponse>(
      `/dss/properties/${propertyId}/fit`
    );
    return res.data;
  },

  // --- AHP Matrix ---
  getAHPMatrix: async (): Promise<AHPMatrixResponse> => {
    const res = await api.get<AHPMatrixResponse>("/dss/ahp/matrix");
    return res.data;
  },

  saveAHPMatrix: async (entries: AHPMatrixEntry[]): Promise<AHPMatrixResponse> => {
    const res = await api.post<AHPMatrixResponse>("/dss/ahp/matrix", { entries });
    return res.data;
  },

  updateAHPMatrix: async (entries: AHPMatrixEntry[]): Promise<AHPMatrixResponse> => {
    const res = await api.put<AHPMatrixResponse>("/dss/ahp/matrix", { entries });
    return res.data;
  },

  // --- AHP Weights ---
  getAHPWeights: async (): Promise<AHPWeightsResponse> => {
    const res = await api.get<AHPWeightsResponse>("/dss/ahp/weights");
    return res.data;
  },

  // --- AHP Consistency ---
  getAHPConsistency: async (): Promise<AHPConsistencyResponse> => {
    const res = await api.get<AHPConsistencyResponse>("/dss/ahp/consistency");
    return res.data;
  },

  // --- Property AHP Score ---
  getPropertyAHPScore: async (propertyId: number): Promise<PropertyAHPScoreResponse> => {
    const res = await api.get<PropertyAHPScoreResponse>(
      `/dss/properties/${propertyId}/ahp-score`
    );
    return res.data;
  },

  // --- Ranking ---
  getRanking: async (params?: {
    limit?: number;
    suburb?: string;
    min_price?: number;
    max_price?: number;
  }): Promise<RankingResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append("limit", String(params.limit));
    if (params?.suburb) searchParams.append("suburb", params.suburb);
    if (params?.min_price != null) searchParams.append("min_price", String(params.min_price));
    if (params?.max_price != null) searchParams.append("max_price", String(params.max_price));
    const res = await api.get<RankingResponse>(`/dss/ranking?${searchParams.toString()}`);
    return res.data;
  },

  // --- Phase 6: DSS Final Score ---
  getPropertyFinalScore: async (propertyId: number): Promise<PropertyDSSScoreResponse> => {
    const res = await api.get<PropertyDSSScoreResponse>(
      `/dss/properties/${propertyId}/final-score`
    );
    return res.data;
  },

  // --- Phase 6: Recommendations ---
  getRecommendations: async (
    filters: RecommendationFilters = {}
  ): Promise<RecommendationsResponse> => {
    const params = new URLSearchParams();
    if (filters.page) params.append("page", String(filters.page));
    if (filters.page_size) params.append("page_size", String(filters.page_size));
    if (filters.suburb) params.append("suburb", filters.suburb);
    if (filters.min_price != null) params.append("min_price", String(filters.min_price));
    if (filters.max_price != null) params.append("max_price", String(filters.max_price));
    if (filters.property_type) params.append("property_type", filters.property_type);
    const res = await api.get<RecommendationsResponse>(
      `/dss/recommendations?${params.toString()}`
    );
    return res.data;
  },

  refreshRecommendations: async (): Promise<RecommendationRefreshResponse> => {
    const res = await api.post<RecommendationRefreshResponse>(
      "/dss/recommendations/refresh"
    );
    return res.data;
  },

  getRecommendationsSummary: async (): Promise<RecommendationsSummaryResponse> => {
    const res = await api.get<RecommendationsSummaryResponse>(
      "/dss/recommendations/summary"
    );
    return res.data;
  },
};
