import type { Phase } from './types'

/**
 * Phase-by-phase recommendations from the books in /books, paraphrased.
 * Page numbers are pages of those PDF copies (ebook conversions), not of the print editions.
 */

export type BookId = 'vitti' | 'pelz'

export interface Book {
  id: BookId
  short: string
  author: string
  title: string
  details: string
  /** How the author divides the cycle, for mapping onto the app's phases. */
  phaseModel: string
}

export const BOOKS: Record<BookId, Book> = {
  vitti: {
    id: 'vitti',
    short: 'Vitti',
    author: 'Alisa Vitti',
    title: 'In the FLO',
    details: 'HarperOne, 2020',
    phaseModel:
      'Four phases: follicular "Prepare" (7–10 days), ovulatory "Open Up" (3–4 days), luteal "Work" (10–14 days) and menstrual "Rest" (3–7 days). Vitti treats the bleed as the end of a cycle rather than its start.',
  },
  pelz: {
    id: 'pelz',
    short: 'Pelz',
    author: 'Dr. Mindy Pelz',
    title: 'Fast Like a Girl',
    details: 'Hay House, 2022',
    phaseModel:
      'Counted from day 1 of bleeding on a ~30-day cycle: Power phase 1 (days 1–10), Manifestation phase (days 11–15), Power phase 2 (days 16–19) and Nurture phase (day 20 until your period). With a longer or shorter cycle, the Nurture phase is the last ~9–10 days before your period.',
  },
}

export interface Ref {
  book: BookId
  where: string // chapter and section
  pages: string
}

export type Topic = 'mind' | 'food' | 'movement' | 'fasting' | 'stress' | 'symptoms'

export const TOPICS: { key: Topic; label: string }[] = [
  { key: 'mind', label: 'Work & focus' },
  { key: 'food', label: 'Food' },
  { key: 'movement', label: 'Movement' },
  { key: 'fasting', label: 'Fasting' },
  { key: 'stress', label: 'Mood & stress' },
  { key: 'symptoms', label: 'Symptoms' },
]

export interface Rec {
  topic: Topic
  text: string
  ref: Ref
}

export interface Agreement {
  text: string
  refs: Ref[]
}

export type GuideKey = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal-early' | 'luteal-late'

export interface PhaseGuide {
  key: GuideKey
  phase: Phase
  label: string
  when: string
  /** What each book calls this stretch of the cycle. */
  names: Partial<Record<BookId, string>>
  overview: string
  agree: Agreement[]
  recs: Rec[]
}

const V = (where: string, pages: string): Ref => ({ book: 'vitti', where, pages })
const P = (where: string, pages: string): Ref => ({ book: 'pelz', where, pages })

// Frequently cited sections
const V3 = V('ch. 3, "In the FLO Advantage" (brain)', '75–76')
const V4food = V('ch. 4, "Eating for Each Phase of Your Cycle"', '99–102')
const V4cook = V('ch. 4, "Let\'s Cook!"', '112–113')
const V4quick = V('ch. 4, "Five Quick-Start Strategies"', '124–125')
const V5 = V('ch. 5, "Getting in the FLO with Your Workouts"', '134–135')
const V7 = V('ch. 7, "Put Your Cycle to Work for You"', '214–216')
const P4 = P('ch. 4, "Your Menstrual Cycle"', '83–85')
const P7power = P('ch. 7, "The Power Phases"', '141–144')
const P7man = P('ch. 7, "The Manifestation Phase"', '144–148')
const P7nur = P('ch. 7, "The Nurture Phase"', '148–150')

