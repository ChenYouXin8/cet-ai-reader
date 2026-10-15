#!/usr/bin/env node
/**
 * 答案基准生成脚本（一次性工具）
 * ------------------------------------------------------------
 * 开源题库 wamich/english-exem-md 只包含试卷、不含参考答案，
 * 这里调用项目已配置的专属大模型，按篇生成 A/B/C/D 答案基准，
 * 落盘到 scripts/answer-key.json，供 fetch-and-parse-exams.js 合并。
 *
 * 用法：
 *   node scripts/generate-answer-key.js            # 全量生成
 *   node scripts/generate-answer-key.js --limit 1  # 仅生成前 N 篇（调试）
 *   node scripts/generate-answer-key.js --force    # 忽略已有结果，重新生成
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const INDEX_FILE = path.join(ROOT, 'public', 'data', 'articles.json')
const OUT_FILE = path.join(ROOT, 'scripts', 'answer-key.json')

/* ---------------------------- 读取环境变量 ---------------------------- */

function readEnv() {
  const envPath = path.join(ROOT, '.env')
  const raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return {
    baseUrl: (process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL || 'https://gs.neisvip.com:2300/v1').replace(/\/+$/, ''),
    apiKey: process.env.VITE_API_KEY || env.VITE_API_KEY || '',
    model: process.env.VITE_MODEL_NAME || env.VITE_MODEL_NAME || '',
  }
}

const SYSTEM_PROMPT = [
  '你是大学英语四六级阅卷组专家，熟知历年真题的标准答案。',
  '请依据提供的原文与题目，判断每道题的正确选项。',
  '只输出一个 JSON 对象，键为题号（字符串），值为该题正确选项字母（A/B/C/D 之一）。',
  '不要输出任何解释、Markdown 代码块或多余文字。',
  '示例：{"46":"C","47":"B","48":"A","49":"D","50":"C"}',
].join('\n')

function buildUserPrompt(article) {
  const questions = article.questions
    .map((q) => {
      const options = q.options.map((o) => `${o.label}) ${o.text}`).join('\n')
      return `${q.no}. ${q.stem}\n${options}`
    })
    .join('\n\n')
  return [
    `【文章标题】${article.title}`,
    '',
    '【阅读原文】',
    article.content,
    '',
    '【题目】',
    questions,
    '',
    `请输出 JSON：{"${article.questions.map((q) => q.no).join('":"?","')}":"?"}（把 ? 替换为正确选项字母）`,
  ].join('\n')
}

/* ------------------------------ 解析结果 ------------------------------ */

function parseAnswerJson(text, expectedNos) {
  const cleaned = String(text).replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  let payload
  try {
    payload = JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
  const answers = {}
  for (const no of expectedNos) {
    const value = payload[no] ?? payload[String(no)]
    if (typeof value === 'string' && /^[A-D]$/i.test(value.trim())) {
      answers[no] = value.trim().toUpperCase()
    }
  }
  return Object.keys(answers).length === expectedNos.length ? answers : null
}

/* ------------------------------ 请求封装 ------------------------------ */

async function requestAnswers(article, config) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(article) },
      ],
      temperature: 0,
      stream: false,
    }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content ?? ''
  const expectedNos = article.questions.map((q) => q.no)
  const answers = parseAnswerJson(content, expectedNos)
  if (!answers) throw new Error(`无法解析模型输出：${String(content).slice(0, 160)}`)
  return answers
}

/** 有限并发地处理任务，保持结果顺序 */
async function mapPool(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

/* -------------------------------- 主流程 -------------------------------- */

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const limitArg = args.indexOf('--limit')
  const limit = limitArg === -1 ? Infinity : Number(args[limitArg + 1]) || Infinity

  const config = readEnv()
  if (!config.apiKey) throw new Error('缺少 API Key，请检查 .env 中的 VITE_API_KEY')
  if (!fs.existsSync(INDEX_FILE)) throw new Error(`未找到 ${INDEX_FILE}，请先执行 npm run sync:exams`)

  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'))
  const articles = index.articles.slice(0, limit === Infinity ? undefined : limit)

  const existing = !force && fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) : {}
  const pending = articles.filter((article) => !existing[article.id] || existing[article.id].__failed)

  console.log(`\n== 生成答案基准 ==`)
  console.log(`· 模型：${config.model}`)
  console.log(`· 待处理 ${pending.length} / ${articles.length} 篇（已完成 ${articles.length - pending.length} 篇）`)

  let done = 0
  const key = { ...existing }

  await mapPool(pending, 4, async (article) => {
    try {
      const answers = await requestAnswers(article, config)
      key[article.id] = answers
    } catch (error) {
      key[article.id] = { __failed: String(error.message || error) }
    }
    done += 1
    const item = key[article.id]
    const label = item.__failed ? `✗ ${item.__failed}` : Object.values(item).join('')
    console.log(`  [${done}/${pending.length}] ${article.id} → ${label}`)
    fs.writeFileSync(OUT_FILE, `${JSON.stringify(key, null, 2)}\n`, 'utf8')
  })

  const failed = Object.values(key).filter((item) => item.__failed).length
  const ok = Object.keys(key).filter((id) => !key[id].__failed).length
  console.log(`· 已写入 ${path.relative(ROOT, OUT_FILE)}：成功 ${ok} 篇，失败 ${failed} 篇\n`)
  if (failed) process.exitCode = 1
}

main().catch((error) => {
  console.error(`· 生成失败：${error.message}`)
  process.exitCode = 1
})
