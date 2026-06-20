import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL,
  timeout: 30000,
});

// Long-running calls (re-training the ML on new data) need a wider timeout.
export const apiLong = axios.create({
  baseURL,
  timeout: 120000,
});
