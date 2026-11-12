'use client'

import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useFarm, type Screen } from './store'

export function ScreenHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string
  subtitle?: string
  back?: Screen
  action?: ReactNode
}) {
  const { go } = useFarm()
  return (
    <header className="flex items-center gap-3 px-5 pt-4 pb-3">
      {back && (
        <button
          type="button"
          onClick={() => go(back)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card border"
          aria-label="Go back"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-serif text-2xl font-semibold leading-tight text-balance">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border bg-card p-4', className)}>{children}</div>
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 pb-2 pt-1">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{children}</h2>
      {action}
    </div>
  )
}

export function Pill({
  children,
  tone = 'muted',
  className,
}: {
  children: ReactNode
  tone?: 'muted' | 'primary' | 'accent' | 'danger' | 'success'
  className?: string
}) {
  const tones = {
    muted: 'bg-muted text-muted-foreground',
    primary: 'bg-secondary text-secondary-foreground',
    accent: 'bg-accent/30 text-accent-foreground',
    danger: 'bg-destructive/12 text-destructive',
    success: 'bg-success/15 text-success',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
            value === o.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Meter({ value, tone = 'primary' }: { value: number; tone?: 'primary' | 'accent' | 'danger' }) {
  const colors = { primary: 'bg-primary', accent: 'bg-warning', danger: 'bg-destructive' }
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full rounded-full transition-all', colors[tone])} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  )
}
