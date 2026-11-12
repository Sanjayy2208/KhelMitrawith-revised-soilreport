'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Loader2, Mic, MicOff, Send, Square, Volume2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  HELP_TEXT,
  SPEECH_LOCALE,
  SUGGESTIONS,
  UI_TEXT,
  harvestLine,
  parseIntent,
  screenSummary,
  weatherLine,
  type VoiceLang,
  type VoiceSnapshot,
} from '@/lib/voice'
import { useFarm } from './store'

type Message = { id: number; role: 'user' | 'assistant'; text: string }

type RecognitionResultEvent = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }
type RecognitionInstance = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((e: RecognitionResultEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type RecognitionCtor = new () => RecognitionInstance

function getRecognition(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: VoiceLang) {
  if (lang === 'ta') return voices.find((v) => v.lang.toLowerCase().startsWith('ta'))
  return (
    voices.find((v) => v.lang === 'en-IN') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en'))
  )
}

export function VoiceAssistant() {
  const farm = useFarm()
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState<VoiceLang>('en')
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [interim, setInterim] = useState('')
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const recognitionRef = useRef<RecognitionInstance | null>(null)
  const lastAnswerRef = useRef('')
  const logRef = useRef<HTMLDivElement>(null)
  const t = UI_TEXT[lang]

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load)
      window.speechSynthesis.cancel()
      recognitionRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, interim, thinking])

  const snapshot: VoiceSnapshot = {
    farmerName: farm.profile.farmerName,
    activeCrop: farm.activeCrop,
    daysSinceSowing: farm.daysSinceSowing,
    sowingDate: farm.sowingDate,
    tasks: farm.tasks,
    ledger: farm.ledger,
    acres: farm.profile.acres,
    soilPh: farm.profile.soil.ph,
  }

  const hasTamilVoice = voices.length === 0 || Boolean(pickVoice(voices, 'ta'))

  function stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  function speak(text: string, speechLang: VoiceLang = lang) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    synth.cancel()
    const voice = pickVoice(synth.getVoices(), speechLang)
    // Chrome cuts off long utterances, so queue sentence by sentence.
    const chunks = text.match(/[^.!?।]+[.!?।]?/g)?.map((c) => c.trim()).filter(Boolean) ?? [text]
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk)
      u.lang = SPEECH_LOCALE[speechLang]
      if (voice) u.voice = voice
      u.rate = speechLang === 'ta' ? 0.9 : 0.95
      if (i === 0) u.onstart = () => setSpeaking(true)
      if (i === chunks.length - 1) {
        u.onend = () => setSpeaking(false)
        u.onerror = () => setSpeaking(false)
      }
      synth.speak(u)
    })
  }

  function reply(text: string) {
    lastAnswerRef.current = text
    setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', text }])
    speak(text)
  }

  async function askAI(question: string) {
    setThinking(true)
    try {
      const context = [
        `Name ${snapshot.farmerName}`,
        `Location ${farm.profile.village}, ${farm.profile.district}`,
        `${snapshot.acres} acres, ${farm.profile.terrain} terrain`,
        `Current crop ${snapshot.activeCrop.name}, day ${snapshot.daysSinceSowing} of ${snapshot.activeCrop.durationDays}`,
        `Soil pH ${snapshot.soilPh}, N ${farm.profile.soil.nitrogen}, P ${farm.profile.soil.phosphorus}, K ${farm.profile.soil.potassium}`,
        `Current screen ${farm.screen}`,
      ].join('; ')
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, lang, context }),
      })
      const data = (await res.json()) as { answer?: string }
      reply(res.ok && data.answer ? data.answer : t.error)
    } catch {
      reply(t.error)
    } finally {
      setThinking(false)
    }
  }

  function handle(input: string) {
    const text = input.trim()
    if (!text) return
    setMessages((m) => [...m, { id: Date.now(), role: 'user', text }])
    const intent = parseIntent(text)

    switch (intent.kind) {
      case 'stop':
        stopSpeaking()
        setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', text: t.stopped }])
        return
      case 'repeat':
        if (lastAnswerRef.current) speak(lastAnswerRef.current)
        return
      case 'help':
        return reply(HELP_TEXT[lang])
      case 'weather':
        return reply(weatherLine(lang))
      case 'harvest':
        farm.go('home')
        return reply(harvestLine(snapshot, lang))
      case 'navigate':
        farm.go(intent.target)
        reply(screenSummary(intent.target, snapshot, lang))
        setOpen(false)
        return
      default:
        void askAI(text)
    }
  }

  function startListening() {
    const Recognition = getRecognition()
    if (!Recognition) {
      setNotice(t.noMic)
      return
    }
    stopSpeaking()
    recognitionRef.current?.abort()
    const rec = new Recognition()
    rec.lang = SPEECH_LOCALE[lang]
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1
    let finalText = ''
    rec.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else live += r[0].transcript
      }
      setInterim(finalText + live)
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setNotice(t.micDenied)
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
      recognitionRef.current = null
      if (finalText.trim()) handle(finalText)
    }
    recognitionRef.current = rec
    setNotice(null)
    setListening(true)
    try {
      rec.start()
    } catch {
      setListening(false)
    }
  }

  function toggleMic() {
    if (listening) recognitionRef.current?.stop()
    else startListening()
  }

  function openPanel() {
    setOpen(true)
    if (messages.length === 0) {
      setMessages([{ id: Date.now(), role: 'assistant', text: t.greeting }])
    }
  }

  function closePanel() {
    recognitionRef.current?.abort()
    setOpen(false)
  }

  function switchLang(next: VoiceLang) {
    if (next === lang) return
    recognitionRef.current?.abort()
    stopSpeaking()
    setLang(next)
    setNotice(null)
    setMessages((m) => [...m, { id: Date.now(), role: 'assistant', text: UI_TEXT[next].greeting }])
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    handle(draft)
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
  }

  return (
    <>
      {!open && (
        <div className="pointer-events-none absolute bottom-24 right-4 z-30 flex flex-col items-end gap-2">
          {speaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background shadow-lg"
            >
              <Square className="size-3 fill-current" aria-hidden="true" />
              {lang === 'ta' ? 'நிறுத்து' : 'Stop'}
            </button>
          )}
          <button
            type="button"
            onClick={openPanel}
            aria-label={t.title}
            className="pointer-events-auto relative flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xl ring-4 ring-background transition-transform active:scale-95"
          >
            {speaking && <span className="absolute inset-0 animate-ping rounded-full bg-accent/50" aria-hidden="true" />}
            {speaking ? <Volume2 className="relative size-6" /> : <Mic className="relative size-6" />}
          </button>
        </div>
      )}

      {open && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Close voice assistant"
            onClick={closePanel}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px] animate-in fade-in"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={t.title}
            className="relative flex max-h-[85%] flex-col rounded-t-3xl bg-card shadow-2xl animate-in slide-in-from-bottom duration-300"
          >
            <header className="flex items-center justify-between gap-3 border-b px-5 pb-3 pt-4">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary">
                  <Mic className="size-4" aria-hidden="true" />
                </span>
                <h2 className="font-serif text-lg font-semibold">{t.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <div role="radiogroup" aria-label="Language" className="flex rounded-full bg-secondary p-1 text-xs font-semibold">
                  {(['en', 'ta'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={lang === l}
                      onClick={() => switchLang(l)}
                      className={cn(
                        'rounded-full px-3 py-1 transition-colors',
                        lang === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {l === 'en' ? 'English' : 'தமிழ்'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Close"
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                >
                  <X className="size-4" />
                </button>
              </div>
            </header>

            <div ref={logRef} className="no-scrollbar flex min-h-40 flex-1 flex-col gap-2 overflow-y-auto px-5 py-4" aria-live="polite">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'self-end rounded-br-md bg-primary text-primary-foreground'
                      : 'self-start rounded-bl-md bg-secondary text-secondary-foreground',
                  )}
                >
                  {m.text}
                  {m.role === 'assistant' && (
                    <button
                      type="button"
                      onClick={() => speak(m.text)}
                      aria-label="Read aloud"
                      className="ml-1.5 inline-flex translate-y-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <Volume2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {listening && (
                <div className="max-w-[85%] self-end rounded-2xl rounded-br-md border border-dashed border-primary px-3.5 py-2.5 text-sm text-muted-foreground">
                  {interim || t.listening}
                </div>
              )}
              {thinking && (
                <div className="flex items-center gap-2 self-start text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t.thinking}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
              {notice && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{notice}</p>}
              {lang === 'ta' && !hasTamilVoice && (
                <p className="rounded-xl bg-accent/15 px-3 py-2 text-xs text-foreground">{t.noVoice}</p>
              )}

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.try}</p>
                <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
                  {SUGGESTIONS[lang].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handle(s)}
                      className="shrink-0 rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-label={listening ? 'Stop listening' : t.tapToSpeak}
                  aria-pressed={listening}
                  className={cn(
                    'relative flex size-14 shrink-0 items-center justify-center rounded-full shadow-md transition-colors',
                    listening ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground',
                  )}
                >
                  {listening && <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" aria-hidden="true" />}
                  {listening ? <MicOff className="relative size-6" /> : <Mic className="relative size-6" />}
                </button>
                <form onSubmit={onSubmit} className="flex flex-1 items-center gap-2 rounded-full border bg-background py-1 pl-4 pr-1">
                  <label htmlFor="voice-input" className="sr-only">
                    {t.placeholder}
                  </label>
                  <input
                    id="voice-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={t.placeholder}
                    lang={SPEECH_LOCALE[lang]}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || thinking}
                    aria-label={t.send}
                    className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    <Send className="size-4" />
                  </button>
                </form>
              </div>
              <p className="sr-only" aria-live="assertive">
                {listening ? t.listening : ''}
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
