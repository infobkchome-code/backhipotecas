/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0b261f",
          primary: "#0d3b2e",
          secondary: "#1e5f4a",
          accent: "#c8a34a",
          light: "#f7f7f5"
        }
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.08)"
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px"
      }
    },
  },
  plugins: [],
}
