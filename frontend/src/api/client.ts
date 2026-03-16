import axios from "axios";
import { clearAccessToken, getAccessToken } from "../utils/authStorage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function setApiAccessToken(token: string | null): void {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// Attach token to requests
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

let unauthorizedEventLocked = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const hadToken = Boolean(getAccessToken());
      clearAccessToken();

      if (hadToken && !unauthorizedEventLocked) {
        unauthorizedEventLocked = true;
        window.dispatchEvent(new Event("app:auth-unauthorized"));
        window.setTimeout(() => {
          unauthorizedEventLocked = false;
        }, 500);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
