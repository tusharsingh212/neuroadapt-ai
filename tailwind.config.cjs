/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./popup.html", "./demo.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgba(125, 211, 252, 0.2), 0 25px 60px rgba(2, 6, 23, 0.45)"
      },
      fontFamily: {
        sans: [
          "Aptos",
          "Segoe UI Variable",
          "Segoe UI",
          "Inter",
          "system-ui",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};
