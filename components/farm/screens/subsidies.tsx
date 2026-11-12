'use client'

import { useState } from 'react'
import { BellRing, CalendarClock, ExternalLink, Info } from 'lucide-react'
import { SUBSIDIES } from '@/lib/farm-data'
import { Card, Pill, ScreenHeader } from '../ui'

export function SubsidiesScreen() {
  const [filter, setFilter] = useState<string>('All')
  const tags = ['All', ...Array.from(new Set(SUBSIDIES.map((s) => s.tag)))]
  const list = filter === 'All' ? SUBSIDIES : SUBSIDIES.filter((s) => s.tag === filter)

  return (
    <div className="pb-8">
      <ScreenHeader title="Govt. schemes" subtitle="Subsidies, grants & support" back="home" />
      <div className="flex flex-col gap-4 px-5">
        <Card className="flex gap-3 bg-muted">
          <Info className="size-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-pretty">
            Informational alerts only. Apply directly through the official portal or your local agriculture office.
          </p>
        </Card>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={filter === t}
              onClick={() => setFilter(t)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold ${filter === t ? 'border-primary bg-primary text-primary-foreground' : 'bg-card'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <ul className="flex flex-col gap-3">
          {list.map((s) => (
            <li key={s.id}>
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold leading-snug">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.body}</p>
                  </div>
                  <Pill tone={s.tag === 'Subsidy' ? 'accent' : 'primary'}>{s.tag}</Pill>
                </div>
                <p className="mt-3 text-lg font-bold text-primary">{s.benefit}</p>
                <p className="mt-1 text-sm text-muted-foreground">Eligibility: {s.eligibility}</p>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <CalendarClock className="size-4" /> {s.deadline}
                  </span>
                  <div className="flex gap-2">
                    <button type="button" className="flex size-9 items-center justify-center rounded-full border" aria-label={`Remind me about ${s.name}`}>
                      <BellRing className="size-4" />
                    </button>
                    <button type="button" className="flex items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-semibold text-secondary-foreground">
                      Details <ExternalLink className="size-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
