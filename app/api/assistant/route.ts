import { generateText } from 'ai'

export const maxDuration = 30

type Body = { question?: unknown; lang?: unknown; context?: unknown }

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : ''
  const lang = body.lang === 'ta' ? 'ta' : 'en'
  const context = typeof body.context === 'string' ? body.context.slice(0, 1500) : ''

  if (!question) return Response.json({ error: 'Missing question' }, { status: 400 })

  const language = lang === 'ta' ? 'Tamil (in Tamil script)' : 'simple Indian English'

  try {
    const { text } = await generateText({
      model: 'google/gemini-3.5-flash',
      instructions: `You are KhetMitra, a friendly voice assistant for Indian farmers inside a farm management app.
Always reply in ${language}. Your reply will be read aloud by text-to-speech, so:
- Keep it to 2-4 short sentences, practical and specific.
- No markdown, bullet points, emojis or symbols. Write numbers and units in words-friendly form (e.g. "2 grams per litre").
- For pesticides, give the common chemical name and dose, and remind about safety gear and the label.
- If the question is unrelated to farming or the app, answer briefly and politely steer back to farming.
The app has screens: Home, Crop advice, Leaf scan, Fertilizer schedule, Ledger, Subsidies, Disaster aid, Devices, Field GPS location. Suggest a relevant screen when helpful.
Farmer context: ${context}`,
      prompt: question,
    })
    return Response.json({ answer: text.trim() })
  } catch (error) {
    console.error('[assistant] generation failed', error)
    return Response.json({ error: 'Assistant unavailable' }, { status: 502 })
  }
}
