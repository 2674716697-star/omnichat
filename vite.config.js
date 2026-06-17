import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  // 开发环境：index.html 在根目录，src/ 是模块目录
  root: '.',
  // 生产构建输出到 dist/
  build: {
    outDir: 'dist',
    // 单文件模式：所有资源内联
    cssCodeSplit: false,
    assetsInlineLimit: 100000000, // 内联所有资源
    // 保留 omnichat.html 文件名供 _build.js 使用
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    // 生产构建生成独立 HTML 文件
    viteSingleFile({
      useRecommendedBuildConfig: false,
      removeViteModuleLoader: true,
    }),
  ],
  // 开发服务器
  server: {
    port: 3000,
    open: false,
  },
});
