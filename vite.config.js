import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    open: true,
    proxy: {
      '/v1': {
        target: 'https://api.notion.com',
        changeOrigin: true,
        secure: false,
        headers: {
          Referer: 'https://api.notion.com'
        }
      },
    }
  },
  plugins: [vue()]
})