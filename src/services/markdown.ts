import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false, // 关闭原生 HTML，避免模型输出注入
  linkify: true,
  breaks: true,
})

/** 渲染 AI 输出的结构化 Markdown */
export function renderMarkdown(source: string): string {
  return md.render(source || '')
}
