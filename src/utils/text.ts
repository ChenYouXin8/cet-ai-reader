/**
 * 文本处理工具：段落切分、分句引擎、词数统计
 */

/** 常见缩写，避免在缩写点号处误断句 */
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'jr', 'sr', 'vs', 'etc', 'eg', 'ie',
  'no', 'fig', 'inc', 'ltd', 'co', 'approx', 'cf', 'al', 'vol', 'pp',
])

/** 按空行切分段落 */
export function splitParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * 交互分句引擎：按句末标点（. ? !）将正文切分为独立句子，同时规避
 * 小数（1.5）、多级缩写（U.S.）与常见缩写（Mr.）造成的误切分。
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = []
  let start = 0

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char !== '.' && char !== '!' && char !== '?') continue

    // 小数：前后均为数字，如 1.5、25,000.75
    if (char === '.' && /\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? '')) continue

    // 多级缩写：U.S.、e.g.、i.e.
    if (char === '.' && /(?:[A-Za-z]\.){2,}$/.test(text.slice(Math.max(0, i - 5), i + 1))) {
      if (/[A-Za-z]/.test(text[i + 1] ?? '')) continue
    }

    // 单词缩写：Mr. / Dr. / etc.
    const prevWord = text.slice(0, i).match(/([A-Za-z]+)$/)?.[1] ?? ''
    if (char === '.' && ABBREVIATIONS.has(prevWord.toLowerCase())) continue

    // 收束结尾的引号、括号
    let end = i + 1
    while (end < text.length && /["'”’)\]】]/.test(text[end])) end += 1

    const sentence = text.slice(start, end).trim()
    if (sentence) sentences.push(sentence)

    let next = end
    while (next < text.length && /\s/.test(text[next])) next += 1
    start = next
    i = next - 1
  }

  const tail = text.slice(start).trim()
  if (tail) sentences.push(tail)
  return sentences
}

/** 统计英文词数 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

export interface SentenceToken {
  text: string
  /** 是否为可点击查词的英文单词 */
  word: boolean
}

/**
 * 单词级切分：把句子拆成「英文单词」与「标点/空白」两类 token，
 * 供正文渲染时把每个单词包裹为可点击 span（不影响原有空格与标点）。
 */
export function tokenizeSentence(sentence: string): SentenceToken[] {
  const tokens: SentenceToken[] = []
  // 单词：字母，允许内部连字符与撇号（well-being、don’t、U.S. 拆为 U / S）
  const wordRe = /[A-Za-z]+(?:['’\-][A-Za-z]+)*/g
  let last = 0
  let match = wordRe.exec(sentence)

  while (match) {
    if (match.index > last) tokens.push({ text: sentence.slice(last, match.index), word: false })
    tokens.push({ text: match[0], word: true })
    last = match.index + match[0].length
    match = wordRe.exec(sentence)
  }
  if (last < sentence.length) tokens.push({ text: sentence.slice(last), word: false })

  return tokens
}

/** 复制文本到剪贴板（含非安全上下文的降级实现） */
export async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {
    /* 继续走降级方案 */
  }
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  document.body.removeChild(area)
}
