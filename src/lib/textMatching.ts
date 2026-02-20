// Constants
const FUZZY_MATCH_THRESHOLD = 0.6  // Lowered from 0.7 to handle transcription errors
const MAX_GAP_SIZE = 2  // Max words we'll skip and infer as "probably spoken"
const PUNCTUATION_REGEX = /[.,!?;:"""''()[\]{}]/g
const WHITESPACE_REGEX = /\s+/g

// Buffer-based matching constants
const EDIT_DISTANCE_THRESHOLD = 0.2  // Normalized edit distance threshold for fuzzy match
const STRICT_EDIT_DISTANCE_THRESHOLD = 0.1  // Stricter threshold for low-information words
const LOOKAHEAD_WINDOW = 6 // Check current + next N tokens
const NEXT_LINE_LOOKAHEAD_COUNT = 3  // Number of tokens from next line to check
const NEXT_LINE_LOOKAHEAD_THRESHOLD = 0.5  // Start checking next line when 50% through current line

// Dynamic weighting constants
const SHORT_TOKEN_LENGTH = 3  // Tokens <= 3 chars are considered low-information
const HIGH_FREQUENCY_PERCENTILE = 0.2  // Top 20% most common tokens

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

  // Strip markdown syntax (same boundary rules as the renderer)
  normalized = normalized.replace(/\B\*\*([^*]+)\*\*\B/g, '$1')
  normalized = normalized.replace(/\B__([^_]+)__\B/g, '$1')
  normalized = normalized.replace(/\B\*([^*]+)\*\B/g, '$1')
  normalized = normalized.replace(/\B_([^_]+)_\B/g, '$1')
  normalized = normalized.replace(/#{1,6}\s+/g, '')

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
 * Now with gap filling - matches sequentially from startIndex
 */
export function findMatchingWords(
  scriptWords: WordInfo[],
  transcript: string,
  startIndex: number
): number[] {
  if (scriptWords.length === 0) return []

  const normalizedTranscript = normalizeText(transcript)
  const transcriptWords = normalizedTranscript.split(' ').filter(w => w.length > 0)

  if (transcriptWords.length === 0) return []

  // Always start from the provided index (no skip-ahead)
  const searchStart = Math.max(0, Math.min(startIndex, scriptWords.length - 1))

  // Match sequence sequentially
  const { matches } = matchSequence(scriptWords, transcriptWords, searchStart)

  // Fill gaps: if we matched words at positions [i, i+3], fill in [i+1, i+2]
  const filledMatches = fillGaps(matches)

  return filledMatches
}

/**
 * Match a sequence of transcript words starting from a position in the script
 */
function matchSequence(
  scriptWords: WordInfo[],
  transcriptWords: string[],
  startIdx: number
): { matches: number[]; score: number } {
  const matches: number[] = []
  let scriptIdx = startIdx
  let transcriptIdx = 0
  let score = 0

  while (scriptIdx < scriptWords.length && transcriptIdx < transcriptWords.length) {
    const scriptWord = scriptWords[scriptIdx]
    const transcriptWord = transcriptWords[transcriptIdx]

    if (!scriptWord || !transcriptWord) break

    const similarity = similarityRatio(scriptWord.normalizedWord, transcriptWord)

    if (similarity >= FUZZY_MATCH_THRESHOLD) {
      matches.push(scriptIdx)
      score += similarity
      scriptIdx++
      transcriptIdx++
    } else {
      // Try skipping script word (word not spoken yet)
      scriptIdx++

      // Prevent infinite loops
      if (scriptIdx - startIdx > transcriptWords.length * 3) {
        break
      }
    }
  }

  return { matches, score }
}

/**
 * Fill gaps between matched words (e.g., if we matched [5, 8, 9], fill to [5, 6, 7, 8, 9])
 */
function fillGaps(matches: number[]): number[] {
  if (matches.length === 0) return matches

  const filled = new Set<number>(matches)

  for (let i = 0; i < matches.length - 1; i++) {
    const current = matches[i]
    const next = matches[i + 1]

    if (current === undefined || next === undefined) continue

    const gap = next - current - 1

    // If gap is small (1-2 words), fill it in
    if (gap > 0 && gap <= MAX_GAP_SIZE) {
      for (let j = current + 1; j < next; j++) {
        filled.add(j)
      }
    }
  }

  return Array.from(filled).sort((a, b) => a - b)
}

/**
 * Match transcript against words in a specific line only
 * Returns matched word indices and whether the line is complete
 */
export function findMatchingWordsInLine(
  scriptWords: WordInfo[],
  lineWordIndices: number[],
  transcript: string
): { matches: number[]; lineComplete: boolean } {
  if (lineWordIndices.length === 0) {
    return { matches: [], lineComplete: false }
  }

  const normalizedTranscript = normalizeText(transcript)
  const transcriptWords = normalizedTranscript.split(' ').filter(w => w.length > 0)

  if (transcriptWords.length === 0) {
    return { matches: [], lineComplete: false }
  }

  // Create a sub-array of script words for this line only
  const lineWords = lineWordIndices
    .map(idx => scriptWords[idx])
    .filter((w): w is WordInfo => w !== undefined)

  if (lineWords.length === 0) {
    return { matches: [], lineComplete: false }
  }

  // Match sequentially within the line
  const matches: number[] = []
  let lineWordIdx = 0
  let transcriptIdx = 0

  while (lineWordIdx < lineWords.length && transcriptIdx < transcriptWords.length) {
    const lineWord = lineWords[lineWordIdx]
    const transcriptWord = transcriptWords[transcriptIdx]

    if (!lineWord || !transcriptWord) break

    const similarity = similarityRatio(lineWord.normalizedWord, transcriptWord)

    if (similarity >= FUZZY_MATCH_THRESHOLD) {
      // Match found - record the original script index
      const scriptIdx = lineWordIndices[lineWordIdx]
      if (scriptIdx !== undefined) {
        matches.push(scriptIdx)
      }
      lineWordIdx++
      transcriptIdx++
    } else {
      // Try skipping line word (word not spoken yet)
      lineWordIdx++

      // Prevent infinite loops
      if (lineWordIdx > transcriptWords.length * 3) {
        break
      }
    }
  }

  // Fill gaps in matches
  const filledMatches = fillGaps(matches)

  // Line is complete if we've matched all words in the line
  const lineComplete = filledMatches.length === lineWordIndices.length

  return { matches: filledMatches, lineComplete }
}

/**
 * State for buffer-based line matching
 */
export type LineMatchState = {
  gtIndex: number           // Ground truth index (current position in line tokens, 0-indexed)
  processedAsrIndex: number // Character index in ASR buffer we've processed so far
  highlightIndices: number[] // Token indices to highlight (0-indexed within the line)
}

/**
 * Calculate token frequency across all script tokens
 * Returns a map of token -> frequency and the high-frequency threshold count
 */
export function calculateTokenFrequency(allTokens: string[]): {
  frequencyMap: Map<string, number>
  highFrequencyThreshold: number
} {
  const frequencyMap = new Map<string, number>()

  // Count occurrences
  for (const token of allTokens) {
    frequencyMap.set(token, (frequencyMap.get(token) ?? 0) + 1)
  }

  // Calculate high-frequency threshold (top 20% percentile)
  const frequencies = Array.from(frequencyMap.values()).sort((a, b) => b - a)
  const percentileIndex = Math.floor(frequencies.length * HIGH_FREQUENCY_PERCENTILE)
  const highFrequencyThreshold = frequencies[percentileIndex] ?? 1

  return { frequencyMap, highFrequencyThreshold }
}

/**
 * Determine if a token is low-information (short or high-frequency)
 */
function isLowInformationToken(
  token: string,
  frequencyMap: Map<string, number>,
  highFrequencyThreshold: number
): boolean {
  // Short tokens are low-information (the, and, de, la, etc.)
  if (token.length <= SHORT_TOKEN_LENGTH) {
    return true
  }

  // High-frequency tokens are low-information
  const frequency = frequencyMap.get(token) ?? 0
  if (frequency >= highFrequencyThreshold) {
    return true
  }

  return false
}

/**
 * Calculate normalized edit distance (0.0 = identical, 1.0 = completely different)
 */
function normalizedEditDistance(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 0.0

  const distance = levenshteinDistance(str1, str2)
  return distance / maxLen
}

/**
 * Try to match a single ASR token against ground truth tokens in lookahead window
 * Uses dynamic thresholds based on token information content
 * Returns the matched GT index, or -1 if no match
 */
function matchTokenWithLookahead(
  asrToken: string,
  lineTokens: string[],
  gtIndex: number,
  frequencyMap: Map<string, number>,
  highFrequencyThreshold: number
): number {
  // Check current expected token + lookahead window
  const windowEnd = Math.min(gtIndex + LOOKAHEAD_WINDOW + 1, lineTokens.length)

  for (let i = gtIndex; i < windowEnd; i++) {
    const gtToken = lineTokens[i]
    if (!gtToken) continue

    // Exact match always succeeds
    if (asrToken === gtToken) {
      return i
    }

    // Determine threshold based on token information content
    const isLowInfo = isLowInformationToken(gtToken, frequencyMap, highFrequencyThreshold)
    const threshold = isLowInfo ? STRICT_EDIT_DISTANCE_THRESHOLD : EDIT_DISTANCE_THRESHOLD

    // Fuzzy match with dynamic threshold
    const editDist = normalizedEditDistance(asrToken, gtToken)
    if (editDist < threshold) {
      return i
    }
  }

  return -1 // No match found
}

/**
 * Buffer-based streaming ASR matcher for a single line
 *
 * @param lineTokens - Normalized tokens for the current line (0-indexed)
 * @param asrBuffer - Full ASR text buffer (growing string)
 * @param currentState - Current matching state
 * @param frequencyMap - Token frequency map for dynamic weighting
 * @param highFrequencyThreshold - Threshold for high-frequency tokens
 * @param nextLineTokens - Optional tokens from next line for lookahead matching
 * @returns Updated state with new matches and completion status
 */
export function matchAsrToLine(
  lineTokens: string[],
  asrBuffer: string,
  currentState: LineMatchState,
  frequencyMap: Map<string, number>,
  highFrequencyThreshold: number,
  nextLineTokens?: string[]
): { newState: LineMatchState; lineComplete: boolean } {
  if (lineTokens.length === 0) {
    return {
      newState: currentState,
      lineComplete: false
    }
  }

  // Extract only the new part of the ASR buffer
  const newAsrText = asrBuffer.substring(currentState.processedAsrIndex)

  if (newAsrText.trim().length === 0) {
    // No new text to process
    return {
      newState: currentState,
      lineComplete: currentState.gtIndex >= lineTokens.length
    }
  }

  // Tokenize only the new chunk
  const normalizedNewChunk = normalizeText(newAsrText)
  const newTokens = normalizedNewChunk.split(' ').filter(w => w.length > 0)

  if (newTokens.length === 0) {
    // No new tokens after normalization
    return {
      newState: {
        ...currentState,
        processedAsrIndex: asrBuffer.length
      },
      lineComplete: currentState.gtIndex >= lineTokens.length
    }
  }

  // Process each new ASR token
  let gtIndex = currentState.gtIndex
  const highlightIndices = new Set(currentState.highlightIndices)
  let nextLineDetected = false

  for (const asrToken of newTokens) {
    // Stop if we've already completed the line
    if (gtIndex >= lineTokens.length) {
      break
    }

    // Try to match this ASR token against GT tokens (with lookahead and dynamic weighting)
    const matchedGtIndex = matchTokenWithLookahead(asrToken, lineTokens, gtIndex, frequencyMap, highFrequencyThreshold)

    if (matchedGtIndex !== -1) {
      // Match found! Highlight all tokens from current position to matched position
      for (let i = gtIndex; i <= matchedGtIndex; i++) {
        highlightIndices.add(i)
      }

      // Advance GT pointer to matched position + 1
      gtIndex = matchedGtIndex + 1
    } else {
      // Check if we should try matching against next line
      const pastThreshold = gtIndex >= lineTokens.length * NEXT_LINE_LOOKAHEAD_THRESHOLD

      if (pastThreshold && nextLineTokens && nextLineTokens.length > 0) {
        // Try matching against first N tokens of next line
        const nextLinePreview = nextLineTokens.slice(0, NEXT_LINE_LOOKAHEAD_COUNT)

        for (let i = 0; i < nextLinePreview.length; i++) {
          const nextLineToken = nextLinePreview[i]
          if (!nextLineToken) continue

          // Exact match always succeeds
          if (asrToken === nextLineToken) {
            console.log('[textMatching] Next line token detected:', asrToken, 'at position', i)
            nextLineDetected = true
            break
          }

          // Use stricter threshold for low-information tokens to prevent false positives
          const isLowInfo = isLowInformationToken(nextLineToken, frequencyMap, highFrequencyThreshold)
          const threshold = isLowInfo ? STRICT_EDIT_DISTANCE_THRESHOLD : EDIT_DISTANCE_THRESHOLD

          // Fuzzy match with dynamic threshold
          const editDist = normalizedEditDistance(asrToken, nextLineToken)
          if (editDist < threshold) {
            console.log('[textMatching] Next line token detected (fuzzy):', asrToken, '~', nextLineToken, 'threshold:', threshold)
            nextLineDetected = true
            break
          }
        }

        if (nextLineDetected) {
          // Treat current line as complete
          break
        }
      }
    }
    // Else: ASR token didn't match (junk/insertion) → ignore it
  }

  // Line is complete when GT pointer reaches line length OR next line token detected
  const lineComplete = gtIndex >= lineTokens.length || nextLineDetected

  return {
    newState: {
      gtIndex,
      processedAsrIndex: asrBuffer.length,
      highlightIndices: Array.from(highlightIndices).sort((a, b) => a - b)
    },
    lineComplete
  }
}

/**
 * Tokenize a line (array of word indices) into normalized tokens
 */
export function tokenizeLine(
  scriptWords: WordInfo[],
  lineWordIndices: number[]
): string[] {
  return lineWordIndices
    .map(idx => scriptWords[idx])
    .filter((w): w is WordInfo => w !== undefined)
    .map(w => w.normalizedWord)
}
