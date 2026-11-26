import { defineConfig } from 'vite';

/**
 * Vite 构建配置（Milestone 2 Web 试玩壳层）。
 * - 不使用任何前端框架：壳层为原生 TypeScript + DOM，包体最小，贴合微信小游戏迁端目标；
 * - base 取相对路径，构建产物可托管于任意子路径。
 */
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
