/**
 * Fixes VFR timestamps from MediaRecorder fMP4 and injects Apple's
 * FullFrameRatePlaybackIntent tag so QuickTime Player plays at normal speed.
 *
 * ROOT CAUSE: MediaRecorder with 250ms timeslice produces wildly variable stts
 * sample_deltas (e.g., delta=16 → 1875fps apparent). QuickTime activates its
 * slow-motion UI when any stts entry yields >60-85fps apparent rate.
 *
 * FIX: normalizeVideoTimestamps() rewrites all stts deltas to CFR 30fps in-place,
 * then updates mdhd/tkhd/mvhd durations to match. No re-encode needed.
 *
 * The FullFrameRatePlaybackIntent tag (moov > meta, mdta handler) is kept as a
 * belt-and-suspenders signal for QuickTime on macOS 15+.
 */

const INTENT_KEY = 'com.apple.quicktime.full-frame-rate-playback-intent'
const TARGET_FPS = 30

// -- Big-endian read/write helpers --

function readU32(d: Uint8Array, o: number): number {
  return ((d[o]! << 24) | (d[o + 1]! << 16) | (d[o + 2]! << 8) | d[o + 3]!) >>> 0
}

function writeU32(d: Uint8Array, o: number, v: number): void {
  d[o] = (v >>> 24) & 0xff
  d[o + 1] = (v >>> 16) & 0xff
  d[o + 2] = (v >>> 8) & 0xff
  d[o + 3] = v & 0xff
}

function readU64(d: Uint8Array, o: number): number {
  const hi = readU32(d, o)
  const lo = readU32(d, o + 4)
  return hi * 0x100000000 + lo
}

function writeU64(d: Uint8Array, o: number, v: number): void {
  writeU32(d, o, Math.floor(v / 0x100000000))
  writeU32(d, o + 4, v >>> 0)
}

function ascii(d: Uint8Array, o: number, len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) s += String.fromCharCode(d[o + i]!)
  return s
}

function writeAscii(d: Uint8Array, o: number, s: string): void {
  for (let i = 0; i < s.length; i++) d[o + i] = s.charCodeAt(i)
}

// -- Box traversal --

type BoxInfo = { offset: number; size: number }

function findBox(d: Uint8Array, start: number, end: number, type: string): BoxInfo | null {
  let pos = start
  while (pos + 8 <= end) {
    const size = readU32(d, pos)
    if (size < 8) return null
    if (ascii(d, pos + 4, 4) === type) return { offset: pos, size }
    pos += size
  }
  return null
}

function findAllBoxes(d: Uint8Array, start: number, end: number, type: string, out: number[]): void {
  const CONTAINERS = ['moov', 'trak', 'mdia', 'minf', 'stbl', 'udta', 'dinf']
  let pos = start
  while (pos + 8 <= end) {
    const size = readU32(d, pos)
    if (size < 8) return
    const t = ascii(d, pos + 4, 4)
    if (t === type) out.push(pos)
    const childStart = t === 'meta' ? pos + 12 : pos + 8
    if (CONTAINERS.includes(t) || t === 'meta') {
      findAllBoxes(d, childStart, pos + size, type, out)
    }
    pos += size
  }
}

// -- Build meta > hdlr + keys + ilst (no udta wrapper) --

