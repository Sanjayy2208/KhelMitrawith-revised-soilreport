'use client'

import { Home, Sprout, ScanLine, CalendarCheck, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FarmProvider, useFarm, type Screen } from './store'
import { Onboarding } from './screens/onboarding'
import { HomeScreen } from './screens/home'
import { CropsScreen } from './screens/crops'
import { ScanScreen } from './screens/scan'
import { CareScreen } from './screens/care'
import { LedgerScreen } from './screens/ledger'
import { SubsidiesScreen } from './screens/subsidies'
import { ReliefScreen } from './screens/relief'
import { DevicesScreen } from './screens/devices'
import { LocationScreen } from './screens/location'
import { VoiceAssistant } from './voice-assistant'

const NAV: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'crops', label: 'Crops', icon: Sprout },
  { id: 'scan', label: 'Scan', icon: ScanLine },
  { id: 'care', label: 'Schedule', icon: CalendarCheck },
  { id: 'ledger', label: 'Ledger', icon: Wallet },
]

function CurrentScreen() {
  const { screen } = useFarm()
  switch (screen) {
    case 'crops':
      return <CropsScreen />
    case 'scan':
      return <ScanScreen />
    case 'care':
      return <CareScreen />
    case 'ledger':
      return <LedgerScreen />
    case 'subsidies':
      return <SubsidiesScreen />
    case 'relief':
      return <ReliefScreen />
    case 'devices':
      return <DevicesScreen />
    case 'location':
      return <LocationScreen />
    default:
      return <HomeScreen />
  }
}

function BottomNav() {
  const { screen, go } = useFarm()
  return (
    <nav aria-label="Main" className="border-t bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur">
      <ul className="flex items-end justify-between">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = screen === id
          if (id === 'scan') {
            return (
              <li key={id} className="flex flex-1 justify-center">
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active ? 'page' : undefined}
                  className="-mt-7 flex flex-col items-center gap-1"
                >
                  <span
                    className={cn(
                      'flex size-14 items-center justify-center rounded-full border-4 border-background shadow-lg transition-colors',
                      active ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground',
                    )}
                  >
                    <Icon className="size-6" />
                  </span>
                  <span className={cn('text-[11px] font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}>
                    {label}
                  </span>
                </button>
              </li>
            )
          }
          return (
            <li key={id} className="flex flex-1 justify-center">
              <button
                type="button"
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-1 px-2 py-1"
              >
                <span
                  className={cn(
                    'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                    active ? 'bg-secondary text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className={cn('text-[11px] font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}>
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function StatusBar() {
  return (
    <div className="hidden items-center justify-between px-7 pt-3 text-xs font-semibold md:flex" aria-hidden="true">
      <span>9:41</span>
      <span className="h-6 w-24 rounded-full bg-foreground" />
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-4 rounded-sm border border-foreground" />
      </span>
    </div>
  )
}

function Phone() {
  const { onboarded, screen } = useFarm()
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-background md:h-[844px] md:w-[400px] md:rounded-[3rem] md:border-[10px] md:border-foreground md:shadow-2xl">
      <StatusBar />
      {onboarded ? (
        <>
          <main key={screen} className="no-scrollbar flex-1 overflow-y-auto animate-in fade-in duration-300">
            <CurrentScreen />
          </main>
          <BottomNav />
          <VoiceAssistant />
        </>
      ) : (
        <main className="no-scrollbar flex-1 overflow-y-auto">
          <Onboarding />
        </main>
      )}
    </div>
  )
}

export function AppShell() {
  return (
    <FarmProvider>
      <div className="flex min-h-dvh items-center justify-center bg-secondary md:py-8">
        <Phone />
      </div>
    </FarmProvider>
  )
}
