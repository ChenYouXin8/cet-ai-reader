<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  Check,
  DatabaseBackup,
  Download,
  Eye,
  EyeOff,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-vue-next'
import { useAnswerRecords } from '@/composables/useAnswerRecords'
import { applyBackup, exportBackup, readBackupFile, summarize } from '@/composables/useBackup'
import { useSettings } from '@/composables/useSettings'
import { useVocab } from '@/composables/useVocab'
import { useWrongBook } from '@/composables/useWrongBook'
import { isUsingProxy, resolveEndpoint } from '@/services/llm'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (event: 'close'): void }>()

const { settings, defaults, save, reset } = useSettings()
const { records } = useAnswerRecords()
const { items: wrongItems } = useWrongBook()
const { items: vocabItems } = useVocab()

const draft = reactive({ baseUrl: '', apiKey: '', model: '', temperature: 0.3 })
const showKey = ref(false)
const saved = ref(false)

/** 当前本地数据量，便于导出前心里有数 */
const stats = computed(() => ({
  answers: Object.keys(records.value).length,
  wrong: wrongItems.value.length,
  vocab: vocabItems.value.length,
}))

const picker = ref<HTMLInputElement | null>(null)
const toast = ref('')
let toastTimer: number | undefined

function showToast(text: string, duration = 2600) {
  toast.value = text
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = ''), duration)
}

/** 一键导出：把答题记录 / 错题集 / 生词本 / 模型配置打包成 JSON 下载 */
function handleExport() {
  const summary = exportBackup()
  showToast(
    `✅ 已导出备份：答题 ${summary.answers} 篇 · 错题 ${summary.wrong} 道 · 生词 ${summary.vocab} 个`,
    3600,
  )
}

/** 一键恢复：读取 JSON → 校验 → 覆盖写入 localStorage → 重新加载页面 */
async function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 允许连续选择同一个文件
  if (!file) return

  try {
    const backup = await readBackupFile(file)
    const summary = summarize(backup)
    const confirmed = window.confirm(
      [
        '导入后将以备份内容覆盖当前本地数据：',
        `· 答题记录 ${summary.answers} 篇`,
        `· 错题 ${summary.wrong} 道`,
        `· 生词 ${summary.vocab} 个`,
        `· 模型配置 ${summary.hasSettings ? '含' : '不含'}`,
        '',
        '当前尚未备份的数据将无法找回，确认继续？',
      ].join('\n'),
    )
    if (!confirmed) return

    const applied = applyBackup(backup)
    showToast(`✅ 已恢复：答题 ${applied.answers} 篇 · 错题 ${applied.wrong} 道 · 生词 ${applied.vocab} 个，正在重新加载…`, 3000)
    window.setTimeout(() => window.location.reload(), 1000)
  } catch (cause) {
    showToast(`❌ ${cause instanceof Error ? cause.message : String(cause)}`, 3600)
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.assign(draft, settings)
    saved.value = false
    showKey.value = false
    toast.value = ''
  },
  { immediate: true },
)

const endpointPreview = computed(() => resolveEndpoint(draft.baseUrl))
const proxyMode = computed(() => isUsingProxy(draft.baseUrl))

function submit() {
  save({
    baseUrl: draft.baseUrl.trim(),
    apiKey: draft.apiKey.trim(),
    model: draft.model.trim(),
    temperature: Number(draft.temperature),
  })
  saved.value = true
  window.setTimeout(() => (saved.value = false), 1800)
}

function restoreDefaults() {
  Object.assign(draft, defaults)
  reset()
}
</script>

