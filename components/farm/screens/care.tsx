'use client'

import { useState } from 'react'
import { BellRing, Check, Clock, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addDays, fmtDate } from '@/lib/farm-data'
import { useFarm } from '../store'
import { Card, Pill, ScreenHeader, Segmented } from '../ui'

export function CareScreen() {
  const { tasks, profile, sowingDate, daysSinceSowing, completeTask, activeCrop } = useFarm()
  const [tab, setTab] = useState<'schedule' | 'log'>('schedule')
  const [applying, setApplying] = useState<string | null>(null)
  const [dose, setDose] = useState(0)
  const [notify, setNotify] = useState(true)

  const done = tasks.filter((t) => t.done)

  return (
    <div className="pb-8">
      <ScreenHeader title="Fertilizer plan" subtitle={`${activeCrop.name} · Day ${daysSinceSowing} · ${profile.acres} acres`} />
      <div className="flex flex-col gap-4 px-5">
        <label className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <BellRing className="size-5 text-primary" />
          <span className="flex-1">
            <span className="block text-sm font-semibold">Dose reminders</span>
            <span className="block text-xs text-muted-foreground">Notify at 6:00 AM on application day</span>
          </span>
          <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        </label>

        <Segmented
          label="View"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'schedule', label: 'Schedule' },
            { value: 'log', label: `Application log (${done.length})` },
          ]}
        />

        {tab === 'schedule' ? (
          <ol className="relative flex flex-col gap-3 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-0.5 before:bg-border">
            {tasks.map((t) => {
              const date = addDays(sowingDate, t.day)
              const total = +(t.dosePerAcre * profile.acres).toFixed(2)
              const status = t.done ? 'done' : t.day < daysSinceSowing ? 'overdue' : t.day === daysSinceSowing ? 'today' : 'upcoming'
              const isApplying = applying === t.id
              return (
                <li key={t.id} className="relative flex gap-3">
                  <span
                    className={cn(
                      'z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-4 border-background',
                      status === 'done' && 'bg-success text-primary-foreground',
                      status === 'today' && 'bg-accent text-accent-foreground',
                      status === 'overdue' && 'bg-destructive text-primary-foreground',
                      status === 'upcoming' && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {status === 'done' ? <Check className="size-4" /> : status === 'upcoming' ? <Clock className="size-4" /> : <FlaskConical className="size-4" />}
                  </span>
                  <Card className={cn('flex-1 p-3.5', status === 'today' && 'border-accent', status === 'upcoming' && 'opacity-80')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Day {t.day} · {fmtDate(date)}</p>
                        <p className="font-semibold">{t.product}</p>
                      </div>
                      {status === 'today' && <Pill tone="accent">Today</Pill>}
                      {status === 'overdue' && <Pill tone="danger">Overdue</Pill>}
                      {status === 'done' && <Pill tone="success">Applied</Pill>}
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{total}</span>
                      <span className="text-sm text-muted-foreground">{t.unit} total</span>
                      <span className="ml-auto text-xs text-muted-foreground">{t.dosePerAcre} {t.unit}/acre</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t.method}</p>
                    {!t.done && t.day <= daysSinceSowing + 7 && !isApplying && (
                      <button
                        type="button"
                        onClick={() => {
                          setApplying(t.id)
                          setDose(total)
                        }}
                        className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
                      >
                        Mark as applied
                      </button>
                    )}
                    {isApplying && (
                      <form
                        className="mt-3 flex flex-col gap-2 rounded-xl bg-muted p-3"
                        onSubmit={(e) => {
                          e.preventDefault()
                          completeTask(t.id, dose / profile.acres)
                          setApplying(null)
                        }}
                      >
                        <label className="flex items-center gap-2 text-sm font-semibold">
                          Actual quantity used
                          <input
                            type="number"
                            step="0.1"
                            value={dose}
                            onChange={(e) => setDose(Number(e.target.value))}
                            className="ml-auto w-24 rounded-lg border bg-card px-2 py-1.5 text-right"
                          />
                          {t.unit}
                        </label>
                        {dose > total * 1.15 && <p className="text-xs font-semibold text-destructive">Above recommended dose — risk of leaf burn.</p>}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setApplying(null)} className="flex-1 rounded-lg border bg-card py-2 text-sm font-semibold">Cancel</button>
                          <button type="submit" className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Log it</button>
                        </div>
                      </form>
                    )}
                  </Card>
                </li>
              )
            })}
          </ol>
        ) : (
          <Card className="p-0">
            <table className="w-full text-sm">
              <caption className="sr-only">Fertilizer application history</caption>
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 font-bold">Date</th>
                  <th className="p-3 font-bold">Chemical</th>
                  <th className="p-3 text-right font-bold">Dose</th>
                </tr>
              </thead>
              <tbody>
                {done
                  .slice()
                  .reverse()
                  .map((t) => {
                    const used = t.done!.actualDose * profile.acres
                    const over = t.done!.actualDose > t.dosePerAcre * 1.15
                    return (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="p-3 align-top text-muted-foreground">{fmtDate(t.done!.date)}</td>
                        <td className="p-3 align-top">
                          <span className="block font-semibold">{t.product}</span>
                          <span className="text-xs text-muted-foreground">{t.type}</span>
                        </td>
                        <td className={cn('p-3 text-right align-top font-semibold tabular-nums', over && 'text-destructive')}>
                          {+used.toFixed(1)} {t.unit}
                          {over && <span className="block text-xs font-medium">+{Math.round((t.done!.actualDose / t.dosePerAcre - 1) * 100)}%</span>}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  )
}
