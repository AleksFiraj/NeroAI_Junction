/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B1220",
        card: "#151E2F",
        accent: "#3BA8FF",
        safe: "#22C55E",
        warning: "#F59E0B",
        critical: "#EF4444",
      },
      boxShadow: {
        glow: "0 0 18px rgba(59, 168, 255, 0.35)",
      },
    },
  },
  plugins: [],
};
