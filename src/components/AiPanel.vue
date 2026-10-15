<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Check, Copy, Loader2, RefreshCw, Send, Settings2, Sparkles, Square, Trash2, TriangleAlert } from 'lucide-vue-next'
import type { Bubble } from '@/composables/useAnalysis'
import { useAnalysis } from '@/composables/useAnalysis'
import { useSettings } from '@/composables/useSettings'
import { renderMarkdown } from '@/services/markdown'
import { copyText } from '@/utils/text'
import SettingsDrawer from './SettingsDrawer.vue'

const { messages, busy, revision, canRegenerate, regenerate, stop, clear, chat } = useAnalysis()
const { settings } = useSettings()

const drawerOpen = ref(false)
const copiedId = ref(0)
const copiedAll = ref(false)
const scroller = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)
const draft = ref('')

const lastAssistant = computed(() => [...messages.value].reverse().find((bubble) => bubble.role === 'assistant'))

const state = computed(() => {
  if (busy.value) return 'busy'
  return lastAssistant.value?.error ? 'error' : 'ready'
})

const statusText = computed(() => {
  if (state.value === 'busy') return '解析中…'
  if (state.value === 'error') return '请求失败'
  return '已就绪'
})

// 新消息出现时平滑触底；流式增量时保持贴底，避免每帧动画抖动
watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    const element = scroller.value
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
  },
)

watch(revision, async () => {
  await nextTick()
  const element = scroller.value
  if (element) element.scrollTop = element.scrollHeight
})

async function copyBubble(bubble: Bubble) {
  await copyText(bubble.content)
  copiedId.value = bubble.id
  window.setTimeout(() => (copiedId.value = 0), 1600)
}

/** 把整场对话导出为 Markdown 文本 */
function conversationMarkdown(): string {
  return messages.value
    .filter((bubble) => bubble.content.trim())
    .map((bubble) => (bubble.role === 'user' ? `## ${bubble.label ?? '提问'}\n\n${bubble.content}` : `## AI 回答\n\n${bubble.content}`))
    .join('\n\n---\n\n')
}

async function copyAll() {
  const markdown = conversationMarkdown()
  if (!markdown) return
  await copyText(markdown)
  copiedAll.value = true
  window.setTimeout(() => (copiedAll.value = false), 1600)
}

const MAX_INPUT_HEIGHT = 132

