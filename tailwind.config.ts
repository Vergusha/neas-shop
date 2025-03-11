import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html', 
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', // синий цвет для акцентов
        secondary: '#1e293b', // серый цвет для текста
        background: '#f8fafc', // светло-серый для фона
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // используем шрифт Inter (по желанию)
      },
    },
  },
  plugins: [],
};

export default config;