<template>
  <Transition name="drawer">
    <div v-if="open" class="absolute inset-0 z-30 flex flex-col bg-white dark:bg-ink-800">
      <header class="flex items-center gap-2 border-b border-paper-200 px-4 py-3 dark:border-ink-700">
        <SlidersHorizontal :size="15" class="text-amber-600 dark:text-amber-400" />
        <h2 class="flex-1 text-[13px] font-semibold">模型设置</h2>
        <button class="icon-btn" title="关闭" @click="emit('close')"><X :size="16" /></button>
      </header>

      <form class="scroll-thin flex-1 space-y-4 overflow-y-auto px-4 py-4" @submit.prevent="submit">
        <label class="block">
          <span class="mb-1 block text-[11px] font-medium text-stone-500">API Base URL</span>
          <input v-model="draft.baseUrl" class="input" spellcheck="false" placeholder="https://example.com/v1" />
        </label>

        <label class="block">
          <span class="mb-1 block text-[11px] font-medium text-stone-500">API Key</span>
          <div class="relative">
            <input
              v-model="draft.apiKey"
              class="input pr-9"
              :type="showKey ? 'text' : 'password'"
              spellcheck="false"
              placeholder="sk-..."
            />
            <button
              type="button"
              class="icon-btn absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              :title="showKey ? '隐藏' : '显示'"
              @click="showKey = !showKey"
            >
              <EyeOff v-if="showKey" :size="14" />
              <Eye v-else :size="14" />
            </button>
          </div>
        </label>

        <label class="block">
          <span class="mb-1 block text-[11px] font-medium text-stone-500">Model Name</span>
          <input v-model="draft.model" class="input" spellcheck="false" />
        </label>

        <label class="block">
          <span class="mb-1 flex items-center justify-between text-[11px] font-medium text-stone-500">
            <span>Temperature</span>
            <span class="font-mono text-stone-600 dark:text-stone-300">{{ Number(draft.temperature).toFixed(1) }}</span>
          </span>
          <input
            v-model.number="draft.temperature"
            type="range"
            min="0"
            max="2"
            step="0.1"
            class="mt-2 w-full accent-amber-500"
          />
        </label>

        <div
          class="rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed"
          :class="
            proxyMode
              ? 'border-emerald-300/70 bg-emerald-50/70 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-amber-300/70 bg-amber-50/70 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
          "
        >
          <p class="flex items-start gap-1.5 font-medium">
            <ShieldCheck v-if="proxyMode" :size="13" class="mt-px shrink-0" />
            <ShieldAlert v-else :size="13" class="mt-px shrink-0" />
            {{ proxyMode ? '经 Vite 代理转发，无跨域限制' : '将直连该地址，可能与浏览器 CORS 冲突' }}
          </p>
          <p class="mt-1 break-all font-mono opacity-80">{{ endpointPreview }}</p>
        </div>

        <section class="rounded-lg border border-paper-200 px-3 py-3 dark:border-ink-700">
          <h3 class="flex items-center gap-1.5 text-[11.5px] font-semibold">
            <DatabaseBackup :size="14" class="shrink-0 text-amber-600 dark:text-amber-400" />
            数据备份与恢复
          </h3>
          <p class="mt-1.5 text-[11px] leading-relaxed text-stone-500">
            一键打包本地全部学习数据。清理浏览器缓存、更换端口或换设备后，导入备份文件即可完整还原。
          </p>
          <p class="mt-2 text-[11px] text-stone-500">
            当前本地：答题记录
            <span class="font-mono text-stone-700 dark:text-stone-200">{{ stats.answers }}</span> 篇 · 错题集
            <span class="font-mono text-stone-700 dark:text-stone-200">{{ stats.wrong }}</span> 道 · 生词本
            <span class="font-mono text-stone-700 dark:text-stone-200">{{ stats.vocab }}</span> 个
          </p>
          <div class="mt-2.5 flex flex-col gap-2">
            <button type="button" class="pill-btn flex-none" title="导出全部本地数据为 JSON 文件" @click="handleExport">
              <Upload :size="13" /> 📤 导出完整数据备份
            </button>
            <button
              type="button"
              class="pill-btn flex-none"
              title="从 JSON 备份文件恢复全部本地数据"
              @click="picker?.click()"
            >
              <Download :size="13" /> 📥 导入备份并恢复
            </button>
          </div>
          <input ref="picker" type="file" accept=".json,application/json" class="hidden" @change="handleImport" />
        </section>
      </form>

      <footer class="flex items-center gap-2 border-t border-paper-200 px-4 py-3 dark:border-ink-700">
        <button type="button" class="pill-btn" @click="restoreDefaults">
          <RotateCcw :size="13" /> 恢复默认
        </button>
        <button type="button" class="pill-btn" :disabled="saved" @click="submit">
          <Check :size="13" /> {{ saved ? '已保存' : '保存设置' }}
        </button>
        <button type="button" class="pill-btn" @click="emit('close')">完成</button>
      </footer>

      <Transition name="toast">
        <div
          v-if="toast"
          class="pointer-events-none absolute bottom-16 left-1/2 z-10 max-w-[92%] -translate-x-1/2 rounded-lg bg-stone-900/90 px-3 py-2 text-center text-[11px] leading-relaxed text-white shadow-lg dark:bg-amber-400 dark:text-ink-900"
        >
          {{ toast }}
        </div>
      </Transition>
    </div>
  </Transition>
</template>
