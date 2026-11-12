'use client'

import { useRef, useState } from 'react'
import { AlertTriangle, Bug, Camera, FlaskConical, ImagePlus, Leaf, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addDays, fmtDate, type FertilizerTask } from '@/lib/farm-data'
import { useFarm, type Diagnosis } from '../store'
import { Card, Meter, Pill, ScreenHeader, SectionTitle } from '../ui'
import { ImageEditor, type EditorResult } from '../image-editor'

const SYMPTOMS = ['Brown spots with rings', 'Scorched leaf edges', 'Yellowing', 'Holes / chewed', 'White powder', 'Curling', 'Wilting'] as const

type Phase = 'capture' | 'edit' | 'details' | 'analyzing' | 'result'

type Report = {
  scores: { biological: number; pest: number; chemical: number }
  verdict: Diagnosis['verdict']
  name: string
  flagged: FertilizerTask[]
  remedy: string[]
  avoid: string[]
}

function analyze(symptoms: string[], recent: FertilizerTask[], marked: number): Report {
  const flagged = recent.filter((t) => t.done && t.done.actualDose > t.dosePerAcre * 1.15)
  let bio = 35
  let pest = 15
  let chem = 15
  if (symptoms.includes('Brown spots with rings')) bio += 30
  if (symptoms.includes('White powder')) bio += 25
  if (symptoms.includes('Yellowing')) (bio += 8), (chem += 10)
  if (symptoms.includes('Holes / chewed')) pest += 45
  if (symptoms.includes('Curling')) pest += 18
  if (symptoms.includes('Scorched leaf edges')) chem += 30
  if (symptoms.includes('Wilting')) bio += 10
  if (flagged.length) chem += 25
  if (marked > 25) chem += 8
  const total = bio + pest + chem
  const scores = {
    biological: Math.round((bio / total) * 100),
    pest: Math.round((pest / total) * 100),
    chemical: Math.round((chem / total) * 100),
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]

  if (top === 'chemical') {
    return {
      scores,
      verdict: 'Chemical burn / toxicity',
      name: 'Nitrogen (urea) leaf scorch',
      flagged,
      remedy: [
        'Stop all nitrogen applications for the next 10–12 days.',
        'Give a light, deep irrigation to leach excess salts from the root zone.',
        'Remove only the severely scorched leaves; new growth will recover.',
        'Spray seaweed extract (2 ml/L) once to aid recovery.',
      ],
      avoid: ['Do not apply fungicide now — symptoms are not fungal.', 'Skip the next urea dose; it will be rescheduled automatically.'],
    }
  }
  if (top === 'pest') {
    return {
      scores,
      verdict: 'Pest attack',
      name: 'Leaf miner / caterpillar feeding',
      flagged,
      remedy: [
        'Install yellow sticky traps at 10 per acre.',
        'Spray Neem oil 1500 ppm (5 ml/L) in the evening.',
        'If damage >10% of leaves, use Spinosad 45 SC (0.3 ml/L).',
      ],
      avoid: ['Avoid broad-spectrum insecticides that harm pollinators.', 'Keep 5 days gap from the zinc foliar spray.'],
    }
  }
  return {
    scores,
    verdict: 'Biological disease',
    name: 'Early blight (Alternaria solani)',
    flagged,
    remedy: [
      'Remove and destroy infected lower leaves.',
      'Spray Mancozeb 75% WP at 2.5 g/L, repeat after 10 days.',
      'Switch to drip irrigation and avoid wetting foliage.',
    ],
    avoid: flagged.length
      ? ['Recent urea overdose may worsen spread — hold nitrogen for 7 days.']
      : ['Do not mix copper fungicide with the zinc spray due today.'],
  }
}

