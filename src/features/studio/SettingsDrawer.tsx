import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Tooltip } from '../../components/Tooltip'
import { cn } from '../../lib/cn'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useI18n } from './i18n'

type Props = {
  open: boolean
  onClose: () => void
  script: string
  onScriptChange: (value: string) => void
  markdownEnabled: boolean
  onMarkdownEnabledChange: (value: boolean) => void
}

const SAVED_SCRIPTS_STORAGE_KEY = 'teleme.me:saved_scripts'
const PREVIEW_WORD_COUNT = 12

type SavedScriptEntry = {
  id: string
  text: string
  savedAt: number
}

type DrawerView = 'editor' | 'savedList' | 'savedDetail'

export function SettingsDrawer(props: Props) {
  const { open, onClose, script, onScriptChange, markdownEnabled, onMarkdownEnabledChange } = props
  const { strings } = useI18n()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const savedDetailTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const editorBoxRef = useRef<HTMLDivElement | null>(null)
  const savedDetailBoxRef = useRef<HTMLDivElement | null>(null)
  const MIN_TEXTAREA_HEIGHT = 220
  // Reserve extra space so the action buttons stay visible
  const BOTTOM_PADDING = 120
  const [view, setView] = useState<DrawerView>('editor')
  const [selectedScript, setSelectedScript] = useState<SavedScriptEntry | null>(null)
  const [savedScripts, setSavedScripts] = useLocalStorage<SavedScriptEntry[]>(SAVED_SCRIPTS_STORAGE_KEY, [])
  const [saveIndicatorKind, setSaveIndicatorKind] = useState<'success' | null>(null)
  const saveIndicatorTimeoutRef = useRef<number | null>(null)
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    []
  )

  const syncTextarea = useCallback(() => {
    if (!open) return
    const container = scrollRef.current
    const isEditorView = view === 'editor'
    const textarea = isEditorView ? textareaRef.current : savedDetailTextareaRef.current
    const box = isEditorView ? editorBoxRef.current : savedDetailBoxRef.current
    const available = container && container.clientHeight > 0 ? container.clientHeight - BOTTOM_PADDING : null

    if (box && available != null) {
      box.style.maxHeight = `${Math.max(MIN_TEXTAREA_HEIGHT, available)}px`
    } else if (box) {
      box.style.maxHeight = ''
    }

    if (!textarea) return

    let maxTextareaHeight: number | null = null
    if (box && available != null) {
      const style = window.getComputedStyle(box)
      const chromeY =
        Number.parseFloat(style.paddingTop) +
        Number.parseFloat(style.paddingBottom) +
        Number.parseFloat(style.borderTopWidth) +
        Number.parseFloat(style.borderBottomWidth)
      maxTextareaHeight = Math.max(MIN_TEXTAREA_HEIGHT, available - chromeY)
    }

    textarea.style.height = 'auto'
    textarea.style.maxHeight = maxTextareaHeight != null ? `${maxTextareaHeight}px` : ''
    textarea.style.height = `${Math.max(MIN_TEXTAREA_HEIGHT, textarea.scrollHeight)}px`
  }, [open, view])

  useLayoutEffect(() => {
    syncTextarea()
  }, [script, selectedScript, syncTextarea])

  useEffect(() => {
    if (!open) return
    const onResize = () => syncTextarea()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, syncTextarea])

  useEffect(() => {
    if (!open) {
      setView('editor')
      setSelectedScript(null)
    }
  }, [open])

  useEffect(() => {
    if (open && (view === 'editor' || view === 'savedDetail')) {
      syncTextarea()
    }
  }, [open, view, syncTextarea])

  useEffect(() => {
    return () => {
      if (saveIndicatorTimeoutRef.current != null) {
        window.clearTimeout(saveIndicatorTimeoutRef.current)
      }
    }
  }, [])

  const canSave = script.trim().length > 0

  const formatSavedDate = useCallback(
    (timestamp: number) => dateFormatter.format(new Date(timestamp)),
    [dateFormatter]
  )

  const getPreviewLabel = useCallback(
    (value: string) => {
      const normalized = value.replace(/\s+/g, ' ').trim()
      if (!normalized) return strings.emptySavedScript
      const words = normalized.split(' ')
      const preview = words.slice(0, PREVIEW_WORD_COUNT).join(' ')
      return words.length > PREVIEW_WORD_COUNT ? `${preview}…` : preview
    },
    [strings.emptySavedScript]
  )

  const handleSaveScript = useCallback(() => {
    if (!canSave) return

    const entry: SavedScriptEntry = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: script,
      savedAt: Date.now()
    }
    setSavedScripts((prev) => [entry, ...prev])

    setSaveIndicatorKind('success')
    if (saveIndicatorTimeoutRef.current != null) {
      window.clearTimeout(saveIndicatorTimeoutRef.current)
    }
    saveIndicatorTimeoutRef.current = window.setTimeout(() => {
      setSaveIndicatorKind(null)
    }, 1000)
  }, [canSave, script, setSavedScripts])

  const handleOpenSavedScripts = useCallback(() => {
    setSelectedScript(null)
    setView('savedList')
  }, [])

  const handleSelectSavedScript = useCallback((entry: SavedScriptEntry) => {
    setSelectedScript(entry)
    setView('savedDetail')
  }, [])

  const handleReplaceCurrentScript = useCallback(() => {
    if (!selectedScript) return
    onScriptChange(selectedScript.text)
    setSelectedScript(null)
    setView('editor')
  }, [onScriptChange, selectedScript])

  const handleDeleteSavedScript = useCallback(
    (entryId: string) => {
      setSavedScripts((prev) => prev.filter((entry) => entry.id !== entryId))
      if (selectedScript?.id === entryId) {
        setSelectedScript(null)
        setView('savedList')
      }
    },
    [selectedScript, setSavedScripts]
  )

  const handleBack = useCallback(() => {
    if (view === 'savedDetail') {
      setView('savedList')
      setSelectedScript(null)
    } else {
      setView('editor')
      setSelectedScript(null)
    }
  }, [view])

  useEffect(() => {
    if (!open || view === 'editor') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation?.()
      event.stopPropagation()
      handleBack()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, view, handleBack])

  const hasSavedScripts = savedScripts.length > 0

  const headerTitle =
    view === 'editor'
      ? strings.script
      : view === 'savedList'
        ? strings.savedScripts
        : strings.savedScriptPreview

  const backTooltipLabel = useMemo(() => {
    if (view === 'editor') return strings.close
    return view === 'savedDetail' ? strings.backToSavedScripts : strings.backToScript
  }, [view, strings.backToSavedScripts, strings.backToScript, strings.close])

  let headerMeta: ReactNode = null
  if (view === 'editor') {
    const words = script.trim().split(/\s+/).length
    const minutes = words / 150
    const m = Math.floor(minutes)
    const s = Math.round((minutes - m) * 60)
    if (!(m === 0 && s === 0)) {
      headerMeta = (
        <div className="text-[10px] font-medium text-white/50 tracking-wide">
          {strings.speakingTime} ~ {m > 0 ? `${m}m ` : ''}
          {s}s
        </div>
      )
    }
  } else if (view === 'savedDetail' && selectedScript) {
    headerMeta = (
      <div className="text-[10px] font-medium text-white/50 tracking-wide">
        {strings.savedAt} {formatSavedDate(selectedScript.savedAt)}
      </div>
    )
  }

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
              <div className="flex flex-col items-start gap-0.5">
                <div className="text-sm font-semibold text-white/90">{headerTitle}</div>
                {headerMeta}
              </div>
              <div className="flex items-center gap-2">
                <Tooltip label={strings.enableMarkdown}>
                  <button
                    type="button"
                    onClick={() => onMarkdownEnabledChange(!markdownEnabled)}
                    aria-label={strings.enableMarkdown}
                    className={cn(
                      'inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-xs transition-colors',
                      markdownEnabled
                        ? 'border-white/18 bg-white/10 text-white'
                        : 'border-white/10 bg-white/6 text-white/70 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">MD</span>
                    <span
                      className={cn(
                        'relative inline-flex h-5 w-8 items-center rounded-full border border-white/10 bg-white/8 transition-colors',
                        markdownEnabled && 'bg-white/15'
                      )}
                      aria-hidden="true"
                    >
                      <span
                        className={cn(
                          'absolute left-[2px] top-[2px] h-[14px] w-[14px] rounded-full bg-white/70 transition-transform',
                          markdownEnabled ? 'translate-x-[14px]' : 'translate-x-0'
                        )}
                      />
                    </span>
                  </button>
                </Tooltip>
                <Tooltip
                  label={backTooltipLabel}
                  shortcut={view === 'editor' ? 'Esc' : undefined}
                  side={view === 'editor' ? 'auto' : 'bottom'}
                  preferSide={view === 'editor' ? 'left' : 'bottom'}
                  sideOffset={view === 'editor' ? 14 : 8}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center">
                    <button
                      type="button"
                      aria-label={backTooltipLabel}
                      onClick={view === 'editor' ? onClose : handleBack}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/75 hover:bg-white/10 hover:text-white"
                    >
                      {view === 'editor' ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    </button>
                  </span>
                </Tooltip>
              </div>
            </header>

            <div
              ref={scrollRef}
              className="mt-5 flex h-[calc(100%-72px)] flex-col gap-20 overflow-hidden pb-2"
            >
              {view === 'editor' && (
                <section className="space-y-3">
                  <div
                    ref={editorBoxRef}
                    className={cn(
                      'w-full rounded-2xl border border-white/10 bg-white/4 px-4 py-3 pr-6',
                      'overflow-hidden focus-within:border-white/20 focus-within:bg-white/5'
                    )}
                  >
                    <textarea
                      ref={textareaRef}
                      value={script}
                      onChange={(e) => onScriptChange(e.target.value)}
                      className={cn(
                        'tele-scroll min-h-[220px] w-full resize-none bg-transparent pr-4 text-sm text-white/85',
                        'focus:outline-none overflow-y-auto'
                      )}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveScript}
                      disabled={!canSave}
                      className={cn(
                        'inline-flex flex-1 min-w-[160px] items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium text-white/85 transition',
                        'border-white/10 bg-white/4 hover:border-white/25 hover:bg-white/10',
                        'disabled:cursor-not-allowed disabled:opacity-40'
                      )}
                    >
                      <span className="relative inline-flex items-center">
                        <span>{strings.saveScript}</span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute -bottom-0.5 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-white transition-all duration-200',
                            saveIndicatorKind ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                          )}
                        >
                          <Check className="h-1.5 w-1.5" strokeWidth={3} />
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenSavedScripts}
                      className={cn(
                        'inline-flex flex-1 min-w-[160px] items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium text-white/80 transition',
                        'border-white/10 bg-white/4 hover:border-white/25 hover:bg-white/10'
                      )}
                    >
                      {strings.savedScripts}
                    </button>
                    
                  </div>
                </section>
              )}
              {view === 'savedList' && (
                <section className="flex min-h-0 flex-col space-y-4">
                  <p className="text-sm text-white/70">{strings.savedScriptsInfo}</p>
                  {hasSavedScripts ? (
                    <div className="mt-1 flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 tele-scroll">
                      {savedScripts.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => handleSelectSavedScript(entry)}
                          className={cn(
                            'w-full rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-left text-white/85 transition',
                            'hover:border-white/20 hover:bg-white/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30'
                          )}
                        >
                          <div className="text-sm font-medium">{getPreviewLabel(entry.text)}</div>
                          <div className="text-[11px] text-white/55">
                            {strings.savedAt} {formatSavedDate(entry.savedAt)}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/60">
                      {strings.noSavedScripts}
                    </div>
                  )}
                </section>
              )}
                {view === 'savedDetail' && (
                  <section className="space-y-4">
                    <div
                      ref={savedDetailBoxRef}
                      className="w-full rounded-2xl border border-white/10 bg-white/4 px-4 py-3 pr-6"
                    >
                      <textarea
                        ref={savedDetailTextareaRef}
                        value={selectedScript?.text ?? ''}
                        readOnly
                        className={cn(
                          'tele-scroll min-h-[220px] w-full resize-none bg-transparent pr-4 text-sm text-white/85',
                          'focus:outline-none overflow-y-auto'
                        )}
                        spellCheck={false}
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        disabled={!selectedScript}
                        onClick={handleReplaceCurrentScript}
                      className={cn(
                        'inline-flex w-full items-center justify-center rounded-2xl border px-4 py-2 text-sm text-white/85 transition',
                        'border-white/10 bg-white/4 hover:border-white/25 hover:bg-white/10',
                        'disabled:cursor-not-allowed disabled:opacity-40'
                      )}
                    >
                      {strings.replaceCurrentScript}
                    </button>
                      <button
                        type="button"
                        disabled={!selectedScript}
                        onClick={() => selectedScript && handleDeleteSavedScript(selectedScript.id)}
                      className={cn(
                        'inline-flex w-full items-center justify-center rounded-2xl border px-4 py-2 text-sm text-white/80 transition',
                        'border-white/10 bg-white/4 hover:border-white/25 hover:bg-white/10',
                        'disabled:cursor-not-allowed disabled:opacity-40'
                      )}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {strings.deleteSavedScript}
                      </button>
                    </div>
                  </section>
                )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
