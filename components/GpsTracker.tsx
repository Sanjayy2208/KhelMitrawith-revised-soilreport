"use client";

import { useGps } from "@/hooks/use-gps";

export default function GpsTracker() {
  const { gpsData, connectAndSendGps } = useGps();

  return (
    <div className="p-4 border rounded-lg max-w-sm">
      <h2 className="text-lg font-bold mb-4">Location Sync</h2>
      
      <button
        onClick={connectAndSendGps}
        disabled={gpsData.isConnecting}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {gpsData.isConnecting ? "Locating & Syncing..." : "Sync My Location"}
      </button>

      {/* Show Error */}
      {gpsData.error && (
        <p className="text-red-500 mt-2 text-sm">{gpsData.error}</p>
      )}

      {/* Show Success */}
      {gpsData.latitude && (
        <div className="mt-4 text-sm text-green-600">
          <p>Successfully synced!</p>
          <p>Lat: {gpsData.latitude}</p>
          <p>Lng: {gpsData.longitude}</p>
        </div>
      )}
    </div>
  );
}
