import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBDRqlTybD5HhDbYJM_am6niTNM8C1l0jw",
  authDomain: "chatbot-dev-b08a4.firebaseapp.com",
  projectId: "chatbot-dev-b08a4",
  storageBucket: "chatbot-dev-b08a4.firebasestorage.app",
  messagingSenderId: "815886870759",
  appId: "1:815886870759:web:0712cc53b8baec95ceda42",
  measurementId: "G-SPCQZ9JYG3",
};

export const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "";

function assertFirebaseConfig() {
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(`Faltan variables de Firebase: ${missingKeys.join(", ")}`);
  }
}

export function getFirebaseApp() {
  assertFirebaseConfig();
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  const supported = await isSupported().catch(() => false);

  if (!supported) {
    return null;
  }

  return getMessaging(getFirebaseApp());
}