/** 输入框随内容自适应高度（约 1 ~ 5 行） */
function autoGrow() {
  const element = inputEl.value
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, MAX_INPUT_HEIGHT)}px`
}

function send() {
  const text = draft.value.trim()
  if (!text || busy.value) return
  draft.value = ''
  void nextTick(autoGrow)
  chat(text)
}

/** Enter 发送、Shift + Enter 换行；中文输入法候选期间不触发发送 */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter') return
  if (event.shiftKey || event.isComposing) return
  event.preventDefault()
  send()
}

/** 快捷追问胶囊：直接发起一次自由提问 */
function askQuick(prompt: string) {
  if (busy.value) return
  chat(prompt)
}
</script>

<template>
  <aside
    class="relative flex w-[420px] shrink-0 flex-col border-l border-paper-200 bg-white dark:border-ink-700 dark:bg-ink-800"
  >
    <header class="flex items-center gap-2 border-b border-paper-200 px-3.5 py-2.5 dark:border-ink-700">
      <span
        class="h-2 w-2 shrink-0 rounded-full"
        :class="{
          'animate-pulse bg-amber-500': state === 'busy',
          'bg-red-500': state === 'error',
          'bg-emerald-500': state === 'ready',
        }"
      />
      <span class="text-[11px] font-medium text-stone-600 dark:text-stone-300">{{ statusText }}</span>
      <span class="chip chip-plain truncate" :title="settings.model">{{ settings.model }}</span>
      <button
        class="icon-btn ml-auto"
        :disabled="!messages.length"
        :title="copiedAll ? '已复制整场对话' : '复制整场对话 Markdown'"
        @click="copyAll"
      >
        <Check v-if="copiedAll" :size="15" />
        <Copy v-else :size="15" />
      </button>
      <button class="icon-btn" title="模型设置" @click="drawerOpen = true"><Settings2 :size="16" /></button>
    </header>

    <div ref="scroller" class="scroll-thin flex-1 space-y-4 overflow-y-auto px-4 py-4">
      <div v-if="!messages.length" class="flex h-full flex-col items-center justify-center px-6 text-center">
        <div class="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400">
          <Sparkles :size="20" />
        </div>
        <p class="text-[13px] font-medium">AI 精读解析</p>
        <p class="mt-1.5 text-[11.5px] leading-relaxed text-stone-500">
          点击正文中的任意单词、句子或划选短语，即可唤醒本侧边栏，<br />实时流式输出【查词释义 / 精准译文 / 核心考点 / 长难句剖析】<br />做完题提交判分后，还可让 AI 剖析每个选项的陷阱。
        </p>
        <p class="mt-2 text-[11.5px] leading-relaxed text-stone-400">
          也可以直接在下方输入框提问，并针对上面的解析连续追问。
        </p>
      </div>

      <template v-for="bubble in messages" :key="bubble.id">
        <!-- 用户提问 -->
        <div v-if="bubble.role === 'user'" class="flex flex-col items-end gap-1">
          <span class="chip chip-amber">{{ bubble.label }}</span>
          <p
            class="max-w-[94%] whitespace-pre-wrap rounded-xl rounded-br-sm bg-amber-50 px-3 py-2 text-[12.5px] leading-relaxed text-stone-700 dark:bg-amber-500/10 dark:text-stone-200"
          >
            {{ bubble.content }}
          </p>
        </div>

        <!-- AI 结构化解析 / 追问回答 -->
        <div
          v-else
          class="group relative rounded-xl border border-paper-200 bg-paper-50/80 px-3.5 py-3 dark:border-ink-700 dark:bg-ink-900/60"
        >
          <p v-if="bubble.streaming && !bubble.content" class="flex items-center gap-2 text-[12px] text-stone-500">
            <Loader2 :size="13" class="animate-spin" /> 正在连接模型并生成解析…
          </p>

          <div
            v-else
            class="md-body"
            :class="{ 'typewriter-caret': bubble.streaming }"
            v-html="renderMarkdown(bubble.content)"
          />

          <p v-if="bubble.stopped" class="mt-2 text-[11px] text-stone-400">已手动停止生成</p>

          <p v-if="bubble.error" class="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-red-600 dark:text-red-400">
            <TriangleAlert :size="13" class="mt-px shrink-0" />{{ bubble.error }}
          </p>

          <!-- 快捷追问胶囊 -->
          <div v-if="bubble.chips?.length && !bubble.streaming && !bubble.error" class="mt-2.5 flex flex-wrap gap-1.5">
            <button
              v-for="chip in bubble.chips"
              :key="chip.label"
              class="rounded-full border border-paper-200 bg-white px-2 py-[3px] text-[10.5px] text-stone-500 transition hover:border-amber-300 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-600 dark:bg-ink-800 dark:text-stone-300"
              :disabled="busy"
              :title="chip.prompt"
              @click="askQuick(chip.prompt)"
            >
              {{ chip.label }}
            </button>
          </div>

          <button
            v-if="bubble.content && !bubble.streaming"
            class="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md border border-paper-200 bg-white/85 px-1.5 py-1 text-[10.5px] text-stone-500 opacity-0 transition group-hover:opacity-100 hover:text-amber-600 dark:border-ink-600 dark:bg-ink-800/85"
            title="复制本条解析"
            @click="copyBubble(bubble)"
          >
            <Check v-if="copiedId === bubble.id" :size="11" />
            <Copy v-else :size="11" />
            {{ copiedId === bubble.id ? '已复制' : '复制' }}
          </button>
        </div>
      </template>
    </div>

    <!-- 自由对话输入区 -->
    <div class="border-t border-paper-200 px-3.5 pt-2.5 dark:border-ink-700">
      <div
        class="flex items-end gap-1.5 rounded-xl border border-paper-200 bg-paper-50/60 px-2 py-1.5 transition focus-within:border-amber-400 focus-within:bg-white dark:border-ink-600 dark:bg-ink-900/40 dark:focus-within:bg-ink-900"
      >
        <textarea
          ref="inputEl"
          v-model="draft"
          rows="1"
          class="scroll-thin flex-1 resize-none bg-transparent py-1 text-[12.5px] leading-relaxed outline-none placeholder:text-stone-400"
          placeholder="向 AI 提问任何英语问题，或针对上方解析追问..."
          @input="autoGrow"
          @keydown="onKeydown"
        />
        <button v-if="busy" class="icon-btn mb-0.5 text-red-500" title="停止生成" @click="stop">
          <Square :size="13" />
        </button>
        <button
          v-else
          class="icon-btn mb-0.5 text-amber-600 dark:text-amber-400"
          :disabled="!draft.trim()"
          title="发送（Enter）"
          @click="send"
        >
          <Send :size="15" />
        </button>
      </div>
      <p class="mt-1 px-1 text-[10.5px] text-stone-400">Enter 发送 · Shift + Enter 换行</p>
    </div>

    <footer class="flex items-center gap-2 border-t border-paper-200 px-3.5 py-2.5 dark:border-ink-700">
      <button v-if="busy" class="pill-btn" @click="stop"><Square :size="12" /> 停止生成</button>
      <button v-else class="pill-btn" :disabled="!canRegenerate" @click="regenerate">
        <RefreshCw :size="13" /> 重新生成
      </button>

      <button
        class="pill-btn"
        :disabled="!lastAssistant?.content || busy"
        @click="lastAssistant && copyBubble(lastAssistant)"
      >
        <Copy :size="13" /> 复制解析 Markdown
      </button>

      <button class="pill-btn" :disabled="!messages.length" @click="clear"><Trash2 :size="13" /> 清空</button>
    </footer>

    <SettingsDrawer :open="drawerOpen" @close="drawerOpen = false" />
  </aside>
</template>
