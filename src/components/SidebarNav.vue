<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BookMarked,
  BookOpenText,
  CircleX,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  X,
} from 'lucide-vue-next'
import { useArticles } from '@/composables/useArticles'
import type { TabKey } from '@/composables/useArticles'
import { useAnalysis } from '@/composables/useAnalysis'
import { useLayout } from '@/composables/useLayout'
import { useVocab } from '@/composables/useVocab'
import { useWrongBook } from '@/composables/useWrongBook'
import { countWords } from '@/utils/text'
import VocabPanel from './VocabPanel.vue'
import WrongBookPanel from './WrongBookPanel.vue'

const { filtered, counts, tab, query, activeId, status, error, meta, select, load } = useArticles()
const { navOpen, toggleNav } = useLayout()
const { selected } = useAnalysis()
const { items: wrongItems } = useWrongBook()
const { items: vocabItems } = useVocab()

/** 左侧栏三大视图：真题目录 / 错题集锦 / 我的生词本 */
type ViewKey = 'catalog' | 'wrong' | 'vocab'
const view = ref<ViewKey>('catalog')

const views = [
  { key: 'catalog' as ViewKey, label: '真题目录', icon: BookMarked },
  { key: 'wrong' as ViewKey, label: '错题集锦', icon: CircleX },
  { key: 'vocab' as ViewKey, label: '生词本', icon: NotebookPen },
]

const badges = computed<Record<ViewKey, number>>(() => ({
  catalog: counts.value.all,
  wrong: wrongItems.value.length,
  vocab: vocabItems.value.length,
}))

const tabs: { key: TabKey; label: string; short: string }[] = [
  { key: 'all', label: '全部', short: '全' },
  { key: 'cet4', label: 'CET-4', short: '4' },
  { key: 'cet6', label: 'CET-6', short: '6' },
]

function pick(id: string) {
  select(id)
  selected.value = null
}

/** 折叠态点击视图图标：直接展开并切到该视图 */
function openView(key: ViewKey) {
  view.value = key
  navOpen.value = true
}
</script>

