import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({base:'./',plugins:[react()],test:{environment:'jsdom',setupFiles:['./tests/setup-canvas.js'],include:['tests/**/*.test.{ts,tsx,js}']},build:{modulePreload:{polyfill:false},rollupOptions:{output:{inlineDynamicImports:true}}}});
