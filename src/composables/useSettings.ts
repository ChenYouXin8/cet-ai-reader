import { reactive, watch } from 'vue'
import { DEFAULT_BASE_URL } from '@/services/llm'

export const SETTINGS_STORAGE_KEY = 'cet-reader:settings'

export interface AppSettings {
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
}

/**
 * 项目初始默认值：优先取 .env 中的配置；
 * 未配置时 apiKey 为空字符串，用户可在前端「设置」面板手动填写并保存在浏览器本地。
 */
export const DEFAULT_SETTINGS: AppSettings = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL,
  apiKey: import.meta.env.VITE_API_KEY || '',
  model: import.meta.env.VITE_MODEL_NAME || 'Qwen/Qwen3.8-Flash-Next-Uncensored',
  temperature: Number(import.meta.env.VITE_API_TEMPERATURE ?? 0.3),
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

const settings = reactive<AppSettings>(load())

watch(
  settings,
  (value) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value))
    } catch {
      /* 隐私模式下忽略写入失败 */
    }
  },
  { deep: true },
)

export function useSettings() {
  return {
    settings,
    defaults: DEFAULT_SETTINGS,
    save(patch: Partial<AppSettings>) {
      Object.assign(settings, patch)
    },
    reset() {
      Object.assign(settings, { ...DEFAULT_SETTINGS })
    },
  }
}
