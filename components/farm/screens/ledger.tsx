'use client'

import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtDate, inr, type ExpenseCategory } from '@/lib/farm-data'
import { useFarm } from '../store'
import { Card, ScreenHeader, SectionTitle, Segmented } from '../ui'

const CATEGORIES: ExpenseCategory[] = ['Seeds', 'Fertilizer', 'Pesticide', 'Labour', 'Irrigation', 'Machinery', 'Other']

export function LedgerScreen() {
  const { ledger, addEntry, removeEntry, activeCrop } = useFarm()
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [category, setCategory] = useState<ExpenseCategory>('Labour')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [qty, setQty] = useState('')
  const [rate, setRate] = useState('')

  const expenses = ledger.filter((e) => e.kind === 'expense')
  const income = ledger.filter((e) => e.kind === 'income')
  const spent = expenses.reduce((a, e) => a + e.amount, 0)
  const earned = income.reduce((a, e) => a + e.amount, 0)
  const net = earned - spent
  const byCat = CATEGORIES.map((c) => ({ c, v: expenses.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = kind === 'income' ? Number(qty) * Number(rate) : Number(amount)
    if (!value || value <= 0) return
    addEntry({
      kind,
      category: kind === 'income' ? 'Sale' : category,
      label: kind === 'income' ? `Sold ${qty} q ${activeCrop.name} @ ${inr(Number(rate))}/q` : label || category,
      amount: value,
      date: new Date().toISOString(),
    })
    setAdding(false)
    setLabel('')
    setAmount('')
    setQty('')
    setRate('')
  }

  return (
    <div className="pb-8">
      <ScreenHeader
        title="Profit & loss"
        subtitle={`${activeCrop.name} season ledger`}
        action={
          <button type="button" onClick={() => setAdding(true)} className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label="Add entry">
            <Plus className="size-5" />
          </button>
        }
      />
      <div className="flex flex-col gap-4 px-5">
        <section className={cn('rounded-3xl p-5', earned === 0 ? 'bg-foreground text-primary-foreground' : net >= 0 ? 'bg-success text-primary-foreground' : 'bg-destructive text-primary-foreground')}>
          <p className="text-sm opacity-80">{earned === 0 ? 'Total invested so far' : net >= 0 ? 'Net profit' : 'Net loss'}</p>
          <p className="mt-1 font-serif text-4xl font-semibold">{inr(earned === 0 ? spent : Math.abs(net))}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-primary-foreground/10 p-3">
              <p className="flex items-center gap-1 opacity-80"><ArrowUpRight className="size-4" /> Expenses</p>
              <p className="text-lg font-bold">{inr(spent)}</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 p-3">
              <p className="flex items-center gap-1 opacity-80"><ArrowDownLeft className="size-4" /> Sales</p>
              <p className="text-lg font-bold">{inr(earned)}</p>
            </div>
          </div>
          {earned === 0 && <p className="mt-3 text-xs opacity-80">Record your produce sale to see final profit or loss.</p>}
        </section>

        <Card>
          <p className="pb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Where money went</p>
          <div className="flex h-3 overflow-hidden rounded-full">
            {byCat.map((x, i) => (
              <div key={x.c} style={{ width: `${(x.v / spent) * 100}%`, opacity: 1 - i * 0.13 }} className="bg-primary first:rounded-l-full last:rounded-r-full" />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {byCat.map((x, i) => (
              <li key={x.c} className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-primary" style={{ opacity: 1 - i * 0.13 }} />
                <span className="flex-1 text-muted-foreground">{x.c}</span>
                <span className="font-semibold tabular-nums">{Math.round((x.v / spent) * 100)}%</span>
              </li>
            ))}
          </ul>
        </Card>

        <div>
          <SectionTitle>Transactions</SectionTitle>
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {ledger
              .slice()
              .sort((a, b) => +new Date(b.date) - +new Date(a.date))
              .map((e) => (
                <li key={e.id} className="flex items-center gap-3 p-3.5">
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', e.kind === 'income' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
                    {e.kind === 'income' ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.label}</p>
                    <p className="text-xs text-muted-foreground">{e.category} · {fmtDate(e.date)}</p>
                  </div>
                  <span className={cn('text-sm font-bold tabular-nums', e.kind === 'income' && 'text-success')}>
                    {e.kind === 'income' ? '+' : '−'}{inr(e.amount)}
                  </span>
                  <button type="button" onClick={() => removeEntry(e.id)} className="text-muted-foreground" aria-label={`Delete ${e.label}`}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {adding && (
        <div className="absolute inset-0 z-20 flex items-end bg-foreground/40" role="dialog" aria-modal="true" aria-labelledby="add-entry-title">
          <form onSubmit={submit} className="flex w-full flex-col gap-4 rounded-t-3xl bg-card p-5 pb-8 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <h2 id="add-entry-title" className="font-serif text-xl font-semibold">New entry</h2>
              <button type="button" onClick={() => setAdding(false)} aria-label="Close" className="flex size-9 items-center justify-center rounded-full bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <Segmented label="Entry type" value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Produce sale' }]} />
            {kind === 'expense' ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={cn('rounded-full border px-3 py-1.5 text-sm font-semibold', category === c ? 'border-primary bg-primary text-primary-foreground' : '')}>
                      {c}
                    </button>
                  ))}
                </div>
                <input placeholder="Description (e.g. Weeding labour)" value={label} onChange={(e) => setLabel(e.target.value)} className="rounded-xl border bg-background px-3.5 py-3" />
                <input placeholder="Amount ₹" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-xl border bg-background px-3.5 py-3" required />
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Quantity (q)" type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} className="rounded-xl border bg-background px-3.5 py-3" required />
                <input placeholder="Rate ₹/q" type="number" inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} className="rounded-xl border bg-background px-3.5 py-3" required />
                {qty && rate && <p className="col-span-2 text-sm">Total: <strong>{inr(Number(qty) * Number(rate))}</strong></p>}
              </div>
            )}
            <button type="submit" className="rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground">Save entry</button>
          </form>
        </div>
      )}
    </div>
  )
}
