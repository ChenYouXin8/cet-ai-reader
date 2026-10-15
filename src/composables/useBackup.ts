import { ANSWERS_STORAGE_KEY } from '@/composables/useAnswerRecords'
import { SETTINGS_STORAGE_KEY } from '@/composables/useSettings'
import { VOCAB_STORAGE_KEY } from '@/composables/useVocab'
import { WRONG_BOOK_STORAGE_KEY } from '@/composables/useWrongBook'
import { dateStamp, downloadText, readJson, writeJson } from '@/utils/storage'

/**
 * 数据备份与恢复：把散落在 localStorage 里的全部业务数据打包成单个 JSON 文件，
 * 清理浏览器缓存、更换端口或换电脑后，凭这个文件即可完整还原。
 */

/** 备份文件标识，用于导入时确认来源 */
export const BACKUP_APP = 'cet-reading-ai'
/** 备份格式版本，便于将来做结构迁移 */
export const BACKUP_VERSION = 1

/** 参与备份的业务数据键 */
const BACKUP_KEYS = [
  ANSWERS_STORAGE_KEY,
  WRONG_BOOK_STORAGE_KEY,
  VOCAB_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
] as const

type BackupKey = (typeof BACKUP_KEYS)[number]

export interface BackupFile {
  app: string
  version: number
  exportedAt: string
  data: Partial<Record<BackupKey, unknown>>
}

/** 备份内容概览：面板展示与 Toast 提示共用 */
export interface BackupSummary {
  /** 有答题记录的文章数 */
  answers: number
  wrong: number
  vocab: number
  /** 备份中是否含模型配置 */
  hasSettings: boolean
}

/** 逐键类型校验：类型不符的内容一律跳过，避免脏数据污染 localStorage */
function isValidValue(key: BackupKey, value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  if (key === WRONG_BOOK_STORAGE_KEY || key === VOCAB_STORAGE_KEY) return Array.isArray(value)
  return !Array.isArray(value)
}

/** 读取当前 localStorage 的业务数据，组装成备份对象 */
export function buildBackup(): BackupFile {
  const data: BackupFile['data'] = {}
  for (const key of BACKUP_KEYS) {
    const value = readJson<unknown>(key, null)
    if (value !== null && value !== undefined) data[key] = value
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }
}

/** 统计备份里各类数据的条目数 */
export function summarize(file: BackupFile): BackupSummary {
  const data = file.data
  const answers = data[ANSWERS_STORAGE_KEY]
  return {
    answers: isValidValue(ANSWERS_STORAGE_KEY, answers) ? Object.keys(answers as object).length : 0,
    wrong: Array.isArray(data[WRONG_BOOK_STORAGE_KEY]) ? (data[WRONG_BOOK_STORAGE_KEY] as unknown[]).length : 0,
    vocab: Array.isArray(data[VOCAB_STORAGE_KEY]) ? (data[VOCAB_STORAGE_KEY] as unknown[]).length : 0,
    hasSettings: isValidValue(SETTINGS_STORAGE_KEY, data[SETTINGS_STORAGE_KEY]),
  }
}

/** 导出完整备份：纯前端 Blob 下载 CET_Helper_Backup_YYYYMMDD.json */
export function exportBackup(): BackupSummary {
  const file = buildBackup()
  downloadText(
    `CET_Helper_Backup_${dateStamp()}.json`,
    `${JSON.stringify(file, null, 2)}\n`,
    'application/json;charset=utf-8',
  )
  return summarize(file)
}

/** 解析并校验备份文件，非法时抛出可直接展示给用户的中文提示 */
export function parseBackup(text: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('文件不是合法的 JSON 文本')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('备份内容格式不正确')

  const file = parsed as Partial<BackupFile>
  if (file.app !== BACKUP_APP) throw new Error('这不是本应用导出的备份文件')
  if (!file.data || typeof file.data !== 'object' || Array.isArray(file.data)) {
    throw new Error('备份文件缺少数据段')
  }

  const data = file.data as Record<string, unknown>
  if (!BACKUP_KEYS.some((key) => data[key] !== undefined)) throw new Error('备份中没有任何可识别的业务数据')

  return {
    app: BACKUP_APP,
    version: Number(file.version) || BACKUP_VERSION,
    exportedAt: String(file.exportedAt ?? ''),
    data,
  }
}

/** 覆盖写入 localStorage，返回写入结果的概览 */
export function applyBackup(file: BackupFile): BackupSummary {
  for (const key of BACKUP_KEYS) {
    const value = file.data[key]
    if (value === undefined || !isValidValue(key, value)) continue
    writeJson(key, value)
  }
  return summarize(file)
}

/** 读取用户选中的文件并解析（只接受 .json） */
export async function readBackupFile(file: File): Promise<BackupFile> {
  if (!/\.json$/i.test(file.name)) throw new Error('请选择 .json 格式的备份文件')
  return parseBackup(await file.text())
}
