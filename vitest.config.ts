import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tests/**/*.test.{ts,js}'], testTimeout: 15000 },
  resolve: { alias: { 'npm:@supabase/supabase-js@2.117.2': '@supabase/supabase-js' } },
});
