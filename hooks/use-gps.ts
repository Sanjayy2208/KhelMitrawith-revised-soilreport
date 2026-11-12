'use client'

import { useCallback, useEffect, useState } from 'react'

export interface GpsLocation {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

interface GpsState {
  location: GpsLocation | null
  error: string | null
  isConnecting: boolean
}

const STORAGE_KEY = 'khetmitra:last-gps-location'

export function useGps() {
  const [gpsData, setGpsData] = useState<GpsState>({
    location: null,
    error: null,
    isConnecting: false,
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const location = JSON.parse(saved) as GpsLocation
        if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
          setGpsData((prev) => ({ ...prev, location }))
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const connectAndSendGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsData((prev) => ({ ...prev, error: 'Your browser does not support GPS location.' }))
      return
    }

    setGpsData((prev) => ({ ...prev, isConnecting: true, error: null }))
    navigator.geolocation.getCurrentPosition(
      async ({ coords, timestamp }) => {
        const location: GpsLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          timestamp,
        }

        try {
          const response = await fetch('/api/gps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(location),
          })
          const result = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(result.error || 'Could not sync your location.')

          localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
          setGpsData({ location, error: null, isConnecting: false })
        } catch (error) {
          setGpsData((prev) => ({
            ...prev,
            isConnecting: false,
            error: error instanceof Error ? error.message : 'GPS sync failed. Please try again.',
          }))
        }
      },
      (geoError) => {
        const message =
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access in your browser settings and try again.'
            : geoError.code === geoError.POSITION_UNAVAILABLE
              ? 'Your current location is unavailable. Check your device GPS and try again.'
              : 'GPS request timed out. Move to an area with a clearer sky and try again.'
        setGpsData((prev) => ({ ...prev, isConnecting: false, error: message }))
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }, [])

  return { gpsData, connectAndSendGps }
}
