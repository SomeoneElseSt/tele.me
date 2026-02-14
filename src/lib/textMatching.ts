// Constants
const FUZZY_MATCH_THRESHOLD = 0.7
const PUNCTUATION_REGEX = /[.,!?;:"""''()[\]{}]/g
const WHITESPACE_REGEX = /\s+/g

export type WordInfo = {
  word: string
  normalizedWord: string
  startIdx: number
  endIdx: number
}

/**
 * Normalize text: lowercase, strip markdown, remove punctuation, collapse whitespace
 */
export function normalizeText(text: string): string {
  let normalized = text.toLowerCase()

  // Strip markdown syntax
  normalized = normalized.replace(/`[^`]+`/g, (match) => match.slice(1, -1))
  normalized = normalized.replace(/\*\*([^*]+)\*\*/g, '$1')
  normalized = normalized.replace(/__([^_]+)__/g, '$1')
  normalized = normalized.replace(/\*([^*]+)\*/g, '$1')
  normalized = normalized.replace(/_([^_]+)_/g, '$1')
  normalized = normalized.replace(/#{1,6}\s+/g, '')
  normalized = normalized.replace(/^\s*[-*+]\s+/gm, '')
  normalized = normalized.replace(/^\s*\d+\.\s+/gm, '')

  // Remove punctuation
  normalized = normalized.replace(PUNCTUATION_REGEX, '')

  // Collapse whitespace
  normalized = normalized.replace(WHITESPACE_REGEX, ' ').trim()

  return normalized
}

/**
 * Extract word array with character indices for tracking
 */
export function extractWords(text: string): WordInfo[] {
  const words: WordInfo[] = []
  const normalized = normalizeText(text)
  const normalizedWords = normalized.split(' ').filter(w => w.length > 0)

  let currentIdx = 0
  for (const normalizedWord of normalizedWords) {
    const startIdx = currentIdx
    const endIdx = startIdx + normalizedWord.length
    words.push({
      word: normalizedWord,
      normalizedWord,
      startIdx,
      endIdx
    })
    currentIdx = endIdx + 1 // +1 for space
  }

  return words
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0) return len2
  if (len2 === 0) return len1

  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len2; j++) {
    const row = matrix[0]
    if (row) row[j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      const row = matrix[i]
      const prevRow = matrix[i - 1]
      if (!row || !prevRow) continue

      const deletion = (prevRow[j] ?? 0) + 1
      const insertion = (row[j - 1] ?? 0) + 1
      const substitution = (prevRow[j - 1] ?? 0) + cost

      row[j] = Math.min(deletion, insertion, substitution)
    }
  }

  const lastRow = matrix[len1]
  return lastRow?.[len2] ?? 0
}

/**
 * Calculate similarity ratio between two strings (1.0 = identical, 0.0 = completely different)
 */
function similarityRatio(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1.0

  const distance = levenshteinDistance(str1, str2)
  return 1.0 - distance / maxLen
}

/**
 * Find matching word indices using sliding window + Levenshtein distance
 */
export function findMatchingWords(
  scriptWords: WordInfo[],
  transcript: string,
  lastMatchedIndex: number
): number[] {
  if (scriptWords.length === 0) return []

  const normalizedTranscript = normalizeText(transcript)
  const transcriptWords = normalizedTranscript.split(' ').filter(w => w.length > 0)

  if (transcriptWords.length === 0) return []

  const matches: number[] = []
  const startSearchIdx = Math.max(0, lastMatchedIndex + 1)

  // Try to match transcript words to script words sequentially
  let scriptIdx = startSearchIdx
  let transcriptIdx = 0

  while (scriptIdx < scriptWords.length && transcriptIdx < transcriptWords.length) {
    const scriptWord = scriptWords[scriptIdx]
    const transcriptWord = transcriptWords[transcriptIdx]

    if (!scriptWord || !transcriptWord) break

    const similarity = similarityRatio(scriptWord.normalizedWord, transcriptWord)

    if (similarity >= FUZZY_MATCH_THRESHOLD) {
      matches.push(scriptIdx)
      scriptIdx++
      transcriptIdx++
    } else {
      // Try next script word (skip unspoken words)
      scriptIdx++

      // Prevent infinite loops - if we've skipped too many words, give up
      if (scriptIdx - startSearchIdx > transcriptWords.length * 3) {
        break
      }
    }
  }

  return matches
}
