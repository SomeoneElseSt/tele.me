import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, Download, Film, Loader2, Play, Save, Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { clamp } from '../../hooks/geometry'
import { useI18n } from './i18n'
import { Tooltip } from '../../components/Tooltip'

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
const SWAP_DELAY_MS = 200

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
  const [removingTakeIds, setRemovingTakeIds] = useState<string[]>([])
  const [enteringTakeIds, setEnteringTakeIds] = useState<string[]>([])
  const [showPlaceholder, setShowPlaceholder] = useState(takes.length === 0)
  const [showList, setShowList] = useState(takes.length > 0)
  const prevTakeIdsRef = useRef<string[]>([])
  const prevCountRef = useRef(takes.length)
  const swapTimeoutRef = useRef<number | null>(null)
  const deleteButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const rect = open && anchorEl ? anchorEl.getBoundingClientRect() : null
  const desiredLeft = rect ? rect.left + rect.width / 2 - POPOVER_WIDTH / 2 : 0
  const left = rect ? clamp(desiredLeft, MARGIN_PX, window.innerWidth - POPOVER_WIDTH - MARGIN_PX) : 0
  const top = rect ? rect.top - GAP_PX : 0

  const showWarning = takes.length >= 3

  useEffect(() => {
    const prevCount = prevCountRef.current
    const nextCount = takes.length
    if (prevCount === nextCount) return

    if (swapTimeoutRef.current != null) {
      window.clearTimeout(swapTimeoutRef.current)
      swapTimeoutRef.current = null
    }

    if (prevCount === 0 && nextCount > 0) {
      setShowPlaceholder(false)
      setShowList(false)
      swapTimeoutRef.current = window.setTimeout(() => setShowList(true), SWAP_DELAY_MS)
    } else if (prevCount > 0 && nextCount === 0) {
      setShowList(false)
      setShowPlaceholder(false)
      swapTimeoutRef.current = window.setTimeout(() => setShowPlaceholder(true), SWAP_DELAY_MS)
    } else if (nextCount > 0) {
      setShowPlaceholder(false)
      setShowList(true)
    } else {
      setShowPlaceholder(true)
      setShowList(false)
    }

    prevCountRef.current = nextCount
  }, [takes.length])

  useEffect(() => {
    const prevIds = prevTakeIdsRef.current
    const nextIds = takes.map((take) => take.id)
    const addedIds = nextIds.filter((id) => !prevIds.includes(id))
    if (addedIds.length === 0) {
      prevTakeIdsRef.current = nextIds
      return
    }

    const enteringDelayMs = showList ? ENTER_DELAY_MS : SWAP_DELAY_MS + ENTER_DELAY_MS
    setEnteringTakeIds((prev) => [...prev, ...addedIds])
    window.setTimeout(() => {
      setEnteringTakeIds((prev) => prev.filter((id) => !addedIds.includes(id)))
    }, enteringDelayMs)

    prevTakeIdsRef.current = nextIds
  }, [takes, showList])

  useEffect(() => {
    return () => {
      if (swapTimeoutRef.current != null) {
        window.clearTimeout(swapTimeoutRef.current)
      }
    }
  }, [])

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

  // Calculate confirmation popup position
  const confirmButtonEl = confirmingTakeId ? deleteButtonRefs.current.get(confirmingTakeId) : null
  const confirmRect = confirmButtonEl?.getBoundingClientRect()
  const shouldShowLeft = confirmRect ? (window.innerWidth - confirmRect.right < 120) : false

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
                          ? 'border-white/20 bg-white/12 text-white/80'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <div className="relative">
                        <Save className="h-4 w-4" />
                        <div
                          className={cn(
                            'absolute -bottom-0.5 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500 text-white transition-all duration-200',
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
                        aria-label="Clear all recordings"
                        onClick={() => setConfirmingClearAll(!confirmingClearAll)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear all
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
                  </div>
                  <Tooltip label={strings.close} shortcut="Esc">
                    <button
                      type="button"
                      aria-label={strings.close}
                      onClick={onClose}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
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

              <div className="mt-4">
                <div
                  className={cn(
                    'overflow-hidden transition-[max-height,opacity,transform] duration-200 ease-out',
                    showPlaceholder ? 'max-h-20 opacity-100 translate-y-0' : 'max-h-0 opacity-0 translate-y-2'
                  )}
                >
                  <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/75">
                    {strings.recordFirstVideo}
                  </div>
                </div>
                <div
                  className={cn(
                    'transition-[max-height,opacity] duration-200 ease-out overflow-y-auto tele-scroll overscroll-contain pr-1 -mr-1',
                    showList
                      ? 'max-h-96 opacity-100'
                      : 'max-h-0 opacity-0 pointer-events-none'
                  )}
                  onScroll={() => {
                    // Close confirmation popup on scroll to avoid floating UI issues
                    if (confirmingTakeId) setConfirmingTakeId(null)
                  }}
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
                    const isEntering = enteringTakeIds.includes(take.id)
                    const isConfirming = confirmingTakeId === take.id && !isRemoving

                    return (
                      <div
                        key={take.id}
                        className={cn(
                          'flex items-center gap-2 transition-[max-height,opacity,transform,margin] duration-[180ms] ease-out overflow-visible',
                          index === 0 ? 'mt-0' : 'mt-2',
                          isRemoving
                            ? 'max-h-0 opacity-0 translate-y-1 !mt-0 pointer-events-none !overflow-hidden'
                            : isEntering
                              ? 'max-h-0 opacity-0 -translate-y-2 !mt-0 pointer-events-none !overflow-hidden'
                              : 'max-h-24 opacity-100 translate-y-0'
                        )}
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
                            onClick={() => setConfirmingTakeId(isConfirming ? null : take.id)}
                            aria-label={`Delete ${strings.takeLabel(take.takeNumber)}`}
                            disabled={isRemoving}
                            className={cn(
                              'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70',
                              'hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-colors',
                              isConfirming && 'bg-red-500/20 border-red-500/30 text-red-400'
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {confirmButtonEl && confirmRect && (
              <motion.div
                key="delete-confirm"
                className={cn(
                  'fixed z-[80] rounded-xl border border-white/10 bg-black/90 px-2.5 py-1.5'
                )}
                style={{
                  bottom: window.innerHeight - confirmRect.top + 8,
                  left: shouldShowLeft ? 'auto' : confirmRect.left + 4,
                  right: shouldShowLeft ? window.innerWidth - confirmRect.right + 4 : 'auto',
                }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">Confirm?</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirmingTakeId) removeTake(confirmingTakeId)
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
      )}
    </AnimatePresence>,
    document.body
  )
}
