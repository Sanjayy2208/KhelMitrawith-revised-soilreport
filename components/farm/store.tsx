'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  addDays,
  CROPS,
  DEFAULT_PROFILE,
  FERTILIZER_TEMPLATE,
  type CropInfo,
  type FarmProfile,
  type FertilizerTask,
  type LedgerEntry,
} from '@/lib/farm-data'

export type Screen =
  | 'home'
  | 'crops'
  | 'scan'
  | 'care'
  | 'ledger'
  | 'subsidies'
  | 'relief'
  | 'devices'
  | 'location'
  | 'profile'

export type Diagnosis = {
  id: string
  date: string
  image: string
  verdict: 'Biological disease' | 'Pest attack' | 'Chemical burn / toxicity'
  name: string
  confidence: number
}

const DAYS_SINCE_SOWING = 38

function buildTasks(sowing: Date): FertilizerTask[] {
  return FERTILIZER_TEMPLATE.map((t, i) => ({
    ...t,
    id: `f${i}`,
    done:
      t.day < DAYS_SINCE_SOWING
        ? {
            date: addDays(sowing, t.day).toISOString(),
            actualDose: t.day === 35 ? t.dosePerAcre * 1.4 : t.dosePerAcre,
          }
        : undefined,
  }))
}

function buildLedger(sowing: Date, acres: number): LedgerEntry[] {
  const d = (n: number) => addDays(sowing, n).toISOString()
  return [
    { id: 'l1', kind: 'expense', category: 'Machinery', label: 'Tractor ploughing & rotavator', amount: 2400 * acres, date: d(-4) },
    { id: 'l2', kind: 'expense', category: 'Seeds', label: 'Hybrid tomato seedlings', amount: 8500 * acres, date: d(-1) },
    { id: 'l3', kind: 'expense', category: 'Fertilizer', label: 'Farmyard manure', amount: 3200 * acres, date: d(0) },
    { id: 'l4', kind: 'expense', category: 'Fertilizer', label: 'DAP 50 kg bags', amount: 1350 * acres, date: d(1) },
    { id: 'l5', kind: 'expense', category: 'Labour', label: 'Transplanting labour (6 workers)', amount: 2100 * acres, date: d(1) },
    { id: 'l6', kind: 'expense', category: 'Irrigation', label: 'Drip line maintenance', amount: 1800, date: d(10) },
    { id: 'l7', kind: 'expense', category: 'Fertilizer', label: 'Urea top dressing', amount: 300 * acres, date: d(21) },
    { id: 'l8', kind: 'expense', category: 'Labour', label: 'Weeding', amount: 1500 * acres, date: d(28) },
    { id: 'l9', kind: 'expense', category: 'Fertilizer', label: 'Urea top dressing', amount: 360 * acres, date: d(35) },
  ]
}

type FarmState = {
  onboarded: boolean
  setOnboarded: (v: boolean) => void
  profile: FarmProfile
  setProfile: (p: FarmProfile) => void
  activeCrop: CropInfo
  setActiveCropId: (id: string) => void
  sowingDate: Date
  daysSinceSowing: number
  tasks: FertilizerTask[]
  completeTask: (id: string, actualDose: number) => void
  ledger: LedgerEntry[]
  addEntry: (e: Omit<LedgerEntry, 'id'>) => void
  removeEntry: (id: string) => void
  diagnoses: Diagnosis[]
  addDiagnosis: (d: Diagnosis) => void
  screen: Screen
  go: (s: Screen) => void
}

const FarmContext = createContext<FarmState | null>(null)

export function FarmProvider({ children }: { children: ReactNode }) {
  const sowingDate = useMemo(() => addDays(new Date(), -DAYS_SINCE_SOWING), [])
  const [onboarded, setOnboarded] = useState(false)
  const [profile, setProfile] = useState<FarmProfile>(DEFAULT_PROFILE)
  const [activeCropId, setActiveCropId] = useState('tomato')
  const [tasks, setTasks] = useState(() => buildTasks(sowingDate))
  const [ledger, setLedger] = useState(() => buildLedger(sowingDate, DEFAULT_PROFILE.acres))
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [screen, setScreen] = useState<Screen>('home')

  const activeCrop = CROPS.find((c) => c.id === activeCropId) ?? CROPS[0]

  const value: FarmState = {
    onboarded,
    setOnboarded,
    profile,
    setProfile,
    activeCrop,
    setActiveCropId,
    sowingDate,
    daysSinceSowing: DAYS_SINCE_SOWING,
    tasks,
    completeTask: (id, actualDose) => {
      const task = tasks.find((t) => t.id === id)
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: { date: new Date().toISOString(), actualDose } } : t)),
      )
      if (task) {
        setLedger((prev) => [
          ...prev,
          {
            id: `l${Date.now()}`,
            kind: 'expense',
            category: task.type === 'Fungicide' ? 'Pesticide' : 'Fertilizer',
            label: task.product,
            amount: Math.round(actualDose * profile.acres * (task.unit === 'L' ? 450 : 28)),
            date: new Date().toISOString(),
          },
        ])
      }
    },
    ledger,
    addEntry: (e) => setLedger((prev) => [...prev, { ...e, id: `l${Date.now()}` }]),
    removeEntry: (id) => setLedger((prev) => prev.filter((e) => e.id !== id)),
    diagnoses,
    addDiagnosis: (d) => setDiagnoses((prev) => [d, ...prev]),
    screen,
    go: setScreen,
  }

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>
}

export function useFarm() {
  const ctx = useContext(FarmContext)
  if (!ctx) throw new Error('useFarm must be used inside FarmProvider')
  return ctx
}
