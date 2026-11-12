import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { latitude, longitude, accuracy, timestamp } = body ?? {}

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180
    ) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required.' },
        { status: 400 },
      )
    }

    if (accuracy !== undefined && (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0)) {
      return NextResponse.json({ error: 'GPS accuracy must be a valid non-negative number.' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'GPS location received successfully.',
      data: {
        latitude,
        longitude,
        accuracy: typeof accuracy === 'number' ? accuracy : null,
        timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Invalid GPS request.' }, { status: 400 })
  }
}
