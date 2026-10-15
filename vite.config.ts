import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

/** OpenAI 兼容服务默认地址（可在 .env 中通过 VITE_API_BASE_URL 覆盖） */
const DEFAULT_AI_TARGET = 'https://gs.neisvip.com:2300/v1'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        // 前端统一请求 /api/ai/chat/completions，由 Vite 代理转发到专属服务，彻底规避浏览器 CORS 拦截
        '/api/ai': {
          target: env.VITE_API_BASE_URL || DEFAULT_AI_TARGET,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/ai/, ''),
        },
      },
    },
  }
})
