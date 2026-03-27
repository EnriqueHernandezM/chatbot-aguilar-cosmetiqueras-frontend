import { getAccessToken } from "@/api/authStorage";

export const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

type ApiRequestOptions = RequestInit & {
  includeJsonContentType?: boolean;
  requiresAuth?: boolean;
};

export async function apiFetch(endpoint: string, options: ApiRequestOptions = {}): Promise<Response> {
  const {
    includeJsonContentType = false,
    requiresAuth = true,
    headers,
    ...restOptions
  } = options;

  const token = requiresAuth ? getAccessToken() : null;
  const requestHeaders = new Headers(headers);

  if (includeJsonContentType && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: requestHeaders,
  });
}
