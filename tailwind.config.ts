import { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}", // Ensure this path matches your project structure
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'), // Ensure 'daisyui' is installed in your project
  ],
}

export default config;