import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--bg)",
        foreground: "var(--ink)",
        surface: "var(--surface)",
        dark: {
          950: "var(--navy)",
          900: "var(--navy)",
          800: "var(--navy-2)",
          700: "var(--navy-2)",
          border: "var(--navy-2)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          100: "var(--accent-soft)",
          400: "var(--accent)",
          500: "var(--accent)",
          600: "var(--accent)",
        },
        gold: {
          DEFAULT: "var(--accent)",
          dark: "var(--accent)",
          soft: "var(--accent-soft)",
        },
        navy: {
          DEFAULT: "var(--navy)",
          light: "var(--navy-2)",
        },
        sidebar: {
          DEFAULT: "var(--navy)",
          soft: "var(--navy-2)",
        },
        border: {
          DEFAULT: "var(--line)",
          soft: "var(--line)",
          input: "var(--line-strong)",
        },
        muted: "var(--ink-3)",
        secondary: "var(--ink-2)",
        success: "var(--ok)",
        warning: "var(--warn)",
        danger: "var(--bad)",
        info: "var(--ink-2)",
        purple: "var(--ink-2)",
        titan: {
          DEFAULT: "var(--ink-2)",
          2: "var(--navy)",
          dark: "var(--navy)",
          light: "var(--line-strong)",
          soft: "var(--surface-2)",
          active: "var(--surface-2)",
        },
        line: "var(--line)",
        stat: "var(--navy-2)",
      },
      boxShadow: {
        xs: "var(--shadow)",
        sm: "var(--shadow)",
        md: "var(--shadow)",
        lg: "var(--shadow)",
        card: "var(--shadow)",
      },
      borderRadius: {
        sm: "var(--radius-control)",
        md: "var(--radius-control)",
        lg: "var(--radius-card)",
        xl: "var(--radius-sheet)",
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        sheet: "var(--radius-sheet)",
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
