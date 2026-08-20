import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      /* R0 : le rayon monte avec la surface. 8 / 12 / 14 / 16 / 20 / 24 / 28 / 32 / pill. */
      borderRadius: {
        sm: "8px",
        DEFAULT: "12px",
        md: "12px",
        lg: "14px",
        xl: "20px",   /* la carte */
        "2xl": "24px", /* la modale */
        "3xl": "28px", /* la carte grand format */
        hero: "32px",
        full: "9999px",
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)"
        },
        status: {
          success: "#0E8177",  /* mint-600 — lisible en texte sur clair */
          warning: "#847A00",  /* le seul jaune lisible en texte */
          error: "#C93B40",    /* red-600 */
        },
        enterprise: {
          base: "var(--bg-base)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          hover: "var(--bg-hover)",
        },
        /* Rampes R0. À réserver aux moments de marque : partout ailleurs on
           passe par les alias sémantiques (bg-card, text-muted-foreground…). */
        ink: {
          50: "#E9EBF2", 100: "#DFE3EC", 200: "#C0C7D8", 300: "#9DA9C4",
          400: "#7A88A9", 500: "#536087", 600: "#33436C", 700: "#24304F",
          800: "#16233F", 850: "#101B33", 900: "#0B1226",
          DEFAULT: "#101B33",
        },
        mint: {
          50: "#E6F7F5", 100: "#D9F2EF", 200: "#B3E7E0", 300: "#8CDBD1",
          400: "#52C9BB", 500: "#17B3A6", 600: "#0E8177", 700: "#0B6159",
          800: "#07423C", 900: "#042A26",
          DEFAULT: "#17B3A6",
        },
        brand: {
          50: "#FFFCE0", 100: "#FFF9C2", 200: "#FFF285", 300: "#FFEC47",
          400: "#FFE81F", 500: "#FFE500", 600: "#E8D000", 700: "#B5A800",
          800: "#847A00", 900: "#4A4720",
          DEFAULT: "#FFE500",
          /* le SEUL jaune lisible en texte sur fond clair */
          safe: "#847A00",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      /* Aucune ombre noire : toutes sont de l'encre diluée. */
      boxShadow: {
        card: "0 12px 22px rgba(16, 27, 51, 0.08)",
        raised: "0 22px 36px rgba(16, 27, 51, 0.14)",
        overlay: "0 40px 90px rgba(16, 27, 51, 0.30)",
        brand: "0 8px 22px rgba(255, 229, 0, 0.35)",
        danger: "0 8px 22px rgba(229, 72, 77, 0.30)",
        focus: "0 0 0 3px rgba(23, 179, 166, 0.55)",
      },
      /* Une seule courbe pour toute la marque : elle démarre vite et se pose. */
      transitionTimingFunction: {
        ro: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        fast: "200ms",
        base: "350ms",
        reveal: "800ms",
      },
      letterSpacing: {
        display: "-0.03em",
        heading: "-0.02em",
        label: "0.10em",
        overline: "0.14em",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "ro-reveal": {
          from: { opacity: "0", transform: "translateY(32px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ro-reveal": "ro-reveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