function buildMetaWithIntent(): Uint8Array {
  const keyBytes = new TextEncoder().encode(INTENT_KEY)

  const HDLR_SIZE = 33
  const KEY_ENTRY_SIZE = 4 + 4 + keyBytes.length
  const KEYS_SIZE = 16 + KEY_ENTRY_SIZE
  const DATA_SIZE = 17
  const ITEM_SIZE = 8 + DATA_SIZE
  const ILST_SIZE = 8 + ITEM_SIZE
  const META_SIZE = 12 + HDLR_SIZE + KEYS_SIZE + ILST_SIZE

  const buf = new Uint8Array(META_SIZE)
  let p = 0

  // meta fullbox header (version=0, flags=0)
  writeU32(buf, p, META_SIZE); writeAscii(buf, p + 4, 'meta'); p += 12

  // hdlr box — handler_type = 'mdta'
  writeU32(buf, p, HDLR_SIZE); writeAscii(buf, p + 4, 'hdlr')
  writeAscii(buf, p + 16, 'mdta')
  p += HDLR_SIZE

  // keys box
  writeU32(buf, p, KEYS_SIZE); writeAscii(buf, p + 4, 'keys')
  writeU32(buf, p + 12, 1) // entry_count
  writeU32(buf, p + 16, KEY_ENTRY_SIZE)
  writeAscii(buf, p + 20, 'mdta')
  buf.set(keyBytes, p + 24)
  p += KEYS_SIZE

  // ilst box
  writeU32(buf, p, ILST_SIZE); writeAscii(buf, p + 4, 'ilst')
  writeU32(buf, p + 8, ITEM_SIZE); writeU32(buf, p + 12, 1) // item: key index 1
  writeU32(buf, p + 16, DATA_SIZE); writeAscii(buf, p + 20, 'data')
  writeU32(buf, p + 24, 0x15) // type = BE signed integer
  writeU32(buf, p + 28, 0)    // locale
  buf[p + 32] = 1             // value = 1

  return buf
}

// -- Timestamp normalization --

function readMdhdTimescale(d: Uint8Array, mdhd: BoxInfo): number {
  const v = d[mdhd.offset + 8]!
  // v0: creation(4)+mod(4)+timescale at +20; v1: creation(8)+mod(8)+timescale at +28
  return v === 1 ? readU32(d, mdhd.offset + 28) : readU32(d, mdhd.offset + 20)
}

function writeMdhdDuration(d: Uint8Array, mdhd: BoxInfo, dur: number): void {
  const v = d[mdhd.offset + 8]!
  // v0: duration at +24; v1: duration (uint64) at +32
  if (v === 1) { writeU32(d, mdhd.offset + 32, 0); writeU32(d, mdhd.offset + 36, dur) }
  else writeU32(d, mdhd.offset + 24, dur)
}

function writeTkhdDuration(d: Uint8Array, tkhd: BoxInfo, dur: number): void {
  const v = d[tkhd.offset + 8]!
  // v0: track_ID(4)+reserved(4)+duration at +28 (movie timescale)
  // v1: track_ID(4)+reserved(4)+duration (uint64) at +36
  if (v === 1) { writeU32(d, tkhd.offset + 36, 0); writeU32(d, tkhd.offset + 40, dur) }
  else writeU32(d, tkhd.offset + 28, dur)
}

function writeMvhdDuration(d: Uint8Array, mvhd: BoxInfo, dur: number): void {
  const v = d[mvhd.offset + 8]!
  // v0: timescale at +20, duration at +24; v1: timescale at +28, duration (uint64) at +32
  if (v === 1) { writeU32(d, mvhd.offset + 32, 0); writeU32(d, mvhd.offset + 36, dur) }
  else writeU32(d, mvhd.offset + 24, dur)
}

function readMvhdTimescale(d: Uint8Array, mvhd: BoxInfo): number {
  const v = d[mvhd.offset + 8]!
  return v === 1 ? readU32(d, mvhd.offset + 28) : readU32(d, mvhd.offset + 20)
}

function readMdhdDuration(d: Uint8Array, mdhd: BoxInfo): number {
  const v = d[mdhd.offset + 8]!
  // v0: duration at +24; v1: duration (uint64) at +32 (read low 32 bits only — fits in JS number)
  return v === 1 ? readU32(d, mdhd.offset + 36) : readU32(d, mdhd.offset + 24)
}

/**
 * Returns the real recording duration in seconds by reading the audio track's mdhd.
 * Audio (AAC) has CBR timestamps so its duration is accurate; video timestamps from
 * MediaRecorder fMP4 are VFR junk and cannot be trusted.
 */
