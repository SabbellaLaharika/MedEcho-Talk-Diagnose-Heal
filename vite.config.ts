import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
<<<<<<< HEAD
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      base: "/MedEcho-Talk-Diagnose-Heal",
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
=======
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: Number(env.VITE_PORT) || 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    base: "/MedEcho-Talk-Diagnose-Heal",
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
>>>>>>> 3196f8a1728df2c3dfbe7bf7b822066379870ff6
});
