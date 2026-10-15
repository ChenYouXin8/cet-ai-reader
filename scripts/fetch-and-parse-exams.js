#!/usr/bin/env node
/**
 * 四六级真题题库拉取与清洗脚本
 * ------------------------------------------------------------
 * 1. 若 data/raw-repo 不存在，则 git clone --depth=1 wamich/english-exem-md
 * 2. 递归扫描「远程仓库」与「data/custom 自定义题库」下的所有 Markdown / TXT 试卷，
 *    按目录 / 文件名识别 CET-4 与 CET-6
 * 3. 正则抽取 Part III / Reading Comprehension / Section C（仔细阅读）的
 *    年份、套数、正文段落与题目
 * 4. 两组题目按 id 合并去重（自定义题库优先）后，输出统一索引 public/data/articles.json
 * 5. 两边都没解析出文章时，才写入内置精选真题样本兜底
 *
 * 数据安全：本脚本对 data/custom 只读不写，任一次执行都不会覆盖或删除手动添加的题目。
 *
 * 用法：npm run sync:exams
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FALLBACK_ARTICLES } from './fallback-samples.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO_URL = 'https://github.com/wamich/english-exem-md.git'
const RAW_DIR = path.join(ROOT, 'data', 'raw-repo')
/** 手动维护的自定义题库目录：脚本只读不写，缺失时自动创建 */
const CUSTOM_DIR = path.join(ROOT, 'data', 'custom')
const OUT_FILE = path.join(ROOT, 'public', 'data', 'articles.json')
/** 答案基准（由 npm run answers 生成，题源本身不含参考答案） */
const ANSWER_KEY_FILE = path.join(ROOT, 'scripts', 'answer-key.json')

const LEVEL_LABEL = { cet4: '四级', cet6: '六级' }
const CLONE_TIMEOUT_MS = 120_000

/* ------------------------------------------------------------------ *
 * 文本清洗
 * ------------------------------------------------------------------ */

