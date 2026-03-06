import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { FFMPEG_CORE_JS_URL, FFMPEG_CORE_WASM_URL, FFMPEG_WORKER_URL } from './ffmpegCoreAssets'
import { injectFullFrameRateIntent } from './mp4FullFrameRate'

let ffmpegInstance: FFmpeg | null = null
let jobId = 0

// Sequential queue — ffmpeg.wasm is single-threaded and shares one virtual filesystem
let queueTail: Promise<unknown> = Promise.resolve()

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const task = queueTail.then(fn, fn)
  queueTail = task.catch(() => {})
  return task
}

function getExtension(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  return 'mp4'
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  const ffmpeg = new FFmpeg()
  const loadConfig: Parameters<typeof ffmpeg.load>[0] & { classWorkerURL?: string } = {
    coreURL: FFMPEG_CORE_JS_URL,
    wasmURL: FFMPEG_CORE_WASM_URL,
    workerURL: FFMPEG_WORKER_URL,
    classWorkerURL: FFMPEG_WORKER_URL,
  }
  await ffmpeg.load(loadConfig)
  ffmpegInstance = ffmpeg
  return ffmpeg
}

export function remuxVideo(
  blob: Blob,
  mimeType = 'video/mp4'
): Promise<Blob> {
  return enqueue(async () => {
    const id = jobId++
    const ext = getExtension(mimeType)
    const inputFile = `remux_in_${id}.${ext}`
    const outputFile = `remux_out_${id}.${ext}`
    const ffmpeg = await getFFmpeg()

    await ffmpeg.writeFile(inputFile, await fetchFile(blob))
    await ffmpeg.exec([
      '-i', inputFile,
      '-map', '0:v:0', '-map', '0:a:0',
      '-c', 'copy',
      '-use_editlist', '0',
      '-movflags', '+faststart',
      outputFile,
    ])

    const data = await ffmpeg.readFile(outputFile)
    const raw = data as Uint8Array
    const patched = mimeType.includes('mp4') ? injectFullFrameRateIntent(raw) : raw
    const result = new Blob([patched.slice()], { type: mimeType })

    await ffmpeg.deleteFile(inputFile)
    await ffmpeg.deleteFile(outputFile)

    return result
  })
}

export function trimVideo(
  blob: Blob,
  startSec: number,
  endSec: number,
  mimeType = 'video/mp4'
): Promise<Blob> {
  return enqueue(async () => {
    const id = jobId++
    const ext = getExtension(mimeType)
    const inputFile = `trim_in_${id}.${ext}`
    const outputFile = `trim_out_${id}.${ext}`
    const ffmpeg = await getFFmpeg()

    await ffmpeg.writeFile(inputFile, await fetchFile(blob))
    await ffmpeg.exec([
      '-i', inputFile,
      '-ss', String(startSec), '-to', String(endSec),
      '-map', '0:v:0', '-map', '0:a:0',
      '-c', 'copy',
      '-use_editlist', '0',
      '-movflags', '+faststart',
      outputFile,
    ])

    const data = await ffmpeg.readFile(outputFile)
    const raw = data as Uint8Array
    const patched = mimeType.includes('mp4') ? injectFullFrameRateIntent(raw) : raw
    const result = new Blob([patched.slice()], { type: mimeType })

    await ffmpeg.deleteFile(inputFile)
    await ffmpeg.deleteFile(outputFile)

    return result
  })
}
