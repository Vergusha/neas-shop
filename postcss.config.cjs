// postcss.config.js
module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),  // Используйте этот плагин вместо старого tailwindcss
    require('autoprefixer')
  ]
}
