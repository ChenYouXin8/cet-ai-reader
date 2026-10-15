import { ref, watch } from 'vue'
import type { AnswerLetter, Category, QuestionOption } from '@/types'
import { readJson, writeJson } from '@/utils/storage'

export const WRONG_BOOK_STORAGE_KEY = 'cet_wrong_questions_v1'

/** 错题条目：提交判分后选错的题目自动归集，永久保留直到用户主动移除 */
export interface WrongQuestion {
  /** `${articleId}_q_${no}`，保证同一篇文章的同一题只存在一条 */
  id: string
  articleId: string
  articleTitle: string
  category: Category
  no: number
  stem: string
  options: QuestionOption[]
  answer: AnswerLetter
  userAnswer: AnswerLetter
  /** 首次收录时间 */
  addedAt: number
  /** 最近一次做错的时间（重复做错同一题时只更新此字段） */
  updatedAt: number
}

export type WrongQuestionInput = Omit<WrongQuestion, 'id' | 'addedAt' | 'updatedAt'>

/** 去重键：文章 ID + 题号 */
const keyOf = (entry: { articleId: string; no: number }) => `${entry.articleId}|${entry.no}`
/** 唯一标识 */
const idOf = (entry: { articleId: string; no: number }) => `${entry.articleId}_q_${entry.no}`

/** 兼容早期版本数据：统一 id 格式、补齐 updatedAt，并顺手合并历史重复条目 */
function normalize(list: WrongQuestion[]): WrongQuestion[] {
  const seen = new Map<string, WrongQuestion>()
  for (const raw of list) {
    const item: WrongQuestion = {
      ...raw,
      id: idOf(raw),
      addedAt: raw.addedAt ?? Date.now(),
      updatedAt: raw.updatedAt ?? raw.addedAt ?? Date.now(),
    }
    const key = keyOf(item)
    if (!seen.has(key)) seen.set(key, item)
  }
  return [...seen.values()]
}

const items = ref<WrongQuestion[]>(normalize(readJson<WrongQuestion[]>(WRONG_BOOK_STORAGE_KEY, [])))

watch(items, (value) => writeJson(WRONG_BOOK_STORAGE_KEY, value), { deep: true })

export function useWrongBook() {
  return {
    items,
    /**
     * 归集错题：同一篇文章的同一题号在列表中只保留一条。
     * 已存在 → 仅刷新 updatedAt（同时同步最新的选项与作答），首次收录时间保持不变；
     * 不存在 → 新增并置顶。传空数组时不改动任何历史错题。
     */
    record(entries: WrongQuestionInput[]) {
      if (!entries.length) return
      const now = Date.now()
      const current = new Map(items.value.map((item) => [keyOf(item), item]))
      const fresh: WrongQuestion[] = []

      for (const entry of entries) {
        const key = keyOf(entry)
        const existing = current.get(key)
        const next: WrongQuestion = existing
          ? { ...entry, id: idOf(entry), addedAt: existing.addedAt, updatedAt: now }
          : { ...entry, id: idOf(entry), addedAt: now, updatedAt: now }
        current.set(key, next)
        if (!existing) fresh.push(next)
      }

      // 新收录的置顶，历史错题维持原有顺序并带上刚更新的字段
      const rest = items.value
        .filter((item) => !fresh.some((added) => keyOf(added) === keyOf(item)))
        .map((item) => current.get(keyOf(item)) as WrongQuestion)

      items.value = [...fresh, ...rest]
    },
    /** 单条移除：只删这一道题，不影响原文与其他错题 */
    remove(id: string) {
      items.value = items.value.filter((item) => item.id !== id)
    },
    clear() {
      items.value = []
    },
  }
}
