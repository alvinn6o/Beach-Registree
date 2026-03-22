/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        beach: {
          sand: "#f5e6c8",
          ocean: "#1a6fa0",
          palm: "#2d8a4e",
          sunset: "#e8834a",
          dark: "#0a0c12",
          card: "#12141c",
          border: "#1e2130",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        hero: ["var(--font-hero)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
