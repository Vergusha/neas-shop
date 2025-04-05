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
      colors: {
        primary: '#003D2D',
        'primary-focus': '#004D3D',
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
    themes: ["light", "dark", "synthwave"],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    logs: false,
  }
}