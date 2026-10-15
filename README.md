<div align="center">

# CET-AI-Reader

**四六级真题 AI 精读伴学器 · AI-Powered CET-4 / CET-6 Reading Companion**

[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[English](#english) · [简体中文](#简体中文)

</div>

---

## English

### Overview

CET-AI-Reader is a **local, browser-based intensive-reading workbench** for China's CET-4 / CET-6 real exam papers. It ships with past papers out of the box and layers an OpenAI-compatible LLM on top of them: click any word or sentence for an instant, structured explanation, practise the reading questions, and keep asking follow-up questions in a side chat that remembers which passage you are reading. Everything runs on your own machine — the exam corpus comes from a public Markdown repository (plus your own custom files), and all of your study data stays in the browser.

### Features

- 📚 **Built-in & extensible exam corpus** — syncs CET-4 / CET-6 past papers from a public Markdown repository; drop your own `.md` / `.txt` papers into `data/custom/` and they are merged in, never overwritten.
- 🔍 **Sentence-level breakdown & instant word lookup** — one click on a sentence returns a structured analysis (accurate translation → core vocabulary → complex-sentence structure); one click on a word returns phonetics, contextual meaning and exam collocations; select any phrase to analyze it in context.
- 📝 **Five-question practice with AI trap analysis** — answer the questions, submit for scoring, and ask the AI to explain why each distractor is designed to trap you.
- 💾 **Local data persistence** — answer records, wrong-answer collection and vocabulary notebook are persisted in the browser (`localStorage`), so progress survives refreshes and restarts.
- 📥 **One-click export** — export your vocabulary as Anki (`.txt`, tab-separated) or as an Excel-friendly CSV (`.csv`, UTF-8 BOM, no garbled Chinese).
- 💬 **Free chat with multi-turn follow-ups** — analysis results are rendered as a message stream; you can ask anything in the input box and the model receives the current article and the exact sentence/word you were viewing as implicit context.
- 🛡️ **Backup & restore** — bundle all local study data into a single JSON file and restore it after clearing the browser cache or switching ports.
- 🌗 **Immersive three-column layout** — exam navigation / reading area / AI analysis panel, collapsible, with dark mode.

### Tech Stack

| Layer | Choice |
| --- | --- |
| Build tool | Vite |
| UI framework | Vue 3 (`<script setup>` + TypeScript) |
| Styling | Tailwind CSS + Lucide icons |
| Markdown rendering | markdown-it |
| Model access | Any **OpenAI-compatible** `/chat/completions` endpoint, consumed with native `fetch` + `ReadableStream` (SSE streaming) |
| Storage | Browser `localStorage` (versioned keys) |

### Quick Start

```bash
# 1. Clone
git clone https://github.com/ChenYouXin8/cet-ai-reader.git
cd cet-ai-reader

# 2. Install dependencies
npm install

# 3. Create your environment file (optional, recommended)
cp .env.example .env        # Windows: copy .env.example .env

# 4. Sync the exam corpus (clones / scans the source papers)
npm run sync:exams

# 5. Start the dev server
npm start                   # re-syncs the corpus, then serves http://localhost:5173
```

> **Requirement:** Node.js **>= 20.19**.

### Configuration

All settings come from `.env` (copied from `.env.example`):

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL of the OpenAI-compatible service; `/chat/completions` is appended automatically | `https://gs.neisvip.com:2300/v1` |
| `VITE_API_KEY` | API key. Leave empty to fill it in later from the in-app **Settings** panel | *(empty)* |
| `VITE_MODEL_NAME` | Model name | `Qwen/Qwen3.8-Flash-Next-Uncensored` |
| `VITE_API_TEMPERATURE` | Sampling temperature (optional) | `0.3` |

**No `.env`? No problem.** Open **Settings** in the sidebar and fill in Base URL / API Key / Model — they are saved to your browser's `localStorage`, so no rebuild is needed. Reading, practising, the wrong-answer collection and all exports work without a key; only the AI features require one.

> [!IMPORTANT]
> `.env` is **git-ignored** and must never be committed. `VITE_*` variables are inlined into the client bundle at build time, so never publish a production build that embeds a private key.

### npm Scripts

| Command | Description |
| --- | --- |
| `npm start` | Sync the exam corpus, then start the dev server |
| `npm run dev` | Start the dev server only |
| `npm run sync:exams` | Clone / scan / merge all papers into `public/data/articles.json` |
| `npm run answers` | *(optional)* Generate the reference answer key with the LLM |
| `npm run build` | Type-check (`vue-tsc`) and build for production |
| `npm run preview` | Preview the production build |

### Project Structure

```
cet-ai-reader/
├─ data/
│  ├─ custom/                  # your own papers (.md / .txt) — read-only for the sync script
│  └─ raw-repo/                # cloned source corpus (git-ignored)
├─ public/data/articles.json   # generated exam index consumed by the app
├─ scripts/
│  ├─ fetch-and-parse-exams.js # clone → scan → clean → merge → index
│  ├─ generate-answer-key.js   # optional AI-generated answer key
│  └─ fallback-samples.js      # offline fallback samples
└─ src/
   ├─ components/              # three-column layout, reader, AI panel, quiz, drawers
   ├─ composables/             # state + persistence (records / wrong answers / vocab / settings / backup)
   ├─ services/                # SSE streaming client, Markdown rendering
   └─ utils/                    # text segmentation, localStorage helpers, exporters
```

### Data & Privacy

- Your answer records, wrong-answer collection, vocabulary notebook and model settings never leave the browser — there is no backend and no account.
- Clearing browser data will erase them, which is exactly why the **backup & restore** feature exists.
- Exam texts are fetched from a third-party public repository and remain the property of their original publishers; they are provided for personal study only.

### Credits & License

- Exam corpus source: [wamich/english-exem-md](https://github.com/wamich/english-exem-md).
- Built with Vue 3, Vite, Tailwind CSS, markdown-it and Lucide.
- Code released under the **MIT License** (a `LICENSE` file should be added at the repository root before publishing).

---

## 简体中文

### 项目简介

CET-AI-Reader 是一个**本地运行、浏览器内使用的四六级真题精读工作台**。它内置历年四六级真题，并在其上叠加一个 OpenAI 兼容的大模型：点击任意单词或句子即可获得结构化解析，完成 5 题连做后还能让 AI 逐项分析干扰项陷阱；右侧侧边栏支持自由对话与多轮连续追问，并会自动带上你正在精读的文章与关注的原句作为上下文。全部数据留在你自己的机器上——题库来自公开 Markdown 仓库（外加你自建的自定义题库），学习数据只存在浏览器本地。

### 核心特性

- 📚 **历年真题内置与自定义扩展**：自动同步公开仓库中的四六级真题；把自建的 `.md` / `.txt` 试卷放进 `data/custom/` 即会被合并收录，且永远不会被同步脚本覆盖。
- 🔍 **句子级长难句剖析与单词即时点查**：点击句子获得「精准译文 → 核心考点词 → 长难句剖析」三段式解析；点击单词获得音标、语境释义与考点搭配；划选短语按原句语境定向解析。
- 📝 **5 题连做交互与 AI 干扰项避坑分析**：五道题连做、一键交卷判分，并可让 AI 剖析每个错误选项的陷阱所在。
- 💾 **本地数据持久化**：做题进度（错题集、做题进度、生词本）全部保存在浏览器 `localStorage`，刷新、重启、断网都不会丢失。
- 📥 **支持一键导出生词为 Anki (.txt) 与 Excel (.csv)**：Anki 采用标准制表符分隔格式，CSV 带 UTF-8 BOM，Excel 打开不乱码。
- 💬 **侧边栏自由对话与多轮连续追问**：解析结果以消息流卡片呈现，可在底部输入框自由提问；模型会自动把当前文章与刚点击的句子/单词作为隐式上下文。
- 🛡️ **一键备份与恢复**：把全部本地学习数据打包成一个 JSON 文件，清理浏览器缓存或更换端口后导入即可完整还原。
- 🌗 **沉浸式三栏布局**：左栏题库导航、中栏阅读区、右栏 AI 解析侧边栏，支持折叠与深色主题。

### 技术栈

| 层次 | 选型 |
| --- | --- |
| 构建工具 | Vite |
| 前端框架 | Vue 3（`<script setup>` + TypeScript） |
| 样式与图标 | Tailwind CSS + Lucide |
| Markdown 渲染 | markdown-it |
| 模型接入 | 任意 **OpenAI 兼容** 的 `/chat/completions` 接口，原生 `fetch` + `ReadableStream` 实现 SSE 流式输出 |
| 数据存储 | 浏览器 `localStorage`（带版本号的键名） |

### 快速启动

```bash
# 1. 克隆仓库
git clone https://github.com/ChenYouXin8/cet-ai-reader.git
cd cet-ai-reader

# 2. 安装依赖
npm install

# 3. 创建环境变量文件（可选，推荐）
cp .env.example .env        # Windows 使用：copy .env.example .env

# 4. 同步题库（自动克隆 / 扫描源试卷）
npm run sync:exams

# 5. 启动开发服务器
npm start                   # 先同步题库，再启动 http://localhost:5173
```

> **环境要求**：Node.js **>= 20.19**。

### 配置说明

全部配置来自 `.env`（由 `.env.example` 复制而来）：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | OpenAI 兼容接口基地址，请求路径自动补齐 `/chat/completions` | `https://gs.neisvip.com:2300/v1` |
| `VITE_API_KEY` | API Key；留空则稍后可在前端「设置」面板手动填写 | *(空)* |
| `VITE_MODEL_NAME` | 模型名称 | `Qwen/Qwen3.8-Flash-Next-Uncensored` |
| `VITE_API_TEMPERATURE` | 采样温度（可选） | `0.3` |

**没有 `.env` 也能跑**：在侧边栏打开「设置」，填写 Base URL / API Key / Model 即可，配置会保存在浏览器本地，无需重新构建。阅读、做题、错题集与全部导出功能都不需要 Key，只有 AI 解析需要。

> [!IMPORTANT]
> `.env` 已在 `.gitignore` 中忽略，请**不要**提交真实密钥。`VITE_*` 变量会在构建时内联进前端产物，因此不要把嵌入私有密钥的产物公开部署。

### npm 命令

| 命令 | 说明 |
| --- | --- |
| `npm start` | 同步题库并启动开发服务器 |
| `npm run dev` | 仅启动开发服务器 |
| `npm run sync:exams` | 克隆 / 扫描 / 合并全部试卷，生成 `public/data/articles.json` |
| `npm run answers` | （可选）用大模型生成参考答案基准 |
| `npm run build` | 类型检查（`vue-tsc`）并构建生产版本 |
| `npm run preview` | 预览生产构建产物 |

### 目录结构

```
cet-ai-reader/
├─ data/
│  ├─ custom/                  # 自建题库（.md / .txt），同步脚本只读不写
│  └─ raw-repo/                # 克隆的源题库（已被 .gitignore 忽略）
├─ public/data/articles.json   # 脚本生成、前端消费的题库索引
├─ scripts/
│  ├─ fetch-and-parse-exams.js # 克隆 → 扫描 → 清洗 → 合并 → 生成索引
│  ├─ generate-answer-key.js   # 可选：AI 生成标准答案基准
│  └─ fallback-samples.js      # 离线兜底样例
└─ src/
   ├─ components/              # 三栏布局、阅读区、AI 侧边栏、答题区、各类抽屉
   ├─ composables/             # 状态与本地持久化（答题记录 / 错题 / 生词 / 设置 / 备份）
   ├─ services/                # SSE 流式请求客户端、Markdown 渲染
   └─ utils/                    # 文本分句分词、localStorage 工具、导出
```

### 数据与隐私

- 做题记录、错题集、生词本与模型配置全部保存在浏览器本地，无后端、无账号、不上传。
- 清理浏览器数据会一并清除上述内容，这正是「一键备份与恢复」存在的意义。
- 真题文本抓取自第三方公开仓库，版权归原出版机构所有，仅供个人学习交流使用。

### 致谢与许可证

- 题库来源：[wamich/english-exem-md](https://github.com/wamich/english-exem-md)。
- 基于 Vue 3、Vite、Tailwind CSS、markdown-it、Lucide 构建。
- 代码以 **MIT License** 开源（正式发布前请在仓库根目录补充 `LICENSE` 文件）。
