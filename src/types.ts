export type Category = 'cet4' | 'cet6'

/** 选择题选项字母 */
export type AnswerLetter = 'A' | 'B' | 'C' | 'D'

export interface QuestionOption {
  label: string
  text: string
}

export interface Question {
  no: number
  stem: string
  options: QuestionOption[]
  /** 标准答案基准；题源未提供时由 scripts/generate-answer-key.js 补齐 */
  answer?: AnswerLetter
}

export interface Article {
  id: string
  category: Category
  year: string
  title: string
  content: string
  questions: Question[]
}

export interface ArticleIndex {
  generatedAt: string
  source: string
  offline?: boolean
  total: number
  cet4?: number
  cet6?: number
  articles: Article[]
}