/** 去掉 Markdown 强调符号，用于标题 / 结构判断 */
const stripMd = (line) => line.replace(/[*_`]/g, '').trim()

/** 正文与题干清洗：去 HTML 标签、实体、Markdown 强调标记，压缩空白 */
function cleanText(input) {
  return String(input)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?u>/gi, '')
    .replace(/&emsp;|&nbsp;|&#160;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ------------------------------------------------------------------ *
 * 结构识别
 * ------------------------------------------------------------------ */

const HEADING_RE = /^#{1,6}\s/

/** 是否指向“阅读部分”的标题（Reading Comprehension / Careful Reading / Part III） */
function isReadingHeading(line) {
  const t = stripMd(line)
  if (!HEADING_RE.test(t)) return false
  return /part\s*III/i.test(t) || /reading\s+comprehension/i.test(t) || /careful\s+reading/i.test(t)
}

/** 是否为 Section C 标题（兼容 `### Section **C**` 写法） */
const isSectionC = (line) => /^#{1,6}\s*Section\s*C\b/i.test(stripMd(line))

/** 是否为 Passage 小标题，返回篇序号 */
function passageHeadingNo(line) {
  const t = stripMd(line)
  const m = t.match(/^#{1,6}\s*Passage\s+(One|Two|Three|Four|Five|[1-5])\b/i)
  if (!m) return 0
  const map = { one: 1, two: 2, three: 3, four: 4, five: 5 }
  const token = m[1].toLowerCase()
  return map[token] ?? Number(token)
}

/** 是否为题干行首，如 `46. Why ...` */
const QUESTION_RE = /^(\d{1,3})\s*[.、]\s*(.+)$/
/** 是否为选项行首，如 `A) ...` */
const OPTION_RE = /^([A-D])\s*[).、]\s*(.+)$/
/** 是否为 `Questions 46 to 50 are based on ...` 引导行 */
const Q_RANGE_RE = /Questions?\s*(\d{1,3})\s*(?:to|[-–—])\s*(\d{1,3})/i

/** 切出阅读部分（Part III）的行区间 */
function sliceReadingRegion(lines) {
  const start = lines.findIndex(isReadingHeading)
  if (start === -1) return null
  let end = lines.length
  for (let i = start + 1; i < lines.length; i += 1) {
    // 下一个一级 / 二级标题（Part IV 等）即为阅读部分结束
    if (/^#{1,2}\s/.test(lines[i])) {
      end = i
      break
    }
  }
  return { start, end }
}

/* ------------------------------------------------------------------ *
 * 题目解析
 * ------------------------------------------------------------------ */
function parseQuestions(blockLines) {
  const questions = []
  let current = null

  for (const raw of blockLines) {
    const line = stripMd(raw).replace(/\s+$/g, '')
    if (!line) continue

    const qm = line.match(QUESTION_RE)
    if (qm && !OPTION_RE.test(line)) {
      if (current) questions.push(current)
      current = { no: Number(qm[1]), stem: cleanText(qm[2]), options: [] }
      continue
    }

    const om = line.match(OPTION_RE)
    if (om && current) {
      current.options.push({ label: om[1], text: cleanText(om[2]) })
      continue
    }

    if (!current) continue
    // 题干续行
    if (current.options.length === 0) {
      current.stem = cleanText(`${current.stem} ${line}`)
      continue
    }
    // 选项续行
    const last = current.options[current.options.length - 1]
    last.text = cleanText(`${last.text} ${line}`)
  }
  if (current) questions.push(current)

  // 部分真题的选项顺序被打乱（A、C、B、D），统一按字母排序
  for (const q of questions) q.options.sort((a, b) => a.label.localeCompare(b.label))
  return questions
}

/* ------------------------------------------------------------------ *
 * 元信息识别
 * ------------------------------------------------------------------ */

function normalizeYear(text) {
  const cn = String(text).match(/(\d{4})\s*年\s*(\d{1,2})\s*月/)
  if (cn) return `${cn[1]}-${String(cn[2]).padStart(2, '0')}`
  const m = String(text).match(/(\d{4})\D{0,3}(\d{1,2})/)
  if (!m) return ''
  return `${m[1]}-${String(m[2]).padStart(2, '0')}`
}

function detectCategory(relPath, fileName, headerText) {
  const haystack = [relPath, fileName].join('/').toLowerCase()
  if (/cet[\s_-]*4|level[\s_-]*4|四级/.test(haystack)) return 'cet4'
  if (/cet[\s_-]*6|level[\s_-]*6|六级/.test(haystack)) return 'cet6'
  // 目录 / 文件名均无信息时，退化为试卷内首行标题
  if (/六级/.test(headerText)) return 'cet6'
  if (/四级/.test(headerText)) return 'cet4'
  return ''
}

function detectSetNo(fileName, headerText) {
  const fromName = fileName.match(/(\d+)(?=[^\d]*$)/)
  if (fromName) return Number(fromName[1])
  const fromHeader = headerText.match(/第\s*(\d+)\s*套/)
  return fromHeader ? Number(fromHeader[1]) : 1
}

/* ------------------------------------------------------------------ *
 * 单份试卷解析
 * ------------------------------------------------------------------ */

function parsePaper(markdown, { relPath, fileName }) {
  const lines = markdown.split(/\r?\n/)
  const headerText = lines.slice(0, 3).join(' ')

  const region = sliceReadingRegion(lines)
  if (!region) return { articles: [], reason: '未找到 Reading Comprehension 部分' }

  // 在阅读部分内定位 Section C（仔细阅读）
  let sectionStart = -1
  for (let i = region.start; i < region.end; i += 1) {
    if (isSectionC(lines[i])) {
      sectionStart = i
      break
    }
  }
  if (sectionStart === -1) return { articles: [], reason: '未找到 Section C（仔细阅读）' }

  // 按 #### Passage One / Two 切块
  const blocks = []
  let current = null
  for (let i = sectionStart + 1; i < region.end; i += 1) {
    const no = passageHeadingNo(lines[i])
    if (no) {
      if (current) blocks.push(current)
      current = { no, lines: [] }
      continue
    }
    if (current) current.lines.push(lines[i])
  }
  if (current) blocks.push(current)
  if (!blocks.length) return { articles: [], reason: 'Section C 内未找到 Passage 小标题' }

  const category = detectCategory(relPath, fileName, headerText)
  const year = normalizeYear(relPath) || normalizeYear(fileName) || normalizeYear(headerText)
  const setNo = detectSetNo(fileName, headerText)
  if (!category || !year) {
    return { articles: [], reason: `元信息不完整（category=${category || '?'}, year=${year || '?'}）` }
  }

  const articles = []
  for (const block of blocks) {
    // 正文 = 题干引导行之前，题目 = 第一个题干行之后
    let firstQ = block.lines.findIndex((l) => {
      const t = stripMd(l)
      return QUESTION_RE.test(t) && !OPTION_RE.test(t)
    })
    if (firstQ === -1) firstQ = block.lines.length

    const paragraphs = []
    let buffer = []
    const flush = () => {
      if (!buffer.length) return
      const text = cleanText(buffer.join(' '))
      if (text && text.length > 1) paragraphs.push(text)
      buffer = []
    }
    for (const raw of block.lines.slice(0, firstQ)) {
      const t = stripMd(raw)
      if (!t) {
        flush()
        continue
      }
      // 跳过说明文字、题干引导句、表格（词库）等非正文内容
      if (
        t.startsWith('|') ||
        t.startsWith('#') ||
        Q_RANGE_RE.test(t) ||
        /^Directions/i.test(t) ||
        /based on the (following )?passage/i.test(t)
      ) {
        flush()
        continue
      }
      buffer.push(t)
    }
    flush()

    const questions = parseQuestions(block.lines.slice(firstQ))
    const levelLabel = LEVEL_LABEL[category]
    const [y, m] = year.split('-')
    articles.push({
      id: `${category}-${year}-s${setNo}-p${block.no}`,
      category,
      year,
      title: `${y}年${Number(m)}月${levelLabel}仔细阅读（第${setNo}套）Passage ${block.no}`,
      content: paragraphs.join('\n\n'),
      questions,
    })
  }
  return { articles, reason: '' }
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */

/** 可作为题源的文件扩展名：同时支持 .md 与 .txt */
const SOURCE_EXT_RE = /\.(md|txt)$/i
const IGNORED_NAME_RE = /^readme/i

/** 递归扫描目录下所有题源文件（不存在的目录返回空数组） */
function walkSources(dir, base = dir) {
  if (!fs.existsSync(dir)) return []
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...walkSources(full, base))
    else if (entry.isFile() && SOURCE_EXT_RE.test(entry.name) && !IGNORED_NAME_RE.test(entry.name)) {
      found.push({ full, relPath: path.relative(base, full).split(path.sep).join('/'), fileName: entry.name })
    }
  }
  return found
}

/** 逐个解析某目录下的题源文件，跳过原因写入 skipped */
function collectArticles(dir, label, skipped) {
  const files = walkSources(dir)
  const articles = []
  for (const file of files) {
    try {
      const { articles: parsed, reason } = parsePaper(fs.readFileSync(file.full, 'utf8'), file)
      if (parsed.length) articles.push(...parsed)
      else skipped.push(`[${label}] ${file.relPath}（${reason}）`)
    } catch (error) {
      skipped.push(`[${label}] ${file.relPath}（解析异常：${error.message}）`)
    }
  }
  return { articles, fileCount: files.length }
}

/**
 * 按 id 合并多组文章并去重：靠前的分组优先。
 * 自定义题库排在远程仓库之前，保证手动维护的题目不会被仓库里的同名文件顶掉。
 */
function mergeArticles(...groups) {
  const merged = []
  const seen = new Set()
  for (const group of groups) {
    for (const article of group) {
      if (seen.has(article.id)) continue
      seen.add(article.id)
      merged.push(article)
    }
  }
  return merged
}

function ensureRepo() {
  if (fs.existsSync(RAW_DIR)) return { ok: true, cloned: false }
  fs.mkdirSync(path.dirname(RAW_DIR), { recursive: true })
  console.log(`· 本地题库不存在，正在克隆 ${REPO_URL} ...`)
  const result = spawnSync('git', ['clone', '--depth=1', REPO_URL, RAW_DIR], {
    stdio: 'inherit',
    timeout: CLONE_TIMEOUT_MS,
    shell: false,
  })
  if (result.error || result.status !== 0) {
    console.warn('· 克隆失败（网络不通或无 git），本次跳过远程题库')
    return { ok: false, cloned: false }
  }
  return { ok: true, cloned: true }
}

function sortArticles(list) {
  const catRank = { cet4: 0, cet6: 1 }
  return list.sort((a, b) => {
    if (catRank[a.category] !== catRank[b.category]) return catRank[a.category] - catRank[b.category]
    if (a.year !== b.year) return b.year.localeCompare(a.year)
    const [, sa, pa] = a.id.match(/-s(\d+)-p(\d+)$/) ?? []
    const [, sb, pb] = b.id.match(/-s(\d+)-p(\d+)$/) ?? []
    if (Number(sa) !== Number(sb)) return Number(sa) - Number(sb)
    return Number(pa) - Number(pb)
  })
}

/** 读取答案基准（题源不含参考答案，由 npm run answers 调用模型生成） */
function loadAnswerKey() {
  if (!fs.existsSync(ANSWER_KEY_FILE)) return {}
  try {
    const payload = JSON.parse(fs.readFileSync(ANSWER_KEY_FILE, 'utf8'))
    return payload && typeof payload === 'object' ? payload : {}
  } catch (error) {
    console.warn(`· 答案基准读取失败（${error.message}），本次跳过合并`)
    return {}
  }
}

/** 按「文章 id + 题号」把答案基准合并进题目 */
function mergeAnswers(articles) {
  const key = loadAnswerKey()
  let filled = 0
  for (const article of articles) {
    const map = key[article.id]
    if (!map || map.__failed) continue
    for (const question of article.questions) {
      const value = map[question.no] ?? map[String(question.no)]
      if (typeof value === 'string' && /^[A-D]$/.test(value)) {
        question.answer = value
        filled += 1
      }
    }
  }
  return filled
}

function writeIndex(articles, meta) {
  const payload = {
    generatedAt: new Date().toISOString(),
    source: REPO_URL,
    ...meta,
    total: articles.length,
    articles,
  }
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return payload
}

function main() {
  console.log('\n== 四六级题库同步 ==')

  // 自定义题库目录：只读不写；缺失时自动创建，保证手动添加的题目永远有落脚点
  fs.mkdirSync(CUSTOM_DIR, { recursive: true })

  const skipped = []

  // 先扫自定义题库：即便远程仓库克隆失败，data/custom 里的题目也一定会被读入
  const custom = collectArticles(CUSTOM_DIR, '自定义', skipped)
  console.log(`· 扫描到自定义题库 ${custom.fileCount} 个文件（${path.relative(ROOT, CUSTOM_DIR)}，只读不写）`)

  const repo = ensureRepo()
  const repoResult = repo.ok ? collectArticles(RAW_DIR, '远程仓库', skipped) : { articles: [], fileCount: 0 }
  if (repo.ok) console.log(`· 扫描到远程仓库 ${repoResult.fileCount} 份试卷`)

  if (skipped.length) {
    console.log(`· 跳过 ${skipped.length} 个文件：`)
    for (const item of skipped) console.log(`    - ${item}`)
  }

  // 合并去重：自定义题库优先，两边都不会被对方覆盖
  let articles = mergeArticles(custom.articles, repoResult.articles)

  let offline = false
  if (!articles.length) {
    offline = true
    articles = FALLBACK_ARTICLES.map((item) => ({ ...item }))
    console.log(`· 未解析出真题，已写入 ${articles.length} 篇内置精选真题样本（离线兜底）`)
  }

  sortArticles(articles)
  const filled = mergeAnswers(articles)
  if (filled) console.log(`· 已合并标准答案基准 ${filled} 题`)
  else if (!offline) console.log('· 未找到答案基准，可执行 npm run answers 生成')

  const payload = writeIndex(articles, {
    offline,
    cet4: articles.filter((a) => a.category === 'cet4').length,
    cet6: articles.filter((a) => a.category === 'cet6').length,
  })

  // 统计「自定义题库」在最终索引里实际占用的篇数（去重后）
  const customIds = new Set(custom.articles.map((article) => article.id))
  const customKept = articles.filter((article) => customIds.has(article.id)).length

  console.log(`· 已生成 ${path.relative(ROOT, OUT_FILE)}`)
  console.log(
    `  共 ${payload.total} 篇（CET-4 ${payload.cet4} / CET-6 ${payload.cet6}，其中自定义题库 ${customKept} 篇）${
      offline ? ' · 离线兜底模式' : ''
    }\n`,
  )
}

main()
