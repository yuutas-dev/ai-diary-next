import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx,js,jsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-zen-maru)",
          ...(Array.isArray(defaultTheme.fontFamily?.sans)
            ? defaultTheme.fontFamily.sans
            : ["ui-sans-serif", "system-ui", "sans-serif"]),
        ],
      },
    },
  },
};

export default config;
