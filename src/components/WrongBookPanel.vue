<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bot, ExternalLink, Trash2 } from 'lucide-vue-next'
import { useArticles } from '@/composables/useArticles'
import { useAnalysis } from '@/composables/useAnalysis'
import type { WrongQuestion } from '@/composables/useWrongBook'
import { useWrongBook } from '@/composables/useWrongBook'
import { useLayout } from '@/composables/useLayout'
import { formatDateTime } from '@/utils/storage'

const { items, remove, clear } = useWrongBook()
const { articles, select } = useArticles()
const { selected, analyze } = useAnalysis()
const { panelOpen } = useLayout()

const total = computed(() => items.value.length)

const toast = ref('')
let toastTimer: number | undefined

function showToast(text: string) {
  toast.value = text
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = ''), 2600)
}

/** 收录时间 / 最近做错时间：重复做错同一题时只刷新后者 */
function timeLabel(item: WrongQuestion): string {
  return item.updatedAt > item.addedAt
    ? `最近做错 ${formatDateTime(item.updatedAt)}`
    : `收录于 ${formatDateTime(item.addedAt)}`
}

/** 跳回原文章继续精读 */
function jump(item: WrongQuestion) {
  select(item.articleId)
  selected.value = null
}

/** 唤起右侧 AI，重新剖析这道错题为什么选错 */
function explain(item: WrongQuestion) {
  const article = articles.value.find((entry) => entry.id === item.articleId)
  if (!article) return
  panelOpen.value = true
  void analyze({
    kind: 'question',
    no: item.no,
    stem: item.stem,
    options: item.options,
    answer: item.answer,
    userAnswer: item.userAnswer,
    passage: article.content,
    source: item.articleTitle,
  })
}

/** 🗑️ 单条移除：仅从错题集中删除该题，不影响原文章正文与其他错题 */
function removeOne(item: WrongQuestion) {
  remove(item.id)
  showToast('已移除，标记为已掌握')
}
</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col">
    <div class="flex items-center gap-2 px-3 pb-2">
      <span class="text-[11px] text-stone-500">共收录 {{ total }} 道错题</span>
      <button
        class="ml-auto inline-flex items-center gap-1 text-[11px] text-stone-500 transition hover:text-red-600 disabled:opacity-40 dark:hover:text-red-400"
        :disabled="!total"
        @click="clear"
      >
        <Trash2 :size="12" /> 一键清空
      </button>
    </div>

    <div class="scroll-thin flex-1 overflow-y-auto px-3 pb-4">
      <p
        v-if="!total"
        class="rounded-lg border border-dashed border-paper-200 px-3 py-6 text-center text-xs leading-relaxed text-stone-500 dark:border-ink-700"
      >
        还没有错题。做完题并提交判分后，选错的题目会自动收录到这里，并永久保留。
      </p>

      <TransitionGroup v-else name="card-list" tag="div" class="relative space-y-2">
        <article
          v-for="item in items"
          :key="item.id"
          class="rounded-lg border border-paper-200 bg-white px-3 py-2.5 dark:border-ink-700 dark:bg-ink-800"
        >
          <div class="mb-1.5 flex items-center gap-1.5">
            <span class="chip" :class="item.category === 'cet6' ? 'chip-violet' : 'chip-amber'">
              {{ item.category === 'cet4' ? 'CET-4' : 'CET-6' }}
            </span>
            <span class="text-[11px] font-medium text-stone-500">第 {{ item.no }} 题</span>
          </div>

          <p class="line-clamp-2 text-[12.5px] font-medium leading-snug">{{ item.stem }}</p>
          <p class="mt-1 text-[11px] text-stone-500">
            你的答案：<b class="text-red-600 dark:text-red-400">{{ item.userAnswer }}</b>
            ｜ 正确答案：<b class="text-emerald-600 dark:text-emerald-400">{{ item.answer }}</b>
          </p>
          <p class="mt-1 truncate text-[10.5px] text-stone-400" :title="item.articleTitle">
            {{ item.articleTitle }} · {{ timeLabel(item) }}
          </p>

          <div class="mt-2 flex gap-1.5">
            <button class="pill-btn" @click="jump(item)"><ExternalLink :size="12" /> 回到原文</button>
            <button class="pill-btn" @click="explain(item)"><Bot :size="12" /> AI 解析</button>
          </div>

          <button
            class="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-500/5 py-1.5 text-[11.5px] font-medium text-red-600 transition hover:bg-red-500/15 dark:border-red-500/40 dark:text-red-400"
            @click="removeOne(item)"
          >
            <Trash2 :size="12" /> 🗑️ 移除 / 已掌握
          </button>
        </article>
      </TransitionGroup>
    </div>

    <!-- 轻量移除反馈 -->
    <Transition name="toast">
      <div
        v-if="toast"
        class="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-900/90 px-3 py-1.5 text-[11px] text-white shadow-lg dark:bg-amber-400 dark:text-ink-900"
      >
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>
