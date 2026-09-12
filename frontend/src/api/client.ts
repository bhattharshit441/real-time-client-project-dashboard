import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// withCredentials so the HttpOnly refresh-token cookie is sent/received.
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// On 401, try one silent refresh (using the HttpOnly cookie) then retry once.
let refreshingPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshingPromise) {
          refreshingPromise = api
            .post("/auth/refresh")
            .then((r) => {
              setAccessToken(r.data.accessToken);
              return r.data.accessToken as string;
            })
            .catch(() => {
              setAccessToken(null);
              return null;
            })
            .finally(() => {
              refreshingPromise = null;
            });
        }
        const newToken = await refreshingPromise;
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch {
        // fall through to reject below
      }
    }
    return Promise.reject(error);
  }
);

export { API_URL };
