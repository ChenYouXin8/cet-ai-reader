<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bot, CheckCircle2, RotateCcw } from 'lucide-vue-next'
import type { AnswerLetter, Article, Question } from '@/types'
import { useAnalysis } from '@/composables/useAnalysis'
import { useAnswerRecords } from '@/composables/useAnswerRecords'
import type { AnswerRecord } from '@/composables/useAnswerRecords'
import { useLayout } from '@/composables/useLayout'
import { useWrongBook } from '@/composables/useWrongBook'
import type { WrongQuestionInput } from '@/composables/useWrongBook'

const props = defineProps<{ article: Article }>()

const { analyze } = useAnalysis()
const { panelOpen } = useLayout()
const { get: getRecord, save: saveRecord, remove: removeRecord } = useAnswerRecords()
const { record: recordWrong } = useWrongBook()

const answers = ref<Record<number, AnswerLetter>>({})
const submitted = ref(false)
const warning = ref('')
let warningTimer: number | undefined

const questions = computed(() => props.article.questions)
/** 仅有标准答案的题目参与判分 */
const gradable = computed(() => questions.value.filter((item) => item.answer))

const answeredCount = computed(() => questions.value.filter((item) => answers.value[item.no]).length)
const total = computed(() => gradable.value.length)
const score = computed(() => gradable.value.filter((item) => answers.value[item.no] === item.answer).length)
const accuracy = computed(() => (total.value ? Math.round((score.value / total.value) * 100) : 0))

/** 选项边框与底色：正确=绿，错选=红，正确答案以绿框标出 */
const OPTION_CLASS: Record<string, string> = {
  idle: 'border-paper-200 hover:border-amber-400 hover:bg-amber-500/5 dark:border-ink-600',
  selected: 'border-amber-500 bg-amber-500/10',
  correct: 'border-emerald-500 bg-emerald-500/10',
  wrong: 'border-red-500 bg-red-500/10',
}

// 切换文章时：清空即时状态，再从 localStorage 还原历史作答
watch(
  () => props.article.id,
  () => {
    answers.value = {}
    submitted.value = false
    warning.value = ''
    restore()
  },
  { immediate: true },
)

/** 把当前作答状态整理成持久化结构：selected 以题目序号（"0" ~ "4"）为键 */
function snapshot(isSubmitted: boolean): AnswerRecord {
  const selected: Record<string, AnswerLetter> = {}
  questions.value.forEach((question, index) => {
    const letter = answers.value[question.no]
    if (letter) selected[String(index)] = letter
  })
  return {
    selected,
    isSubmitted,
    score: isSubmitted ? score.value : 0,
    submittedAt: isSubmitted ? Date.now() : 0,
  }
}

function persist(isSubmitted: boolean) {
  const record = snapshot(isSubmitted)
  if (isSubmitted || Object.keys(record.selected).length) saveRecord(props.article.id, record)
  else removeRecord(props.article.id)
}

/** 从历史记录还原选项与红绿批改结果 */
function restore() {
  const record = getRecord(props.article.id)
  if (!record) return

  const restored: Record<number, AnswerLetter> = {}
  questions.value.forEach((question, index) => {
    const letter = record.selected[String(index)]
    if (letter) restored[question.no] = letter
  })
  answers.value = restored
  submitted.value = Boolean(record.isSubmitted)
}

/** 收集本次选错的题目（错题本自动收录） */
function collectWrong(): WrongQuestionInput[] {
  const entries: WrongQuestionInput[] = []
  for (const question of gradable.value) {
    const userAnswer = answers.value[question.no]
    if (!question.answer || !userAnswer || userAnswer === question.answer) continue
    entries.push({
      articleId: props.article.id,
      articleTitle: props.article.title,
      category: props.article.category,
      no: question.no,
      stem: question.stem,
      options: question.options,
      answer: question.answer,
      userAnswer,
    })
  }
  return entries
}

/**
 * 🔄 已提交状态下：仅重置本篇答题记录（cet_answers_storage_v1）。
 * 错题集（cet_wrong_questions_v1）为独立生命周期，历史错题永久保留，
 * 只能由用户在错题集里主动移除。
 */
function clearRecord() {
  removeRecord(props.article.id)
  answers.value = {}
  submitted.value = false
  warning.value = ''
}

function pick(question: Question, label: string) {
  if (submitted.value) return
  answers.value = { ...answers.value, [question.no]: label as AnswerLetter }
  persist(false)
}

function submit() {
  if (answeredCount.value < questions.value.length) {
    warning.value = `还有题目未作答，请做完全部 ${questions.value.length} 道题后再提交`
    window.clearTimeout(warningTimer)
    warningTimer = window.setTimeout(() => (warning.value = ''), 3200)
    return
  }
  warning.value = ''
  submitted.value = true
  persist(true)
  recordWrong(collectWrong())
}

