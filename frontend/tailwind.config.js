/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: "#0B0E11",
          900: "#0B0E11",
          800: "#111418",
          700: "#161B22",
          600: "#1F252D",
          500: "#2A313B",
        },
        neon: {
          red: "#FF3B30",
          yellow: "#FFCC00",
          green: "#34C759",
          blue: "#0A84FF",
        },
      },
      fontFamily: {
        display: [
          "'Space Grotesk'",
          "'Inter'",
          "system-ui",
          "sans-serif",
        ],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(255, 59, 48, 0.35)",
        "glow-yellow": "0 0 24px rgba(255, 204, 0, 0.35)",
        "glow-green": "0 0 24px rgba(52, 199, 89, 0.3)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.6)", opacity: "0.9" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.8s ease-out infinite",
        fadeIn: "fadeIn 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
