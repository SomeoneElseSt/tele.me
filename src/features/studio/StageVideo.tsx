import { useEffect, useRef } from 'react'
import { VideoOff } from 'lucide-react'
import { cn } from '../../lib/cn'

type Props = {
  stream: MediaStream | null
  mirror: boolean
}

export function StageVideo({ stream, mirror }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.srcObject = stream
    
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        const settings = videoTrack.getSettings()
        console.log('Video resolution:', settings.width, 'x', settings.height)
      }
    }
  }, [stream])

  return (
    <div className="absolute inset-0 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn('h-full w-full object-cover', mirror && '-scale-x-100')}
      />

      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/75 backdrop-blur">
            <VideoOff className="h-4 w-4 text-white/70" />
            <span>Allow camera permissions to start.</span>
          </div>
        </div>
      )}
    </div>
  )
}
