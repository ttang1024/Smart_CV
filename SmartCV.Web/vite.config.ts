import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5167',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../SmartCV.API/wwwroot',
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('pdfjs-dist')) return 'pdf-libs';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'export-libs';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('node_modules')) return 'vendor';
        }
      }
    }
  }
})