function optionState(question: Question, label: string): string {
  if (!submitted.value) return answers.value[question.no] === label ? 'selected' : 'idle'
  if (question.answer === label) return 'correct'
  if (answers.value[question.no] === label) return 'wrong'
  return 'idle'
}

/** 点击题干 → 整句精析 */
function analyzeStem(question: Question) {
  window.getSelection()?.removeAllRanges()
  panelOpen.value = true
  void analyze({ kind: 'sentence', text: question.stem, source: props.article.title })
}

/** 判分后 → 打包原文、题干、选项与双方答案，交给模型做题目深度剖析 */
function analyzeOption(question: Question) {
  if (!question.answer) return
  panelOpen.value = true
  void analyze({
    kind: 'question',
    no: question.no,
    stem: question.stem,
    options: question.options,
    answer: question.answer,
    userAnswer: answers.value[question.no],
    passage: props.article.content,
    source: props.article.title,
  })
}
</script>

<template>
  <div class="space-y-5">
    <!-- 判分结果面板 -->
    <div
      v-if="submitted"
      class="flex flex-wrap items-center gap-3 rounded-xl border border-paper-200 bg-paper-50/80 px-4 py-3 dark:border-ink-700 dark:bg-ink-900/50"
    >
      <span class="text-sm font-semibold">
        本次得分：<span class="text-amber-600 dark:text-amber-400">{{ score }} / {{ total }}</span>
      </span>
      <span class="rounded-md bg-amber-500/12 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        正确率 {{ accuracy }}%
      </span>
      <button
        class="ml-auto inline-flex items-center gap-1.5 text-xs text-stone-500 transition hover:text-amber-600 dark:hover:text-amber-400"
        @click="clearRecord"
      >
        <RotateCcw :size="13" /> 🔄 清空记录重新作答
      </button>
    </div>

    <p v-if="!gradable.length" class="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
      该篇题库暂未录入标准答案，请先运行 <code>npm run answers</code> 生成答案基准。
    </p>

    <div v-for="question in questions" :key="question.no" class="space-y-1.5">
      <p
        class="cursor-pointer rounded-md px-1 text-[15px] font-medium leading-relaxed transition hover:bg-amber-500/10"
        title="点击解析该题干"
        @click="analyzeStem(question)"
      >
        <span class="mr-1 text-amber-700 dark:text-amber-400">{{ question.no }}.</span>{{ question.stem }}
      </p>

      <ul class="space-y-1.5 pl-5">
        <li v-for="option in question.options" :key="option.label">
          <button
            class="flex w-full gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[15px] transition disabled:cursor-default"
            :class="OPTION_CLASS[optionState(question, option.label)]"
            :disabled="submitted"
            @click="pick(question, option.label)"
          >
            <span class="shrink-0 font-medium text-stone-500">{{ option.label }})</span>
            <span>{{ option.text }}</span>
            <CheckCircle2
              v-if="submitted && question.answer === option.label"
              :size="15"
              class="ml-auto shrink-0 text-emerald-600 dark:text-emerald-400"
            />
          </button>
        </li>
      </ul>

      <!-- 判分后：结果行 + AI 选项解析入口 -->
      <div v-if="submitted" class="flex flex-wrap items-center gap-3 pl-5 pt-0.5">
        <span class="text-[12px] text-stone-500">
          你的答案：<b :class="answers[question.no] === question.answer ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">{{ answers[question.no] ?? '—' }}</b>
          ｜ 正确答案：<b class="text-emerald-600 dark:text-emerald-400">{{ question.answer ?? '—' }}</b>
        </span>
        <button
          v-if="question.answer"
          class="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[12px] font-medium text-amber-700 transition hover:bg-amber-500/20 dark:text-amber-300"
          @click="analyzeOption(question)"
        >
          <Bot :size="13" /> 🤖 AI 错题/选项解析
        </button>
      </div>
    </div>

    <!-- 提交判分 -->
    <div v-if="!submitted" class="flex flex-wrap items-center gap-3 border-t border-paper-200 pt-4 dark:border-ink-700">
      <button
        class="rounded-lg bg-stone-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-stone-700 dark:bg-amber-400 dark:text-ink-900 dark:hover:bg-amber-300"
        @click="submit"
      >
        提交判分
      </button>
      <span class="text-[12px] text-stone-500">已作答 {{ answeredCount }} / {{ questions.length }}</span>
      <span v-if="warning" class="text-[12px] font-medium text-red-600 dark:text-red-400">{{ warning }}</span>
    </div>
  </div>
</template>
