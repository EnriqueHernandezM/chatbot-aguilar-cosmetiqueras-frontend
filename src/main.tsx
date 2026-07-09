import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// TEMP ENV DEBUG: remove this block after checking GitHub Actions/Vite env values.
console.table({
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  BASE_URL: import.meta.env.BASE_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  VITE_CLOUDINARY_UPLOAD_PRESET: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  VITE_CLOUDINARY_FOLDER: import.meta.env.VITE_CLOUDINARY_FOLDER,
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_VAPID_KEY: import.meta.env.VITE_FIREBASE_VAPID_KEY,
  VITE_ENABLE_FIREBASE_MESSAGING: import.meta.env.VITE_ENABLE_FIREBASE_MESSAGING,
});
// END TEMP ENV DEBUG

createRoot(document.getElementById("root")!).render(<App />);
