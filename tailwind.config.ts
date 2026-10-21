import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { default: "1rem", md: "2rem", xl: "3rem" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        canvas: "rgb(var(--canvas))",
        surface: "rgb(var(--surface))",
        "surface-muted": "rgb(var(--surface-muted))",
        "surface-sunken": "rgb(var(--surface-sunken))",
        ink: "rgb(var(--ink))",
        "ink-muted": "rgb(var(--ink-muted))",
        "ink-subtle": "rgb(var(--ink-subtle))",
        primary: {
          DEFAULT: "rgb(var(--primary))",
          hover: "rgb(var(--primary-hover))",
          active: "rgb(var(--primary-active))",
          wash: "rgb(var(--primary-wash))",
          soft: "rgb(var(--primary-soft))",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary))",
          container: "rgb(var(--secondary-container))",
        },
        success: {
          DEFAULT: "rgb(var(--success))",
          wash: "rgb(var(--success-wash))",
        },
        warning: {
          DEFAULT: "rgb(var(--warning))",
          wash: "rgb(var(--warning-wash))",
        },
        danger: {
          DEFAULT: "rgb(var(--danger))",
          wash: "rgb(var(--danger-wash))",
        },
        line: {
          DEFAULT: "rgb(var(--border))",
          strong: "rgb(var(--border-strong))",
        },
      },
      fontFamily: {
        jakarta: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "9999px",
      },
      boxShadow: {
        card:
          "0 10px 25px -5px rgba(17,24,39,0.06), 0 8px 10px -6px rgba(17,24,39,0.04)",
        lift: "0 25px 50px -12px rgba(17,24,39,0.18)",
        glow: "0 4px 14px 0 rgba(220,38,38,0.39)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.82)", opacity: "0.55" },
          "70%": { transform: "scale(1.25)", opacity: "0" },
          "100%": { transform: "scale(1.25)", opacity: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite",
        "fade-up": "fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "spin-slow": "spin-slow 9s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
