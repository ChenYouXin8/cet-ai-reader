<script setup lang="ts">
import { computed } from 'vue'
import { Download, FileSpreadsheet, Trash2 } from 'lucide-vue-next'
import { useVocab } from '@/composables/useVocab'
import { formatDateTime } from '@/utils/storage'

const { items, remove, clear, exportAnki, exportCsv } = useVocab()

const total = computed(() => items.value.length)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex items-center gap-2 px-3 pb-2">
      <span class="text-[11px] text-stone-500">共 {{ total }} 个生词</span>
      <button
        class="ml-auto inline-flex items-center gap-1 text-[11px] text-stone-500 transition hover:text-red-600 disabled:opacity-40 dark:hover:text-red-400"
        :disabled="!total"
        @click="clear"
      >
        <Trash2 :size="12" /> 一键清空
      </button>
    </div>

    <div class="flex gap-1.5 px-3 pb-3">
      <button class="pill-btn" :disabled="!total" title="导出为 Anki 卡片" @click="exportAnki">
        <Download :size="12" /> 📥 导出 Anki
      </button>
      <button class="pill-btn" :disabled="!total" title="导出为 Excel / CSV" @click="exportCsv">
        <FileSpreadsheet :size="12" /> 📊 导出 CSV
      </button>
    </div>

    <div class="scroll-thin flex-1 overflow-y-auto px-3 pb-4">
      <p v-if="!total" class="rounded-lg border border-dashed border-paper-200 px-3 py-6 text-center text-xs leading-relaxed text-stone-500 dark:border-ink-700">
        还没有生词。阅读时点击任意英文单词查词，会自动归档到这里。
      </p>

      <div v-else class="space-y-2">
        <article
          v-for="item in items"
          :key="item.id"
          class="rounded-lg border border-paper-200 bg-white px-3 py-2.5 dark:border-ink-700 dark:bg-ink-800"
        >
          <div class="flex items-baseline gap-2">
            <span class="text-[14px] font-semibold">{{ item.word }}</span>
            <span v-if="item.phonetic" class="text-[11px] text-stone-500">{{ item.phonetic }}</span>
            <span class="chip ml-auto" :class="item.category === 'cet6' ? 'chip-violet' : 'chip-amber'">
              {{ item.category === 'cet4' ? 'CET-4' : 'CET-6' }}
            </span>
            <button class="icon-btn h-5 w-5" title="删除该生词" @click="remove(item.id)">
              <Trash2 :size="12" />
            </button>
          </div>

          <p v-if="item.definition" class="mt-1 text-[12px] leading-relaxed text-stone-700 dark:text-stone-300">
            {{ item.definition }}
          </p>
          <p v-else class="mt-1 text-[11px] italic text-stone-400">释义解析中…</p>

          <p v-if="item.contextSentence" class="mt-1.5 border-l-2 border-paper-300 pl-2 text-[11px] italic leading-relaxed text-stone-500 dark:border-ink-600">
            {{ item.contextSentence }}
          </p>

          <p class="mt-1 truncate text-[10.5px] text-stone-400" :title="item.sourceArticle">
            {{ item.sourceArticle }} · {{ formatDateTime(item.addedAt) }}
          </p>
        </article>
      </div>
    </div>
  </div>
</template>
