import axios from "axios";

function resolveApiBaseUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // In dev, Vite proxies API routes on the same host/port (works on LAN devices too).
  if (import.meta.env.DEV) {
    return "";
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return "http://127.0.0.1:8000";
}

const baseURL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL,
  timeout: 30000,
});

// Long-running calls (re-training the ML on new data) need a wider timeout.
export const apiLong = axios.create({
  baseURL,
  timeout: 120000,
});
