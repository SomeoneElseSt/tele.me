import { AnimatePresence, motion } from 'framer-motion'
import { Download, Film, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'
import { clamp } from '../../hooks/geometry'

export type DownloadTake = {
  id: string
  url: string
  createdAt: number
}

type Props = {
  open: boolean
  anchorEl: HTMLElement | null
  takes: DownloadTake[]
  onClose: () => void
}

const POPOVER_WIDTH = 300
const GAP_PX = 12
const MARGIN_PX = 12

function formatTime(value: number) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function DownloadPopover(props: Props) {
  const { open, anchorEl, takes, onClose } = props

  const rect = open && anchorEl ? anchorEl.getBoundingClientRect() : null
  const desiredLeft = rect ? rect.left + rect.width / 2 - POPOVER_WIDTH / 2 : 0
  const left = rect ? clamp(desiredLeft, MARGIN_PX, window.innerWidth - POPOVER_WIDTH - MARGIN_PX) : 0
  const top = rect ? rect.top - GAP_PX : 0

  return createPortal(
    <AnimatePresence>
      {open && anchorEl && (
        <div
          className="fixed z-[70]"
          style={{
            left,
            top,
            width: POPOVER_WIDTH,
            transform: 'translateY(-100%)'
          }}
        >
          <motion.div
            className="rounded-2xl border border-white/10 bg-black/70 p-4 text-xs text-white/70 shadow-glow backdrop-blur"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-white/75">Videos</div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {takes.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/75">
                Record your first video to download it.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {takes.map((take, index) => (
                  <div key={take.id} className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex flex-1 items-center justify-between rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/85'
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Film className="h-4 w-4 text-white/60" />
                        <span>Take {index + 1}</span>
                      </span>
                      <span className="text-xs text-white/55">{formatTime(take.createdAt)}</span>
                    </div>
                    <a
                      href={take.url}
                      download={`teleme-${new Date(take.createdAt).toISOString().replaceAll(':', '')}.webm`}
                      aria-label={`Download take ${index + 1}`}
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80',
                        'hover:bg-white/8 transition-colors'
                      )}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
