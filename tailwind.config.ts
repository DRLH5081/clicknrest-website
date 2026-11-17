import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FBF8F3",
        sand: { 50: "#FAF6F0", 100: "#F4EEE5", 200: "#E9E0D2", 300: "#D9CCB8", 400: "#BFAE95" },
        ink: { DEFAULT: "#0F1F33", soft: "#3A4A5E", muted: "#55606E", deep: "#0A1626" },
        gold: { 50: "#FBF5E8", 100: "#F3E4C1", 400: "#C8962E", 500: "#B0822A", 600: "#8A6417", 700: "#6E5014" },
        olive: { 50: "#EEF1EA", 100: "#DCE3D3", 600: "#4F5D43", 700: "#3F4B35" },
        danger: { 50: "#FBEDED", 600: "#A12F2F", 700: "#862525" },
        amber: { 50: "#FDF5E3", 700: "#8A5A0B" },
      },
      fontFamily: {
        display: ['"Fraunces Variable"', "Georgia", "serif"],
        sans: ['"Inter Variable"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: { "4xl": "2rem" },
      boxShadow: {
        soft: "0 1px 2px rgba(15,31,51,0.04), 0 8px 24px -8px rgba(15,31,51,0.12)",
        lift: "0 2px 4px rgba(15,31,51,0.05), 0 18px 40px -12px rgba(15,31,51,0.22)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "none" } },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
      },
      animation: {
        "fade-up": "fade-up .7s cubic-bezier(.2,.7,.2,1) both",
        "fade-in": "fade-in .4s ease both",
      },
    },
  },
  plugins: [],
} satisfies Config;
