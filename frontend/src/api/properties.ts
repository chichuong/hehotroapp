import api from "./client";
import type {
  PropertyListResponse,
  PropertyDetail,
  PropertyFilters,
  PropertyMapResponse,
  PropertyListItem,
} from "../types";

export const propertyApi = {
  list: async (filters: PropertyFilters = {}): Promise<PropertyListResponse> => {
    const params = new URLSearchParams();
    if (filters.page) params.append("page", String(filters.page));
    if (filters.page_size) params.append("page_size", String(filters.page_size));
    if (filters.search) params.append("search", filters.search);
    if (filters.suburb) params.append("suburb", filters.suburb);
    if (filters.min_price != null) params.append("min_price", String(filters.min_price));
    if (filters.max_price != null) params.append("max_price", String(filters.max_price));
    if (filters.min_rooms != null) params.append("min_rooms", String(filters.min_rooms));
    if (filters.max_rooms != null) params.append("max_rooms", String(filters.max_rooms));
    if (filters.min_bedrooms != null) params.append("min_bedrooms", String(filters.min_bedrooms));
    if (filters.min_bathrooms != null) params.append("min_bathrooms", String(filters.min_bathrooms));
    if (filters.min_cars != null) params.append("min_cars", String(filters.min_cars));
    if (filters.property_type) params.append("property_type", filters.property_type);
    if (filters.min_year_built != null) params.append("min_year_built", String(filters.min_year_built));
    if (filters.max_year_built != null) params.append("max_year_built", String(filters.max_year_built));
    if (filters.sort_by) params.append("sort_by", filters.sort_by);
    if (filters.sort_order) params.append("sort_order", filters.sort_order);
    if (filters.view) params.append("view", filters.view);
    if (filters.include_fit) params.append("include_fit", "true");
    if (filters.include_valuation) params.append("include_valuation", "true");
    if (filters.include_dss) params.append("include_dss", "true");

    const res = await api.get<PropertyListResponse>(`/properties?${params.toString()}`);
    return res.data;
  },

  listMap: async (filters: PropertyFilters = {}): Promise<PropertyMapResponse> => {
    const params = new URLSearchParams();
    params.append("view", "map");
    if (filters.search) params.append("search", filters.search);
    if (filters.suburb) params.append("suburb", filters.suburb);
    if (filters.min_price != null) params.append("min_price", String(filters.min_price));
    if (filters.max_price != null) params.append("max_price", String(filters.max_price));
    if (filters.property_type) params.append("property_type", filters.property_type);

    const res = await api.get<PropertyMapResponse>(`/properties?${params.toString()}`);
    return res.data;
  },

  getById: async (id: number): Promise<PropertyDetail> => {
    const res = await api.get<PropertyDetail>(`/properties/${id}`);
    return res.data;
  },

  getRelated: async (id: number, limit = 6): Promise<PropertyListItem[]> => {
    const res = await api.get<PropertyListItem[]>(`/properties/${id}/related?limit=${limit}`);
    return res.data;
  },

  getSuburbs: async (): Promise<string[]> => {
    const res = await api.get<string[]>("/properties/suburbs");
    return res.data;
  },

  getTypes: async (): Promise<string[]> => {
    const res = await api.get<string[]>("/properties/types");
    return res.data;
  },
};
