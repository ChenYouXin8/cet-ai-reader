import { computed, ref, watch } from 'vue'
import type { AnalyzeTarget, ChatContext, ChatMessage } from '@/services/llm'
import { buildChatSystemPrompt, buildUserPrompt, streamChat, systemPromptFor } from '@/services/llm'
import { useArticles } from './useArticles'
import { parseWordAnalysis, useVocab } from './useVocab'
import { useSettings } from './useSettings'

/** 解析卡片下方的快捷追问胶囊 */
export interface QuickPrompt {
  /** 胶囊上的文案 */
  label: string
  /** 点击后实际发送的提问 */
  prompt: string
}

export interface Bubble {
  id: number
  role: 'user' | 'assistant'
  content: string
  /** 用户气泡标签，如「整句解析」「自由提问」 */
  label?: string
  streaming: boolean
  error?: string
  stopped?: boolean
  /** 结构化解析对应的目标类型；自由对答为空 */
  kind?: AnalyzeTarget['kind']
  /** 查词 / 长难句解析完成后可点的快捷追问 */
  chips?: QuickPrompt[]
}

export interface SelectionIndex {
  p: number
  s: number
}

/** 最近一次请求，用于「重新生成」（解析与自由追问都可重发） */
type LastRequest = { kind: 'target'; target: AnalyzeTarget } | { kind: 'chat'; text: string }

const messages = ref<Bubble[]>([])
const busy = ref(false)
const error = ref('')
const selected = ref<SelectionIndex | null>(null)
const lastRequest = ref<LastRequest | null>(null)
/** 用户最近关注的内容（点过的单词 / 句子 / 划选的短语），作为自由追问的隐式上下文 */
const focus = ref('')
/** 每次内容增量自增，用于驱动侧边栏自动滚动，避免深度监听长文本 */
const revision = ref(0)

let sequence = 0
let activeToken = 0
let controller: AbortController | null = null

const { settings } = useSettings()
const { enrich: enrichVocab } = useVocab()
const { active } = useArticles()

/** 切换文章后，之前关注的句子/单词已不属于当前文章，清空追问焦点 */
watch(
  () => active.value?.id,
  () => {
    focus.value = ''
  },
)

function pushBubble(bubble: Omit<Bubble, 'id'>): Bubble {
  sequence += 1
  const item: Bubble = { id: sequence, ...bubble }
  messages.value.push(item)
  return item
}

function abort() {
  controller?.abort()
  controller = null
}

/** 侧边栏用户气泡的标签文案 */
const TARGET_LABEL: Record<AnalyzeTarget['kind'], string> = {
  sentence: '整句解析',
  phrase: '短语解析',
  word: '单词精析',
  question: '题目深度剖析',
}

/** 生成用户气泡里展示的提问摘要 */
function describeTarget(target: AnalyzeTarget): string {
  if (target.kind === 'question') {
    return [
      `${target.no}. ${target.stem}`,
      ...target.options.map((option) => `${option.label}) ${option.text}`),
      `你的选择：${target.userAnswer ?? '未作答'}　标准答案：${target.answer}`,
    ].join('\n')
  }
  if (target.kind === 'sentence') return target.text
  return target.context ? `「${target.text}」\n\n所在原句：${target.context}` : `「${target.text}」`
}

/** 查词 / 长难句解析完成后的快捷追问胶囊（题目剖析不提供） */
function chipsFor(target: AnalyzeTarget): QuickPrompt[] | undefined {
  if (target.kind === 'word') {
    return [
      { label: '用该词造句', prompt: `用「${target.text}」造两个四级难度的句子，并给出中文翻译。` },
      { label: '辨析近义词', prompt: `辨析「${target.text}」与常见近义词的用法区别，并各给一个例句。` },
      { label: '查看派生词', prompt: `列出「${target.text}」的常见派生词（词性 + 释义），并各配一个例句。` },
    ]
  }
  if (target.kind === 'sentence') {
    return [
      { label: '简化这个句子', prompt: '把这个句子改写成更易读的短句，并说明简化掉了哪些成分。' },
      { label: '逐字逐句拆分', prompt: '逐字逐句拆解这个句子：标出主干、从句与修饰成分，并给出直译。' },
    ]
  }
  return undefined
}

/** 组装自由对话的隐式上下文：优先取当前精读的文章 */
function resolveContext(): ChatContext {
  return { articleTitle: active.value?.title ?? '', focus: focus.value }
}

