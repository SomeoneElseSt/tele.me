import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, Download, Film, Loader2, Play, Save, Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { clamp } from '../../hooks/geometry'
import { useI18n } from './i18n'
import { Tooltip } from '../../components/Tooltip'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useTooltipController } from '../../components/useTooltipController'
import { formatFilename } from '../recording/format'

/**
 * DownloadPopover Architecture Notes:
 *
 * 1. LAYOUT STABILITY (The "Core" of the tray):
 *    - We use `scrollbar-gutter: stable` (via .tele-scroll in styles.css) on the main list container.
 *    - This is CRITICAL. It ensures the container width is identical whether a scrollbar is present or not.
 *    - Without this, the tray would "jump" horizontally when transitioning from the Placeholder to the first Video.
 *
 * 2. UNIFIED ANIMATION FLOW:
 *    - Both the "No Videos" Placeholder and the list of Takes are rendered within the SAME .tele-scroll container.
 *    - By using a single AnimatePresence and animating the height of BOTH the placeholder (auto -> 0)
 *      and the first take (0 -> auto) in-flow, the tray background grows smoothly without stacking or snapping.
 *
 * 3. AVOIDING JITTER:
 *    - We explicitly avoid Framer Motion's `layout` and `layout="position"` props here.
 *    - Those props often cause jitter when combined with manual height animations or fixed-width gutters.
 *    - Instead, we rely on standard flex-col height changes.
 */

export type DownloadTake = {
  id: string
  url: string
  createdAt: number
  mimeType?: string
  takeNumber: number
}

type Props = {
  open: boolean
  anchorEl: HTMLElement | null
  takes: DownloadTake[]
  onClose: () => void
  onDeleteTake: (takeId: string) => void
  onClearAll: () => void
  onPlayTake: (takeId: string) => void
  persistVideos: boolean
  onPersistVideosChange: (enabled: boolean) => void
  isLoadingVideos?: boolean
}

