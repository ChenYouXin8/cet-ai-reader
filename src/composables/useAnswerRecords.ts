import { ref, watch } from 'vue'
import type { AnswerLetter } from '@/types'
import { readJson, writeJson } from '@/utils/storage'

export const ANSWERS_STORAGE_KEY = 'cet_answers_storage_v1'

/**
 * 单篇文章的答题记录。
 * selected 以「题目在该篇文章中的序号」为键（"0" ~ "4"），与需求约定的结构一致。
 */
export interface AnswerRecord {
  selected: Record<string, AnswerLetter>
  isSubmitted: boolean
  score: number
  submittedAt: number
}

export type AnswerRecords = Record<string, AnswerRecord>

const records = ref<AnswerRecords>(readJson<AnswerRecords>(ANSWERS_STORAGE_KEY, {}))

watch(records, (value) => writeJson(ANSWERS_STORAGE_KEY, value), { deep: true })

export function useAnswerRecords() {
  return {
    records,
    get(articleId: string): AnswerRecord | null {
      return records.value[articleId] ?? null
    },
    save(articleId: string, record: AnswerRecord) {
      records.value = { ...records.value, [articleId]: record }
    },
    /** 清空某篇文章的答题记录（重新作答） */
    remove(articleId: string) {
      const next = { ...records.value }
      delete next[articleId]
      records.value = next
    },
    clearAll() {
      records.value = {}
    },
  }
}
