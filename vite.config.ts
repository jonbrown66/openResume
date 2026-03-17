import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // AI Studio 环境会通过 DISABLE_HMR 关闭热更新，避免代理编辑时闪烁。
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
