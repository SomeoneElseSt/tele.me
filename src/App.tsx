import { useMemo, useState } from 'react'
import { Film, Github, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { RecorderPanel } from './features/recording/RecorderPanel'
import { PrompterPanel } from './features/prompter/PrompterPanel'
import { HotkeysDialog } from './features/hotkeys/HotkeysDialog'
import { useHotkeys } from './hooks/useHotkeys'
import { cn } from './lib/cn'

export default function App() {
  const [hotkeysOpen, setHotkeysOpen] = useState(false)

  const hotkeyBindings = useMemo(
    () => ({
      '?': () => setHotkeysOpen(true)
    }),
    []
  )
  useHotkeys(hotkeyBindings, true)

  return (
    <div className="min-h-screen text-white/90">
      <div className="mx-auto max-w-7xl px-5 py-10">
        <header className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
                <Film className="h-5 w-5 text-white/85" />
              </div>
              <div className="leading-tight">
                <div className="text-lg font-semibold tracking-[-0.02em]">tele.me</div>
                <div className="text-xs text-white/55">Tasteful teleprompter + recorder • runs locally</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white/80',
                  'hover:bg-white/10 hover:text-white transition-all'
                )}
                href="https://github.com/SomeoneElseSt/tele.me"
                target="_blank"
                rel="noreferrer"
              >
                <Github className="h-4 w-4" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <button
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white/80',
                  'hover:bg-white/10 hover:text-white transition-all'
                )}
                onClick={() => setHotkeysOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Hotkeys</span>
              </button>
            </div>
          </motion.div>
        </header>

        <main className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <RecorderPanel onRequestHotkeys={() => setHotkeysOpen(true)} />
          <PrompterPanel onRequestHotkeys={() => setHotkeysOpen(true)} />
        </main>

        <footer className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/55 sm:flex-row sm:items-center">
          <div>Privacy: everything stays on your device. No accounts.</div>
          <div>Build: MVP UI (Step 1). Voice-follow + subtitles next.</div>
        </footer>
      </div>

      <HotkeysDialog open={hotkeysOpen} onClose={() => setHotkeysOpen(false)} />
    </div>
  )
}
