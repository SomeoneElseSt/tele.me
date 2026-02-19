import { syllable } from 'syllable'
import type { WordInfo } from './textMatching'

/**
 * Timing information for a single word
 */
export type WordTiming = {
  wordIndex: number
  durationMs: number
  hasPunctuation: boolean
  punctuationPauseMs: number
}

/**
 * Punctuation pause multipliers (base values in ms)
 */
const COMMA_PAUSE_MS = 500
const PERIOD_PAUSE_MS = 900
const LINE_BREAK_PAUSE_MS = 600

/**
 * Default WPM for scaling punctuation pauses
 */
const DEFAULT_WPM = 300

/**
 * Duration variance control (0.0 - 2.0)
 *
 * Controls how much word duration varies based on syllable count:
 * - 1.0 = Normal distribution (default) - syllable count directly determines duration
 * - 0.5 = Low variance - short and long words are closer in duration
 * - 0.0 = Zero variance - all words same duration regardless of syllable count
 * - 1.5 = High variance - bigger difference between short and long words
 * - 2.0 = Very high variance - extreme difference between short and long words
 *
 * Examples at 150 WPM with different variance values:
 * - 1-syllable word: 267ms (var=1.0), 356ms (var=0.5), 178ms (var=1.5)
 * - 3-syllable word: 800ms (var=1.0), 711ms (var=0.5), 889ms (var=1.5)
 */
const DURATION_VARIANCE = 1.0
const MIN_MS_PER_SYLLABLE = 180

/**
 * Check if a word has punctuation at its position in the original script
 */
function hasPunctuationAtPosition(
  script: string,
  wordInfo: WordInfo,
  words: WordInfo[]
): { hasPunctuation: boolean; punctuationType: 'comma' | 'period' | 'linebreak' | null } {
  // Find the approximate position in the original script
  // Since WordInfo contains normalized words, we need to search for the word in context

  // Get the normalized script text
  const normalizedScript = script.toLowerCase()

  // Try to find the word context in the original script
  const wordText = wordInfo.word
  const wordIndex = wordInfo.startIdx

  // Look for this word in the original script context
  // We'll search for punctuation immediately after where this word should be

  // Find all occurrences of the word in the normalized script
  const regex = new RegExp(`\\b${wordText}\\b`, 'gi')
  const matches: number[] = []
  let match

  while ((match = regex.exec(normalizedScript)) !== null) {
    matches.push(match.index)
  }

  // If we can't find the word, return no punctuation
  if (matches.length === 0) {
    return { hasPunctuation: false, punctuationType: null }
  }

  // Count how many times this exact word appeared before this instance (nth occurrence of this word)
  const globalIdx = words.findIndex(w => w.startIdx === wordInfo.startIdx)
  const nthOccurrence = words.slice(0, globalIdx).filter(w => w.word === wordText).length
  const scriptPosition = matches[Math.min(nthOccurrence, matches.length - 1)]

  if (scriptPosition === undefined) {
    return { hasPunctuation: false, punctuationType: null }
  }

  // Look at characters immediately after the word in the original script
  const afterWordIndex = scriptPosition + wordText.length
  const nextChars = script.slice(afterWordIndex, afterWordIndex + 10)

  // Check for line breaks first (highest priority)
  if (nextChars.includes('\n')) {
    return { hasPunctuation: true, punctuationType: 'linebreak' }
  }

  // Check for period-like punctuation
  if (nextChars.match(/[.!?]/)) {
    return { hasPunctuation: true, punctuationType: 'period' }
  }

  // Check for comma-like punctuation
  if (nextChars.match(/[,;:]/)) {
    return { hasPunctuation: true, punctuationType: 'comma' }
  }

  return { hasPunctuation: false, punctuationType: null }
}

/**
 * Calculate timing for each word in the script
 *
 * @param words - Array of WordInfo from extractWords()
 * @param wpm - Words per minute (100-200)
 * @param script - Original script text for punctuation detection
 * @returns Array of WordTiming objects
 */
export function calculateWordTimings(
  words: WordInfo[],
  wpm: number,
  script: string
): WordTiming[] {
  if (words.length === 0) return []

  // Clamp WPM to valid range
  const validWpm = Math.max(100, Math.min(300, wpm))

  // Calculate base time per syllable in milliseconds
  // WPM = words per minute
  // Assuming average word has ~1.5 syllables, we can derive syllables per minute
  // Time per syllable = 60000ms / (WPM * 1.5)
  const avgSyllables = 1.5
  const msPerSyllable = 60000 / (validWpm * avgSyllables)

  const timings: WordTiming[] = []

  for (let i = 0; i < words.length; i++) {
    const wordInfo = words[i]
    if (!wordInfo) continue

    // Count syllables in the word
    const syllableCount = Math.max(1, syllable(wordInfo.word))

    // Apply variance control to syllable count
    // This normalizes duration distribution - lower variance = more uniform durations
    const syllableRatio = syllableCount / avgSyllables
    const adjustedRatio = Math.pow(syllableRatio, DURATION_VARIANCE)
    const adjustedSyllables = adjustedRatio * avgSyllables

    // Proportional floor: longer words stay proportionally longer even at high WPM
    const baseDuration = Math.max(syllableCount * MIN_MS_PER_SYLLABLE, adjustedSyllables * msPerSyllable)

    // Check for punctuation
    const { hasPunctuation, punctuationType } = hasPunctuationAtPosition(script, wordInfo, words)

    // Calculate punctuation pause (scaled by WPM)
    let punctuationPause = 0
    if (hasPunctuation && punctuationType) {
      const wpmScale = DEFAULT_WPM / validWpm

      switch (punctuationType) {
        case 'comma':
          punctuationPause = COMMA_PAUSE_MS * wpmScale
          break
        case 'period':
          punctuationPause = PERIOD_PAUSE_MS * wpmScale
          break
        case 'linebreak':
          punctuationPause = LINE_BREAK_PAUSE_MS * wpmScale
          break
      }
    }

    timings.push({
      wordIndex: i,
      durationMs: baseDuration + punctuationPause,
      hasPunctuation,
      punctuationPauseMs: punctuationPause
    })
  }

  return timings
}