const POPOVER_WIDTH = 300
const GAP_PX = 12
const MARGIN_PX = 12
const REMOVE_FADE_MS = 180
const ENTER_DELAY_MS = 20
const CONFIRM_SWAP_DELAY_MS = 140

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
  const { open, anchorEl, takes, onClose, onDeleteTake, onClearAll, onPlayTake, persistVideos, onPersistVideosChange, isLoadingVideos } = props
  const { strings, locale } = useI18n()
  const [confirmingTakeId, setConfirmingTakeId] = useState<string | null>(null)
  const [confirmingClearAll, setConfirmingClearAll] = useState(false)
  const deleteButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const trayRef = useRef<HTMLDivElement>(null)
  const confirmSwapTimeout = useRef<number | null>(null)
  const tooltip = useTooltipController()

  const rect = open && anchorEl ? anchorEl.getBoundingClientRect() : null
  const desiredLeft = rect ? rect.left + rect.width / 2 - POPOVER_WIDTH / 2 : 0
  const left = rect ? clamp(desiredLeft, MARGIN_PX, window.innerWidth - POPOVER_WIDTH - MARGIN_PX) : 0
  const top = rect ? rect.top - GAP_PX : 0

  const showWarning = takes.length >= 3


  const removeTake = (takeId: string) => {
    setConfirmingTakeId(null)
    onDeleteTake(takeId)
  }

  const removeAllTakes = () => {
    setConfirmingClearAll(false)
    onClearAll()
  }

  // Clear confirmation states when popover closes
  useEffect(() => {
    if (!open) {
      setConfirmingTakeId(null)
      setConfirmingClearAll(false)
      tooltip.clear()
      if (confirmSwapTimeout.current) {
        window.clearTimeout(confirmSwapTimeout.current)
        confirmSwapTimeout.current = null
      }
    }
  }, [open, tooltip])

  useEffect(() => {
    return () => {
      if (confirmSwapTimeout.current) {
        window.clearTimeout(confirmSwapTimeout.current)
        confirmSwapTimeout.current = null
      }
    }
  }, [])

  useHotkeys(
    {
      enter: (e) => {
        if (confirmingTakeId) {
          e.stopPropagation()
          removeTake(confirmingTakeId)
        } else if (confirmingClearAll) {
          e.stopPropagation()
          removeAllTakes()
        }
      },
    },
    open && (confirmingTakeId != null || confirmingClearAll)
  )

  // Calculate confirmation popup position
  const confirmButtonEl = confirmingTakeId ? deleteButtonRefs.current.get(confirmingTakeId) : null
  const confirmRect = confirmButtonEl?.getBoundingClientRect()
  const trayRect = trayRef.current?.getBoundingClientRect()
  const shouldShowLeft = confirmRect ? (window.innerWidth - confirmRect.right < 120) : false

  const confirmTop = confirmRect && trayRect ? confirmRect.top - trayRect.top : 0
  const confirmLeft = confirmRect && trayRect ? confirmRect.left - trayRect.left : 0
  const handleConfirmButtonClick = (takeId: string, isCurrentlyConfirming: boolean) => {
    if (confirmSwapTimeout.current) {
      window.clearTimeout(confirmSwapTimeout.current)
      confirmSwapTimeout.current = null
    }
    if (isCurrentlyConfirming) {
      setConfirmingTakeId(null)
      return
    }
    setConfirmingTakeId((current) => {
      if (!current) {
        return takeId
      }
      confirmSwapTimeout.current = window.setTimeout(() => {
        setConfirmingTakeId(takeId)
        confirmSwapTimeout.current = null
      }, CONFIRM_SWAP_DELAY_MS)
      return null
    })
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
            ref={trayRef}
            className="relative text-xs text-white/70 overflow-visible rounded-2xl border border-white/10 bg-black/40 shadow-glow backdrop-blur"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 overflow-visible">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-medium text-white/75">{strings.videosTitle}</div>
                  {isLoadingVideos && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white/50" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip
                    label={
                      takes.length >= 10 && !persistVideos
                        ? strings.persistVideosWillSave10
                        : strings.persistVideosTooltip
                    }
                    className="max-w-xs whitespace-normal"
                  >
                    <button
                      type="button"
                      aria-label={strings.persistVideos}
                      onClick={() => onPersistVideosChange(!persistVideos)}
                      className={cn(
                        'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                        persistVideos
                          ? 'border-white/20 bg-white/12 text-white/80 outline-none'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white outline-none'
                      )}
                    >
                      <div className="relative">
                        <Save className="h-4 w-4" />
                        <div
                          className={cn(
                            'absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-white transition-all duration-200',
                            persistVideos ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                          )}
                        >
                          <Check className="h-1.5 w-1.5" strokeWidth={3} />
                        </div>
                      </div>
                    </button>
                  </Tooltip>
                  <div
                    className={cn(
                      'transition-[max-width,opacity,margin] duration-200 ease-out',
                      confirmingClearAll ? 'overflow-visible' : 'overflow-hidden',
                      takes.length > 0
                        ? 'max-w-[8rem] opacity-100 mr-0'
                        : 'max-w-0 opacity-0 -mr-2 pointer-events-none'
                    )}
                  >
                    <div className="relative">
                      <button
                        type="button"
                        aria-label={strings.clearAll}
                        onClick={() => setConfirmingClearAll(!confirmingClearAll)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10 hover:text-white outline-none whitespace-nowrap"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {strings.clearAll}
                      </button>
                      <AnimatePresence>
                        {confirmingClearAll && (
                          <motion.div
                            className="absolute right-0 bottom-full mb-2 z-[80] rounded-xl border border-white/10 bg-black/90 px-2.5 py-1.5"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.12, ease: 'easeOut' }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/60">{strings.deleteAllConfirm}</span>
                              <div className="flex items-center gap-1">
                                <Tooltip label={strings.confirm} shortcut="Enter">
                                  <button
                                    autoFocus
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeAllTakes()
                                    }}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                </Tooltip>
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
                  </div>
                  <Tooltip label={strings.close} shortcut="Esc">
                    <button
                      type="button"
                      aria-label={strings.close}
                      onClick={() => {
                        tooltip.clear()
                        onClose()
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white outline-none"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              <div
                className={cn(
                  'overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-out',
                  showWarning ? 'max-h-48 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'
                )}
              >
                <div className="flex items-start gap-3.5 rounded-xl border border-red-500/30 bg-red-500/20 px-5 py-4 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <div className="min-w-0 flex-1 break-words">
                    <div className="font-medium text-white/85 leading-relaxed break-words">{strings.memoryWarningTitle}</div>
                    <div className="mt-1.5 text-white/65 leading-relaxed break-words">{strings.memoryWarningMessage}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col overflow-y-auto overflow-x-hidden tele-scroll overscroll-contain pr-1 -mr-1 py-1 max-h-96">
                <AnimatePresence initial={false}>
                  {takes.length === 0 ? (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/75">
                        {strings.recordFirstVideo}
                      </div>
                    </motion.div>
                  ) : (
                    takes.map((take) => {
                      const extension = getFileExtension(take.mimeType)
                      const filename = formatFilename(take.createdAt, extension)

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

                      const isConfirming = confirmingTakeId === take.id

                      return (
                        <motion.div
                          key={take.id}
                          initial={{ opacity: 0, height: 0, scale: 0.98, marginBottom: 0 }}
                          animate={{
                            opacity: 1,
                            height: 'auto',
                            scale: 1,
                            marginBottom: 8
                          }}
                          exit={{ opacity: 0, height: 0, scale: 0.98, marginBottom: 0 }}
                          transition={{
                            duration: 0.25,
                            ease: [0.32, 0.72, 0, 1]
                          }}
                          className="flex items-center gap-2 shrink-0 overflow-hidden"
                        >
                          <div
                            className={cn(
                              'flex flex-1 items-center justify-between rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/85'
                            )}
                          >
                            <button
                              onClick={() => onPlayTake(take.id)}
                              className="inline-flex items-center gap-2 hover:text-white transition-colors"
                            >
                              <Play className="h-4 w-4 text-white/60" />
                              <span>{strings.takeLabel(take.takeNumber)}</span>
                            </button>
                            <span className="text-xs text-white/55">{formatTime(take.createdAt, locale)}</span>
                          </div>
                          <a
                            href={take.url}
                            onClick={handleDownload}
                            aria-label={strings.downloadTakeLabel(take.takeNumber)}
                            className={cn(
                              'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80',
                              'hover:bg-white/8 transition-colors'
                            )}
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          <div className="relative">
                            <button
                              ref={(el) => {
                                if (el) {
                                  deleteButtonRefs.current.set(take.id, el)
                                } else {
                                  deleteButtonRefs.current.delete(take.id)
                                }
                              }}
                              onClick={() => handleConfirmButtonClick(take.id, isConfirming)}
                              aria-label={strings.deleteTakeLabel(take.takeNumber)}
                              className={cn(
                                'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70',
                                'hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-colors',
                                isConfirming && 'bg-red-500/20 border-red-500/30 text-red-400'
                              )}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence>
              {confirmButtonEl && confirmRect && trayRect && (
                <motion.div
                  key="delete-confirm"
                  className={cn(
                    'absolute z-[80] rounded-xl border border-white/10 bg-black px-2.5 py-1.5 whitespace-nowrap'
                  )}
                  style={{
                    bottom: trayRect.height - confirmTop + 8,
                    left: confirmLeft + (confirmRect.width / 2),
                  }}
                  initial={{ opacity: 0, y: 4, x: '-50%' }}
                  animate={{ opacity: 1, y: 0, x: '-50%' }}
                  exit={{ opacity: 0, y: 4, x: '-50%' }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">{strings.confirmQuestion}</span>
                    <div className="flex items-center gap-1">
                      <Tooltip label={strings.confirm} shortcut="Enter">
                        <button
                          autoFocus
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirmingTakeId) removeTake(confirmingTakeId)
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
