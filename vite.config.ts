import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  css: {
    devSourcemap: true,
  },
  build: {
    sourcemap: true,
    outDir: 'dist', // Changed from 'build' to 'dist' for Firebase deployment
  },
  server: {
    port: 7777,
    open: true
  }
})
