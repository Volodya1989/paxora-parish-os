import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#111827",
          700: "#374151",
          500: "#6B7280"
        },
        mist: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB"
        }
      }
    }
  },
  plugins: []
};

export default config;
