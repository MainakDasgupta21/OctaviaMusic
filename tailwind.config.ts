import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        // Roboto is the single typeface for the whole app. All of these
        // aliases resolve to Roboto so existing `font-display`, `font-headline`,
        // `font-editorial`, `font-outfit` usages keep working.
        sans: [
          "Roboto",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        headline: [
          "Roboto",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "Roboto",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        editorial: [
          "Roboto",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "Roboto Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        outfit: [
          "Roboto",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        // Fluid editorial type scale — clamped, mobile-friendly,
        // magazine-grade negative tracking that grows with size.
        "display-2xl": ["clamp(3.5rem, 8vw, 7rem)",   { lineHeight: "0.88", letterSpacing: "-0.032em" }],
        "display-xl":  ["clamp(3rem, 6vw, 5.5rem)",   { lineHeight: "0.90", letterSpacing: "-0.028em" }],
        "display-lg":  ["clamp(2.25rem, 4.5vw, 4rem)",{ lineHeight: "0.96", letterSpacing: "-0.022em" }],
        "display-md":  ["clamp(1.75rem, 3vw, 2.5rem)",{ lineHeight: "1.06", letterSpacing: "-0.018em" }],
        "display-sm":  ["clamp(1.375rem, 2.4vw, 1.75rem)", { lineHeight: "1.12", letterSpacing: "-0.014em" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        "tighter-1": "-0.015em",
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
        sidebar: {
          bg: "hsl(var(--sidebar-bg))",
          active: "hsl(var(--sidebar-active))",
        },
        // Semantic surfaces / ink (use these in new components).
        surface: {
          0: "hsl(var(--surface-0))",
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
          4: "hsl(var(--surface-4))",
        },
        ink: {
          DEFAULT: "hsl(var(--ink-primary))",
          2: "hsl(var(--ink-secondary))",
          3: "hsl(var(--ink-tertiary))",
          4: "hsl(var(--ink-quaternary))",
        },
        brand: {
          50:  "hsl(var(--brand-50))",
          100: "hsl(var(--brand-100))",
          200: "hsl(var(--brand-200))",
          300: "hsl(var(--brand-300))",
          400: "hsl(var(--brand-400))",
          500: "hsl(var(--brand-500))",
          600: "hsl(var(--brand-600))",
          700: "hsl(var(--brand-700))",
          800: "hsl(var(--brand-800))",
          900: "hsl(var(--brand-900))",
        },
        track: {
          DEFAULT: "hsl(var(--track-accent))",
          strong: "hsl(var(--track-accent-strong))",
          fg: "hsl(var(--track-accent-foreground))",
        },
        ember: {
          DEFAULT: "hsl(var(--brand-500))",
          strong: "hsl(var(--brand-600))",
        },
        oxblood: {
          DEFAULT: "hsl(var(--oxblood))",
          strong: "hsl(var(--oxblood-strong))",
        },
        bone: "hsl(var(--bone))",
        // Gen Z "play" layer — counter-hues for chips, eyebrows, holo edges.
        "accent-2": "hsl(var(--accent-2))",
        lime: "hsl(var(--accent-lime))",
        violet: "hsl(var(--accent-violet))",
        pink: "hsl(var(--accent-pink))",
        iris: {
          a: "hsl(var(--accent-iris-a))",
          b: "hsl(var(--accent-iris-b))",
          c: "hsl(var(--accent-iris-c))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        info: "hsl(var(--info))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        sharp: "var(--radius-sharp)",
        soft: "var(--radius-soft)",
        blob: "var(--radius-blob)",
      },
      transitionTimingFunction: {
        emphasis: "cubic-bezier(0.22, 1, 0.36, 1)",
        decel: "cubic-bezier(0, 0, 0.2, 1)",
        accel: "cubic-bezier(0.4, 0, 1, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        bounce: "cubic-bezier(0.34, 1.8, 0.64, 1)",
      },
      transitionDuration: {
        instant: "80ms",
        short: "140ms",
        med: "220ms",
        long: "380ms",
        xlong: "600ms",
      },
      boxShadow: {
        "elev-1": "var(--shadow-1)",
        "elev-2": "var(--shadow-2)",
        "elev-3": "var(--shadow-3)",
        "elev-4": "var(--shadow-4)",
        "elev-5": "var(--shadow-5)",
        accent: "var(--shadow-accent)",
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s var(--ease-emphasis)",
        "slide-in-left": "slide-in-left 0.3s var(--ease-emphasis)",
        "scale-in": "scale-in 0.3s var(--ease-emphasis)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