function audioTrackDurationSeconds(data: Uint8Array, moovOffset: number, moovSize: number): number | null {
  const moovEnd = moovOffset + moovSize
  let searchPos = moovOffset + 8
  while (searchPos < moovEnd) {
    const trak = findBox(data, searchPos, moovEnd, 'trak')
    if (!trak) break
    searchPos = trak.offset + trak.size

    const trakEnd = trak.offset + trak.size
    const mdia = findBox(data, trak.offset + 8, trakEnd, 'mdia')
    if (!mdia) continue

    const mdiaEnd = mdia.offset + mdia.size
    const minf = findBox(data, mdia.offset + 8, mdiaEnd, 'minf')
    if (!minf) continue

    // Audio track has smhd (sound media header)
    if (!findBox(data, minf.offset + 8, minf.offset + minf.size, 'smhd')) continue

    const mdhd = findBox(data, mdia.offset + 8, mdiaEnd, 'mdhd')
    if (!mdhd) continue

    const timescale = readMdhdTimescale(data, mdhd)
    const duration = readMdhdDuration(data, mdhd)
    if (timescale === 0) continue
    const sec = duration / timescale
    console.log(`[NormalizeTS] audio track: timescale=${timescale}, duration=${duration}, realDuration=${sec.toFixed(3)}s`)
    return sec
  }
  console.warn('[NormalizeTS] no audio track found — falling back to TARGET_FPS')
  return null
}

/**
 * In-place: rewrites video stts sample_deltas so the video duration matches the
 * audio track's real duration. This fixes the VFR timestamp junk from MediaRecorder
 * fMP4 (which causes QuickTime to see apparent fps spikes >1000 and activate slow-mo)
 * without stretching or compressing the visual content.
 */
function normalizeVideoTimestamps(data: Uint8Array, moovOffset: number, moovSize: number): void {
  const moovEnd = moovOffset + moovSize

  const mvhd = findBox(data, moovOffset + 8, moovEnd, 'mvhd')
  if (!mvhd) return
  const mvhdTimescale = readMvhdTimescale(data, mvhd)

  // Use audio duration as the ground truth for real recording length
  const realDurationSec = audioTrackDurationSeconds(data, moovOffset, moovSize)

  let searchPos = moovOffset + 8
  while (searchPos < moovEnd) {
    const trak = findBox(data, searchPos, moovEnd, 'trak')
    if (!trak) break
    searchPos = trak.offset + trak.size

    const trakEnd = trak.offset + trak.size
    const mdia = findBox(data, trak.offset + 8, trakEnd, 'mdia')
    if (!mdia) continue

    const mdiaEnd = mdia.offset + mdia.size
    const minf = findBox(data, mdia.offset + 8, mdiaEnd, 'minf')
    if (!minf) continue

    // Skip non-video tracks (audio has smhd, not vmhd)
    if (!findBox(data, minf.offset + 8, minf.offset + minf.size, 'vmhd')) continue

    const mdhd = findBox(data, mdia.offset + 8, mdiaEnd, 'mdhd')
    if (!mdhd) continue

    const timescale = readMdhdTimescale(data, mdhd)

    const stbl = findBox(data, minf.offset + 8, minf.offset + minf.size, 'stbl')
    if (!stbl) continue
    const stts = findBox(data, stbl.offset + 8, stbl.offset + stbl.size, 'stts')
    if (!stts) continue

    // Count total frames and log pre-normalization state
    const entryCount = readU32(data, stts.offset + 12)
    let totalFrames = 0
    let minDelta = Infinity
    let maxDelta = 0
    for (let i = 0; i < entryCount; i++) {
      const count = readU32(data, stts.offset + 16 + i * 8)
      const delta = readU32(data, stts.offset + 16 + i * 8 + 4)
      totalFrames += count
      if (delta < minDelta) minDelta = delta
      if (delta > maxDelta) maxDelta = delta
    }
    const rawDuration = readMdhdDuration(data, mdhd)
    console.log(`[NormalizeTS] video BEFORE: timescale=${timescale}, sttsEntries=${entryCount}, frames=${totalFrames}, rawDuration=${(rawDuration / timescale).toFixed(3)}s, deltaRange=[${minDelta}..${maxDelta}] → fpsRange=[${Math.round(timescale / maxDelta)}..${Math.round(timescale / Math.max(minDelta, 1))}]`)

    // Compute delta: spread frames evenly over the real duration if audio is available,
    // otherwise fall back to TARGET_FPS (avoids stretch/compress vs unknown duration)
    const targetDuration = realDurationSec !== null
      ? Math.round(realDurationSec * timescale)
      : totalFrames * Math.round(timescale / TARGET_FPS)
    const targetDelta = totalFrames > 0 ? Math.round(targetDuration / totalFrames) : Math.round(timescale / TARGET_FPS)

    // Overwrite every stts delta in-place
    for (let i = 0; i < entryCount; i++) writeU32(data, stts.offset + 16 + i * 8 + 4, targetDelta)

    const newDuration = totalFrames * targetDelta
    const newMvhdDuration = Math.round(newDuration * mvhdTimescale / timescale)

    writeMdhdDuration(data, mdhd, newDuration)
    const tkhd = findBox(data, trak.offset + 8, trakEnd, 'tkhd')
    if (tkhd) writeTkhdDuration(data, tkhd, newMvhdDuration)
    writeMvhdDuration(data, mvhd, newMvhdDuration)

    const apparentFps = targetDelta > 0 ? Math.round(timescale / targetDelta) : 0
    console.log(`[NormalizeTS] frames=${totalFrames}, audioDuration=${realDurationSec?.toFixed(3)}s, targetDelta=${targetDelta}, apparentFps=${apparentFps}, newDuration=${(newDuration / timescale).toFixed(3)}s`)
    break
  }
}

