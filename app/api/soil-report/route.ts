import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FILE_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

type SoilValues = {
  ph: number | null
  organicCarbon: number | null
  nitrogen: number | null
  phosphorus: number | null
  potassium: number | null
}

function parseModelJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned)
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Soil report analysis is not configured. Add GEMINI_API_KEY to the server environment.' }, { status: 503 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Please select a soil report PDF or image.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file. Upload a PDF, JPG, PNG, or WEBP soil report.' }, { status: 415 })
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'The report must be non-empty and no larger than 15 MB.' }, { status: 413 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const base64 = bytes.toString('base64')
    const prompt = `You are an expert document reader for Indian Soil Health Cards. Read the attached document and return ONLY valid JSON with this exact shape:
{
  "documentType": "soil_health_card" | "other" | "unreadable",
  "status": "valid" | "incomplete" | "invalid",
  "values": { "ph": number|null, "organicCarbon": number|null, "nitrogen": number|null, "phosphorus": number|null, "potassium": number|null },
  "units": { "nitrogen": string|null, "phosphorus": string|null, "potassium": string|null },
  "confidence": number,
  "message": string
}
Rules:
- Extract only values explicitly printed in the document. Do not infer, estimate, or invent missing values.
- pH is dimensionless; organicCarbon is percentage; N/P/K should be numeric values in kg/ha. If the card uses a different unit, convert only when the conversion is unambiguous; otherwise return null for that value and explain in message.
- Map available phosphorus and available potassium values to phosphorus and potassium. Do not confuse fertilizer recommendations with measured soil values.
- A recognizable Soil Health Card with all five values and plausible ranges (pH 0–14, organic carbon 0–100%, N/P/K non-negative) is valid.
- A recognizable Soil Health Card missing one or more required values is incomplete.
- A clearly unrelated document, fabricated-looking/non-soil document, or a report with impossible values is invalid.
- If the file cannot be read, documentType is unreadable and status is invalid.
- Keep confidence between 0 and 1. message should be a short, user-friendly explanation.
- Do not return markdown or any text outside the JSON.`

    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: file.type, data: base64 } }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(50000),
    })

    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text().catch(() => '')
      console.error('[soil-report] Gemini API error:', geminiResponse.status, detail.slice(0, 1000))
      return NextResponse.json({ error: geminiResponse.status === 429 ? 'Soil report analysis is busy. Please try again shortly.' : 'Gemini could not analyse this report. Please try again.' }, { status: 502 })
    }

    const result = await geminiResponse.json()
    const text = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('') ?? ''
    if (!text) return NextResponse.json({ error: 'No readable result was returned. Try a clearer photo or PDF.' }, { status: 502 })

    const parsed = parseModelJson(text) as {
      documentType?: string; status?: string; values?: Partial<SoilValues>
      confidence?: number; message?: string; units?: Record<string, string | null>
    }
    const keys: (keyof SoilValues)[] = ['ph', 'organicCarbon', 'nitrogen', 'phosphorus', 'potassium']
    const values = Object.fromEntries(keys.map((key) => {
      const value = parsed.values?.[key]
      return [key, typeof value === 'number' && Number.isFinite(value) ? value : null]
    })) as SoilValues
    const anyValue = keys.some((key) => values[key] !== null)
    const plausible = values.ph === null || (values.ph >= 0 && values.ph <= 14)
      ? values.organicCarbon === null || (values.organicCarbon >= 0 && values.organicCarbon <= 100)
      : false
    const nonNegative = (['nitrogen', 'phosphorus', 'potassium'] as const).every((key) => values[key] === null || values[key] >= 0)
    const documentType = parsed.documentType === 'soil_health_card' ? 'soil_health_card' : parsed.documentType === 'unreadable' ? 'unreadable' : 'other'
    const complete = keys.every((key) => values[key] !== null)
    const status = documentType !== 'soil_health_card' || !plausible || !nonNegative || parsed.status === 'invalid'
      ? 'invalid'
      : complete ? 'valid' : anyValue ? 'incomplete' : 'invalid'

    return NextResponse.json({
      documentType,
      status,
      values,
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
      message: typeof parsed.message === 'string' ? parsed.message.slice(0, 300) : status === 'valid' ? 'Soil report verified. Values have been filled in.' : status === 'incomplete' ? 'Some values were found. Please enter the missing values manually.' : 'This does not appear to be a readable Soil Health Card.',
    })
  } catch (error) {
    console.error('[soil-report] analysis failed:', error)
    return NextResponse.json({ error: error instanceof Error && error.name === 'TimeoutError' ? 'Analysis took too long. Please try again.' : 'Could not read this report. Try a clearer photo or PDF.' }, { status: 500 })
  }
}
