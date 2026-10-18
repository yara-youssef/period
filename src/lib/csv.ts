/** Small RFC 4180 parser: quoted fields, escaped quotes, commas/semicolons/tabs. */
export function parseCSV(text: string): string[][] {
  text = text.replace(/^\uFEFF/, '')
  const firstLine = text.slice(0, text.indexOf('\n') >>> 0)
  const delimiter = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0]!
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f.trim() !== '')) rows.push(row)
  return rows
}

/** "7h 32m", "7:32", "1,234", "45 min", "--" → number (durations in minutes). */
export function parseNumber(raw: string | undefined): number | null {
  if (raw == null) return null
  const s = raw.trim()
  if (!s || s === '--' || s === '-') return null
  const hm = s.match(/^(\d+)\s*h(?:rs?)?\s*(?:(\d+)\s*m(?:in)?)?$/i)
  if (hm) return Number(hm[1]) * 60 + Number(hm[2] ?? 0)
  const colon = s.match(/^(\d+):(\d{2})(?::\d{2})?$/)
  if (colon) return Number(colon[1]) * 60 + Number(colon[2])
  const n = Number(s.replace(/[^\d.,-]/g, '').replace(/,(?=\d{3}(\D|$))/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const GUESSES: [RegExp, string][] = [
  [/^(date|day|calendar ?date|datum|fecha)$/i, 'date'],
  [/mood/i, 'mood'],
  [/energy/i, 'energy'],
  [/deep/i, 'deepSleepMinutes'],
  [/rem/i, 'remSleepMinutes'],
  [/sleep.*score|score.*sleep/i, 'sleepScore'],
  [/sleep|duration/i, 'sleepMinutes'],
  [/step/i, 'steps'],
  [/intensity/i, 'intensityMinutes'],
  [/workout|activity time|exercise/i, 'workoutMinutes'],
  [/active.*cal|cal.*active/i, 'activeCalories'],
  [/resting|rhr/i, 'restingHR'],
  [/hrv/i, 'hrv'],
  [/stress/i, 'stress'],
  [/body ?battery/i, 'bodyBattery'],
  [/flow|period|bleed/i, 'flow'],
]

/** Best guess at which field a CSV column holds, from its header. */
export function guessColumn(header: string): string {
  const h = header.trim()
  for (const [re, key] of GUESSES) if (re.test(h)) return key
  return ''
}
