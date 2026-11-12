import { addDays, RELIEF_SCHEMES, SUBSIDIES, type CropInfo, type FertilizerTask, type LedgerEntry } from './farm-data'

export type VoiceLang = 'en' | 'ta'

export const SPEECH_LOCALE: Record<VoiceLang, string> = { en: 'en-IN', ta: 'ta-IN' }

export type NavTarget = 'home' | 'crops' | 'scan' | 'care' | 'ledger' | 'subsidies' | 'relief' | 'devices'

export type Intent =
  | { kind: 'navigate'; target: NavTarget }
  | { kind: 'weather' }
  | { kind: 'harvest' }
  | { kind: 'help' }
  | { kind: 'repeat' }
  | { kind: 'stop' }
  | { kind: 'ask' }

type Snapshot = {
  farmerName: string
  activeCrop: CropInfo
  daysSinceSowing: number
  sowingDate: Date
  tasks: FertilizerTask[]
  ledger: LedgerEntry[]
  acres: number
  soilPh: number
}

const CROP_TA: Record<string, string> = {
  tomato: 'தக்காளி',
  onion: 'வெங்காயம்',
  potato: 'உருளைக்கிழங்கு',
  wheat: 'கோதுமை',
  mustard: 'கடுகு',
  ginger: 'இஞ்சி',
  capsicum: 'குடைமிளகாய்',
  cabbage: 'முட்டைக்கோஸ்',
  soybean: 'சோயாபீன்',
  paddy: 'நெல்',
}

const NAV_KEYWORDS: Record<NavTarget, string[]> = {
  home: ['home', 'dashboard', 'go back', 'முகப்பு', 'வீடு', 'ஹோம்', 'முதல் பக்கம்'],
  crops: ['crop', 'recommend', 'what to grow', 'market', 'price', 'பயிர்', 'சந்தை', 'விலை', 'என்ன விதைக்க'],
  scan: ['scan', 'leaf', 'disease', 'pest', 'photo', 'camera', 'ஸ்கேன்', 'இலை', 'நோய்', 'பூச்சி', 'புகைப்படம்', 'கேமரா'],
  care: ['schedule', 'fertiliser', 'fertilizer', 'task', 'spray', 'urea', 'அட்டவணை', 'உரம்', 'வேலை', 'பணி', 'தெளிப்பு'],
  ledger: ['ledger', 'expense', 'spent', 'spend', 'cost', 'money', 'profit', 'account', 'கணக்கு', 'செலவு', 'லாபம்', 'பணம்', 'வரவு'],
  subsidies: ['subsid', 'scheme', 'government', 'kisan', 'loan', 'மானியம்', 'திட்டம்', 'அரசு', 'கடன்'],
  relief: ['disaster', 'relief', 'flood', 'drought', 'insurance', 'damage', 'loss', 'பேரிடர்', 'நிவாரணம்', 'வெள்ளம்', 'வறட்சி', 'காப்பீடு', 'சேதம்', 'இழப்பு'],
  devices: ['device', 'sensor', 'moisture', 'pump', 'iot', 'சாதனம்', 'சென்சார்', 'கருவி', 'ஈரப்பதம்', 'மோட்டார்'],
}

const has = (text: string, words: string[]) => words.some((w) => text.includes(w))

export function parseIntent(raw: string): Intent {
  const text = raw.toLowerCase().trim()
  if (!text) return { kind: 'ask' }
  if (has(text, ['stop', 'quiet', 'cancel', 'நிறுத்து', 'போதும்'])) return { kind: 'stop' }
  if (has(text, ['repeat', 'again', 'say that', 'மீண்டும்', 'திரும்ப'])) return { kind: 'repeat' }
  if (has(text, ['help', 'what can you', 'commands', 'உதவி', 'என்ன செய்ய முடியும்'])) return { kind: 'help' }
  if (has(text, ['weather', 'rain', 'temperature', 'வானிலை', 'மழை', 'வெப்ப'])) return { kind: 'weather' }
  if (has(text, ['harvest', 'அறுவடை'])) return { kind: 'harvest' }

  const isQuestion = has(text, ['how to', 'how do', 'why', 'which medicine', 'treat', 'எப்படி', 'ஏன்', 'மருந்து'])
  if (!isQuestion) {
    for (const [target, words] of Object.entries(NAV_KEYWORDS) as [NavTarget, string[]][]) {
      if (has(text, words)) return { kind: 'navigate', target }
    }
  }
  return { kind: 'ask' }
}

const rupees = (n: number, lang: VoiceLang) =>
  `${Math.round(n).toLocaleString('en-IN')} ${lang === 'ta' ? 'ரூபாய்' : 'rupees'}`

const dateWords = (d: Date, lang: VoiceLang) =>
  d.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'long' })

