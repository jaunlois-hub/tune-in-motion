import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['JetBrains Mono', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        tuner: {
          flat: "hsl(var(--tuner-flat))",
          sharp: "hsl(var(--tuner-sharp))",
          perfect: "hsl(var(--tuner-perfect))",
          glow: "hsl(var(--tuner-glow))",
          strobe: "hsl(var(--tuner-strobe))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontSize: {
        // micro (9px) is ornamental/SVG only — never for readable text (WCAG 1.4.4)
        micro: ["0.5625rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
        nano: ["0.625rem", { lineHeight: "1.1rem", letterSpacing: "0.06em" }], // 10px label floor
        caption: ["0.6875rem", { lineHeight: "1.2rem", letterSpacing: "0.04em" }], // 11px
      },
      boxShadow: {
        "glow-1": "var(--glow-1)",
        "glow-2": "var(--glow-2)",
        "glow-3": "var(--glow-3)",
        "glow-4": "var(--glow-4)",
        hero: "0 0 0 1px hsl(var(--primary)/0.3), 0 0 60px -4px hsl(var(--primary)/0.5), 0 0 120px -20px hsl(var(--primary)/0.25), 0 24px 64px -16px hsl(0 0% 0% / 0.8)",
        header: "0 1px 0 0 hsl(var(--primary)/0.15), 0 4px 24px 0 hsl(240 15% 3% / 0.8)",
        "tab-active": "0 0 10px hsl(var(--primary)/0.5), 0 0 20px hsl(var(--primary)/0.2)",
      },
      transitionTimingFunction: {
        "brand-snap": "cubic-bezier(0.2, 0, 0, 1)",
        "brand-settle": "cubic-bezier(0.4, 0, 0.2, 1)",
        "brand-glow": "cubic-bezier(0, 0, 0.2, 1)",
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
        "strobe-rotate": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "strobe-rotate": "strobe-rotate 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
