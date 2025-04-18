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
        'dark-primary': '#95c672',
      },
      backgroundColor: theme => ({
        'dark-button-primary': '#95c672',
      }),
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
    themes: [
      "light", 
      {
        dark: {
          ...require("daisyui/src/theming/themes")["[data-theme=dark]"],
          "primary": "#95c672", // Change from #eebbca to #95c672
          "primary-focus": "#7fb356", // Slightly darker shade for hover states
          "primary-content": "#ffffff",
          "secondary": "#95c672",
          "accent": "#e7cc50",
          "neutral": "#2a323c",
          "base-100": "#1f2937",
          "base-200": "#111827",
          "base-300": "#0f172a",
          "base-content": "#e5e7eb",
          "info": "#3abff8",
          "success": "#36d399",
          "warning": "#fbbd23",
          "error": "#f87272",
        },
      },
      "synthwave"
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    logs: false,
  }
}