import { ref, watch } from 'vue'
import type { Category } from '@/types'
import { dateStamp, downloadText, formatDateTime, readJson, writeJson } from '@/utils/storage'

export const VOCAB_STORAGE_KEY = 'cet_vocab_notebook_v1'

/** 单条生词记录 */
export interface VocabEntry {
  id: string
  word: string
  phonetic: string
  definition: string
  contextSentence: string
  sourceArticle: string
  category: Category
  addedAt: number
}

/** 收录生词时随查词上下文一起带入的信息 */
export interface VocabContext {
  contextSentence?: string
  sourceArticle?: string
  category?: Category
}

const CATEGORY_TAG: Record<Category, string> = { cet4: 'CET4', cet6: 'CET6' }

const items = ref<VocabEntry[]>(readJson<VocabEntry[]>(VOCAB_STORAGE_KEY, []))

watch(items, (value) => writeJson(VOCAB_STORAGE_KEY, value), { deep: true })

let seq = 0
const nextId = () => `vocab-${Date.now()}-${(seq += 1)}`

/** 生词去重统一忽略大小写与首尾空白 */
const isSameWord = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * 收录生词：已存在同名单词时只刷新查词时间与出处，不产生重复条目。
 */
function add(word: string, context: VocabContext = {}) {
  const clean = word.trim()
  if (!clean) return

  const index = items.value.findIndex((item) => isSameWord(item.word, clean))
  if (index === -1) {
    items.value = [
      {
        id: nextId(),
        word: clean,
        phonetic: '',
        definition: '',
        contextSentence: context.contextSentence ?? '',
        sourceArticle: context.sourceArticle ?? '',
        category: context.category ?? 'cet4',
        addedAt: Date.now(),
      },
      ...items.value,
    ]
    return
  }

  const next = [...items.value]
  next[index] = {
    ...next[index],
    addedAt: Date.now(),
    contextSentence: context.contextSentence ?? next[index].contextSentence,
    sourceArticle: context.sourceArticle ?? next[index].sourceArticle,
    category: context.category ?? next[index].category,
  }
  items.value = next
}

/** AI 流式结束后回填音标与释义 */
function enrich(word: string, patch: { phonetic?: string; definition?: string }) {
  const index = items.value.findIndex((item) => isSameWord(item.word, word))
  if (index === -1) return

  const current = items.value[index]
  const phonetic = patch.phonetic?.trim() || current.phonetic
  const definition = patch.definition?.trim() || current.definition
  if (phonetic === current.phonetic && definition === current.definition) return

  const next = [...items.value]
  next[index] = { ...current, phonetic, definition }
  items.value = next
}

function remove(id: string) {
  items.value = items.value.filter((item) => item.id !== id)
}

function clear() {
  items.value = []
}

/* ------------------------------------------------------------------ *
 * 导出：纯前端 Blob 下载
 * ------------------------------------------------------------------ */

/** Anki 字段内不允许出现制表符与换行 */
const flatten = (value: string) => value.replace(/\t/g, ' ').replace(/\r?\n/g, '<br>')

/** Anki 背面：音标 + 释义 + 真题原句 + 出处 */
function ankiBack(entry: VocabEntry): string {
  const phonetic = entry.phonetic ? `${entry.phonetic}<br>` : ''
  const definition = entry.definition || '（暂无释义）'
  const sentence = entry.contextSentence || '—'
  const source = entry.sourceArticle || '—'
  return `${phonetic}<b>释义：</b>${definition}<br><br><b>真题原句：</b>${sentence}<br><small>出处：${source}</small>`
}

/** 导出为 Anki 卡片（制表符分隔：单词 / 背面 HTML / 标签） */
function exportAnki() {
  if (!items.value.length) return
  const lines = items.value.map((entry) =>
    [flatten(entry.word), flatten(ankiBack(entry)), CATEGORY_TAG[entry.category]].join('\t'),
  )
  downloadText(`CET_Vocab_Anki_${dateStamp()}.txt`, `${lines.join('\n')}\n`)
}

/** CSV 单元格转义 */
function csvCell(value: string): string {
  const text = value.replace(/\r?\n/g, ' ')
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** 导出为 CSV（含 UTF-8 BOM，避免 Windows 下 Excel 打开乱码） */
function exportCsv() {
  if (!items.value.length) return
  const header = ['单词', '音标', '释义', '真题例句', '所属文章', '分类', '添加时间']
  const rows = items.value.map((entry) => [
    entry.word,
    entry.phonetic,
    entry.definition,
    entry.contextSentence,
    entry.sourceArticle,
    CATEGORY_TAG[entry.category],
    formatDateTime(entry.addedAt),
  ])
  const content = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
  downloadText(`CET_Vocab_${dateStamp()}.csv`, content, 'text/csv;charset=utf-8')
}

/**
 * 从「单词精析」的 Markdown 输出中提取音标与四六级核心释义。
 * 对应格式：`### 单词：[Word] [音标]` + `- **四六级核心释义**：...`
 */
export function parseWordAnalysis(markdown: string): { phonetic: string; definition: string } {
  const heading = markdown.match(/^#{1,6}\s*单词[：:][^\n]*/m)?.[0] ?? ''
  const phoneticMatch = heading.match(/\/([^/\n]{1,40})\//)
  const phonetic = phoneticMatch ? `/${phoneticMatch[1].trim()}/` : ''

  const definitionMatch = markdown.match(/四六级核心释义[^\n]*?[：:]\s*([^\n]+)/)
  const definition = definitionMatch
    ? definitionMatch[1].replace(/\*\*/g, '').replace(/^[-\s]*/, '').trim()
    : ''

  return { phonetic, definition }
}

export function useVocab() {
  return { items, add, enrich, remove, clear, exportAnki, exportCsv }
}