export function cropName(crop: CropInfo, lang: VoiceLang) {
  return lang === 'ta' ? (CROP_TA[crop.id] ?? crop.name) : crop.name
}

function nextTaskLine(s: Snapshot, lang: VoiceLang) {
  const due = s.tasks.find((t) => !t.done)
  if (!due) return lang === 'ta' ? 'நிலுவையில் உள்ள உர வேலை எதுவும் இல்லை.' : 'There are no pending fertilizer tasks.'
  const dose = `${due.dosePerAcre} ${due.unit === 'kg' ? (lang === 'ta' ? 'கிலோ' : 'kilo') : lang === 'ta' ? 'லிட்டர்' : 'litre'}`
  const when =
    due.day <= s.daysSinceSowing
      ? lang === 'ta' ? 'இன்று செய்ய வேண்டும்' : 'is due today'
      : lang === 'ta' ? `${due.day - s.daysSinceSowing} நாட்களில் செய்ய வேண்டும்` : `is due in ${due.day - s.daysSinceSowing} days`
  return lang === 'ta'
    ? `அடுத்த வேலை: ${due.product}, ஏக்கருக்கு ${dose}. இது ${when}. முறை: ${due.method}.`
    : `Next task: ${due.product}, ${dose} per acre. It ${when}. Method: ${due.method}.`
}

export function screenSummary(target: NavTarget, s: Snapshot, lang: VoiceLang): string {
  const crop = cropName(s.activeCrop, lang)
  const spent = s.ledger.filter((e) => e.kind === 'expense').reduce((a, e) => a + e.amount, 0)
  const harvest = addDays(s.sowingDate, s.activeCrop.durationDays)
  const ta = lang === 'ta'

  switch (target) {
    case 'home':
      return ta
        ? `முகப்பு பக்கம். உங்கள் ${crop} பயிர் ${s.activeCrop.durationDays} நாட்களில் ${s.daysSinceSowing}வது நாளில் உள்ளது. அறுவடை சுமார் ${dateWords(harvest, lang)}. ${nextTaskLine(s, lang)}`
        : `Home. Your ${crop} crop is on day ${s.daysSinceSowing} of ${s.activeCrop.durationDays}. Harvest is around ${dateWords(harvest, lang)}. ${nextTaskLine(s, lang)}`
    case 'crops':
      return ta
        ? `பயிர் ஆலோசனை. மண் கார அமிலத்தன்மை ${s.soilPh} அடிப்படையில் உங்கள் நிலத்துக்கு ஏற்ற பயிர்களும் சந்தை விலை கணிப்பும் இங்கே உள்ளன.`
        : `Crop advice. Here are crops suited to your land based on soil pH ${s.soilPh}, with market price forecasts.`
    case 'scan':
      return ta
        ? 'இலை ஸ்கேன். பாதிக்கப்பட்ட இலையின் தெளிவான புகைப்படம் எடுங்கள். நோய், பூச்சி அல்லது ரசாயன பாதிப்பா என்று சொல்கிறேன்.'
        : 'Leaf scan. Take a clear photo of the affected leaf and I will tell you if it is a disease, pest attack or chemical burn.'
    case 'care':
      return ta ? `உர அட்டவணை. ${nextTaskLine(s, lang)}` : `Fertilizer schedule. ${nextTaskLine(s, lang)}`
    case 'ledger':
      return ta
        ? `கணக்கு புத்தகம். இதுவரை மொத்த செலவு ${rupees(spent, lang)}. ஏக்கருக்கு சுமார் ${rupees(spent / s.acres, lang)}.`
        : `Ledger. You have spent ${rupees(spent, lang)} so far, about ${rupees(spent / s.acres, lang)} per acre.`
    case 'subsidies':
      return ta
        ? `அரசு மானியங்கள். உங்களுக்கு ${SUBSIDIES.length} திட்டங்கள் உள்ளன. உதாரணமாக ${SUBSIDIES[0].name}, ஆண்டுக்கு 6,000 ரூபாய். சொட்டு நீர் பாசனத்துக்கு 55 சதவீதம் வரை மானியம் கிடைக்கும்.`
        : `Subsidies. ${SUBSIDIES.length} schemes match you, like ${SUBSIDIES[0].name} with 6,000 rupees a year, and up to 55 percent subsidy on drip irrigation.`
    case 'relief':
      return ta
        ? `பேரிடர் நிவாரணம். பயிர் சேதம் ஏற்பட்டால் 72 மணி நேரத்துக்குள் ${RELIEF_SCHEMES[0].name} காப்பீட்டுக்கு தெரிவிக்கவும். சேதமடைந்த பயிரின் புகைப்படங்களை எடுத்து வைக்கவும்.`
        : `Disaster aid. If your crop is damaged, report it within 72 hours for ${RELIEF_SCHEMES[0].name}. Take photos of the damaged field as evidence.`
    case 'devices':
      return ta
        ? 'சாதனங்கள். மண் ஈரப்பதம் சென்சார் மற்றும் பம்ப் நிலையை இங்கே பார்க்கலாம்.'
        : 'Devices. Check your soil moisture sensors and pump status here.'
  }
}

