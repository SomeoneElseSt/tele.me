import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { FFMPEG_CORE_JS_URL, FFMPEG_CORE_WASM_URL, FFMPEG_WORKER_URL } from './ffmpegCoreAssets'

let ffmpegInstance: FFmpeg | null = null

function getExtension(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  return 'mp4'
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  const ffmpeg = new FFmpeg()
  await ffmpeg.load({
    coreURL: FFMPEG_CORE_JS_URL,
    wasmURL: FFMPEG_CORE_WASM_URL,
    workerURL: FFMPEG_WORKER_URL,
    classWorkerURL: FFMPEG_WORKER_URL,
  })
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
  const ffmpeg = await getFFmpeg()

  await ffmpeg.writeFile(inputFile, await fetchFile(blob))

  await ffmpeg.exec(['-i', inputFile, '-ss', String(startSec), '-to', String(endSec), '-c', 'copy', outputFile])

  const data = await ffmpeg.readFile(outputFile)
  const raw = data as Uint8Array
  const result = new Blob([raw.slice()], { type: mimeType })
  return result
}
