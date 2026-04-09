/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey") ?? "",
  authDomain: params.get("authDomain") ?? "",
  projectId: params.get("projectId") ?? "",
  storageBucket: params.get("storageBucket") ?? "",
  messagingSenderId: params.get("messagingSenderId") ?? "",
  appId: params.get("appId") ?? "",
});

const messaging = firebase.messaging();
const appBaseUrl = params.get("appBaseUrl") ?? self.location.origin;
const assetBaseUrl = new URL("./", appBaseUrl).toString();
const RECENT_NOTIFICATION_WINDOW_MS = 4000;
let lastNotificationFingerprint = "";
let lastNotificationTimestamp = 0;

function getHandledByLabel(value) {
  return value === "bot" ? "Bot" : "Humano";
}

function getConversationId(data = {}) {
  return data.conversationId || data.chatId;
}

function getNotificationBody(preview, handledBy) {
  return handledBy ? `${preview} - ${handledBy}` : preview;
}

function buildNotificationUrl(conversationId) {
  return conversationId ? `${appBaseUrl}#/conversations/${conversationId}` : `${appBaseUrl}#/`;
}

function buildNotificationOptions({ preview, handledBy, conversationId, url }) {
  return {
    body: getNotificationBody(preview, handledBy),
    icon: `${assetBaseUrl}pwa-192x192.png`,
    badge: `${assetBaseUrl}pwa-72x72.png`,
    data: {
      url,
      conversationId,
      chatId: conversationId,
    },
    tag: conversationId ? `conversation-${conversationId}` : undefined,
  };
}

function shouldSkipDuplicateNotification({ title, preview, conversationId }) {
  const fingerprint = [title, preview, conversationId].filter(Boolean).join("|");
  const now = Date.now();

  if (
    fingerprint &&
    fingerprint === lastNotificationFingerprint &&
    now - lastNotificationTimestamp < RECENT_NOTIFICATION_WINDOW_MS
  ) {
    return true;
  }

  lastNotificationFingerprint = fingerprint;
  lastNotificationTimestamp = now;
  return false;
}

function showAppNotification({ title, preview, handledBy, conversationId }) {
  if (shouldSkipDuplicateNotification({ title, preview, conversationId })) {
    return Promise.resolve();
  }

  const url = buildNotificationUrl(conversationId);

  return self.registration.showNotification(
    title,
    buildNotificationOptions({ title, preview, handledBy, conversationId, url }),
  );
}

function normalizeNotificationPayload(data = {}, notification = {}) {
  const title = data.title || data.phone || notification.title || "Nuevo mensaje";
  const preview = data.body || data.preview || notification.body || "Tienes un mensaje nuevo";
  const handledBy = data.handledBy ? getHandledByLabel(data.handledBy) : "";
  const conversationId = getConversationId(data);

  return {
    title,
    preview,
    handledBy,
    conversationId,
  };
}

messaging.onBackgroundMessage((payload) => {
  const normalizedPayload = normalizeNotificationPayload(payload?.data ?? {}, payload?.notification ?? {});
  void showAppNotification(normalizedPayload);
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload;

  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const normalizedPayload = normalizeNotificationPayload(payload?.data ?? payload ?? {}, payload?.notification ?? {});

  event.waitUntil(showAppNotification(normalizedPayload));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const conversationId = event.notification?.data?.conversationId || event.notification?.data?.chatId;
  const targetUrl = event.notification?.data?.url || buildNotificationUrl(conversationId);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return Promise.resolve();
    }),
  );
});
