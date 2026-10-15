<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, Moon, PanelLeftOpen, PanelRightClose, PanelRightOpen, Sparkles, Sun } from 'lucide-vue-next'
import { useArticles } from '@/composables/useArticles'
import { useAnalysis } from '@/composables/useAnalysis'
import { useLayout } from '@/composables/useLayout'
import { useTheme } from '@/composables/useTheme'
import { useVocab } from '@/composables/useVocab'
import { countWords, splitParagraphs, splitSentences, tokenizeSentence } from '@/utils/text'
import QuestionQuiz from './QuestionQuiz.vue'

const { active, status, error, load } = useArticles()
const { selected, analyze } = useAnalysis()
const { navOpen, panelOpen, toggleNav, togglePanel } = useLayout()
const { theme, toggleTheme } = useTheme()
const { add: addVocab } = useVocab()

const bodyRef = ref<HTMLElement | null>(null)
const showQuestions = ref(true)
const popup = ref<{ x: number; y: number; text: string; context: string } | null>(null)

/** 段落 → 句子 两级结构，用于点击分句与整句高亮 */
const paragraphs = computed(() =>
  active.value ? splitParagraphs(active.value.content).map((paragraph) => splitSentences(paragraph)) : [],
)

const source = computed(() => active.value?.title ?? '')

/** 点击整句（句子空白处 / 句子头部图标）→ 整句精析 */
function analyzeSentence(p: number, s: number, text: string) {
  popup.value = null
  selected.value = { p, s }
  panelOpen.value = true
  void analyze({ kind: 'sentence', text, source: source.value })
}

/** 点击单个单词 → 单词精析（阻止冒泡，不触发整句解析） */
function analyzeWord(word: string, sentence: string) {
  popup.value = null
  selected.value = null
  panelOpen.value = true
  window.getSelection()?.removeAllRanges()
  // 查词即自动归档进本地生词本（重复查同一个单词只刷新时间与出处）
  addVocab(word, {
    contextSentence: sentence,
    sourceArticle: source.value,
    category: active.value?.category,
  })
  void analyze({ kind: 'word', text: word, context: sentence, source: source.value })
}

/** 向上查找该节点所属的句子，作为短语解析的语境 */
function closestSentence(node: Node | null): string {
  let current: Node | null = node
  while (current && current !== bodyRef.value) {
    if (current instanceof HTMLElement && current.classList.contains('sentence')) {
      return current.textContent?.trim() ?? ''
    }
    current = current.parentNode
  }
  return ''
}

