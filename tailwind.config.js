/** @type {import('tailwindcss').Config} */
const icons = require ('./public/favicon-125x125.svg');
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Figtree", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Source Serif 4", "Georgia", "serif"],
      },
      colors: {
        ink: "#14201b",
        mist: "#eef4f0",
        leaf: {
          50: "#eef8f2",
          100: "#d7eee1",
          600: "#0f6b4c",
          700: "#0b553c",
        },
      },
      boxShadow: {
        panel: "0 1px 0 rgba(20,32,27,0.04), 0 12px 32px rgba(20,32,27,0.06)",
      },
      backgroundImage: {
        app: "radial-gradient(circle at top left, #d9f0e4 0, transparent 28%), linear-gradient(180deg, #f7faf8 0%, #eef4f0 100%)",
      },
    },
  },
  plugins: [],
};