export function weatherLine(lang: VoiceLang) {
  return lang === 'ta'
    ? 'இன்று வெப்பநிலை 29 டிகிரி, ஓரளவு மேகமூட்டம். தெளிப்பு வேலைகளை மாலையில் செய்வது நல்லது.'
    : 'It is 29 degrees and partly cloudy today. Evening is the best time for any spraying.'
}

export function harvestLine(s: Snapshot, lang: VoiceLang) {
  const harvest = addDays(s.sowingDate, s.activeCrop.durationDays)
  const left = s.activeCrop.durationDays - s.daysSinceSowing
  return lang === 'ta'
    ? `${cropName(s.activeCrop, lang)} அறுவடைக்கு இன்னும் ${left} நாட்கள் உள்ளன, சுமார் ${dateWords(harvest, lang)}.`
    : `${left} days left until ${cropName(s.activeCrop, lang)} harvest, around ${dateWords(harvest, lang)}.`
}

export const HELP_TEXT: Record<VoiceLang, string> = {
  en: 'You can say: go to schedule, how much have I spent, open leaf scan, show subsidies, disaster help, when is harvest, or ask any farming question like how to control tomato leaf curl.',
  ta: 'நீங்கள் சொல்லலாம்: உர அட்டவணை, எவ்வளவு செலவு, இலை ஸ்கேன், மானியம், பேரிடர் உதவி, அறுவடை எப்போது, அல்லது தக்காளி இலை சுருட்டை எப்படி கட்டுப்படுத்துவது போன்ற எந்த விவசாய கேள்வியும் கேட்கலாம்.',
}

export const SUGGESTIONS: Record<VoiceLang, string[]> = {
  en: ['What is my next task?', 'How much have I spent?', 'Open leaf scan', 'Show subsidies', 'When is harvest?', 'How to control leaf curl?'],
  ta: ['அடுத்த வேலை என்ன?', 'எவ்வளவு செலவு?', 'இலை ஸ்கேன்', 'மானியம் காட்டு', 'அறுவடை எப்போது?', 'இலை சுருட்டை எப்படி கட்டுப்படுத்துவது?'],
}

export const UI_TEXT = {
  en: {
    title: 'Voice assistant',
    greeting: 'Hello! Tap the mic and speak. I can open screens, read your farm details and answer farming questions.',
    listening: 'Listening…',
    thinking: 'Thinking…',
    tapToSpeak: 'Tap to speak',
    placeholder: 'Type or speak a question',
    send: 'Send',
    noMic: 'Voice input is not supported in this browser. You can type instead.',
    micDenied: 'Microphone access was blocked. Allow mic permission or type your question.',
    noVoice: 'No Tamil voice found on this device. Install a Tamil text-to-speech voice in your phone settings.',
    error:
      'Sorry, I could not answer that question right now. You can still say things like next task, how much have I spent, or open leaf scan.',
    stopped: 'Okay.',
    try: 'Try saying',
  },
  ta: {
    title: 'குரல் உதவியாளர்',
    greeting: 'வணக்கம்! மைக்கை தட்டி பேசுங்கள். பக்கங்களை திறக்கவும், உங்கள் பண்ணை விவரங்களை சொல்லவும், விவசாய கேள்விகளுக்கு பதில் தரவும் முடியும்.',
    listening: 'கேட்கிறேன்…',
    thinking: 'யோசிக்கிறேன்…',
    tapToSpeak: 'பேச தட்டவும்',
    placeholder: 'கேள்வியை தட்டச்சு செய்யவும் அல்லது பேசவும்',
    send: 'அனுப்பு',
    noMic: 'இந்த உலாவியில் குரல் உள்ளீடு இல்லை. தட்டச்சு செய்யலாம்.',
    micDenied: 'மைக் அனுமதி மறுக்கப்பட்டது. அனுமதி கொடுக்கவும் அல்லது தட்டச்சு செய்யவும்.',
    noVoice: 'இந்த சாதனத்தில் தமிழ் குரல் இல்லை. தொலைபேசி அமைப்புகளில் தமிழ் உரை-ஒலி குரலை நிறுவவும்.',
    error:
      'மன்னிக்கவும், இப்போது இந்தக் கேள்விக்கு பதில் கிடைக்கவில்லை. அடுத்த வேலை, எவ்வளவு செலவு, இலை ஸ்கேன் திற என்று சொல்லலாம்.',
    stopped: 'சரி.',
    try: 'இப்படி சொல்லுங்கள்',
  },
} satisfies Record<VoiceLang, Record<string, string>>

export type { Snapshot as VoiceSnapshot }
