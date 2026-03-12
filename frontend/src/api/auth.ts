import api from "./client";
import type { TokenResponse, User } from "../types";

export const authApi = {
  register: async (data: {
    full_name: string;
    email: string;
    password: string;
  }): Promise<TokenResponse> => {
    const res = await api.post<TokenResponse>("/auth/register", data);
    return res.data;
  },

  login: async (data: {
    email: string;
    password: string;
  }): Promise<TokenResponse> => {
    const res = await api.post<TokenResponse>("/auth/login", data);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<User>("/auth/me");
    return res.data;
  },
};
