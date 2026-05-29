import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Camera, AlertCircle, RefreshCw, FlipHorizontal2 } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'

export default function CameraScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const lastScanRef = useRef({ value: '', time: 0 })
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [frontCamera, setFrontCamera] = useState(false)

  const start = useCallback(
    async (front = false) => {
      // Clean up any previous reader
      readerRef.current?.reset()
      readerRef.current = null
      setError(null)
      setScanning(false)

      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      // iOS Safari needs { ideal: ... } not exact string — exact fails on many devices
      const constraints = {
        video: {
          facingMode: { ideal: front ? 'user' : 'environment' },
        },
      }

      try {
        await reader.decodeFromConstraints(constraints, videoRef.current, (result, err) => {
          if (result) {
            setScanning(true)
            const value = result.getText()
            const now = Date.now()
            const last = lastScanRef.current
            // Debounce: ignore same code within 2 seconds
            if (value !== last.value || now - last.time >= 2000) {
              lastScanRef.current = { value, time: now }
              onScan(value)
            }
          }
          // err here is just "nothing detected this frame" — not a real error
        })
        setScanning(true)
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError(
            'Camera access denied.\n\nOn iPhone/iPad: go to Settings → Safari → Camera and set it to Allow. Then try again.'
          )
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found on this device.')
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is in use by another app. Close other apps and try again.')
        } else if (err.name === 'OverconstrainedError') {
          // Exact facingMode failed — retry without constraint
          try {
            await reader.decodeFromConstraints({ video: true }, videoRef.current, (result) => {
              if (result) {
                setScanning(true)
                onScan(result.getText())
              }
            })
            setScanning(true)
          } catch (e2) {
            setError(`Camera error: ${e2.message}`)
          }
        } else {
          setError(`Camera error: ${err.message}`)
        }
      }
    },
    [onScan]
  )

  // Start on mount with back camera
  useEffect(() => {
    start(false)
    return () => {
      readerRef.current?.reset()
    }
  }, [start])

  const switchCamera = () => {
    const next = !frontCamera
    setFrontCamera(next)
    start(next)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <Camera size={18} className="text-gray-700 flex-shrink-0" />
            <span className="font-semibold text-gray-900">Camera Scanner</span>
            {scanning && !error && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Live
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{error}</p>
            <div className="flex gap-2 mt-1 flex-wrap justify-center">
              <button
                onClick={() => start(frontCamera)}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium"
              >
                <RefreshCw size={14} /> Retry
              </button>
              <button
                onClick={onClose}
                className="border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Video — playsInline is REQUIRED on iOS Safari */}
            <div className="relative bg-black">
              <video
                ref={videoRef}
                className="w-full block"
                playsInline
                muted
                autoPlay
              />

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
                {scanning ? 'Point at a barcode or QR code' : 'Starting camera…'}
              </p>
            </div>

            {/* Switch camera */}
            <div className="p-3 border-t border-gray-100 flex justify-center">
              <button
                onClick={switchCamera}
                className="flex items-center gap-2 text-sm text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <FlipHorizontal2 size={16} />
                {frontCamera ? 'Switch to Back Camera' : 'Switch to Front Camera'}
              </button>
            </div>
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