/** 划选结束：弹出浮动操作条 */
function onMouseUp() {
  const selection = window.getSelection()
  const text = selection?.toString().trim() ?? ''

  if (!selection || selection.isCollapsed || text.length < 2) {
    popup.value = null
    return
  }
  const anchor = selection.anchorNode
  if (!anchor || !bodyRef.value?.contains(anchor)) {
    popup.value = null
    return
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect()
  popup.value = {
    x: Math.min(Math.max(rect.left + rect.width / 2, 110), window.innerWidth - 110),
    y: Math.max(rect.top, 64),
    text,
    context: closestSentence(anchor),
  }
}

function analyzePhrase() {
  const target = popup.value
  if (!target) return
  popup.value = null
  window.getSelection()?.removeAllRanges()
  panelOpen.value = true
  void analyze({ kind: 'phrase', text: target.text, context: target.context, source: source.value })
}
</script>

<template>
  <section class="flex min-w-0 flex-1 flex-col">
    <header
      class="flex items-center gap-2 border-b border-paper-200 bg-white/75 px-4 py-2.5 backdrop-blur dark:border-ink-700 dark:bg-ink-800/75"
    >
      <button v-if="!navOpen" class="icon-btn" title="展开题库导航" @click="toggleNav">
        <PanelLeftOpen :size="16" />
      </button>

      <div class="min-w-0 flex-1">
        <h1 class="truncate text-[13px] font-semibold">{{ active?.title ?? '请选择一篇真题' }}</h1>
        <p class="truncate text-[11px] text-stone-500">
          <template v-if="active">
            {{ active.category === 'cet4' ? 'CET-4' : 'CET-6' }} · {{ active.year }} · 约
            {{ countWords(active.content) }} 词 · {{ active.questions.length }} 题
          </template>
          <template v-else>点击左侧列表开始精读</template>
        </p>
      </div>

      <button class="icon-btn" :title="theme === 'dark' ? '切换明亮主题' : '切换深色主题'" @click="toggleTheme">
        <Sun v-if="theme === 'dark'" :size="16" />
        <Moon v-else :size="16" />
      </button>
      <button class="icon-btn" :title="panelOpen ? '收起 AI 解析栏' : '展开 AI 解析栏'" @click="togglePanel">
        <PanelRightClose v-if="panelOpen" :size="16" />
        <PanelRightOpen v-else :size="16" />
      </button>
    </header>

    <div
      ref="bodyRef"
      class="reading-body scroll-thin relative flex-1 overflow-y-auto px-6 py-8 sm:px-10 xl:px-16"
      @mouseup="onMouseUp"
      @scroll="popup = null"
    >
      <p v-if="status === 'loading'" class="mx-auto max-w-[760px] text-sm text-stone-500">题库加载中…</p>

      <div v-else-if="status === 'error'" class="mx-auto max-w-[760px]">
        <p class="text-sm text-red-500">{{ error }}</p>
        <button class="mt-3 text-sm text-amber-600 underline" @click="load">重新加载题库</button>
      </div>

      <article v-else-if="active" class="mx-auto max-w-[760px]">
        <h2 class="mb-1 text-xl font-semibold">{{ active.title }}</h2>
        <p class="mb-6 border-b border-dashed border-paper-200 pb-4 text-xs text-stone-500 dark:border-ink-700">
          点击任意单词 → 查词精析；点击句子空白处 / 句首图标 → 整句精析；划选短语 → 定向解析
        </p>

        <p v-for="(sentences, p) in paragraphs" :key="p" class="mb-5 text-justify">
          <span
            v-for="(sentence, s) in sentences"
            :key="s"
            class="sentence"
            :class="{ 'is-active': selected?.p === p && selected?.s === s }"
            @click="analyzeSentence(p, s, sentence)"
          >
            <button class="sentence-icon" title="整句精析" @click.stop="analyzeSentence(p, s, sentence)">
              <Sparkles :size="11" />
            </button>
            <template v-for="(token, t) in tokenizeSentence(sentence)" :key="t">
              <span
                v-if="token.word"
                class="cursor-pointer rounded px-0.5 transition-colors hover:bg-yellow-200/60"
                title="点击查词"
                @click.stop="analyzeWord(token.text, sentence)"
                >{{ token.text }}</span
              ><template v-else>{{ token.text }}</template>
            </template>
            <template v-if="s < sentences.length - 1">{{ ' ' }}</template>
          </span>
        </p>

        <section class="mt-8 border-t border-paper-200 pt-5 dark:border-ink-700">
          <button class="inline-flex items-center gap-2 text-sm font-semibold" @click="showQuestions = !showQuestions">
            <ChevronDown :size="15" class="transition-transform" :class="{ 'rotate-180': showQuestions }" />
            题目与选项（{{ active.questions.length }}）
          </button>

          <!-- v-show 保留作答状态，折叠后重新展开不丢失 -->
          <div v-show="showQuestions" class="mt-4">
            <QuestionQuiz :article="active" />
          </div>
        </section>
      </article>
    </div>

    <!-- 划选短语浮动操作条 -->
    <div
      v-if="popup"
      class="fixed z-40"
      :style="{
        left: `${popup.x}px`,
        top: `${popup.y}px`,
        transform: 'translate(-50%, calc(-100% - 10px))',
        animation: 'pop-in 0.15s ease',
      }"
    >
      <button
        class="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg transition hover:bg-stone-700 dark:bg-amber-400 dark:text-ink-900 dark:hover:bg-amber-300"
        @click="analyzePhrase"
      >
        <Sparkles :size="13" /> 解析选中短语
      </button>
    </div>
  </section>
</template>
