import { useEffect, useRef, useState } from 'react'

export function useMirroredStream(stream: MediaStream | null, enabled: boolean) {
  const [mirroredStream, setMirroredStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const rafRef = useRef<number | null>(null)
  const outputRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      outputRef.current?.getTracks().forEach((track) => track.stop())
      outputRef.current = null
      setMirroredStream(stream)
      return
    }
    if (!stream) {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      outputRef.current?.getTracks().forEach((track) => track.stop())
      outputRef.current = null
      setMirroredStream(null)
      return
    }

    const video = document.createElement('video')
    video.playsInline = true
    video.muted = true
    video.autoplay = true
    video.srcObject = stream
    videoRef.current = video

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvasRef.current = canvas
    ctxRef.current = ctx

    if (!ctx) {
      setMirroredStream(stream)
      return
    }

    const output = canvas.captureStream()
    outputRef.current = output
    stream.getAudioTracks().forEach((track) => output.addTrack(track))
    setMirroredStream(output)

    let isActive = true

    const ensureSize = () => {
      const width = video.videoWidth
      const height = video.videoHeight
      if (!width || !height) return false
      if (canvas.width !== width) canvas.width = width
      if (canvas.height !== height) canvas.height = height
      return true
    }

    const draw = () => {
      if (!isActive) return
      if (!ensureSize()) {
        rafRef.current = window.requestAnimationFrame(draw)
        return
      }
      const width = canvas.width
      const height = canvas.height
      ctx.save()
      ctx.scale(-1, 1)
      ctx.drawImage(video, -width, 0, width, height)
      ctx.restore()
      rafRef.current = window.requestAnimationFrame(draw)
    }

    const onLoadedMetadata = () => {
      if (!isActive) return
      rafRef.current = window.requestAnimationFrame(draw)
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    void video.play().catch(() => {})

    return () => {
      isActive = false
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      outputRef.current?.getTracks().forEach((track) => track.stop())
      outputRef.current = null
    }
  }, [enabled, stream])

  return mirroredStream
}
