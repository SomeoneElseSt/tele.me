import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, Download, Film, Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { clamp } from '../../hooks/geometry'
import { useI18n } from './i18n'

export type DownloadTake = {
  id: string
  url: string
  createdAt: number
  mimeType?: string
}

type Props = {
  open: boolean
  anchorEl: HTMLElement | null
  takes: DownloadTake[]
  onClose: () => void
  onDeleteTake: (takeId: string) => void
  onClearAll: () => void
}

const POPOVER_WIDTH = 300
const GAP_PX = 12
const MARGIN_PX = 12
const REMOVE_FADE_MS = 180

function formatTime(value: number, locale: string) {
  return new Date(value).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
}

function getFileExtension(mimeType?: string): string {
  if (!mimeType) return 'webm'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('webm')) return 'webm'
  return 'webm'
}

export function DownloadPopover(props: Props) {
  const { open, anchorEl, takes, onClose, onDeleteTake, onClearAll } = props
  const { strings, locale } = useI18n()
  const [confirmingTakeId, setConfirmingTakeId] = useState<string | null>(null)
  const [confirmingClearAll, setConfirmingClearAll] = useState(false)
  const [removingTakeIds, setRemovingTakeIds] = useState<string[]>([])

  const rect = open && anchorEl ? anchorEl.getBoundingClientRect() : null
  const desiredLeft = rect ? rect.left + rect.width / 2 - POPOVER_WIDTH / 2 : 0
  const left = rect ? clamp(desiredLeft, MARGIN_PX, window.innerWidth - POPOVER_WIDTH - MARGIN_PX) : 0
  const top = rect ? rect.top - GAP_PX : 0
  
  const showWarning = takes.length >= 3

  const removeTake = (takeId: string) => {
    setConfirmingTakeId(null)
    setRemovingTakeIds((prev) => (prev.includes(takeId) ? prev : [...prev, takeId]))
    window.setTimeout(() => onDeleteTake(takeId), REMOVE_FADE_MS)
    window.setTimeout(() => {
      setRemovingTakeIds((prev) => prev.filter((id) => id !== takeId))
    }, REMOVE_FADE_MS)
  }

  const removeAllTakes = () => {
    setConfirmingClearAll(false)
    setRemovingTakeIds(takes.map((take) => take.id))
    window.setTimeout(() => onClearAll(), REMOVE_FADE_MS)
    window.setTimeout(() => setRemovingTakeIds([]), REMOVE_FADE_MS)
  }

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
                <div className="text-xs font-medium text-white/75">{strings.videosTitle}</div>
                <div className="flex items-center gap-2">
                  {takes.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Clear all recordings"
                        onClick={() => setConfirmingClearAll(!confirmingClearAll)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear all
                      </button>
                      <AnimatePresence mode="wait">
                        {confirmingClearAll && (
                          <motion.div
                            className="absolute right-0 top-full mt-2 rounded-xl border border-white/10 bg-black/80 px-2.5 py-1.5 backdrop-blur"
                            initial={{ opacity: 0, y: -6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/60">Delete all?</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeAllTakes()
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setConfirmingClearAll(false)
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={strings.close}
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

            <div
              className={cn(
                'overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-out',
                showWarning ? 'max-h-24 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'
              )}
            >
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/20 px-3 py-2.5 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400 mt-0.5" />
                <div>
                  <div className="font-medium text-white/85">{strings.memoryWarningTitle}</div>
                  <div className="mt-0.5 text-white/65">{strings.memoryWarningMessage}</div>
                </div>
              </div>
            </div>

            <div
              className={cn(
                'overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-out',
                takes.length === 0 ? 'max-h-20 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'
              )}
            >
              <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/75">
                {strings.recordFirstVideo}
              </div>
            </div>
            <div
              className={cn(
                'transition-[max-height,opacity,margin] duration-200 ease-out',
                takes.length > 0 ? 'max-h-96 opacity-100 mt-4 overflow-visible' : 'max-h-0 opacity-0 mt-0 overflow-hidden'
              )}
            >
              {takes.map((take, index) => {
                  const extension = getFileExtension(take.mimeType)
                  const filename = `teleme-${new Date(take.createdAt).toISOString().replaceAll(':', '')}.${extension}`
                  
                  const handleDownload = async (e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault()
                    
                    try {
                      const response = await fetch(take.url)
                      const blob = await response.blob()
                      const url = URL.createObjectURL(blob)
                      
                      const a = document.createElement('a')
                      a.href = url
                      a.download = filename
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      
                      setTimeout(() => URL.revokeObjectURL(url), 100)
                    } catch {
                      alert('Download failed. Please try recording again.')
                    }
                  }
                  
                  const isRemoving = removingTakeIds.includes(take.id)
                  const isConfirming = confirmingTakeId === take.id && !isRemoving
                  
                  return (
                    <div 
                      key={take.id} 
                      className={cn(
                        'flex items-center gap-2 transition-[max-height,opacity,transform,margin] duration-[180ms] ease-out',
                        index === 0 ? 'mt-0' : 'mt-2',
                        isRemoving
                          ? 'max-h-0 opacity-0 translate-y-1 mt-0 pointer-events-none overflow-hidden'
                          : 'max-h-24 opacity-100 translate-y-0 overflow-visible'
                      )}
                    >
                      <div
                        className={cn(
                          'flex flex-1 items-center justify-between rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/85'
                        )}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Film className="h-4 w-4 text-white/60" />
                          <span>{strings.takeLabel(index + 1)}</span>
                        </span>
                        <span className="text-xs text-white/55">{formatTime(take.createdAt, locale)}</span>
                      </div>
                      <a
                        href={take.url}
                        onClick={handleDownload}
                        aria-label={strings.downloadTakeLabel(index + 1)}
                        className={cn(
                          'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80',
                          'hover:bg-white/8 transition-colors'
                        )}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <div className="relative">
                        <button
                          onClick={() => setConfirmingTakeId(isConfirming ? null : take.id)}
                          aria-label={`Delete ${strings.takeLabel(index + 1)}`}
                          disabled={isRemoving}
                          className={cn(
                            'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70',
                            'hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-colors'
                          )}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <AnimatePresence mode="wait">
                          {isConfirming && (
                            <motion.div
                              className="absolute left-full bottom-full mb-2 ml-2 rounded-xl border border-white/10 bg-black/80 px-2.5 py-1.5 backdrop-blur"
                              initial={{ opacity: 0, x: -10, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                              exit={{ opacity: 0, x: -10, y: 10, scale: 0.95 }}
                              transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-white/60">Delete?</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeTake(take.id)
                                    }}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setConfirmingTakeId(null)
                                    }}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )
                })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
