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
const COMMA_PAUSE_MS = 300
const PERIOD_PAUSE_MS = 500
const LINE_BREAK_PAUSE_MS = 500

/**
 * Default WPM for scaling punctuation pauses
 */
const DEFAULT_WPM = 150

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

  // Use the word index to determine which occurrence this is
  const wordIndexInList = words.findIndex(w => w.startIdx === wordInfo.startIdx)
  const scriptPosition = matches[Math.min(wordIndexInList, matches.length - 1)]

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
  const msPerSyllable = 60000 / (validWpm * 1.5)

  const timings: WordTiming[] = []

  for (let i = 0; i < words.length; i++) {
    const wordInfo = words[i]
    if (!wordInfo) continue

    // Count syllables in the word
    const syllableCount = Math.max(1, syllable(wordInfo.word))

    // Calculate base duration for this word
    const baseDuration = syllableCount * msPerSyllable

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