<template>
  <aside
    class="flex shrink-0 flex-col border-r border-paper-200 bg-white transition-[width] duration-200 dark:border-ink-700 dark:bg-ink-800"
    :class="navOpen ? 'w-[302px]' : 'w-[56px]'"
  >
    <!-- 折叠态：展开入口 + 三大视图快捷入口 -->
    <div v-if="!navOpen" class="flex flex-1 flex-col items-center gap-2 py-3">
      <button class="icon-btn" title="展开侧边栏" @click="toggleNav">
        <PanelLeftOpen :size="17" />
      </button>
      <div class="my-1 h-px w-6 bg-paper-200 dark:bg-ink-700" />
      <button
        v-for="item in views"
        :key="item.key"
        class="rail-tab relative"
        :class="{ 'is-on': view === item.key }"
        :title="item.label"
        @click="openView(item.key)"
      >
        <component :is="item.icon" :size="15" />
        <span
          v-if="badges[item.key]"
          class="absolute -right-1.5 -top-1.5 min-w-[14px] rounded-full bg-amber-500 px-1 text-[9px] font-semibold leading-[14px] text-white"
        >
          {{ badges[item.key] }}
        </span>
      </button>
    </div>

    <template v-else>
      <header class="flex items-center gap-2 px-3.5 pb-3 pt-4">
        <div
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400"
        >
          <BookOpenText :size="16" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[13px] font-semibold leading-tight">四六级真题精读</p>
          <p class="truncate text-[11px] text-stone-500">
            共 {{ counts.all }} 篇仔细阅读{{ meta?.offline ? ' · 离线样本' : '' }}
          </p>
        </div>
        <button class="icon-btn" title="折叠侧边栏" @click="toggleNav">
          <PanelLeftClose :size="16" />
        </button>
      </header>

      <!-- 视图切换 Tab -->
      <div class="px-3 pb-3">
        <div class="flex gap-1 rounded-lg bg-paper-100 p-1 dark:bg-ink-700">
          <button
            v-for="item in views"
            :key="item.key"
            class="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11.5px] font-medium transition"
            :class="
              view === item.key
                ? 'bg-white text-amber-700 shadow-sm dark:bg-ink-800 dark:text-amber-400'
                : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
            "
            @click="view = item.key"
          >
            <component :is="item.icon" :size="13" class="shrink-0" />
            <span class="truncate">{{ item.label }}</span>
            <span v-if="badges[item.key]" class="text-[10px] opacity-60">{{ badges[item.key] }}</span>
          </button>
        </div>
      </div>

      <!-- 视图一：真题目录 -->
      <template v-if="view === 'catalog'">
        <div class="px-3 pb-3">
          <div class="flex gap-1 rounded-lg bg-paper-100 p-1 dark:bg-ink-700">
            <button
              v-for="item in tabs"
              :key="item.key"
              class="flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition"
              :class="
                tab === item.key
                  ? 'bg-white text-amber-700 shadow-sm dark:bg-ink-800 dark:text-amber-400'
                  : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              "
              @click="tab = item.key"
            >
              {{ item.label }}<span class="ml-1 text-[10px] opacity-60">{{ counts[item.key] }}</span>
            </button>
          </div>
        </div>

        <div class="px-3 pb-3">
          <div class="relative">
            <Search class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" :size="14" />
            <input v-model="query" class="input pl-8 pr-7" placeholder="搜索年份或关键词…" />
            <button
              v-if="query"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-600"
              title="清除"
              @click="query = ''"
            >
              <X :size="13" />
            </button>
          </div>
        </div>

        <div class="scroll-thin flex-1 overflow-y-auto px-3 pb-4">
          <p v-if="status === 'loading'" class="py-6 text-center text-xs text-stone-500">题库加载中…</p>

          <div v-else-if="status === 'error'" class="px-1 py-6 text-center text-xs text-red-500">
            <p>{{ error }}</p>
            <button class="mt-2 inline-flex items-center gap-1 text-amber-600" @click="load">
              <RefreshCw :size="12" /> 重新加载
            </button>
          </div>

          <p v-else-if="!filtered.length" class="py-6 text-center text-xs text-stone-500">没有匹配的真题</p>

          <div v-else class="space-y-2">
            <button
              v-for="article in filtered"
              :key="article.id"
              class="w-full rounded-lg border px-3 py-2.5 text-left transition"
              :class="
                article.id === activeId
                  ? 'border-amber-400 bg-amber-50/70 dark:border-amber-500/60 dark:bg-amber-500/10'
                  : 'border-paper-200 hover:border-amber-300 hover:bg-paper-100/70 dark:border-ink-700 dark:hover:border-amber-500/40 dark:hover:bg-ink-700/60'
              "
              @click="pick(article.id)"
            >
              <div class="mb-1 flex items-center gap-1.5">
                <span class="chip" :class="article.category === 'cet6' ? 'chip-violet' : 'chip-amber'">
                  {{ article.category === 'cet4' ? 'CET-4' : 'CET-6' }}
                </span>
                <span class="text-[11px] text-stone-500">{{ article.year }}</span>
                <span v-if="article.id === activeId" class="ml-auto text-[11px] text-amber-600 dark:text-amber-400">
                  阅读中
                </span>
              </div>
              <p class="line-clamp-2 text-[13px] font-medium leading-snug">{{ article.title }}</p>
              <p class="mt-1 text-[11px] text-stone-500">
                {{ countWords(article.content) }} 词 · {{ article.questions.length }} 题
              </p>
            </button>
          </div>
        </div>
      </template>

      <!-- 视图二：错题集锦 -->
      <WrongBookPanel v-else-if="view === 'wrong'" />

      <!-- 视图三：我的生词本 -->
      <VocabPanel v-else />
    </template>
  </aside>
</template>
