import { useEffect, useRef, useState } from 'react'
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'

export default function CameraScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [error, setError] = useState(null)
  const [devices, setDevices] = useState([])
  const [activeDevice, setActiveDevice] = useState(null)
  const [scanning, setScanning] = useState(false)

  // List cameras on mount
  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devs) => {
        setDevices(devs)
        if (devs.length === 0) {
          setError('No camera found on this device.')
          return
        }
        // Prefer back/environment camera on mobile, otherwise use first
        const back = devs.find(
          (d) =>
            /back|rear|environment/i.test(d.label) ||
            d.facingMode === 'environment'
        )
        setActiveDevice((back || devs[0]).deviceId)
      })
      .catch((err) => {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Click the camera icon in the browser address bar and allow access, then refresh.')
        } else {
          setError(`Could not list cameras: ${err.message}`)
        }
      })
  }, [])

  // Start scanning when activeDevice changes
  useEffect(() => {
    if (!activeDevice || !videoRef.current) return

    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    setScanning(false)
    setError(null)

    let lastValue = ''
    let lastTime = 0

    reader
      .decodeFromVideoDevice(activeDevice, videoRef.current, (result, err) => {
        if (result) {
          setScanning(true)
          const value = result.getText()
          const now = Date.now()
          // Debounce — ignore same barcode within 2 seconds
          if (value === lastValue && now - lastTime < 2000) return
          lastValue = value
          lastTime = now
          onScan(value)
        }
        if (err && err.name !== 'NotFoundException') {
          // Real error (not just "nothing detected this frame")
          console.warn('[Scanner]', err.message)
        }
      })
      .then(() => {
        setScanning(true)
      })
      .catch((err) => {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Allow camera in your browser settings and try again.')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('Camera not found. Make sure a camera is connected and not in use by another app.')
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use by another application. Close other apps using the camera and try again.')
        } else {
          setError(`Camera error: ${err.message}`)
        }
      })

    return () => {
      reader.reset()
    }
  }, [activeDevice, onScan])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-gray-700" />
            <span className="font-semibold text-gray-900">Camera Scanner</span>
            {scanning && !error && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Scanning…
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm text-gray-700 leading-relaxed">{error}</p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => { setError(null); setActiveDevice(null); setTimeout(() => setActiveDevice(devices[0]?.deviceId), 100) }}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium"
              >
                <RefreshCw size={14} /> Retry
              </button>
              <button onClick={onClose} className="border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Video feed */}
            <div className="relative bg-black">
              <video ref={videoRef} className="w-full" playsInline muted autoPlay />

              {/* Scanning frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-60 h-36">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
                  {scanning && (
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-red-400"
                      style={{ animation: 'scanline 2s ease-in-out infinite' }}
                    />
                  )}
                </div>
              </div>

              <p className="text-center text-xs text-white/80 bg-black/50 py-2">
                Point camera at a barcode or QR code — scans automatically
              </p>
            </div>

            {/* Camera selector (if multiple cameras) */}
            {devices.length > 1 && (
              <div className="p-3 border-t border-gray-100">
                <select
                  value={activeDevice || ''}
                  onChange={(e) => setActiveDevice(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black bg-white"
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 8)}…`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes scanline {
          0%, 100% { top: 8%; }
          50% { top: 88%; }
        }
      `}</style>
    </div>
  )
}
