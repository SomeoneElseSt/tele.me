import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Mic, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Device = { id: string; label: string }

type Props = {
  open: boolean
  onClose: () => void
  script: string
  onScriptChange: (value: string) => void
  mirrorVideo: boolean
  onMirrorVideoChange: (value: boolean) => void
  cameras: Device[]
  mics: Device[]
  cameraId?: string
  micId?: string
  onCameraIdChange: (value?: string) => void
  onMicIdChange: (value?: string) => void
}

function Toggle({
  label,
  value,
  onChange
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all',
        value ? 'border-white/18 bg-white/8 text-white' : 'border-white/10 bg-white/4 text-white/80 hover:bg-white/6'
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'relative h-6 w-10 rounded-full border transition-all',
          value ? 'border-white/25 bg-white/15' : 'border-white/15 bg-black/30'
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white/80 transition-all',
            value ? 'left-[22px]' : 'left-1'
          )}
        />
      </span>
    </button>
  )
}

function Select({
  icon,
  value,
  onChange,
  options,
  placeholder
}: {
  icon: ReactNode
  value?: string
  onChange: (value?: string) => void
  options: Device[]
  placeholder: string
}) {
  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={cn(
          'h-11 w-full appearance-none rounded-2xl border bg-white/4 px-4 pr-10 text-sm text-white/85',
          'border-white/10 focus:outline-none focus:ring-2 focus:ring-white/25'
        )}
      >
        {options.length === 0 && <option value="">{placeholder}</option>}
        {options.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50">{icon}</div>
    </div>
  )
}

export function SettingsDrawer(props: Props) {
  const {
    open,
    onClose,
    script,
    onScriptChange,
    mirrorVideo,
    onMirrorVideoChange,
    cameras,
    mics,
    cameraId,
    micId,
    onCameraIdChange,
    onMicIdChange
  } = props

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className={cn(
              'fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-white/10 bg-black/70 backdrop-blur',
              'p-5'
            )}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <header className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white/90">Settings</div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/75 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="mt-5 flex h-[calc(100%-72px)] flex-col gap-5 overflow-y-auto tele-scroll pr-1">
              <section className="space-y-3">
                <div className="text-xs text-white/55">Script</div>
                <textarea
                  value={script}
                  onChange={(e) => onScriptChange(e.target.value)}
                  className={cn(
                    'min-h-[220px] w-full resize-none rounded-2xl border bg-white/4 px-4 py-3 text-sm text-white/85',
                    'border-white/10 focus:outline-none focus:ring-2 focus:ring-white/25'
                  )}
                />
              </section>

              <section className="space-y-3">
                <div className="text-xs text-white/55">View</div>
                <Toggle label="Mirror video" value={mirrorVideo} onChange={onMirrorVideoChange} />
              </section>

              <section className="space-y-3">
                <div className="text-xs text-white/55">Devices</div>
                <Select
                  icon={<Camera className="h-4 w-4" />}
                  value={cameraId}
                  onChange={onCameraIdChange}
                  options={cameras}
                  placeholder="No cameras"
                />
                <Select
                  icon={<Mic className="h-4 w-4" />}
                  value={micId}
                  onChange={onMicIdChange}
                  options={mics}
                  placeholder="No mics"
                />
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
