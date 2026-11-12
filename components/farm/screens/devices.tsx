'use client'

import { useState } from 'react'
import { Droplets, Fan, Power, Thermometer, Waves, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFarm } from '../store'
import { Card, Meter, Pill, ScreenHeader, SectionTitle, Segmented } from '../ui'

const ZONES = [
  { id: 'A', name: 'Zone A · North', moisture: 31 },
  { id: 'B', name: 'Zone B · Center', moisture: 46 },
  { id: 'C', name: 'Zone C · South slope', moisture: 22 },
]

export function DevicesScreen() {
  const { profile, activeCrop } = useFarm()
  const [tab, setTab] = useState<'poly' | 'soil'>(profile.hasPolyhouse ? 'poly' : 'soil')
  const [auto, setAuto] = useState(true)
  const [vent, setVent] = useState(40)
  const [target, setTarget] = useState({ temp: 26, rh: 70 })
  const temp = 27.4
  const rh = 68
  const autoVent = Math.max(0, Math.min(100, Math.round((temp - target.temp) * 30 + (rh - target.rh) * 2 + 30)))
  const openPct = auto ? autoVent : vent

  return (
    <div className="pb-8">
      <ScreenHeader title="Field devices" subtitle={`${activeCrop.name} climate needs`} back="home" />
      <div className="flex flex-col gap-4 px-5">
        <Segmented
          label="Device type"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'poly', label: 'Polyhouse' },
            { value: 'soil', label: 'Soil moisture' },
          ]}
        />

        {tab === 'poly' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <Thermometer className="size-5 text-warning" />
                <p className="mt-2 text-3xl font-bold">{temp}°</p>
                <p className="text-xs text-muted-foreground">Target {target.temp}°C</p>
              </Card>
              <Card>
                <Droplets className="size-5 text-primary" />
                <p className="mt-2 text-3xl font-bold">{rh}%</p>
                <p className="text-xs text-muted-foreground">Target RH {target.rh}%</p>
              </Card>
            </div>

            <section className="rounded-3xl bg-primary p-5 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Roof vents</p>
                  <p className="font-serif text-4xl font-semibold">{openPct}% open</p>
                </div>
                <Fan className={cn('size-10', openPct > 0 && 'animate-spin [animation-duration:3s]')} />
              </div>
              <div className="mt-4 flex h-16 items-end gap-1.5" aria-hidden="true">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className={cn('flex-1 rounded-t-md transition-all', i < openPct / 10 ? 'bg-accent' : 'bg-primary-foreground/20')} style={{ height: `${30 + i * 7}%` }} />
                ))}
              </div>
              <label className="mt-4 flex items-center justify-between rounded-2xl bg-primary-foreground/10 p-3">
                <span>
                  <span className="block text-sm font-semibold">Automatic control</span>
                  <span className="block text-xs opacity-75">Adjusts vents from sensor readings</span>
                </span>
                <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
              </label>
              {!auto && (
                <label className="mt-3 flex flex-col gap-1 text-sm">
                  Manual vent position
                  <input type="range" min={0} max={100} step={10} value={vent} onChange={(e) => setVent(Number(e.target.value))} className="accent-[var(--accent)]" />
                </label>
              )}
            </section>

            <Card>
              <p className="pb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Crop climate targets</p>
              {(
                [
                  ['temp', 'Temperature', 18, 35, '°C'],
                  ['rh', 'Humidity', 40, 90, '%'],
                ] as const
              ).map(([k, l, min, max, u]) => (
                <label key={k} className="flex items-center gap-3 py-1.5">
                  <span className="w-24 text-sm font-semibold">{l}</span>
                  <input type="range" min={min} max={max} value={target[k]} onChange={(e) => setTarget({ ...target, [k]: Number(e.target.value) })} className="flex-1 accent-[var(--primary)]" />
                  <span className="w-12 text-right text-sm tabular-nums">{target[k]}{u}</span>
                </label>
              ))}
            </Card>

            <Card className="flex items-center gap-3">
              <Wifi className="size-5 text-success" />
              <div className="flex-1 text-sm">
                <p className="font-semibold">DHT22 sensor · Vent motor</p>
                <p className="text-xs text-muted-foreground">Online · last reading 12s ago</p>
              </div>
              <Pill tone="success">Connected</Pill>
            </Card>
          </>
        ) : (
          <>
            <Card className="flex items-center gap-4">
              <div className="relative flex size-20 shrink-0 items-center justify-center">
                <svg viewBox="0 0 36 36" className="size-20 -rotate-90" aria-hidden="true">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--muted)" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--warning)" strokeWidth="3.5" strokeDasharray={`${33 * 0.974} 100`} strokeLinecap="round" />
                </svg>
                <span className="absolute text-lg font-bold">33%</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average field moisture</p>
                <p className="font-serif text-xl font-semibold">Irrigate tomorrow, 6 AM</p>
                <p className="text-xs text-muted-foreground">~25 min drip per zone · ideal 40–60%</p>
              </div>
            </Card>

            <div>
              <SectionTitle>Sensor zones</SectionTitle>
              <ul className="flex flex-col gap-2">
                {ZONES.map((z) => {
                  const dry = z.moisture < 30
                  return (
                    <li key={z.id}>
                      <Card className="p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-semibold"><Waves className="size-4 text-primary" /> {z.name}</span>
                          <Pill tone={dry ? 'danger' : z.moisture < 40 ? 'accent' : 'success'}>{dry ? 'Dry' : z.moisture < 40 ? 'Low' : 'Optimal'}</Pill>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <Meter value={z.moisture} tone={dry ? 'danger' : z.moisture < 40 ? 'accent' : 'primary'} />
                          <span className="w-10 text-right text-sm font-bold tabular-nums">{z.moisture}%</span>
                        </div>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            </div>

            <button type="button" className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">
              <Power className="size-4" /> Start irrigation now
            </button>
          </>
        )}
      </div>
    </div>
  )
}
