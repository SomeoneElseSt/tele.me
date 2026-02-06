import { Analytics } from '@vercel/analytics/react'
import { Studio } from './features/studio/Studio'
import { TooltipProvider } from './components/Tooltip'

export default function App() {
  return (
    <TooltipProvider>
      <Studio />
      <Analytics />
    </TooltipProvider>
  )
}
