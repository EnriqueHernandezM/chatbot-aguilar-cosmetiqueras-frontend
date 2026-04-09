import { apiFetch } from "@/api/apiClient";

export const FCM_TOKEN_STORAGE_KEY = "fcm_registration_token";

interface FcmTokenPayload {
  token: string;
  platform: "web";
  deviceName: string;
  userAgent: string;
}

export function getStoredFcmToken(): string | null {
  try {
    return localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredFcmToken(token: string): void {
  try {
    localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage failures and keep app usable.
  }
}

export function clearStoredFcmToken(): void {
  try {
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures and keep logout flow running.
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function assertOk(response: Response, fallbackMessage: string) {
  if (response.ok) {
    return;
  }

  const data = await readJson<{ message?: string }>(response);
  const message = data?.message && typeof data.message === "string" ? data.message : fallbackMessage;
  throw new Error(message);
}

export async function registerFcmToken(payload: FcmTokenPayload): Promise<void> {
  const response = await apiFetch("/notifications/fcm-token", {
    method: "POST",
    includeJsonContentType: true,
    body: JSON.stringify(payload),
  });

  await assertOk(response, "No se pudo registrar el token FCM");
}

export async function deleteFcmToken(token: string): Promise<void> {
  const response = await apiFetch("/notifications/fcm-token", {
    method: "DELETE",
    includeJsonContentType: true,
    body: JSON.stringify({ token }),
  });

  await assertOk(response, "No se pudo eliminar el token FCM");
}

export async function sendTestFcmNotification(token: string): Promise<void> {
  const response = await apiFetch("/notifications/test", {
    method: "POST",
    includeJsonContentType: true,
    body: JSON.stringify({ token }),
  });

  await assertOk(response, "No se pudo enviar la notificacion de prueba");
}

export async function unregisterStoredFcmToken(): Promise<void> {
  const token = getStoredFcmToken();

  if (!token) {
    return;
  }

  try {
    await deleteFcmToken(token);
  } finally {
    clearStoredFcmToken();
  }
}