/** 交互历史字符预算：避免把长解析整段塞回模型 */
const HISTORY_BUDGET = 6000

/**
 * 把已有消息整理成对话历史（从最新往前取，超出预算的部分截断），
 * 让「能用这个词造句吗」这类追问能接上前一轮的解析结果。
 */
function buildHistory(): ChatMessage[] {
  const history: ChatMessage[] = []
  let budget = HISTORY_BUDGET
  for (let i = messages.value.length - 1; i >= 0 && budget > 0; i -= 1) {
    const bubble = messages.value[i]
    const content = bubble.content.trim()
    if (!content) continue
    const sliced = content.length > budget ? content.slice(0, budget) : content
    budget -= sliced.length
    history.unshift({ role: bubble.role, content: sliced })
  }
  return history
}

/** 统一的流式请求流程：负责中断、busy 状态、停止与错误提示 */
async function request(payload: ChatMessage[], assistant: Bubble, onComplete?: (full: string) => void) {
  abort()
  const token = (activeToken += 1)

  busy.value = true
  controller = new AbortController()
  const signal = controller.signal

  try {
    const full = await streamChat(payload, { ...settings }, {
      signal,
      onDelta: (chunk) => {
        assistant.content += chunk
        revision.value += 1
      },
    })
    if (!assistant.content.trim()) assistant.error = '模型未返回内容，请重试或检查模型名称'
    else onComplete?.(full)
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      assistant.stopped = true
    } else {
      assistant.error = cause instanceof Error ? cause.message : String(cause)
    }
  } finally {
    assistant.streaming = false
    if (token === activeToken) {
      busy.value = false
      controller = null
    }
    revision.value += 1
  }
}

/**
 * 结构化解析（查词 / 句子 / 短语 / 题目）：提示词与请求方式保持原样，
 * 只是额外记录「关注内容」供后续自由追问注入上下文，并挂上快捷追问胶囊。
 */
function run(target: AnalyzeTarget) {
  error.value = ''
  lastRequest.value = { kind: 'target', target }
  focus.value = target.kind === 'question' ? '' : target.text

  pushBubble({
    role: 'user',
    content: describeTarget(target),
    label: TARGET_LABEL[target.kind],
    streaming: false,
  })

  const assistant = pushBubble({
    role: 'assistant',
    content: '',
    streaming: true,
    kind: target.kind,
    chips: chipsFor(target),
  })

  void request(
    [
      { role: 'system', content: systemPromptFor(target.kind) },
      { role: 'user', content: buildUserPrompt(target) },
    ],
    assistant,
    (full) => {
      // 查词解析完成：回填生词本中的音标与释义
      if (target.kind === 'word') enrichVocab(target.text, parseWordAnalysis(full))
    },
  )
}

/** 自由追问：注入当前文章与关注内容作为背景，并带上最近的对话作为多轮上下文 */
function chat(question: string) {
  const text = question.trim()
  if (!text) return

  error.value = ''
  lastRequest.value = { kind: 'chat', text }

  const history = buildHistory()
  pushBubble({ role: 'user', content: text, label: '自由提问', streaming: false })
  const assistant = pushBubble({ role: 'assistant', content: '', streaming: true })

  void request([{ role: 'system', content: buildChatSystemPrompt(resolveContext()) }, ...history, { role: 'user', content: text }], assistant)
}

const canRegenerate = computed(() => lastRequest.value !== null)

/**
 * 重发自由追问前，先移除上一轮相同的提问及其后的回答，
 * 否则 buildHistory 会把同一条问题重复带进请求的 messages。
 */
function dropLastTurn(text: string) {
  for (let i = messages.value.length - 1; i >= 0; i -= 1) {
    if (messages.value[i].role === 'user' && messages.value[i].content === text) {
      messages.value = messages.value.slice(0, i)
      return
    }
  }
}

function regenerate() {
  const last = lastRequest.value
  if (!last) return
  if (last.kind === 'target') {
    run(last.target)
    return
  }
  dropLastTurn(last.text)
  chat(last.text)
}

function stop() {
  abort()
}

function clear() {
  abort()
  messages.value = []
  error.value = ''
  selected.value = null
  lastRequest.value = null
  focus.value = ''
  busy.value = false
  revision.value += 1
}

export function useAnalysis() {
  return {
    messages,
    busy,
    error,
    selected,
    revision,
    canRegenerate,
    analyze: run,
    chat,
    regenerate,
    stop,
    clear,
  }
}