export const GUIDES: PhaseGuide[] = [
  {
    key: 'menstrual',
    phase: 'menstrual',
    label: 'Menstrual',
    when: 'Your bleed, usually 3–7 days',
    names: { vitti: 'Rest', pelz: 'start of Power phase 1' },
    overview:
      'Hormones are at their lowest. Both books treat this as a time to go easy on the body; they differ on fasting (see "Where the books disagree").',
    agree: [
      { text: 'Keep exercise gentle and restorative rather than intense.', refs: [V5, P7power] },
      { text: 'Lean on protein and good fats rather than lots of carbohydrate.', refs: [V4food, P7power] },
    ],
    recs: [
      { topic: 'mind', text: 'Use these days to review the past month: what felt good, what didn\'t, and what to change. Journal and trust your gut.', ref: V3 },
      { topic: 'mind', text: 'At work, evaluate and reassess goals rather than launching new things. Note what your intuition says about projects or your career.', ref: V7 },
      { topic: 'food', text: 'Eat more protein and healthy fats to keep energy and mood steady while hormones are low.', ref: V4food },
      { topic: 'food', text: 'Choose nutrient-dense, blood-building foods: red meat, kidney beans, buckwheat; seafood, kelp and nori to replace iron and zinc; low-sugar berries such as blueberries and blackberries.', ref: V4food },
      { topic: 'food', text: 'Favour warm, hearty dishes such as soups and stews.', ref: V4cook },
      { topic: 'food', text: 'Pelz recommends "ketobiotic" eating in her power phases: fewer carbohydrates, more good fats, moderate protein, keeping glucose and insulin low.', ref: P7power },
      { topic: 'movement', text: 'Walking, foam rolling, yin yoga, mat Pilates and breathwork. Napping counts. High-intensity exercise now is described as counter-productive.', ref: V5 },
      { topic: 'movement', text: 'For cramps, Vitti passes on yoga poses from Bobby Clennell: triangle, standing forward bend, downward dog and a supported fish pose.', ref: V5 },
      { topic: 'fasting', text: 'Sex hormones are at their lowest, which Pelz describes as the best window for longer fasts (13 hours and up) if you fast at all.', ref: P7power },
      { topic: 'symptoms', text: 'For cramps: magnesium-rich greens (e.g. collards) and vitamin-E foods (almonds, hazelnuts); omega-3 foods such as wild salmon, sardines and seeds; limit dairy, saturated animal fats and refined omega-6 oils.', ref: V('Biohacking Tool Kit, "Cramps"', '186') },
      { topic: 'symptoms', text: 'Vitti suggests vitamin E and magnesium for a few days before your period and the first few days of it to help prevent cramps.', ref: V('Biohacking Tool Kit, "Cramps"', '186') },
    ],
  },
  {
    key: 'follicular',
    phase: 'follicular',
    label: 'Follicular',
    when: 'From the end of your bleed to just before ovulation, about 7–10 days',
    names: { vitti: 'Prepare', pelz: 'rest of Power phase 1 (to day 10)' },
    overview: 'Oestrogen is rising: both books describe better mood, clarity and resilience, and a body that handles harder training well.',
    agree: [
      { text: 'A good time for mentally demanding work and starting new things.', refs: [V7, P4] },
      { text: 'Your body handles harder workouts and builds strength well.', refs: [V('ch. 5, "Work Out Less, Get More Fit"', '128'), P4] },
      { text: 'If you want to experiment with fasting or eating lighter, this is the phase both books consider most suitable.', refs: [V('ch. 4, "A Cyclical Diet Plan"', '120'), P7power] },
    ],
    recs: [
      { topic: 'mind', text: 'Openness to new things and creativity: set intentions, plan, research, brainstorm and get new projects started.', ref: V('ch. 6, "Managing Your Creative Process"', '158–160') },
      { topic: 'mind', text: 'Schedule your most mentally challenging tasks now; rising oestrogen supports working memory and problem-solving.', ref: V7 },
      { topic: 'stress', text: 'Rising oestrogen supports mood and optimism, and stressful events tend to feel easier to handle than when it is low.', ref: P4 },
      { topic: 'food', text: 'Fresh, light foods: fermented veg (kimchi, sauerkraut), vegetables like string beans, zucchini and carrots, lean protein (chicken, trout), sprouted beans and seeds, and oats.', ref: V4food },
      { topic: 'food', text: 'Lighter cooking such as steaming or sautéing.', ref: V4cook },
      { topic: 'food', text: 'Seed cycling (first half of the cycle): a tablespoon each of flaxseeds and pumpkin seeds a day.', ref: V4quick },
      { topic: 'food', text: 'Support oestrogen with good fats (olive oil, avocado, nuts and seeds) and phytoestrogen foods such as legumes, especially in the days before ovulation.', ref: P('ch. 6, "Hormone-supporting foods"', '114–117') },
      { topic: 'movement', text: 'Cardio and new classes: running, cycling, dance, hiking, jump rope, building intensity as the phase goes on. Strength gains are larger now than in the luteal phase.', ref: V5 },
      { topic: 'movement', text: 'If your hormones are out of balance or you\'re dealing with anxiety or fatigue, Vitti suggests keeping workouts to about 30 minutes.', ref: V5 },
      { topic: 'movement', text: 'Oestrogen supports collagen and more elastic ligaments, making this a lower-injury time to push workouts.', ref: P4 },
      { topic: 'fasting', text: 'Up to about day 10, Pelz considers longer fasts (13–72 hours) well tolerated because low insulin helps oestrogen build.', ref: P7power },
    ],
  },
  {
    key: 'ovulatory',
    phase: 'ovulatory',
    label: 'Ovulatory',
    when: 'Around ovulation, about 3–5 days',
    names: { vitti: 'Open Up', pelz: 'Manifestation phase (days 11–15)' },
    overview: 'Oestrogen peaks and testosterone surges. Both books call this the high point for energy, communication and confidence.',
    agree: [
      { text: 'Schedule important conversations, pitches, presentations or asking for a raise now.', refs: [V7, P('ch. 4, "Your Menstrual Cycle"', '83–84')] },
      { text: 'Your strongest window physically: time hard efforts (Pelz even suggests race day) for now.', refs: [V5, P7man] },
      { text: 'Eat to help your liver and gut process the oestrogen peak: lots of vegetables, fibre and greens.', refs: [V4food, P7man] },
    ],
    recs: [
      { topic: 'mind', text: 'Verbal and social skills peak: connect, collaborate, network and say clearly what you want.', ref: V3 },
      { topic: 'food', text: 'Raw and cooling foods: salads, smoothies, red bell pepper, spinach, tomato, leafy greens, raspberries and strawberries. Lighter grains such as quinoa and corn.', ref: V4food },
      { topic: 'food', text: 'Pelz\'s "hormone feasting" foods for liver and gut: cruciferous veg (broccoli, Brussels sprouts, cauliflower), leafy and bitter greens, sesame and flaxseeds, fermented foods, salmon, berries, green apples, green or dandelion tea, and spices like turmeric and cumin.', ref: P7man },
      { topic: 'movement', text: 'Most intense workouts of the month: interval sprints, HIIT, indoor cycling, boot camp, kickboxing. Group classes suit the social mood.', ref: V5 },
      { topic: 'movement', text: 'Testosterone makes strength training more effective now.', ref: P('ch. 4, "Your Menstrual Cycle"', '84') },
      { topic: 'fasting', text: 'Keep any fasts under 15 hours. Longer fasts during the hormone peak can cause "detox" symptoms like nausea, brain fog or anxiety.', ref: P7man },
      { topic: 'symptoms', text: 'Ovulation-time acne is linked to excess oestrogen: eat leafy greens and root veg with healthy fats, zinc foods, and flaxseeds.', ref: V('Biohacking Tool Kit, "Acne"', '187–188') },
      { topic: 'stress', text: 'For low drive or libido now, Pelz points to stress and phthalates: cut back on plastics and heavily fragranced products.', ref: P7man },
    ],
  },
  {
    key: 'luteal-early',
    phase: 'luteal',
    label: 'Early luteal',
    when: 'The first ~5 days after ovulation',
    names: { vitti: 'Work (first half)', pelz: 'Power phase 2 (days 16–19)' },
    overview:
      'Hormones dip briefly after ovulation while progesterone starts to rise. You still have good energy, but less for high-impact exercise.',
    agree: [{ text: 'Expect a small dip in energy and mental sharpness compared with ovulation.', refs: [V5, P4] }],
    recs: [
      { topic: 'mind', text: 'Your brain favours detail and finishing: wrap up projects, do admin and deep work. You still have energy for other people in this first half.', ref: V3 },
      { topic: 'mind', text: 'Get it done: quarterly reports, contracts, editing. Slow down on networking and outside meetings.', ref: V7 },
      { topic: 'movement', text: 'Strength training and more intense yoga, to make the most of the remaining oestrogen and testosterone.', ref: V5 },
      { topic: 'food', text: 'Start eating more: the luteal phase burns more energy. Slow-burning carbs (brown rice, sweet potato), foods rich in B vitamins, calcium and magnesium, and fibre (chickpeas, pears, apples, walnuts).', ref: V4food },
      { topic: 'food', text: 'Switch to roasting and baking.', ref: V4cook },
      { topic: 'food', text: 'Seed cycling (second half): a tablespoon each of sesame and sunflower seeds a day.', ref: V4quick },
      { topic: 'food', text: 'Pelz keeps "ketobiotic", lower-carb eating through days 16–19 before switching to carbohydrate-rich foods.', ref: P7power },
      { topic: 'fasting', text: 'Pelz sees days 16–19 as a second, short window for longer fasts. Vitti advises against this (see disagreements).', ref: P7power },
    ],
  },
  {
    key: 'luteal-late',
    phase: 'luteal',
    label: 'Late luteal (pre-period)',
    when: 'The last ~9–10 days before your period',
    names: { vitti: 'Work (second half)', pelz: 'Nurture phase (day 20 to your period)' },
    overview:
      'Progesterone peaks then falls with oestrogen. Both books put this phase at the centre of PMS and describe it as the time to protect yourself from stress and to eat more, not less.',
    agree: [
      { text: "Don't fast or cut calories in the week before your period.", refs: [P4, P('ch. 4, "Fluctuations of Our Sex Hormones" (progesterone)', '93'), V('ch. 4, "How Cyclical Eating Supports…" (metabolism)', '106')] },
      { text: 'Eat more complex carbohydrates (potatoes, sweet potatoes, squash, beans, brown rice). Carb cravings now are expected, not a lack of willpower.', refs: [P7nur, V4food] },
      { text: 'Swap intense workouts for gentle ones: yoga, Pilates, barre, walks and hikes.', refs: [V5, P7nur] },
      { text: 'Lower stress and protect your own time. Stress hormones crowd out progesterone, the hormone that keeps you calm.', refs: [V3, P7nur] },
    ],
    recs: [
      { topic: 'mind', text: 'Turn the focus to yourself: say no more often and keep firm boundaries; otherwise irritation builds.', ref: V3 },
      { topic: 'stress', text: 'Your stress response is naturally stronger in the second half of the cycle, so the same workload feels heavier.', ref: V('ch. 3, "How Your Cycle Affects Your Stress Response"', '84–85') },
      { topic: 'stress', text: '"No tigers": avoid rushing and over-scheduling. Cortisol from a hectic life uses up the building blocks for progesterone, worsening PMS.', ref: P7nur },
      { topic: 'stress', text: 'Boost oxytocin, which switches off cortisol: hugs, laughing, time with close friends, pets, gratitude, meditation, yoga, massage, intimacy.', ref: P('ch. 4, "Oxytocin"', '91') },
      { topic: 'food', text: 'Progesterone-building foods: potatoes, sweet potatoes and yams, squashes, lentils and black beans, citrus, bananas, mango, papaya, berries, pumpkin seeds, wild or brown rice, quinoa. Not an excuse for fries or ice cream.', ref: P7nur },
      { topic: 'food', text: 'Add natural sweetness from roasted root vegetables, and complex carbs like millet to steady serotonin and avoid mood swings.', ref: V4food },
      { topic: 'food', text: 'On the days PMS usually hits, add sweet potatoes, brown rice, chickpeas and apples, and notice if mood, headaches or sleep improve.', ref: V4quick },
      { topic: 'food', text: 'Choose cooked food over raw (soups, steamed vegetables) to support immunity, which dips now.', ref: V('ch. 4, "How Cyclical Eating Supports…" (immune system)', '105–106') },
      { topic: 'movement', text: 'Pilates, barre and gentle yoga. Women tire sooner and injury risk is higher in the late luteal phase, so pushing hard backfires.', ref: V('ch. 5, "Work Out Less, Get More Fit"', '128, 135') },
      { topic: 'movement', text: 'Replace high-intensity sessions with yoga, hiking or long walks to protect progesterone.', ref: P7nur },
      { topic: 'fasting', text: 'No fasting at all in this phase: even short fasts raise cortisol, and progesterone needs glucose.', ref: P7nur },
      { topic: 'symptoms', text: 'Bloating: support your gut (probiotics), get enough magnesium, and cut caffeine, salty foods and dairy before your period.', ref: V('Biohacking Tool Kit, "Bloating"', '186–187') },
      { topic: 'symptoms', text: 'Breast tenderness: vitamin-E foods (almonds, sunflower seeds, spinach, chard, avocado, kiwi) and avoiding caffeine.', ref: V('Biohacking Tool Kit, "Breast Tenderness"', '188–189') },
      { topic: 'symptoms', text: 'Low vitamin B6 is linked to low progesterone and PMS; magnesium helps sleep and reduces sugar cravings.', ref: V('Biohacking Tool Kit, Step 5', '190–191') },
      { topic: 'symptoms', text: 'Vitti is strongly against caffeine for women with PMS and suggests tapering: half-caf, then decaf, then rooibos.', ref: V('ch. 4, "Caffeine: Biohacking Wonder or FLO Blocker?"', '109–112') },
    ],
  },
]

