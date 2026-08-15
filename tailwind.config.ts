import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-text-primary)",
        surface: "var(--color-surface)",
        dark: {
          950: "var(--dark-950)",
          900: "var(--dark-900)",
          800: "var(--dark-800)",
          700: "var(--dark-700)",
          border: "var(--dark-border)",
        },
        accent: {
          DEFAULT: "var(--accent-500)",
          100: "var(--accent-100)",
          400: "var(--accent-400)",
          500: "var(--accent-500)",
          600: "var(--accent-600)",
        },
        gold: {
          DEFAULT: "var(--color-gold)",
          dark: "var(--color-gold-dark)",
          soft: "var(--color-gold-soft)",
        },
        navy: {
          DEFAULT: "var(--color-navy)",
          light: "var(--color-navy-light)",
        },
        sidebar: {
          DEFAULT: "var(--color-sidebar)",
          soft: "var(--color-sidebar-soft)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          soft: "var(--color-border-soft)",
          input: "var(--color-border-input)",
        },
        muted: "var(--color-text-muted)",
        secondary: "var(--color-text-secondary)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
        purple: "var(--color-purple)",
        titan: {
          DEFAULT: "var(--titan)",
          2: "var(--titan-2)",
          dark: "var(--titan-dark)",
          light: "var(--titan-light)",
          soft: "var(--titan-soft)",
          active: "var(--titan-active)",
        },
        line: "var(--color-border)",
        stat: "var(--color-sidebar-soft)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        card: "var(--shadow-card)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      spacing: {
        sidebar: "var(--sidebar-w)",
        "sidebar-collapsed": "var(--sidebar-collapsed)",
      },
      transitionDuration: {
        DEFAULT: "160ms",
      },
    },
  },
  plugins: [],
};

export default config;
