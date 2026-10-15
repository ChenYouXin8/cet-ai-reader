import { computed, ref } from 'vue'
import type { Article, ArticleIndex, Category } from '@/types'

export type TabKey = 'all' | Category

const articles = ref<Article[]>([])
const status = ref<'loading' | 'ready' | 'error'>('loading')
const error = ref('')
const meta = ref<{ generatedAt: string; offline: boolean } | null>(null)

const tab = ref<TabKey>('all')
const query = ref('')
const activeId = ref('')

const filtered = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return articles.value.filter((article) => {
    if (tab.value !== 'all' && article.category !== tab.value) return false
    if (!keyword) return true
    return `${article.title} ${article.year} ${article.content}`.toLowerCase().includes(keyword)
  })
})

const active = computed(() => articles.value.find((article) => article.id === activeId.value) ?? null)

const counts = computed<Record<TabKey, number>>(() => ({
  all: articles.value.length,
  cet4: articles.value.filter((article) => article.category === 'cet4').length,
  cet6: articles.value.filter((article) => article.category === 'cet6').length,
}))

async function load() {
  status.value = 'loading'
  error.value = ''
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/articles.json`, { cache: 'no-cache' })
    if (!response.ok) throw new Error(`无法加载题库索引（HTTP ${response.status}）`)

    const payload = (await response.json()) as ArticleIndex | Article[]
    const list = Array.isArray(payload) ? payload : (payload.articles ?? [])
    if (!list.length) throw new Error('题库索引为空，请先执行 npm run sync:exams')

    articles.value = list
    meta.value = Array.isArray(payload)
      ? null
      : { generatedAt: payload.generatedAt, offline: Boolean(payload.offline) }

    if (!list.some((article) => article.id === activeId.value)) activeId.value = list[0].id
    status.value = 'ready'
  } catch (cause) {
    status.value = 'error'
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
}

function select(id: string) {
  activeId.value = id
}

export function useArticles() {
  return { articles, status, error, meta, tab, query, activeId, filtered, active, counts, load, select }
}
