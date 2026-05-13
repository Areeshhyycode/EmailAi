import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dae6ff",
          500: "#3b6cff",
          600: "#2a55e8",
          700: "#1f43c2"
        }
      }
    }
  },
  plugins: []
};

export default config;
