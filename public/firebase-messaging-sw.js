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

function getHandledByLabel(value) {
  return value === "human" ? "Humano" : "Bot";
}

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data ?? {};
  const title = data.phone || payload?.notification?.title || "Nuevo mensaje";
  const preview = data.preview || payload?.notification?.body || "Tienes un mensaje nuevo";
  const handledBy = getHandledByLabel(data.handledBy);
  const conversationId = data.conversationId;
  const url = conversationId ? `${appBaseUrl}#/conversations/${conversationId}` : `${appBaseUrl}#/`;

  self.registration.showNotification(title, {
    body: `${preview} - ${handledBy}`,
    data: {
      url,
      conversationId,
    },
    tag: conversationId ? `conversation-${conversationId}` : undefined,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || `${appBaseUrl}#/`;

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
