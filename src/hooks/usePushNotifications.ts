import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseApp, getFirebaseMessaging, firebaseVapidKey } from "@/config/firebase";
import { getStoredFcmToken, registerFcmToken, setStoredFcmToken } from "@/api/notificationsApi";
import { useAuth } from "@/modules/auth/useAuth";

const FIREBASE_MESSAGING_ENABLED = (import.meta.env.VITE_ENABLE_FIREBASE_MESSAGING ?? "false") === "true";

interface ForegroundNotificationData {
  conversationId?: string;
  phone?: string;
  preview?: string;
  handledBy?: string;
}

function getDeviceName() {
  if (typeof navigator === "undefined") {
    return "Web";
  }

  return navigator.userAgent.includes("Android")
    ? "Android Web"
    : navigator.userAgent.includes("Windows")
      ? "Windows Web"
      : "Web";
}

function getHandledByLabel(value?: string) {
  return value === "bot" ? "Bot" : "Humano";
}

function getNotificationAssetUrl(fileName: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}${fileName}`;
}

function buildNotificationOptions(data: ForegroundNotificationData) {
  const title = data.phone?.trim() || "Nuevo mensaje";
  const preview = data.preview?.trim() || "Tienes un mensaje nuevo";
  const handledBy = getHandledByLabel(data.handledBy);

  return {
    title,
    options: {
      body: `${preview} - ${handledBy}`,
      icon: getNotificationAssetUrl("pwa-192x192.png"),
      badge: getNotificationAssetUrl("pwa-72x72.png"),
      data: {
        conversationId: data.conversationId,
        url: data.conversationId
          ? `${window.location.origin}${import.meta.env.BASE_URL}#/conversations/${data.conversationId}`
          : `${window.location.origin}${import.meta.env.BASE_URL}#/`,
      },
      tag: data.conversationId ? `conversation-${data.conversationId}` : undefined,
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
    if (!isAuthenticated || !FIREBASE_MESSAGING_ENABLED || typeof window === "undefined") {
      return;
    }

    let unsubscribeForeground: (() => void) | undefined;
    let isCancelled = false;

    const setupPushNotifications = async () => {
      try {
        const permission = await window.Notification.requestPermission();
        console.log("[FCM] notification permission", permission);

        if (permission !== "granted") {
          console.log("[FCM] permission not granted, skipping token registration");
          return;
        }

        const messaging = await getFirebaseMessaging();
        console.log("[FCM] messaging supported", !!messaging);

        if (!messaging || !firebaseVapidKey) {
          console.log("[FCM] missing messaging instance or vapid key", {
            hasMessaging: !!messaging,
            hasVapidKey: !!firebaseVapidKey,
          });
          return;
        }

        getFirebaseApp();

        const registration = await navigator.serviceWorker.register(buildFirebaseMessagingSwUrl(), {
          scope: `${import.meta.env.BASE_URL}`,
        });
        console.log("[FCM] service worker registered", {
          scope: registration.scope,
          scriptURL: registration.active?.scriptURL ?? registration.installing?.scriptURL ?? registration.waiting?.scriptURL,
        });

        const token = await getToken(messaging, {
          vapidKey: firebaseVapidKey,
          serviceWorkerRegistration: registration,
        });
        console.log("[FCM] token result", token);

        if (!token || isCancelled) {
          console.log("[FCM] token missing or setup cancelled", {
            hasToken: !!token,
            isCancelled,
          });
          return;
        }

        const previousToken = getStoredFcmToken();
        console.log("[FCM] stored token comparison", {
          hasPreviousToken: !!previousToken,
          sameToken: previousToken === token,
        });

        if (previousToken !== token) {
          console.log("[FCM] registering token in backend");
          await registerFcmToken({
            token,
            platform: "web",
            deviceName: getDeviceName(),
            userAgent: navigator.userAgent,
          });
          console.log("[FCM] token registered successfully");

          setStoredFcmToken(token);
        } else {
          console.log("[FCM] token already registered locally, skipping backend POST");
        }

        unsubscribeForeground = onMessage(messaging, async (payload) => {
          console.log("[FCM] foreground message received", payload);
          if (window.Notification.permission !== "granted") {
            return;
          }

          const notificationData = payload.data as ForegroundNotificationData | undefined;
          const { title, options } = buildNotificationOptions(notificationData ?? {});
          const readyRegistration = await navigator.serviceWorker.ready;
          await readyRegistration.showNotification(title, options);
        });
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
