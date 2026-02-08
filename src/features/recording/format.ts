export function formatMs(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatFilename(createdAt: number, extension: string) {
  const date = new Date(createdAt)
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ]
  const monthName = months[date.getMonth()]
  const dd = String(date.getDate()).padStart(2, '0')
  const yyyy = date.getFullYear()
  const HH = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')

  return `teleme-${HH}h${min}m-${monthName}-${dd}-${yyyy}.${extension}`
}

