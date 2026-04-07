import { clearAccessToken, getAccessToken } from "@/api/authStorage";
import { AUTH_SESSION_EXPIRED_EVENT } from "@/modules/auth/authContext.shared";

export const API_BASE_URL = import.meta.env.DEV ? "http://localhost:8082" : (import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "");

type ApiRequestOptions = RequestInit & {
  includeJsonContentType?: boolean;
  requiresAuth?: boolean;
};

export async function apiFetch(endpoint: string, options: ApiRequestOptions = {}): Promise<Response> {
  const { includeJsonContentType = false, requiresAuth = true, headers, ...restOptions } = options;

  const token = requiresAuth ? getAccessToken() : null;
  const requestHeaders = new Headers(headers);

  if (includeJsonContentType && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: requestHeaders,
  });

  if (response.status === 401) {
    try {
      clearAccessToken();
      localStorage.removeItem("agent_user");
    } catch {
      // Ignore storage failures and continue redirect flow.
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));

      if (!window.location.hash.startsWith("#/login")) {
        window.location.hash = "/login";
      }
    }
  }

  return response;
}