/**
 * Normalizes VFR timestamps to CFR 30fps and injects FullFrameRatePlaybackIntent.
 * Returns a new Uint8Array. If moov can't be found, returns the original unchanged.
 */
export function injectFullFrameRateIntent(data: Uint8Array): Uint8Array {
  const moov = findBox(data, 0, data.length, 'moov')
  if (!moov) return data

  // Work on a mutable copy so we can normalize in-place before inserting the meta box
  const mutable = new Uint8Array(data)
  normalizeVideoTimestamps(mutable, moov.offset, moov.size)

  // Skip if mdta meta already injected (e.g. called twice on same blob)
  const moovChildStart = moov.offset + 8
  const moovChildEnd = moov.offset + moov.size
  const existingMeta = findBox(mutable, moovChildStart, moovChildEnd, 'meta')
  if (existingMeta && ascii(mutable, existingMeta.offset + 28, 4) === 'mdta') return mutable

  const meta = buildMetaWithIntent()
  const insertPos = moov.offset + moov.size
  const delta = meta.length

  const result = new Uint8Array(mutable.length + delta)
  result.set(mutable.subarray(0, insertPos), 0)
  result.set(meta, insertPos)
  result.set(mutable.subarray(insertPos), insertPos + delta)

  // Update moov size
  writeU32(result, moov.offset, moov.size + delta)

  // Shift stco (32-bit chunk offsets) — mdat moved forward by delta
  const stcoOffsets: number[] = []
  findAllBoxes(result, moov.offset + 8, moov.offset + moov.size + delta, 'stco', stcoOffsets)
  for (const boxOffset of stcoOffsets) {
    const entryCount = readU32(result, boxOffset + 12)
    for (let i = 0; i < entryCount; i++) {
      const entryPos = boxOffset + 16 + i * 4
      writeU32(result, entryPos, readU32(result, entryPos) + delta)
    }
  }

  // Shift co64 (64-bit chunk offsets)
  const co64Offsets: number[] = []
  findAllBoxes(result, moov.offset + 8, moov.offset + moov.size + delta, 'co64', co64Offsets)
  for (const boxOffset of co64Offsets) {
    const entryCount = readU32(result, boxOffset + 12)
    for (let i = 0; i < entryCount; i++) {
      const entryPos = boxOffset + 16 + i * 8
      writeU64(result, entryPos, readU64(result, entryPos) + delta)
    }
  }

  return result
}
