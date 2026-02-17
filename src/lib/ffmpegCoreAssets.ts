const FFMPEG_PUBLIC_BASE = '/ffmpeg'

function resolveAssetUrl(fileName: string) {
  if (typeof window === 'undefined') return `${FFMPEG_PUBLIC_BASE}/${fileName}`
  return new URL(`${FFMPEG_PUBLIC_BASE}/${fileName}`, window.location.origin).href
}

export const FFMPEG_CORE_JS_URL = resolveAssetUrl('ffmpeg-core.js')
export const FFMPEG_CORE_WASM_URL = resolveAssetUrl('ffmpeg-core.wasm')
export const FFMPEG_WORKER_URL = resolveAssetUrl('ffmpeg-core.worker.js')
