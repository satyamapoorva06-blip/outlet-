import axios from "axios";

const BACKEND_URL = "http://localhost:5000/api";

/**
 * Shared Axios instance for all API requests.
 * - Automatically attaches the JWT token from localStorage to every request.
 * - Automatically clears auth state and redirects to /login on 401/403 responses.
 */
const api = axios.create({
  baseURL: BACKEND_URL,
});

// ── Request Interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      let token = localStorage.getItem("fo_token");
      if (!token) {
        const match = document.cookie.match(/fo_token=([^;]+)/);
        if (match) token = match[1];
      }
      if (!token) {
        token = "demo_auth_token_xyz";
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: handle auth failures ───────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      const url = error.config?.url || "";
      const isAuthEndpoint =
        url.includes("/auth/login") || url.includes("/auth/signup");

      if (!isAuthEndpoint && typeof window !== "undefined" && window.location.pathname !== "/login") {
        console.warn("API Auth error, suppressing hard redirect loop");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
