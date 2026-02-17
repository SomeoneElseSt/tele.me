import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const FFMPEG_CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'

let ffmpegInstance: FFmpeg | null = null

function getExtension(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  return 'mp4'
}

async function loadWithTimeout(url: string, type: string, label: string): Promise<string> {
  console.log(`[Trim] Fetching ${label} from ${url}…`)
  const blobUrl = await toBlobURL(url, type)
  console.log(`[Trim] ${label} fetched OK (blob URL: ${blobUrl.slice(0, 60)}…)`)
  return blobUrl
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    console.log('[Trim] Reusing cached ffmpeg instance')
    return ffmpegInstance
  }
  console.log('[Trim] Creating new FFmpeg instance, loading wasm core…')
  const ffmpeg = new FFmpeg()
  ffmpeg.on('log', ({ message }) => console.log('[ffmpeg]', message))
  ffmpeg.on('progress', ({ progress, time }) => console.log(`[ffmpeg] progress=${(progress * 100).toFixed(1)}% time=${time}`))

  const [coreURL, wasmURL] = await Promise.all([
    loadWithTimeout(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript', 'core.js'),
    loadWithTimeout(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm', 'core.wasm'),
  ])

  console.log('[Trim] Calling ffmpeg.load()…')
  await ffmpeg.load({ coreURL, wasmURL })
  console.log('[Trim] ffmpeg.load() complete')
  ffmpegInstance = ffmpeg
  return ffmpeg
}

export async function trimVideo(
  blob: Blob,
  startSec: number,
  endSec: number,
  mimeType = 'video/mp4'
): Promise<Blob> {
  const ext = getExtension(mimeType)
  const inputFile = `input.${ext}`
  const outputFile = `output.${ext}`
  console.log(`[Trim] trimVideo() called — mimeType=${mimeType} ext=${ext} start=${startSec}s end=${endSec}s blobSize=${blob.size}`)
  const ffmpeg = await getFFmpeg()

  console.log(`[Trim] Writing ${inputFile} to virtual FS…`)
  await ffmpeg.writeFile(inputFile, await fetchFile(blob))
  console.log(`[Trim] ${inputFile} written. Running exec…`)

  await ffmpeg.exec(['-i', inputFile, '-ss', String(startSec), '-to', String(endSec), '-c', 'copy', outputFile])
  console.log(`[Trim] exec done. Reading ${outputFile}…`)

  const data = await ffmpeg.readFile(outputFile)
  const raw = data as Uint8Array
  const result = new Blob([raw.slice()], { type: mimeType })
  console.log(`[Trim] Done. Output size=${result.size}`)
  return result
}
