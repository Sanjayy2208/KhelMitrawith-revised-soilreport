'use client'

import {
  Bell,
  BadgeIndianRupee,
  ChevronRight,
  CloudSun,
  Droplets,
  FlaskConical,
  Landmark,
  LifeBuoy,
  LineChart,
  MapPin,
  ScanLine,
  Sprout,
  Thermometer,
} from 'lucide-react'
import { addDays, fmtDate, inr } from '@/lib/farm-data'
import { useFarm, type Screen } from '../store'
import { Card, Meter, Pill, SectionTitle } from '../ui'

const ACTIONS: { label: string; icon: typeof Sprout; screen: Screen }[] = [
  { label: 'Crop advice', icon: Sprout, screen: 'crops' },
  { label: 'Leaf scan', icon: ScanLine, screen: 'scan' },
  { label: 'Fertilizer', icon: FlaskConical, screen: 'care' },
  { label: 'Subsidies', icon: Landmark, screen: 'subsidies' },
  { label: 'Disaster aid', icon: LifeBuoy, screen: 'relief' },
  { label: 'Devices', icon: Thermometer, screen: 'devices' },
  { label: 'GPS location', icon: MapPin, screen: 'location' },
]

export function HomeScreen() {
  const { profile, activeCrop, daysSinceSowing, sowingDate, tasks, ledger, go } = useFarm()
  const progress = Math.round((daysSinceSowing / activeCrop.durationDays) * 100)
  const due = tasks.find((t) => !t.done)
  const spent = ledger.filter((e) => e.kind === 'expense').reduce((a, e) => a + e.amount, 0)
  const harvest = addDays(sowingDate, activeCrop.durationDays)

  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Namaste,</p>
          <h1 className="font-serif text-2xl font-semibold">{profile.farmerName.split(' ')[0]}</h1>
        </div>
        <button type="button" onClick={() => go('care')} className="relative flex size-11 items-center justify-center rounded-full border bg-card" aria-label="Notifications, 2 unread">
          <Bell className="size-5" />
          <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-destructive ring-2 ring-card" />
        </button>
      </header>

      <section className="overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-80">{profile.village}, {profile.district} · {profile.acres} acres</p>
            <h2 className="mt-1 font-serif text-3xl font-semibold">{activeCrop.name}</h2>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-primary-foreground/15 px-3 py-2">
            <CloudSun className="size-5" />
            <span className="text-lg font-bold">29°</span>
          </div>
        </div>
        <div className="mt-5 flex items-end justify-between text-sm">
          <span>Day <strong className="text-2xl">{daysSinceSowing}</strong> / {activeCrop.durationDays}</span>
          <span className="opacity-80">Harvest ~{fmtDate(harvest)}</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-primary-foreground/20">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs opacity-80">Vegetative stage → flowering in ~10 days</p>
      </section>

      {due && (
        <button type="button" onClick={() => go('care')} className="flex items-center gap-3 rounded-2xl border border-accent bg-accent/15 p-4 text-left">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <FlaskConical className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold uppercase tracking-wide text-accent-foreground">
              {due.day === daysSinceSowing ? 'Due today' : `Due day ${due.day}`}
            </span>
            <span className="block font-semibold">{due.product}</span>
            <span className="block text-sm text-muted-foreground">
              {+(due.dosePerAcre * profile.acres).toFixed(2)} {due.unit} total for {profile.acres} acres
            </span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </button>
      )}

      <div>
        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {ACTIONS.map(({ label, icon: Icon, screen }) => (
            <button key={label} type="button" onClick={() => go(screen)} className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-xs font-semibold">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icon className="size-5" />
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle action={<button type="button" onClick={() => go('devices')} className="text-sm font-semibold text-primary">View</button>}>
          Live sensors
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Thermometer className="size-4" /> Polyhouse</div>
            <p className="mt-1 text-2xl font-bold">27.4°C</p>
            <p className="text-xs text-muted-foreground">RH 68% · Vents 40% open</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Droplets className="size-4" /> Soil moisture</div>
            <p className="mt-1 text-2xl font-bold">31%</p>
            <Meter value={31} tone="accent" />
            <p className="mt-1 text-xs text-muted-foreground">Irrigate in ~18 hrs</p>
          </Card>
        </div>
      </div>

      <div>
        <SectionTitle>This season</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => go('ledger')} className="rounded-2xl border bg-card p-4 text-left">
            <BadgeIndianRupee className="size-5 text-destructive" />
            <p className="mt-2 text-xs text-muted-foreground">Spent so far</p>
            <p className="text-xl font-bold">{inr(spent)}</p>
          </button>
          <button type="button" onClick={() => go('crops')} className="rounded-2xl border bg-card p-4 text-left">
            <LineChart className="size-5 text-success" />
            <p className="mt-2 text-xs text-muted-foreground">Mandi rate today</p>
            <p className="text-xl font-bold">{inr(1620)}<span className="text-xs font-medium text-muted-foreground">/q</span></p>
          </button>
        </div>
      </div>

      <button type="button" onClick={() => go('subsidies')} className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-left">
        <Landmark className="size-6 shrink-0 text-primary" />
        <span className="flex-1">
          <span className="block text-sm font-semibold">Polyhouse subsidy closes 15 Dec</span>
          <span className="block text-xs text-muted-foreground">You may be eligible for 50% of costs</span>
        </span>
        <Pill tone="primary">New</Pill>
      </button>
    </div>
  )
}
