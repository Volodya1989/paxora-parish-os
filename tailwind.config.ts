import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
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
      }
    }
  },
  plugins: []
};

export default config;
