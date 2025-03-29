import type { Config } from 'tailwindcss'
import daisyui from 'daisyui'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#3498db',
        'secondary': '#2ecc71',
        'accent': '#f1c40f',
      },
      animation: {
        'shake': 'shake 0.3s',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'cart-flash': 'cartButtonFlash 0.5s ease',
        'logo-scale': 'logoScale 0.3s ease-in-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translate(1px, 1px) rotate(0deg)' },
        },
        slideIn: {
          'from': { transform: 'translateX(100%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' }
        },
        cartButtonFlash: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' }
        },
        logoScale: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.1)' }
        }
      },
      spacing: {
        'card-p': '1.25rem', // Кастомный padding для карточек
      },
      maxWidth: {
        'card-w': 'calc(100% - 2.5rem)', // Максимальная ширина контента карточки
        'content': '1440px',
        'mobile': '600px',
        'tablet': '960px',
      },
      transform: {
        'logo-scale': 'scale(1.1)',
      },
      transition: {
        'logo': 'transform 0.3s ease-in-out',
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      padding: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      minHeight: {
        'screen-safe': ['100vh', '100dvh'],
      },
      gridTemplateColumns: {
        'auto-fit': 'repeat(auto-fit, minmax(280px, 1fr))',
        'auto-fill': 'repeat(auto-fill, minmax(280px, 1fr))',
      }
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["light", "dark"],
  },
} 

export default config