'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, Mountain, Sparkles, TestTube } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyzeMarket, CROPS, currentSeason, inr, recommendCrops } from '@/lib/farm-data'
import { useFarm } from '../store'
import { Card, Pill, ScreenHeader, Segmented } from '../ui'
import { MarketReport } from '../market-report'

export function CropsScreen() {
  const { profile, activeCrop, setActiveCropId } = useFarm()
  const season = currentSeason()
  const [tab, setTab] = useState<'ai' | 'mine'>('ai')
  const [open, setOpen] = useState<string | null>(null)
  const [mine, setMine] = useState('onion')

  const recs = useMemo(() => recommendCrops(profile, season).slice(0, 5), [profile, season])
  const myCrop = CROPS.find((c) => c.id === mine) ?? CROPS[0]
  const myFit = recommendCrops(profile, season).find((r) => r.crop.id === mine)

  return (
    <div className="pb-8">
      <ScreenHeader title="Crop planner" subtitle={`${season} season · ${profile.acres} acres`} />
      <div className="flex flex-col gap-4 px-5">
        <Card className="flex items-center gap-3 bg-secondary/60">
          <TestTube className="size-5 shrink-0 text-primary" />
          <p className="flex-1 text-sm">
            pH <strong>{profile.soil.ph}</strong> · N <strong>{profile.soil.nitrogen}</strong> · P <strong>{profile.soil.phosphorus}</strong> · K{' '}
            <strong>{profile.soil.potassium}</strong>
          </p>
          <Pill>
            <Mountain className="size-3" /> {profile.elevation}m
          </Pill>
        </Card>

        <Segmented
          label="Recommendation mode"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'ai', label: 'AI picks' },
            { value: 'mine', label: 'Validate my crop' },
          ]}
        />

        {tab === 'ai' ? (
          <ul className="flex flex-col gap-3">
            {recs.map((r, i) => {
              const m = analyzeMarket(r.crop, profile.acres)
              const expanded = open === r.crop.id
              return (
                <li key={r.crop.id}>
                  <Card className={cn('p-0', expanded && 'border-primary')}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : r.crop.id)}
                      className="flex w-full items-center gap-3 p-4 text-left"
                    >
                      <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary">
                        <span className="text-lg font-bold text-primary">{r.score}</span>
                        <span className="absolute -bottom-1 rounded-full bg-card px-1.5 text-[9px] font-bold uppercase text-muted-foreground">fit</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-semibold">{r.crop.name}</span>
                          {i === 0 && (
                            <Pill tone="accent">
                              <Sparkles className="size-3" /> Best
                            </Pill>
                          )}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {r.crop.durationDays} days · Profit{' '}
                          <span className={m.profitPerAcre >= 0 ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
                            {inr(m.profitPerAcre * profile.acres)}
                          </span>
                        </span>
                      </span>
                      <ChevronDown className={cn('size-5 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
                    </button>
                    {expanded && (
                      <div className="flex flex-col gap-3 border-t px-4 pb-4 pt-3">
                        <ul className="flex flex-col gap-1.5 text-sm">
                          {r.reasons.map((x) => (
                            <li key={x} className="flex gap-2"><Check className="size-4 shrink-0 text-success" /> {x}</li>
                          ))}
                          {r.warnings.map((x) => (
                            <li key={x} className="flex gap-2 text-muted-foreground"><span className="w-4 text-center text-warning">!</span> {x}</li>
                          ))}
                        </ul>
                        <MarketReport crop={r.crop} acres={profile.acres} />
                        <button
                          type="button"
                          onClick={() => setActiveCropId(r.crop.id)}
                          disabled={activeCrop.id === r.crop.id}
                          className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
                        >
                          {activeCrop.id === r.crop.id ? 'Currently growing' : `Grow ${r.crop.name}`}
                        </button>
                      </div>
                    )}
                  </Card>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Which crop are you planning?</span>
              <select
                value={mine}
                onChange={(e) => setMine(e.target.value)}
                className="rounded-xl border bg-card px-3.5 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CROPS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            {myFit && (
              <Card className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-primary">{myFit.score}</span>
                <div className="text-sm">
                  <p className="font-semibold">Agronomic fit for your land</p>
                  <p className="text-muted-foreground">{myFit.warnings[0] ?? myFit.reasons[0]}</p>
                </div>
              </Card>
            )}
            <MarketReport crop={myCrop} acres={profile.acres} />
            <button
              type="button"
              onClick={() => setActiveCropId(myCrop.id)}
              disabled={activeCrop.id === myCrop.id}
              className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {activeCrop.id === myCrop.id ? 'Currently growing' : `Grow ${myCrop.name}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