export function ScanScreen() {
  const { tasks, daysSinceSowing, sowingDate, profile, addDiagnosis, diagnoses } = useFarm()
  const [phase, setPhase] = useState<Phase>('capture')
  const [source, setSource] = useState<string | null>(null)
  const [edited, setEdited] = useState<EditorResult | null>(null)
  const [symptoms, setSymptoms] = useState<string[]>(['Brown spots with rings', 'Scorched leaf edges'])
  const [step, setStep] = useState(0)
  const [report, setReport] = useState<Report | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const recent = tasks.filter((t) => t.done && daysSinceSowing - t.day <= 10)

  const onFile = (file?: File) => {
    if (!file) return
    setSource(URL.createObjectURL(file))
    setPhase('edit')
  }

  const runAnalysis = () => {
    setPhase('analyzing')
    setStep(0)
    const steps = [700, 1400, 2100, 2800]
    steps.forEach((ms, i) => setTimeout(() => setStep(i + 1), ms))
    setTimeout(() => {
      const r = analyze(symptoms, recent, edited?.markedPercent ?? 0)
      setReport(r)
      addDiagnosis({
        id: `d${Date.now()}`,
        date: new Date().toISOString(),
        image: edited?.dataUrl ?? '',
        verdict: r.verdict,
        name: r.name,
        confidence: Math.max(r.scores.biological, r.scores.pest, r.scores.chemical),
      })
      setPhase('result')
    }, 3200)
  }

  if (phase === 'edit' && source) {
    return (
      <ImageEditor
        src={source}
        onCancel={() => setPhase('capture')}
        onDone={(r) => {
          setEdited(r)
          setPhase('details')
        }}
      />
    )
  }

  return (
    <div className="pb-8">
      <ScreenHeader title="Leaf doctor" subtitle="Disease, pest or chemical burn?" />
      <div className="flex flex-col gap-4 px-5">
        {phase === 'capture' && (
          <>
            <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-primary/40 bg-secondary/40 px-6 py-10 text-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Leaf className="size-8" />
              </span>
              <div>
                <p className="font-serif text-xl font-semibold">Photograph one affected leaf</p>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">Use daylight, fill the frame, and include both healthy and damaged parts.</p>
              </div>
              <div className="grid w-full grid-cols-2 gap-3">
                <button type="button" onClick={() => cameraRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground">
                  <Camera className="size-4" /> Camera
                </button>
                <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border bg-card py-3 font-semibold">
                  <ImagePlus className="size-4" /> Gallery
                </button>
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => {
                  setSource('/images/sample-leaf.png')
                  setPhase('edit')
                }}
                className="text-sm font-semibold text-primary underline underline-offset-4"
              >
                Try with a sample leaf
              </button>
            </div>

            <Card>
              <div className="flex items-center gap-2">
                <FlaskConical className="size-4 text-primary" />
                <p className="text-sm font-semibold">Chemical history linked automatically</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {recent.length} applications in the last 10 days will be cross-checked for fertilizer toxicity.
              </p>
            </Card>

            {diagnoses.length > 0 && (
              <div>
                <SectionTitle>Past scans</SectionTitle>
                <ul className="flex flex-col gap-2">
                  {diagnoses.map((d) => (
                    <li key={d.id}>
                      <Card className="flex items-center gap-3 p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={d.image || '/placeholder.svg'} alt="Scanned leaf" className="size-12 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(d.date)} · {d.verdict}</p>
                        </div>
                        <Pill>{d.confidence}%</Pill>
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {phase === 'details' && edited && (
          <>
            <div className="relative overflow-hidden rounded-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={edited.dataUrl || '/placeholder.svg'} alt="Edited leaf photo" className="aspect-square w-full object-cover" />
              <button type="button" onClick={() => setPhase('edit')} className="absolute right-3 top-3 rounded-full bg-card/90 px-3 py-1.5 text-sm font-semibold backdrop-blur">
                Edit again
              </button>
              {edited.markedPercent > 0 && (
                <span className="absolute bottom-3 left-3 rounded-full bg-card/90 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  {edited.markedPercent}% area marked
                </span>
              )}
            </div>
            <fieldset>
              <legend className="pb-2 text-sm font-semibold">What do you see? (optional)</legend>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map((s) => {
                  const on = symptoms.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSymptoms(on ? symptoms.filter((x) => x !== s) : [...symptoms, s])}
                      className={cn('rounded-full border px-3.5 py-2 text-sm font-semibold', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <button type="button" onClick={runAnalysis} className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">
              <Sparkles className="size-4" /> Analyze leaf
            </button>
          </>
        )}

        {phase === 'analyzing' && edited && (
          <div className="flex flex-col gap-5">
            <div className="relative overflow-hidden rounded-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={edited.dataUrl || '/placeholder.svg'} alt="Leaf being analyzed" className="aspect-square w-full object-cover" />
              <div className="absolute inset-x-0 top-0 h-1/3 animate-pulse bg-gradient-to-b from-accent/50 to-transparent" />
            </div>
            <ul className="flex flex-col gap-3" aria-live="polite">
              {['Detecting lesions & discoloration', 'Classifying disease vs pest damage', `Cross-checking ${recent.length} chemical logs`, 'Building safe remedy plan'].map((label, i) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  {step > i ? (
                    <ShieldCheck className="size-5 text-success" />
                  ) : step === i ? (
                    <Loader2 className="size-5 animate-spin text-primary" />
                  ) : (
                    <span className="size-5 rounded-full border-2" />
                  )}
                  <span className={step >= i ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {phase === 'result' && report && edited && (
          <>
            <Card className={cn('flex gap-4', report.verdict === 'Chemical burn / toxicity' ? 'border-warning bg-warning/10' : report.verdict === 'Pest attack' ? 'border-destructive/40 bg-destructive/5' : 'border-primary/40 bg-secondary/50')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={edited.dataUrl || '/placeholder.svg'} alt="Diagnosed leaf" className="size-20 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0">
                <Pill tone={report.verdict === 'Chemical burn / toxicity' ? 'accent' : report.verdict === 'Pest attack' ? 'danger' : 'primary'}>{report.verdict}</Pill>
                <p className="mt-1.5 font-serif text-xl font-semibold leading-tight">{report.name}</p>
                <p className="text-sm text-muted-foreground">{Math.max(report.scores.biological, report.scores.pest, report.scores.chemical)}% confidence</p>
              </div>
            </Card>

            <Card>
              <p className="pb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cause probability</p>
              <div className="flex flex-col gap-3">
                {(
                  [
                    { k: 'biological', l: 'Biological disease', icon: Leaf, tone: 'primary' },
                    { k: 'pest', l: 'Pest attack', icon: Bug, tone: 'danger' },
                    { k: 'chemical', l: 'Fertilizer toxicity', icon: FlaskConical, tone: 'accent' },
                  ] as const
                ).map(({ k, l, icon: Icon, tone }) => (
                  <div key={k}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold"><Icon className="size-4" /> {l}</span>
                      <span className="tabular-nums">{report.scores[k]}%</span>
                    </div>
                    <Meter value={report.scores[k]} tone={tone} />
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <p className="pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Chemical history check</p>
              <ul className="flex flex-col gap-2">
                {recent.map((t) => {
                  const over = t.done && t.done.actualDose > t.dosePerAcre * 1.15
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        <span className="font-semibold">{t.product}</span>
                        <span className="block text-xs text-muted-foreground">{fmtDate(addDays(sowingDate, t.day))} · {+(t.done!.actualDose * profile.acres).toFixed(1)} {t.unit} applied</span>
                      </span>
                      {over ? <Pill tone="danger"><AlertTriangle className="size-3" /> {Math.round((t.done!.actualDose / t.dosePerAcre - 1) * 100)}% over</Pill> : <Pill tone="success">OK</Pill>}
                    </li>
                  )
                })}
                {!recent.length && <li className="text-sm text-muted-foreground">No applications in the last 10 days.</li>}
              </ul>
            </Card>

            <Card>
              <p className="pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Safe remedy plan</p>
              <ol className="flex flex-col gap-2.5">
                {report.remedy.map((r, i) => (
                  <li key={r} className="flex gap-3 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                    <span className="text-pretty">{r}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 rounded-xl bg-destructive/8 p-3">
                {report.avoid.map((a) => (
                  <p key={a} className="flex gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {a}</p>
                ))}
              </div>
            </Card>

            <button
              type="button"
              onClick={() => {
                setPhase('capture')
                setEdited(null)
                setReport(null)
              }}
              className="rounded-2xl border bg-card py-4 font-semibold"
            >
              Scan another leaf
            </button>
          </>
        )}
      </div>
    </div>
  )
}
