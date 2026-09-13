
import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// Axios API client
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

// Access token is kept only in memory
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// Add access token to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Only one refresh request at a time
let refreshingPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshingPromise) {
    refreshingPromise = api
      .post("/auth/refresh")
      .then((response) => {
        const token = response.data?.accessToken;

        if (!token) {
          setAccessToken(null);
          return null;
        }

        setAccessToken(token);

        return token;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshingPromise = null;
      });
  }

  return refreshingPromise;
}

// Handle API responses
api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & {
          _retry?: boolean;
        })
      | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    // Do NOT refresh if the refresh endpoint itself returns 401
    const isRefreshRequest =
      originalRequest.url?.includes("/auth/refresh");

    if (
      status === 401 &&
      !originalRequest._retry &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;

      const newToken = await refreshAccessToken();

      if (newToken) {
        originalRequest.headers.Authorization =
          `Bearer ${newToken}`;

        return api(originalRequest);
      }

      setAccessToken(null);
    }

    return Promise.reject(error);
  }
);

export { API_URL };

