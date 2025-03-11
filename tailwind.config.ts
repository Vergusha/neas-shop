// tailwind.config.ts
import { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}", // Убедитесь, что этот путь соответствует вашему проекту
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
