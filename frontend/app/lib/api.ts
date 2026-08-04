import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
      const token = localStorage.getItem("fo_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
      // Skip auto-redirect for auth endpoints (login/signup) — those handle
      // their own error display so the user sees "Invalid credentials" etc.
      const url = error.config?.url || "";
      const isAuthEndpoint =
        url.includes("/auth/login") || url.includes("/auth/signup");

      if (!isAuthEndpoint && typeof window !== "undefined") {
        localStorage.removeItem("fo_token");
        document.cookie =
          "fo_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
