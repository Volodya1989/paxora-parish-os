import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  // Include lib so theme token maps (e.g. sectionTheme) contribute utility classes.
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: colors.stone[900],
          700: colors.stone[700],
          500: colors.stone[500],
          400: colors.stone[400]
        },
        mist: {
          50: colors.stone[50],
          100: colors.stone[100],
          200: colors.stone[200]
        },
        primary: colors.emerald,
        accent: colors.amber
      },
      borderRadius: {
        card: "0.75rem",
        button: "0.5rem"
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.06)",
        overlay: "0 10px 25px -5px rgb(15 23 42 / 0.2)"
      },
      keyframes: {
        "chat-message-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "context-menu-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        "chat-fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        }
      },
      animation: {
        "chat-message-in": "chat-message-in 0.2s ease-out both",
        "context-menu-in": "context-menu-in 0.15s ease-out both",
        "chat-fade-in": "chat-fade-in 0.3s ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
