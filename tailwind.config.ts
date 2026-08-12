import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f4f6f8",
        foreground: "#0f172a",
      },
    },
  },
  plugins: [],
};

export default config;
