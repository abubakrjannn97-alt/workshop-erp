import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        titan: {
          DEFAULT: "var(--titan)",
          2: "var(--titan-2)",
          dark: "var(--titan-dark)",
          light: "var(--titan-light)",
          soft: "var(--titan-soft)",
          active: "var(--titan-active)",
        },
        line: "var(--line)",
        muted: "var(--muted)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
      },
      spacing: {
        sidebar: "var(--sidebar-w)",
        "sidebar-collapsed": "var(--sidebar-collapsed)",
      },
    },
  },
  plugins: [],
};

export default config;
