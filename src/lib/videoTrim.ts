import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { FFMPEG_CORE_JS_URL, FFMPEG_CORE_WASM_URL, FFMPEG_WORKER_URL } from './ffmpegCoreAssets'

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
    const overallStart = performance.now()
    const id = jobId++
    const ext = getExtension(mimeType)
    const inputFile = `remux_in_${id}.${ext}`
    const outputFile = `remux_out_${id}.${ext}`
    
    console.log(`[Remux] Starting job ${id}, input size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`)
    
    const loadStart = performance.now()
    const ffmpeg = await getFFmpeg()
    console.log(`[Remux] FFmpeg ready in ${(performance.now() - loadStart).toFixed(0)}ms`)

    const writeStart = performance.now()
    await ffmpeg.writeFile(inputFile, await fetchFile(blob))
    console.log(`[Remux] File written in ${(performance.now() - writeStart).toFixed(0)}ms`)
    
    const encodeStart = performance.now()
    await ffmpeg.exec([
      '-i', inputFile,
      '-map', '0:v:0', '-map', '0:a:0',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-r', '30',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      outputFile,
    ])
    console.log(`[Remux] Encoding complete in ${(performance.now() - encodeStart).toFixed(0)}ms`)

    const readStart = performance.now()
    const data = await ffmpeg.readFile(outputFile)
    const result = new Blob([(data as Uint8Array).slice()], { type: mimeType })
    console.log(`[Remux] File read in ${(performance.now() - readStart).toFixed(0)}ms`)

    await ffmpeg.deleteFile(inputFile)
    await ffmpeg.deleteFile(outputFile)

    console.log(`[Remux] TOTAL TIME: ${(performance.now() - overallStart).toFixed(0)}ms, output size: ${(result.size / 1024 / 1024).toFixed(2)}MB`)
    
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
      '-ss', String(startSec),
      '-i', inputFile,
      '-t', String(endSec - startSec),
      '-map', '0:v:0', '-map', '0:a:0',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-r', '30',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      outputFile,
    ])

    const data = await ffmpeg.readFile(outputFile)
    const result = new Blob([(data as Uint8Array).slice()], { type: mimeType })

    await ffmpeg.deleteFile(inputFile)
    await ffmpeg.deleteFile(outputFile)

    return result
  })
}
