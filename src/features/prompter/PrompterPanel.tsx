import { AlignLeft, Pause, Play, RotateCcw, Sparkles, Type } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { IconButton } from '../../components/IconButton'
import { Panel } from '../../components/Panel'
import { Slider } from '../../components/Slider'
import { cn } from '../../lib/cn'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useRafLoop } from '../../hooks/useRafLoop'

type Props = {
  onRequestHotkeys: () => void
}

export function PrompterPanel({ onRequestHotkeys }: Props) {
  const [script, setScript] = useState(
    `Hi — this is tele.me.\n\nA tasteful, free teleprompter + recorder that runs locally in your browser.\n\nUse Space to play/pause scrolling.\nUse R to start/stop recording.\n\nLet’s make something beautiful.`
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(52) // px/sec
  const [fontSize, setFontSize] = useState(40)
  const [mirrorText, setMirrorText] = useState(false)
  const [focusMode, setFocusMode] = useState(true)

  const scrollerRef = useRef<HTMLDivElement | null>(null)

  useRafLoop(
    (deltaMs) => {
      const el = scrollerRef.current
      if (!el) return
      const deltaPx = (speed * deltaMs) / 1000
      el.scrollTop = el.scrollTop + deltaPx
    },
    isPlaying
  )

  const bindings = useMemo(
    () => ({
      space: () => setIsPlaying((v) => !v),
      escape: () => setIsPlaying(false),
      'ctrl+enter': () => setIsPlaying((v) => !v),
      'meta+enter': () => setIsPlaying((v) => !v)
    }),
    []
  )
  useHotkeys(bindings, true)

  return (
    <Panel className="relative min-h-[720px] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-fade" />
      <div className="relative flex h-full flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 border border-white/10">
              <AlignLeft className="h-4 w-4 text-white/85" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white/90">Teleprompter</div>
              <div className="text-xs text-white/55">Manual scroll • voice-follow later</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              type="button"
              title="Show hotkeys"
              aria-label="Show hotkeys"
              onClick={onRequestHotkeys}
            >
              <Sparkles className="h-4 w-4" />
            </IconButton>
            <IconButton
              type="button"
              title="Mirror text"
              aria-label="Mirror text"
              active={mirrorText}
              onClick={() => setMirrorText((v) => !v)}
            >
              <Type className="h-4 w-4" />
            </IconButton>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
            <label className="flex flex-col gap-2">
              <span className="text-xs text-white/60">Script</span>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className={cn(
                  'min-h-[180px] w-full resize-none rounded-2xl border bg-white/4 px-4 py-3 text-sm text-white/85',
                  'border-white/10 focus:outline-none focus:ring-2 focus:ring-brand/70'
                )}
              />
            </label>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">Preview</span>
                <div className="text-xs text-white/50">
                  <span className="hidden sm:inline">Space</span>
                  <span className="sm:hidden">Tap play</span>
                  <span className="hidden sm:inline"> to play/pause</span>
                </div>
              </div>
              <div
                ref={scrollerRef}
                className={cn(
                  'relative h-[180px] overflow-y-auto rounded-2xl border border-white/10 bg-black/30',
                  'tele-scroll'
                )}
              >
                <div className={cn('px-6 py-6 text-white/90', mirrorText && '-scale-x-100')}>
                  <pre
                    className={cn(
                      'whitespace-pre-wrap font-medium leading-[1.35] tracking-[-0.02em]',
                      focusMode ? 'text-white/92' : 'text-white/85'
                    )}
                    style={{ fontSize }}
                  >
                  {script}
                </pre>
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/60 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white/85">Scroll speed</div>
                <div className="text-xs text-white/55">{Math.round(speed)} px/s</div>
              </div>
              <div className="mt-3">
                <Slider value={speed} min={10} max={180} step={1} onChange={setSpeed} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white/85">Text size</div>
                <div className="text-xs text-white/55">{fontSize}px</div>
              </div>
              <div className="mt-3">
                <Slider value={fontSize} min={22} max={72} step={1} onChange={setFontSize} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button type="button" onClick={() => setIsPlaying((v) => !v)}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsPlaying(false)
                  scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Top
              </Button>
              <Button type="button" variant="ghost" onClick={() => setFocusMode((v) => !v)}>
                Focus: {focusMode ? 'On' : 'Off'}
              </Button>
            </div>

              <motion.div
                className="text-xs text-white/55"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                Tip: Keep eyes near lens for best presence.
              </motion.div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
