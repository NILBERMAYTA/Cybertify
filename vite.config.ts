import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['641f-2800-320-c814-b400-ed18-1dea-65f3-79dd.ngrok-free.app'],
  },
})
