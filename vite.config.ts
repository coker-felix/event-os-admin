import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './app/src/routes',
      generatedRouteTree: './app/src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
  ],
  server: { port: 5173, strictPort: true },
})
