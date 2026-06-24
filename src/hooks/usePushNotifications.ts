import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseApp, getFirebaseMessaging, firebaseVapidKey } from "@/config/firebase";
import { getStoredFcmToken, registerFcmToken, setStoredFcmToken } from "@/api/notificationsApi";
import { useAuth } from "@/modules/auth/useAuth";

const FIREBASE_MESSAGING_ENABLED = (import.meta.env.VITE_ENABLE_FIREBASE_MESSAGING ?? "false") === "true";

interface ForegroundNotificationData {
  title?: string;
  body?: string;
  chatId?: string;
  conversationId?: string;
  phone?: string;
  preview?: string;
  handledBy?: string;
}

function getDeviceName() {
  if (typeof navigator === "undefined") {
    return "Web";
  }

  return navigator.userAgent.includes("Android") ? "Android Web" : navigator.userAgent.includes("Windows") ? "Windows Web" : "Web";
}

function getHandledByLabel(value?: string) {
  return value === "bot" ? "Bot" : "Humano";
}

function getNotificationAssetUrl(fileName: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}${fileName}`;
}

function buildNotificationOptions(data: ForegroundNotificationData) {
  const conversationId = data.conversationId?.trim() || data.chatId?.trim();
  const title = data.title?.trim() || data.phone?.trim() || "Nuevo mensaje";
  const preview = data.body?.trim() || data.preview?.trim() || "Tienes un mensaje nuevo";
  const handledBy = getHandledByLabel(data.handledBy);
  const body = data.handledBy ? `${preview} - ${handledBy}` : preview;

  return {
    title,
    options: {
      body,
      icon: getNotificationAssetUrl("pwa-192x192.png"),
      badge: getNotificationAssetUrl("pwa-72x72.png"),
      data: {
        conversationId,
        chatId: conversationId,
        url: conversationId ? `${window.location.origin}${import.meta.env.BASE_URL}#/conversations/${conversationId}` : `${window.location.origin}${import.meta.env.BASE_URL}#/`,
      },
      // tag: conversationId ? `conversation-${conversationId}-${Date.now()}` : undefined,
      // renotify: true,
      // requireInteraction: false,
      tag: conversationId ? `msg-${conversationId}-${Date.now()}-${Math.random().toString(36).slice(2)}` : undefined,
      renotify: true, // Solo funciona si el tag cambia entre notifs
      requireInteraction: false,
      silent: false, // Asegura que no sea silenciosa
    },
  };
}

function buildFirebaseMessagingSwUrl() {
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
    appBaseUrl: `${window.location.origin}${import.meta.env.BASE_URL}`,
  });

  return `${import.meta.env.BASE_URL}firebase-messaging-sw.js?${params.toString()}`;
}

export function usePushNotifications() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    console.log("[FCM] enabled?", FIREBASE_MESSAGING_ENABLED, "auth?", isAuthenticated);
    if (!isAuthenticated || !FIREBASE_MESSAGING_ENABLED || typeof window === "undefined") {
      return;
    }

    let unsubscribeForeground: (() => void) | undefined;
    let isCancelled = false;

    const setupPushNotifications = async () => {
      try {
        console.log("[FCM] requesting permission...");
        const permission = await window.Notification.requestPermission();
        console.log("[FCM] permission:", permission);

        if (permission !== "granted") return;

        console.log("[FCM] getting messaging...");
        const messaging = await getFirebaseMessaging();
        console.log("[FCM] messaging:", !!messaging, "vapidKey:", !!firebaseVapidKey);

        if (!messaging || !firebaseVapidKey) return;

        const swUrl = buildFirebaseMessagingSwUrl();
        console.log("[FCM] registering SW:", swUrl);

        const registration = await navigator.serviceWorker.register(swUrl, {
          scope: `${import.meta.env.BASE_URL}`,
        });
        console.log("[FCM] SW registered:", registration.scope);

        console.log("[FCM] getting token...");
        const token = await getToken(messaging, {
          vapidKey: firebaseVapidKey,
          serviceWorkerRegistration: registration,
        });
        console.log("[FCM] token:", token);
      } catch (error) {
        console.error("[FCM] setup failed", error);
      }
    };

    void setupPushNotifications();

    return () => {
      isCancelled = true;
      unsubscribeForeground?.();
    };
  }, [isAuthenticated]);
}
