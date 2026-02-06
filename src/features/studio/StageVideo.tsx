import { useEffect, useRef } from 'react'
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

    </div>
  )
}
