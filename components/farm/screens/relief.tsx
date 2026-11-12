'use client'

import { useState } from 'react'
import { CloudHail, CloudLightning, Download, FileCheck2, Flame, Scale, Waves, Wind } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addDays, fmtDate, inr, RELIEF_SCHEMES } from '@/lib/farm-data'
import { useFarm } from '../store'
import { Card, Pill, ScreenHeader, SectionTitle } from '../ui'

const EVENTS = [
  { id: 'flood', label: 'Flood', icon: Waves },
  { id: 'hail', label: 'Hailstorm', icon: CloudHail },
  { id: 'drought', label: 'Drought', icon: Flame },
  { id: 'cyclone', label: 'Cyclone', icon: Wind },
  { id: 'storm', label: 'Unseasonal rain', icon: CloudLightning },
] as const

const esc = (s: string | number) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function ReliefScreen() {
  const { profile, activeCrop, sowingDate, daysSinceSowing, tasks, ledger, diagnoses } = useFarm()
  const [event, setEvent] = useState<string>('hail')
  const [loss, setLoss] = useState(45)
  const [generated, setGenerated] = useState(false)

  const eligible = RELIEF_SCHEMES.filter((s) => !(s.id === 'r2' || s.id === 'r4') || loss > 33)
  const spent = ledger.filter((e) => e.kind === 'expense').reduce((a, e) => a + e.amount, 0)
  const applied = tasks.filter((t) => t.done)

  const download = () => {
    const evLabel = EVENTS.find((e) => e.id === event)?.label ?? event
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Cultivation Activity Dossier</title>
<style>body{font-family:system-ui,sans-serif;max-width:780px;margin:32px auto;color:#1f2d24;padding:0 16px}h1{font-family:Georgia,serif;margin-bottom:4px}h2{border-bottom:2px solid #2f5d3f;padding-bottom:4px;margin-top:28px;font-size:16px;text-transform:uppercase;letter-spacing:.04em}table{width:100%;border-collapse:collapse;font-size:13px}td,th{border:1px solid #d9dccf;padding:6px 8px;text-align:left}th{background:#eef2e6}.muted{color:#5b6b60;font-size:12px}.note{background:#f6f3e8;padding:10px;border-radius:6px;font-size:12px}</style></head><body>
<h1>Cultivation Activity Dossier</h1><p class="muted">Generated ${esc(new Date().toLocaleString('en-IN'))} · Ref KM-${Date.now().toString().slice(-8)}</p>
<h2>1. Farmer &amp; land profile</h2><table>
<tr><th>Farmer</th><td>${esc(profile.farmerName)}</td><th>Location</th><td>${esc(profile.village)}, ${esc(profile.district)}</td></tr>
<tr><th>Area</th><td>${esc(profile.acres)} acres</td><th>Terrain / Elevation</th><td>${esc(profile.terrain)} · ${esc(profile.elevation)} m</td></tr>
<tr><th>Previous crops</th><td colspan="3">${esc(profile.previousCrops.join(', ') || '—')}</td></tr></table>
<h2>2. Soil test log</h2><table><tr><th>pH</th><th>N (kg/ha)</th><th>P (kg/ha)</th><th>K (kg/ha)</th><th>Organic C (%)</th></tr>
<tr><td>${profile.soil.ph}</td><td>${profile.soil.nitrogen}</td><td>${profile.soil.phosphorus}</td><td>${profile.soil.potassium}</td><td>${profile.soil.organicCarbon}</td></tr></table>
<h2>3. Growth timeline</h2><table><tr><th>Crop</th><td>${esc(activeCrop.name)}</td><th>Sown</th><td>${fmtDate(sowingDate)}</td></tr>
<tr><th>Days at damage</th><td>${daysSinceSowing}</td><th>Expected harvest</th><td>${fmtDate(addDays(sowingDate, activeCrop.durationDays))}</td></tr>
<tr><th>Damage event</th><td>${esc(evLabel)}</td><th>Estimated loss</th><td>${loss}%</td></tr></table>
<h2>4. Fertilizer &amp; chemical applications</h2><table><tr><th>Date</th><th>Product</th><th>Type</th><th>Quantity</th></tr>
${applied.map((t) => `<tr><td>${fmtDate(t.done!.date)}</td><td>${esc(t.product)}</td><td>${esc(t.type)}</td><td>${+(t.done!.actualDose * profile.acres).toFixed(2)} ${t.unit}</td></tr>`).join('')}</table>
${diagnoses.length ? `<h2>5. Crop health scans</h2><table><tr><th>Date</th><th>Finding</th><th>Category</th></tr>${diagnoses.map((d) => `<tr><td>${fmtDate(d.date)}</td><td>${esc(d.name)}</td><td>${esc(d.verdict)}</td></tr>`).join('')}</table>` : ''}
<h2>${diagnoses.length ? 6 : 5}. Expense records</h2><table><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr>
${ledger.filter((e) => e.kind === 'expense').map((e) => `<tr><td>${fmtDate(e.date)}</td><td>${esc(e.category)}</td><td>${esc(e.label)}</td><td>${inr(e.amount)}</td></tr>`).join('')}
<tr><th colspan="3">Total cultivation expense</th><th>${inr(spent)}</th></tr></table>
<p class="note">This dossier is a self-maintained record of farming activity compiled from entries logged in the KhetMitra app. It is provided for the farmer&apos;s independent submission to the relevant authority or insurer and does not constitute an official claim, certification, or assessment.</p>
</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cultivation-dossier-${profile.farmerName.replace(/\s+/g, '-').toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
    setGenerated(true)
  }

  return (
    <div className="pb-8">
      <ScreenHeader title="Disaster relief" subtitle="Find aid & build your proof file" back="home" />
      <div className="flex flex-col gap-4 px-5">
        <fieldset>
          <legend className="pb-2 text-sm font-semibold">What happened?</legend>
          <div className="grid grid-cols-5 gap-2">
            {EVENTS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={event === id}
                onClick={() => setEvent(id)}
                className={cn('flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-semibold leading-tight', event === id ? 'border-primary bg-secondary text-primary' : 'bg-card')}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <Card>
          <label className="flex flex-col gap-2">
            <span className="flex items-center justify-between text-sm font-semibold">
              Estimated crop damage <span className="text-xl font-bold text-destructive">{loss}%</span>
            </span>
            <input type="range" min={5} max={100} step={5} value={loss} onChange={(e) => setLoss(Number(e.target.value))} className="accent-[var(--destructive)]" />
          </label>
          <p className="mt-1 text-xs text-muted-foreground">Most state relief requires damage above 33%.</p>
        </Card>

        <div>
          <SectionTitle>Applicable schemes ({eligible.length})</SectionTitle>
          <ul className="flex flex-col gap-2">
            {eligible.map((s) => (
              <li key={s.id}>
                <Card className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-snug">{s.name}</p>
                    <Pill tone={s.tag === 'Insurance' ? 'primary' : 'accent'}>{s.tag}</Pill>
                  </div>
                  <p className="mt-1 text-sm">{s.benefit}</p>
                  <p className="mt-1 text-xs font-semibold text-destructive">{s.deadline}</p>
                </Card>
              </li>
            ))}
          </ul>
        </div>

        <section className="rounded-3xl bg-foreground p-5 text-primary-foreground">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <FileCheck2 className="size-5" />
            </span>
            <div>
              <p className="font-serif text-lg font-semibold">Cultivation Activity Dossier</p>
              <p className="text-xs opacity-70">Verified record of your farming practices</p>
            </div>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <li className="rounded-xl bg-primary-foreground/10 p-3">Soil profile<span className="block text-xs opacity-70">pH {profile.soil.ph} · NPK</span></li>
            <li className="rounded-xl bg-primary-foreground/10 p-3">Growth timeline<span className="block text-xs opacity-70">Day {daysSinceSowing} of {activeCrop.durationDays}</span></li>
            <li className="rounded-xl bg-primary-foreground/10 p-3">Fertilizer log<span className="block text-xs opacity-70">{applied.length} applications</span></li>
            <li className="rounded-xl bg-primary-foreground/10 p-3">Expenses<span className="block text-xs opacity-70">{inr(spent)}</span></li>
          </ul>
          <button type="button" onClick={download} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-bold text-accent-foreground">
            <Download className="size-4" /> {generated ? 'Download again' : 'Generate & download'}
          </button>
          <p className="mt-3 flex gap-2 text-xs opacity-70">
            <Scale className="size-4 shrink-0" /> For your independent submission. KhetMitra does not file claims on your behalf.
          </p>
        </section>
      </div>
    </div>
  )
}
