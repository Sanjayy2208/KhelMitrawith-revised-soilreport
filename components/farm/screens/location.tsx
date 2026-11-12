'use client'

import { useGps } from '@/hooks/use-gps'
import { Card, ScreenHeader, Pill } from '../ui'
import { Crosshair, MapPin, RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react'

export function LocationScreen() {
  const { gpsData, connectAndSendGps } = useGps()
  const location = gpsData.location
  const mapsUrl = location
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : null

  return (
    <div className="pb-8">
      <ScreenHeader title="Field GPS location" subtitle="Get the coordinates of your farm or current field" back="home" />
      <div className="flex flex-col gap-4 px-5">
        <section className="rounded-3xl bg-primary p-5 text-primary-foreground">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-foreground/15">
              <MapPin className="size-6" />
            </span>
            <div>
              <p className="font-semibold">Locate this field</p>
              <p className="text-xs opacity-80">Use your device GPS to capture exact coordinates</p>
            </div>
          </div>
          <button
            type="button"
            onClick={connectAndSendGps}
            disabled={gpsData.isConnecting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-foreground px-4 py-3 font-semibold text-primary disabled:opacity-60"
          >
            {gpsData.isConnecting ? <RefreshCw className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
            {gpsData.isConnecting ? 'Finding and syncing location…' : location ? 'Refresh GPS location' : 'Get my GPS location'}
          </button>
        </section>

        {gpsData.error && (
          <Card>
            <p role="alert" className="text-sm text-destructive">{gpsData.error}</p>
            <p className="mt-2 text-xs text-muted-foreground">GPS works on HTTPS websites or localhost. Turn on device location and allow this site to access it.</p>
          </Card>
        )}

        {location ? (
          <>
            <Card>
              <div className="flex items-center justify-between">
                <p className="font-semibold">Latest GPS coordinates</p>
                <Pill tone="success">Synced</Pill>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Latitude</dt>
                  <dd className="mt-1 break-all text-lg font-bold tabular-nums">{location.latitude.toFixed(6)}°</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Longitude</dt>
                  <dd className="mt-1 break-all text-lg font-bold tabular-nums">{location.longitude.toFixed(6)}°</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">GPS accuracy</dt>
                  <dd className="mt-1 text-base font-semibold">±{Math.round(location.accuracy)} metres</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Captured</dt>
                  <dd className="mt-1 text-sm font-semibold">{new Date(location.timestamp).toLocaleString()}</dd>
                </div>
              </dl>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold text-primary">
                  <ExternalLink className="size-4" /> View this point in Google Maps
                </a>
              )}
            </Card>
            <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              Coordinates are saved on this device for the KhetMitra session. The GPS API confirms receipt; connect a database to retain locations across devices.
            </p>
          </>
        ) : (
          <Card>
            <p className="font-semibold">No GPS location captured yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Tap “Get my GPS location” and allow the browser permission request. Your latitude, longitude and accuracy will appear here.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