export interface Disagreement {
  topic: string
  phases: GuideKey[]
  sides: { book: BookId; text: string; ref: Ref }[]
}

export const DISAGREEMENTS: Disagreement[] = [
  {
    topic: 'How long to fast',
    phases: ['menstrual', 'follicular', 'ovulatory', 'luteal-early'],
    sides: [
      {
        book: 'pelz',
        text: 'Fasting is the core tool: 13–72-hour fasts in the power phases (days 1–10 and 16–19), under 15 hours around ovulation.',
        ref: P('ch. 7, "The Fasting Cycle"', '141–147'),
      },
      {
        book: 'vitti',
        text: 'Most fasting research is on men. The only fasting she considers safe for menstruating women is a 12-hour overnight break (about 7 p.m. to 7 a.m.). If you want to try calorie restriction, do it in the follicular phase only.',
        ref: V('ch. 4, "Intermittent Fasting" and "A Cyclical Diet Plan"', '115–116, 120'),
      },
    ],
  },
  {
    topic: 'Carbohydrates in the early luteal phase',
    phases: ['luteal-early'],
    sides: [
      { book: 'pelz', text: 'Stay low-carb ("ketobiotic") through days 16–19; bring carbs back from day 20.', ref: P7power },
      { book: 'vitti', text: 'Increase calories and slow-burning carbs from the start of the luteal phase.', ref: V4food },
    ],
  },
]
