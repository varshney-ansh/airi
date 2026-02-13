// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // ... your other files
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: []
}