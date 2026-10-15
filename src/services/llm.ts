/**
 * 专属大模型请求模块
 * 使用原生 fetch + ReadableStream + TextDecoder 实现标准 SSE 流式解析。
 */

/** 专属服务默认地址（请求路径自动补齐 /chat/completions） */
export const DEFAULT_BASE_URL = 'https://gs.neisvip.com:2300/v1'

/** 前端统一调用的地址：由 vite.config.ts 中的 proxy 转发到 DEFAULT_BASE_URL，规避浏览器 CORS 拦截 */
export const PROXY_ENDPOINT = '/api/ai/chat/completions'

export interface LlmConfig {
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 整句精析 */
export interface SentenceTarget {
  kind: 'sentence'
  text: string
  source?: string
}

/** 划选短语定向解析 */
export interface PhraseTarget {
  kind: 'phrase'
  text: string
  /** 短语所在原句 */
  context?: string
  source?: string
}

/** 单词精析 */
export interface WordTarget {
  kind: 'word'
  text: string
  /** 单词所在原句 */
  context?: string
  source?: string
}

/** 题目深度剖析（判分后触发） */
export interface QuestionTarget {
  kind: 'question'
  no: number
  stem: string
  options: { label: string; text: string }[]
  /** 标准答案 */
  answer: string
  /** 用户所选，未作答则缺省 */
  userAnswer?: string
  /** 整篇阅读原文，用于原文定位 */
  passage: string
  source?: string
}

export type AnalyzeTarget = SentenceTarget | PhraseTarget | WordTarget | QuestionTarget

/** 整句精析 · 教研名师系统提示词 */
export const SYSTEM_PROMPT = [
  '你是一名资深大学英语四六级教研名师。请对用户提供的四六级阅读原文句子或段落进行精简、结构化的教学解析。',
  '必须输出以下三个层级，禁止任何多余寒暄客套话：',
  '### 1. 精准译文',
  '[通顺且契合四六级考点语境的双语翻译]',
  '### 2. 核心考点词/短语',
  '- **词汇/短语** [音标] (词性) 核心释义 / 考点搭配',
  '### 3. 长难句剖析',
  '[提取核心主干（主谓宾），指出关键从句结构与语法功能]',
].join('\n')

/** 单词精析 · 专属提示词 */
export const SYSTEM_PROMPT_WORD = [
  '你是一名资深大学英语四六级教研名师。请针对用户给出的英文单词做精简、结构化的考点解析，禁止任何寒暄客套话。',
  '必须严格按照以下格式输出：',
  '### 单词：[Word] [音标]',
  '- **四六级核心释义**：[当前语境词义与高频考义]',
  '- **真题考点搭配**：[列出 2 个常见搭配/短语]',
  '- **原句语境理解**：[简析该词在文中句子的含义]',
].join('\n')

/** 题目深度剖析 · 专属提示词 */
export const SYSTEM_PROMPT_QUESTION = [
  '你是一名资深大学英语四六级教研名师。请结合给出的阅读原文，对这道仔细阅读选择题做深度剖析，禁止任何寒暄客套话。',
  '必须严格按照以下格式输出：',
  '### 1. 正确答案定位与依据',
  '- 定位到原文第 X 段第 Y 句："[引用原文句子]"',
  '- **解题逻辑**：[详细解释为什么选该项，指出同义替换词]',
  '',
  '### 2. 干扰项避坑分析',
  '- A 选项：[错误原因：如无中生有/张冠李戴/偷换概念]',
  '- B 选项：[错误原因]',
  '- C 选项：[错误原因]',
  '- D 选项：[错误原因]',
].join('\n')

/** 按解析类型取对应系统提示词 */
export function systemPromptFor(kind: AnalyzeTarget['kind']): string {
  if (kind === 'word') return SYSTEM_PROMPT_WORD
  if (kind === 'question') return SYSTEM_PROMPT_QUESTION
  return SYSTEM_PROMPT
}

/** 自由对话的隐式上下文：当前精读的文章，以及用户最近关注的内容 */
export interface ChatContext {
  /** 当前精读文章标题 */
  articleTitle?: string
  /** 用户最近点击/划选的句子、单词或短语 */
  focus?: string
}

/**
 * 自由对话 · 上下文注入系统提示词。
 * 追问时不改变原有三类解析的模板，只是把「正在读哪篇、关注哪句」作为背景隐式带给模型。
 */
export function buildChatSystemPrompt(context: ChatContext): string {
  const lines = [
    '你是资深大学英语四六级教学名师，正在陪伴学生精读真题，请解答学生提出的各种英语问题。',
    '输出要求：条理清晰、可使用 Markdown；涉及语言点时给出简明例句；不要输出与问题无关的寒暄客套话。',
  ]
  if (context.articleTitle) lines.push(`当前用户正在精读四六级真题《${context.articleTitle}》。`)
  if (context.focus) lines.push(`用户关注的原文内容为："${context.focus}"`)
  lines.push('请基于以上上下文，结合英语教学名师的身份解答用户的各种疑问。')
  return lines.join('\n')
}

/** 默认走本地代理，自定义 Base URL 时直连该地址 */
export function resolveEndpoint(baseUrl: string): string {
  const base = (baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '')
  if (base === DEFAULT_BASE_URL) return PROXY_ENDPOINT
  return `${base}/chat/completions`
}

export function isUsingProxy(baseUrl: string): boolean {
  return resolveEndpoint(baseUrl) === PROXY_ENDPOINT
}

/** 组装用户消息 */
export function buildUserPrompt(target: AnalyzeTarget): string {
  const lines: string[] = []

  if (target.kind === 'question') {
    lines.push('请解析下面这道四六级仔细阅读选择题：', '')
    lines.push(`【题干】${target.no}. ${target.stem}`)
    for (const option of target.options) lines.push(`  ${option.label}) ${option.text}`)
    lines.push(`【标准答案】${target.answer}`)
    lines.push(`【考生所选】${target.userAnswer ?? '未作答'}`)
    lines.push(`【出处】${target.source ?? ''}`, '')
    lines.push('【阅读原文】', target.passage)
    lines.push('', '提示：若考生所选与标准答案不一致，请在剖析中明确指出该干扰项的陷阱所在。')
    return lines.join('\n')
  }

  if (target.kind === 'phrase') {
    lines.push('请针对下面这个短语/表达做定向考点解析，包含它在原句中的语法功能与常考搭配：', '')
    lines.push(`【目标短语】${target.text}`)
  } else if (target.kind === 'word') {
    lines.push('请针对下面这个单词做定向考点解析，输出音标、词性、语境释义与考点搭配：', '')
    lines.push(`【目标单词】${target.text}`)
  } else {
    lines.push('请解析下面这句四六级阅读真题原文：', '')
    lines.push(`【原句】${target.text}`)
  }

  if (target.kind !== 'sentence' && target.context) lines.push(`【所在原句】${target.context}`)
  if (target.source) lines.push(`【出处】${target.source}`)
  return lines.join('\n')
}

export interface StreamHandlers {
  onDelta: (chunk: string) => void
  signal?: AbortSignal
}

interface DeltaChoice {
  delta?: { content?: unknown }
  message?: { content?: unknown }
  text?: unknown
}

function extractContent(payload: unknown, streaming: boolean): string {
  const choice = (payload as { choices?: DeltaChoice[] } | null)?.choices?.[0]
  if (!choice) return ''
  const value = streaming ? choice.delta?.content : (choice.message?.content ?? choice.text)
  return typeof value === 'string' ? value : ''
}

/**
 * 发起流式解析请求，逐块回调增量文本，并在结束时返回完整内容。
 * 传入手写的 AbortSignal 可中途停止生成。
 */
export async function streamChat(
  messages: ChatMessage[],
  config: LlmConfig,
  handlers: StreamHandlers,
): Promise<string> {
  if (!config.apiKey) throw new Error('缺少 API Key，请在设置抽屉中填写')

  const response = await fetch(resolveEndpoint(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      stream: true,
    }),
    signal: handlers.signal,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `接口返回 ${response.status} ${response.statusText}${detail ? ` · ${detail.slice(0, 300)}` : ''}`,
    )
  }
  if (!response.body) throw new Error('响应为空，无法读取流式数据')

  // 少数网关忽略 stream 参数直接返回整包 JSON，这里做兼容兜底
  if (!(response.headers.get('content-type') ?? '').includes('event-stream')) {
    const payload = await response.json().catch(() => null)
    const text = extractContent(payload, false)
    if (!text) throw new Error('响应格式无法解析，请确认模型名称是否正确')
    handlers.onDelta(text)
    return text
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let full = ''
  let buffer = ''

  const consumeLine = (rawLine: string) => {
    const line = rawLine.trim()
    if (!line.startsWith('data:')) return
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') return

    let payload: unknown
    try {
      payload = JSON.parse(data)
    } catch {
      return // 心跳或非 JSON 片段，忽略
    }

    const error = (payload as { error?: { message?: string } } | null)?.error
    if (error) throw new Error(error.message || '模型返回错误')

    const chunk = extractContent(payload, true)
    if (chunk) {
      full += chunk
      handlers.onDelta(chunk)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) consumeLine(line)
  }

  buffer += decoder.decode()
  if (buffer.trim()) consumeLine(buffer)

  return full
}
