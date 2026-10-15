import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'cet-reader:theme'

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

const theme = ref<Theme>(initialTheme())

watch(
  theme,
  (value) => {
    document.documentElement.classList.toggle('dark', value === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* 忽略写入失败 */
    }
  },
  { immediate: true },
)

export function useTheme() {
  return {
    theme,
    toggleTheme() {
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
    },
  }
}
