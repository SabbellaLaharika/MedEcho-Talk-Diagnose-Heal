import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',

        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'Logo.jpeg'],
        injectManifest: {
          injectionPoint: 'self.__WB_MANIFEST'
        },




        manifest: {

          name: 'MedEcho: Talk, Diagnose, Heal',
          short_name: 'MedEcho',
          description: 'Medical Consultation & Health Assistant',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'Logo.jpeg',
              sizes: '192x192',
              type: 'image/jpeg'
            },
            {
              src: 'Logo.jpeg',
              sizes: '512x512',
              type: 'image/jpeg'
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    base: "/",
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VAPID_PUBLIC_KEY': JSON.stringify(env.VAPID_PUBLIC_KEY || 'BFpoWP42ayomI-t62kJUIJNW84ZUUYO3DL8gA5r6jIo1J8V4W2XuUyCsUXgGdOW_pf8qgbAY30-dhQbiZj2UTZE')
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
