import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (env.VITE_APP_ENV && env.VITE_APP_ENV !== 'HML')
    throw new Error('Phase 01 permite somente HML.');
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            qrcode: ['qrcode'],
          },
        },
      },
    },
  };
});
