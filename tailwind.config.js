/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      ringColor: {
        DEFAULT: 'transparent',
      },
    },
  },
  variants: {
    extend: {
      ringColor: ['focus', 'active'],
      ringOpacity: ['focus', 'active'],
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"],
    darkTheme: "light", // Изменено с "dark" на "light"
    base: true,
    styled: true,
    utils: true,
    logs: false,
  }
}