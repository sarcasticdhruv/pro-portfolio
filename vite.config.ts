import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { devApiPlugin } from './vite-dev-api'

export default defineConfig({
  plugins: [react(), devApiPlugin()],
})
