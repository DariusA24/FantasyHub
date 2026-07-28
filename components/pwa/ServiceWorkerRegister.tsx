"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for PWA/offline support.
 * Renders nothing; runs once on mount in the browser.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Prod always; in dev only when explicitly opted in (avoids stale-cache HMR issues).
    const enabled =
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_PWA_DEV === "true";
    if (!enabled) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.error("SW registration failed:", err));
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
