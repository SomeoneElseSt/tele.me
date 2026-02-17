import coreScriptUrl from '@ffmpeg/core?url'
import coreWasmUrl from '@ffmpeg/core/wasm?url'
import workerModuleUrl from '@ffmpeg/ffmpeg/worker?worker&url'

function resolveAssetUrl(url: string) {
  if (typeof window === 'undefined') return url
  if (/^https?:\/\//i.test(url)) return url
  return new URL(url, window.location.origin).href
}

export const FFMPEG_CORE_JS_URL = resolveAssetUrl(coreScriptUrl)
export const FFMPEG_CORE_WASM_URL = resolveAssetUrl(coreWasmUrl)
export const FFMPEG_WORKER_URL = resolveAssetUrl(workerModuleUrl)
