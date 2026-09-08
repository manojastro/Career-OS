import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c2230",
        paper: "#faf9f6",
        accent: "#2f6f5e",
        accentSoft: "#e4efe9",
        warn: "#a15b1f",
        warnSoft: "#f6ead9",
        danger: "#b3402f",
        dangerSoft: "#f7e6e2",
        muted: "#6b7280",
        line: "#e4e2dc",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
