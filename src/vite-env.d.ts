/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

interface ImportMetaEnv {
  /** OpenAI 兼容接口基地址 */
  readonly VITE_API_BASE_URL: string
  /** API Key（留空则在前端「设置」面板手动填写） */
  readonly VITE_API_KEY: string
  /** 模型名称 */
  readonly VITE_MODEL_NAME: string
  /** 采样温度 */
  readonly VITE_API_TEMPERATURE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
