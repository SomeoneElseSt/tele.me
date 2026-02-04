import { useCallback, useEffect, useMemo, useState } from 'react'

export type MediaDeviceKind = 'audioinput' | 'videoinput'

type DevicesState = {
  ready: boolean
  error?: string
  audioInputs: MediaDeviceInfo[]
  videoInputs: MediaDeviceInfo[]
}

function groupDevices(devices: MediaDeviceInfo[]) {
  const audioInputs = devices.filter((d) => d.kind === 'audioinput')
  const videoInputs = devices.filter((d) => d.kind === 'videoinput')
  return { audioInputs, videoInputs }
}

export function useMediaDevices() {
  const [state, setState] = useState<DevicesState>({
    ready: false,
    audioInputs: [],
    videoInputs: []
  })

  const supported = useMemo(() => Boolean(navigator.mediaDevices?.enumerateDevices), [])

  const refresh = useCallback(async () => {
    if (!supported) {
      setState((prev) => ({ ...prev, ready: true, error: 'Media devices not supported in this browser.' }))
      return
    }

    const devices = await navigator.mediaDevices.enumerateDevices().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to list devices.'
      setState((prev) => ({ ...prev, ready: true, error: message }))
      return null
    })
    if (!devices) return

    const grouped = groupDevices(devices)
    setState({ ready: true, audioInputs: grouped.audioInputs, videoInputs: grouped.videoInputs })
  }, [supported])

  useEffect(() => {
    void refresh()
    if (!supported) return
    const handler = () => void refresh()
    navigator.mediaDevices.addEventListener?.('devicechange', handler)
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', handler)
  }, [refresh, supported])

  return { ...state, supported, refresh }
}
