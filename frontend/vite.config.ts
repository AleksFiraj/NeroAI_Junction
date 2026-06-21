import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API_PREFIXES = [
  "/customers",
  "/customer",
  "/dashboard",
  "/heatmap",
  "/risk",
  "/generate-dataset",
  "/analyze",
  "/ai-explanation",
  "/ai",
  "/consumption",
  "/advance-month",
  "/bulk-upload",
  "/train-model",
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8000";

  const proxy = Object.fromEntries(
    API_PREFIXES.map((prefix) => [
      prefix,
      { target: apiTarget, changeOrigin: true },
    ]),
  );

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      proxy,
    },
    preview: {
      host: true,
      port: 4173,
    },
  };
});
