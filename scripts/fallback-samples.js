/**
 * 离线兜底题库：当 GitHub 克隆失败 / 网络不通 / 未解析出任何真题时写入，
 * 保证应用首次启动即可立即预览精读效果。
 * 结构必须与 scripts/fetch-and-parse-exams.js 产出的条目完全一致。
 */

const paragraph = (...items) => items.join('\n\n')

export const FALLBACK_ARTICLES = [
  {
    id: 'cet4-2022-06-s1-p1',
    category: 'cet4',
    year: '2022-06',
    title: '2022年6月四级仔细阅读 Passage 1',
    content: paragraph(
      'The past decade has seen a quiet revolution in how and where office work gets done. When the first wave of lockdowns forced millions of employees to set up desks in bedrooms and kitchens, many managers assumed that productivity would collapse. The opposite happened: surveys carried out in 2021 found that most remote workers completed at least as much work as they had in the office, and a substantial minority reported finishing more.',
      'Yet the picture is not uniformly bright. Remote work has a way of dissolving the boundaries that used to separate a working day from the rest of life. Employees who once left their laptops at the office now answer messages at midnight, and researchers who study burnout have noticed a steady increase in the number of people who describe themselves as exhausted but unable to stop. The office, for all its interruptions, provided a shared rhythm that told people when to begin and when to stop.',
      'Companies are therefore experimenting with hybrid arrangements, asking staff to come in two or three days a week. The evidence so far suggests that hybrid work preserves the flexibility that employees value while restoring the casual encounters that generate new ideas. What remains unclear is whether such a compromise can last, or whether firms will gradually drift back to the old model once the memory of the pandemic fades.',
    ),
    questions: [
      {
        no: 46,
        answer: 'A',
        stem: 'What did many managers expect when employees first began to work from home?',
        options: [
          { label: 'A', text: 'A sharp fall in overall productivity.' },
          { label: 'B', text: 'A rise in the cost of office rents.' },
          { label: 'C', text: 'A rapid improvement in working skills.' },
          { label: 'D', text: 'A decline in employees\u2019 loyalty to the firm.' },
        ],
      },
      {
        no: 47,
        answer: 'C',
        stem: 'What do we learn about remote workers from surveys carried out in 2021?',
        options: [
          { label: 'A', text: 'Most of them were dissatisfied with their pay.' },
          { label: 'B', text: 'Most of them were working longer hours than before.' },
          { label: 'C', text: 'A majority of them completed no less work than in the office.' },
          { label: 'D', text: 'A majority of them asked to return to the office.' },
        ],
      },
      {
        no: 48,
        answer: 'A',
        stem: 'What problem does remote work bring according to the passage?',
        options: [
          { label: 'A', text: 'It blurs the line between work and private life.' },
          { label: 'B', text: 'It reduces face-to-face contact with clients.' },
          { label: 'C', text: 'It makes promotion decisions less transparent.' },
          { label: 'D', text: 'It weakens employees\u2019 written communication skills.' },
        ],
      },
      {
        no: 49,
        answer: 'B',
        stem: 'What is the advantage of the office mentioned by the author?',
        options: [
          { label: 'A', text: 'It offers better equipment and technical support.' },
          { label: 'B', text: 'It gives people a shared rhythm of starting and stopping.' },
          { label: 'C', text: 'It guarantees equal treatment for all employees.' },
          { label: 'D', text: 'It provides more chances for formal training.' },
        ],
      },
      {
        no: 50,
        answer: 'C',
        stem: 'What does the author say about hybrid work in the last paragraph?',
        options: [
          { label: 'A', text: 'It has already replaced the traditional model completely.' },
          { label: 'B', text: 'It is opposed by most managers in large firms.' },
          { label: 'C', text: 'It may not prove to be a lasting arrangement.' },
          { label: 'D', text: 'It damages the creativity of newly hired staff.' },
        ],
      },
    ],
  },
  {
    id: 'cet4-2022-06-s1-p2',
    category: 'cet4',
    year: '2022-06',
    title: '2022年6月四级仔细阅读 Passage 2',
    content: paragraph(
      'Students who want to remember what they have read are often advised to review their notes repeatedly. Yet a growing body of research suggests that repeated reading is one of the least efficient ways of learning, because it creates a comfortable but misleading feeling that the material is already familiar. Familiarity is not the same thing as knowledge.',
      'In one experiment, two groups of undergraduates studied the same scientific text. The first group read it four times in a row; the second read it once and then tried to recall as much as possible without looking at the page. When tested a week later, the recall group remembered substantially more, even though they had complained during the session that the task felt harder and less productive.',
      'The lesson is uncomfortable for teachers and learners alike: the study methods that feel most effective are frequently the weakest, and those that feel clumsy and effortful tend to produce lasting learning. Schools that wish to raise achievement might therefore do better to train students in the strategy of self-testing than to add yet more reading time to the timetable.',
    ),
    questions: [
      {
        no: 51,
        answer: 'B',
        stem: 'Why is repeated reading regarded as inefficient?',
        options: [
          { label: 'A', text: 'It takes too much time to complete.' },
          { label: 'B', text: 'It gives learners a false sense of mastery.' },
          { label: 'C', text: 'It encourages learners to read too quickly.' },
          { label: 'D', text: 'It weakens learners\u2019 interest in the subject.' },
        ],
      },
      {
        no: 52,
        answer: 'C',
        stem: 'How did the two groups of undergraduates differ in the experiment?',
        options: [
          { label: 'A', text: 'One group studied a longer text than the other.' },
          { label: 'B', text: 'One group was tested immediately after reading.' },
          { label: 'C', text: 'One group tried to reproduce the text from memory.' },
          { label: 'D', text: 'One group was allowed to discuss the text with peers.' },
        ],
      },
      {
        no: 53,
        answer: 'A',
        stem: 'What did the experiment reveal about the two groups a week later?',
        options: [
          { label: 'A', text: 'The recall group performed much better in the test.' },
          { label: 'B', text: 'The rereading group remembered more details.' },
          { label: 'C', text: 'Both groups showed a similar level of recall.' },
          { label: 'D', text: 'Neither group could remember the text clearly.' },
        ],
      },
      {
        no: 54,
        answer: 'C',
        stem: 'How did the recall group feel about the task during the session?',
        options: [
          { label: 'A', text: 'Confident and relaxed.' },
          { label: 'B', text: 'Bored and indifferent.' },
          { label: 'C', text: 'Harder and less productive.' },
          { label: 'D', text: 'Excited and highly motivated.' },
        ],
      },
      {
        no: 55,
        answer: 'B',
        stem: 'What does the author suggest schools should do?',
        options: [
          { label: 'A', text: 'Add more reading hours to the timetable.' },
          { label: 'B', text: 'Train students to test themselves.' },
          { label: 'C', text: 'Reduce the amount of homework assigned.' },
          { label: 'D', text: 'Encourage students to take detailed notes.' },
        ],
      },
    ],
  },
  {
    id: 'cet6-2022-06-s1-p1',
    category: 'cet6',
    year: '2022-06',
    title: '2022年6月六级仔细阅读 Passage 1',
    content: paragraph(
      'For most of the twentieth century, the scarcity that shaped economic life was the scarcity of information. Newspapers, libraries and universities existed largely to collect and distribute a resource that was expensive to produce and hard to find. In such an environment, the ability to read patiently and to weigh evidence was rewarded almost automatically.',
      'The digital age inverted that arrangement. Information is now abundant to the point of surplus, and what has become scarce is attention. Every platform that competes for a share of the day has an incentive to make its content slightly more arresting than the content beside it, and the cumulative effect of these local decisions is a public sphere calibrated for distraction rather than deliberation.',
      'Economists are beginning to treat attention as a genuine resource with a measurable price. They point out that the cost of interruption is not merely the minutes lost while reading a message; it is also the considerable effort required to reconstruct a train of thought that has been broken. If that effort is real, then the apparently free services that fill our screens are paid for in something more valuable than money.',
    ),
    questions: [
      {
        no: 46,
        answer: 'A',
        stem: 'What was the defining economic scarcity of the twentieth century?',
        options: [
          { label: 'A', text: 'Access to information.' },
          { label: 'B', text: 'Skilled manual labour.' },
          { label: 'C', text: 'Affordable housing.' },
          { label: 'D', text: 'Reliable transport.' },
        ],
      },
      {
        no: 47,
        answer: 'B',
        stem: 'Why was patient reading rewarded in the past?',
        options: [
          { label: 'A', text: 'Books were widely available but poorly indexed.' },
          { label: 'B', text: 'Information was scarce and costly to obtain.' },
          { label: 'C', text: 'Formal education was limited to a small elite.' },
          { label: 'D', text: 'Reading speed determined career progress.' },
        ],
      },
      {
        no: 48,
        answer: 'B',
        stem: 'What has become the scarce resource in the digital age?',
        options: [
          { label: 'A', text: 'Trustworthy data.' },
          { label: 'B', text: 'Human attention.' },
          { label: 'C', text: 'Technical expertise.' },
          { label: 'D', text: 'Advertising space.' },
        ],
      },
      {
        no: 49,
        answer: 'A',
        stem: 'What is said to be the cumulative effect of platform competition?',
        options: [
          { label: 'A', text: 'A public sphere designed for distraction.' },
          { label: 'B', text: 'A decline in the quality of journalism.' },
          { label: 'C', text: 'A more equal distribution of readers.' },
          { label: 'D', text: 'A rise in the value of printed media.' },
        ],
      },
      {
        no: 50,
        answer: 'C',
        stem: 'What do economists regard as the true cost of an interruption?',
        options: [
          { label: 'A', text: 'The subscription fee paid by users.' },
          { label: 'B', text: 'The energy consumed by digital devices.' },
          { label: 'C', text: 'The effort of rebuilding a broken train of thought.' },
          { label: 'D', text: 'The loss of advertising revenue for platforms.' },
        ],
      },
    ],
  },
  {
    id: 'cet6-2022-06-s1-p2',
    category: 'cet6',
    year: '2022-06',
    title: '2022年6月六级仔细阅读 Passage 2',
    content: paragraph(
      'City planners once treated trees as decoration, a pleasant amenity to be added once the serious business of roads and buildings was finished. That view is now being revised under the pressure of rising temperatures. Measurements taken across dozens of cities show that a mature canopy can lower air temperature beneath it by several degrees, a difference that decides whether a summer afternoon is merely hot or genuinely dangerous.',
      'The benefits, however, are distributed unevenly. Wealthier districts tend to be greener, not because their residents love trees more, but because they have the political influence to protect the space that trees require. Studies in the United States have found that neighbourhoods that were once subjected to discriminatory housing policies have significantly fewer trees than neighbouring areas, and consequently warmer summers.',
      'Planting programmes have multiplied in response, but they are not a simple solution. A sapling planted today will not cast useful shade for decades, and the mortality rate of young street trees is high when nobody waters them. The cities that have done best are those that have treated the canopy as infrastructure to be maintained rather than as a ceremonial gesture to be photographed.',
    ),
    questions: [
      {
        no: 51,
        answer: 'B',
        stem: 'How did city planners traditionally regard trees?',
        options: [
          { label: 'A', text: 'As a source of construction material.' },
          { label: 'B', text: 'As an amenity added after other work.' },
          { label: 'C', text: 'As an obstacle to traffic planning.' },
          { label: 'D', text: 'As a symbol of civic pride.' },
        ],
      },
      {
        no: 52,
        answer: 'A',
        stem: 'What do measurements across dozens of cities show?',
        options: [
          { label: 'A', text: 'Trees can reduce temperatures by several degrees.' },
          { label: 'B', text: 'Trees increase rainfall in urban areas.' },
          { label: 'C', text: 'Trees have little influence on summer heat.' },
          { label: 'D', text: 'Trees mainly help by filtering polluted air.' },
        ],
      },
      {
        no: 53,
        answer: 'C',
        stem: 'Why are wealthier districts generally greener?',
        options: [
          { label: 'A', text: 'Their residents value nature more highly.' },
          { label: 'B', text: 'They were designed with wider roads.' },
          { label: 'C', text: 'They can protect the space trees require.' },
          { label: 'D', text: 'They receive more funding from private donors.' },
        ],
      },
      {
        no: 54,
        answer: 'B',
        stem: 'What is a major weakness of rapid tree-planting programmes?',
        options: [
          { label: 'A', text: 'They plant species that grow too fast.' },
          { label: 'B', text: 'Young trees often die without care and watering.' },
          { label: 'C', text: 'They reduce the space available for housing.' },
          { label: 'D', text: 'They provoke resistance from local residents.' },
        ],
      },
      {
        no: 55,
        answer: 'C',
        stem: 'What do the most successful cities treat their canopy as?',
        options: [
          { label: 'A', text: 'A temporary beautification project.' },
          { label: 'B', text: 'A tourist attraction to be promoted.' },
          { label: 'C', text: 'Infrastructure that requires maintenance.' },
          { label: 'D', text: 'A private asset of local landowners.' },
        ],
      },
    ],
  },
]
