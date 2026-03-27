import { AuthCredentials } from "@/modules/types";
import { apiFetch } from "@/api/apiClient";

interface LoginApiUser {
  id: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  user: LoginApiUser;
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function loginUser(credentials: AuthCredentials): Promise<LoginResponse> {
  const response = await apiFetch("/users/login", {
    method: "POST",
    includeJsonContentType: true,
    requiresAuth: false,
    body: JSON.stringify(credentials),
  });

  const data = await readJson<LoginResponse | { message?: string }>(response);

  if (!response.ok) {
    const message = data && "message" in data && typeof data.message === "string" ? data.message : "No se pudo iniciar sesion";

    throw new Error(message);
  }

  if (!data || !("access_token" in data) || !("user" in data)) {
    throw new Error("La respuesta del login no tiene el formato esperado");
  }

  return data;
}

export async function logoutUser(): Promise<void> {
  const response = await apiFetch("/users/logout", {
    method: "POST",
  });

  if (response.ok) {
    return;
  }

  const data = await readJson<{ message?: string }>(response);
  const message = data?.message && typeof data.message === "string" ? data.message : "No se pudo cerrar sesion";

  throw new Error(message);
}
