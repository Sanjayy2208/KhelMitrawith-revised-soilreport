'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ArrowRight, Check, FileUp, Mountain, MapPin, Sprout, Waves, Warehouse } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CROPS, type FarmProfile, type Terrain } from '@/lib/farm-data'
import { useFarm } from '../store'

const STEPS = ['Welcome', 'Land', 'Soil', 'History'] as const

const inputCls =
  'w-full rounded-xl border bg-card px-3.5 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function Onboarding() {
  const { profile, setProfile, setOnboarded } = useFarm()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<FarmProfile>(profile)
  const [reportName, setReportName] = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const [reportStatus, setReportStatus] = useState<'valid' | 'invalid' | 'incomplete' | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsMessage, setGpsMessage] = useState('')
  const [gpsError, setGpsError] = useState('')
  const [gpsCoordinates, setGpsCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)

  const update = <K extends keyof FarmProfile>(k: K, v: FarmProfile[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const updateSoil = (k: keyof FarmProfile['soil'], v: number) => setDraft((d) => ({ ...d, soil: { ...d.soil, [k]: v } }))

  const analyseSoilReport = async (file?: File) => {
    if (!file) return
    setReportName(file.name)
    setReportMessage('')
    setReportStatus(null)
    setReportLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/soil-report', { method: 'POST', body: form })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not analyse this report.')
      setReportStatus(result.status)
      setReportMessage(result.message || '')
      if (result.status !== 'invalid' && result.values) {
        const fields: (keyof FarmProfile['soil'])[] = ['ph', 'organicCarbon', 'nitrogen', 'phosphorus', 'potassium']
        setDraft((current) => ({
          ...current,
          soil: Object.fromEntries(fields.map((key) => [key, typeof result.values[key] === 'number' ? result.values[key] : current.soil[key]])) as FarmProfile['soil'],
        }))
      }
    } catch (error) {
      setReportStatus('invalid')
      setReportMessage(error instanceof Error ? error.message : 'Could not analyse this report.')
    } finally {
      setReportLoading(false)
    }
  }

  const detectFarmLocation = () => {
    setGpsError('')
    setGpsMessage('')
    if (!navigator.geolocation) {
      setGpsError('GPS is not supported by this browser. Please enter your village and district manually.')
      return
    }

    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const coordinates = { latitude: coords.latitude, longitude: coords.longitude }
        setGpsCoordinates(coordinates)
        try {
          const response = await fetch(`/api/gps/reverse?lat=${coordinates.latitude}&lon=${coordinates.longitude}`)
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Could not identify your village and district.')
          if (result.village) update('village', result.village)
          if (result.district) update('district', result.district)
          if (!result.village && !result.district) {
            setGpsMessage('GPS coordinates found, but village and district were not available. Please enter them manually.')
          } else {
            setGpsMessage('Location detected. You can edit the village and district if needed.')
          }
        } catch (error) {
          setGpsError(error instanceof Error ? error.message : 'Location lookup failed. Please enter the details manually.')
        } finally {
          setGpsLoading(false)
        }
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow location access in your browser settings and try again.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'Your location is unavailable. Turn on device location and try again.'
            : 'GPS request timed out. Please try again or enter the details manually.'
        setGpsError(message)
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1)
    else {
      setProfile(draft)
      setOnboarded(true)
    }
  }

  if (step === 0) {
    return (
      <div className="flex min-h-full flex-col">
        <div className="relative h-[28rem] overflow-hidden rounded-b-[2.5rem]">
          <Image src="/images/field-hero.png" alt="Terraced farm fields with a polyhouse at sunset" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sprout className="size-3.5" /> KhetMitra
            </span>
            <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-balance">Grow smarter from soil to sale.</h1>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-between gap-6 p-6">
          <ul className="flex flex-col gap-3 text-sm">
            {[
              'Crop advice from your soil, terrain & season',
              '2-year market trends & profit forecasts',
              'Fertilizer reminders, leaf scans & ledger',
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-primary">
                  <Check className="size-3.5" />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <button type="button" onClick={next} className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">
            Set up my farm <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col p-5">
      <div className="flex items-center gap-2" aria-label={`Step ${step} of ${STEPS.length - 1}`}>
        {STEPS.slice(1).map((s, i) => (
          <div key={s} className={cn('h-1.5 flex-1 rounded-full', i < step ? 'bg-primary' : 'bg-muted')} />
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold text-muted-foreground">Step {step} of {STEPS.length - 1}</p>

      {step === 1 && (
        <section className="mt-1 flex flex-col gap-4">
          <h2 className="font-serif text-3xl font-semibold">Your land</h2>
          <Field label="Farmer name">
            <input className={inputCls} value={draft.farmerName} onChange={(e) => update('farmerName', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Village">
              <input className={inputCls} value={draft.village} onChange={(e) => update('village', e.target.value)} />
            </Field>
            <Field label="District">
              <input className={inputCls} value={draft.district} onChange={(e) => update('district', e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <button
              type="button"
              onClick={detectFarmLocation}
              disabled={gpsLoading}
              className="flex items-center gap-2 self-start rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground disabled:cursor-wait disabled:opacity-60"
            >
              <MapPin className="size-4" /> {gpsLoading ? 'Detecting location…' : 'Use GPS location'}
            </button>
            {gpsMessage && <p role="status" className="text-xs text-green-700">{gpsMessage}</p>}
            {gpsError && <p role="alert" className="text-xs text-destructive">{gpsError}</p>}
            {gpsCoordinates && <p className="text-[11px] text-muted-foreground">GPS: {gpsCoordinates.latitude.toFixed(5)}, {gpsCoordinates.longitude.toFixed(5)}</p>}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-1.5 text-sm font-semibold">Terrain</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { v: 'plains', label: 'Plains', icon: Waves },
                  { v: 'hilly', label: 'Hilly', icon: Mountain },
                  { v: 'plateau', label: 'Plateau', icon: Warehouse },
                ] as { v: Terrain; label: string; icon: typeof Waves }[]
              ).map(({ v, label, icon: Icon }) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={draft.terrain === v}
                  onClick={() => update('terrain', v)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-semibold',
                    draft.terrain === v ? 'border-primary bg-secondary text-primary' : 'bg-card',
                  )}
                >
                  <Icon className="size-5" /> {label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Elevation (m)">
              <input type="number" inputMode="numeric" className={inputCls} value={draft.elevation} onChange={(e) => update('elevation', Number(e.target.value))} />
            </Field>
            <Field label="Total acreage">
              <input type="number" step="0.1" inputMode="decimal" className={inputCls} value={draft.acres} onChange={(e) => update('acres', Number(e.target.value))} />
            </Field>
          </div>
          <label className="flex items-center justify-between rounded-xl border bg-card p-3.5">
            <span className="text-sm font-semibold">I have a polyhouse</span>
            <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={draft.hasPolyhouse} onChange={(e) => update('hasPolyhouse', e.target.checked)} />
          </label>
        </section>
      )}

      {step === 2 && (
        <section className="mt-1 flex flex-col gap-4">
          <h2 className="font-serif text-3xl font-semibold">Soil test report</h2>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed bg-card p-6 text-center">
            <FileUp className="size-7 text-primary" />
            <span className="text-sm font-semibold">{reportLoading ? 'Analysing soil report…' : reportName ?? 'Upload Soil Health Card'}</span>
            <span className="text-xs text-muted-foreground">PDF or photo — we&apos;ll read the values</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={reportLoading} onChange={(e) => { void analyseSoilReport(e.target.files?.[0]); e.currentTarget.value = '' }} />
          </label>
          {reportLoading && <p role="status" className="text-center text-xs text-muted-foreground">Gemini AI is reading your soil health card. Please wait…</p>}
          {!reportLoading && reportMessage && <p role={reportStatus === 'invalid' ? 'alert' : 'status'} className={cn('text-center text-xs', reportStatus === 'valid' ? 'text-green-700' : reportStatus === 'incomplete' ? 'text-amber-700' : 'text-destructive')}>{reportMessage}</p>}
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">or enter manually</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="pH" hint="Ideal 6.0–7.5">
              <input type="number" step="0.1" className={inputCls} value={draft.soil.ph} onChange={(e) => updateSoil('ph', Number(e.target.value))} />
            </Field>
            <Field label="Organic C (%)">
              <input type="number" step="0.01" className={inputCls} value={draft.soil.organicCarbon} onChange={(e) => updateSoil('organicCarbon', Number(e.target.value))} />
            </Field>
            <Field label="Nitrogen (kg/ha)">
              <input type="number" className={inputCls} value={draft.soil.nitrogen} onChange={(e) => updateSoil('nitrogen', Number(e.target.value))} />
            </Field>
            <Field label="Phosphorus (kg/ha)">
              <input type="number" className={inputCls} value={draft.soil.phosphorus} onChange={(e) => updateSoil('phosphorus', Number(e.target.value))} />
            </Field>
            <Field label="Potassium (kg/ha)">
              <input type="number" className={inputCls} value={draft.soil.potassium} onChange={(e) => updateSoil('potassium', Number(e.target.value))} />
            </Field>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="mt-1 flex flex-col gap-4">
          <h2 className="font-serif text-3xl font-semibold">Previous crops</h2>
          <p className="text-sm text-muted-foreground">Select the last crops grown on this field, most recent first. This helps us avoid rotation risks.</p>
          <div className="flex flex-wrap gap-2">
            {CROPS.map((c) => {
              const idx = draft.previousCrops.indexOf(c.name)
              const selected = idx >= 0
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    update(
                      'previousCrops',
                      selected ? draft.previousCrops.filter((n) => n !== c.name) : [...draft.previousCrops, c.name].slice(0, 3),
                    )
                  }
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold',
                    selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
                  )}
                >
                  {selected && <span className="flex size-5 items-center justify-center rounded-full bg-primary-foreground text-xs text-primary">{idx + 1}</span>}
                  {c.name}
                </button>
              )
            })}
          </div>
        </section>
      )}

      <div className="mt-auto flex gap-3 pt-6">
        <button type="button" onClick={() => setStep(step - 1)} className="rounded-2xl border bg-card px-5 py-4 font-semibold">
          Back
        </button>
        <button type="button" onClick={next} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">
          {step === STEPS.length - 1 ? 'Finish setup' : 'Continue'} <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
