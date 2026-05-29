import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Camera, AlertCircle, RefreshCw, FlipHorizontal2, ShieldCheck } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'

export default function CameraScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const lastScanRef = useRef({ value: '', time: 0 })
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [frontCamera, setFrontCamera] = useState(false)
  // 'checking' | 'ask' | 'denied' | 'ready'
  const [permState, setPermState] = useState('checking')

  const start = useCallback(
    async (front = false) => {
      readerRef.current?.reset()
      readerRef.current = null
      setError(null)
      setScanning(false)

      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      const constraints = {
        video: {
          facingMode: { ideal: front ? 'user' : 'environment' },
        },
      }

      try {
        await reader.decodeFromConstraints(constraints, videoRef.current, (result) => {
          if (result) {
            setScanning(true)
            const value = result.getText()
            const now = Date.now()
            const last = lastScanRef.current
            if (value !== last.value || now - last.time >= 2000) {
              lastScanRef.current = { value, time: now }
              onScan(value)
            }
          }
        })
        setScanning(true)
        setPermState('ready')
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermState('denied')
          setError(null)
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found on this device.')
          setPermState('ready')
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is in use by another app. Close other apps and try again.')
          setPermState('ready')
        } else if (err.name === 'OverconstrainedError') {
          try {
            await reader.decodeFromConstraints({ video: true }, videoRef.current, (result) => {
              if (result) {
                setScanning(true)
                onScan(result.getText())
              }
            })
            setScanning(true)
            setPermState('ready')
          } catch (e2) {
            setError(`Camera error: ${e2.message}`)
            setPermState('ready')
          }
        } else {
          setError(`Camera error: ${err.message}`)
          setPermState('ready')
        }
      }
    },
    [onScan]
  )

  // Check camera permission status on mount
  useEffect(() => {
    const checkAndStart = async () => {
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' })
          if (result.state === 'granted') {
            setPermState('ready')
            start(false)
          } else if (result.state === 'denied') {
            setPermState('denied')
          } else {
            // 'prompt' — show the ask screen first
            setPermState('ask')
          }
        } catch {
          // Permissions API not supported (Firefox, some iOS) — try directly
          setPermState('ready')
          start(false)
        }
      } else {
        // No permissions API — try directly
        setPermState('ready')
        start(false)
      }
    }
    checkAndStart()
    return () => { readerRef.current?.reset() }
  }, [start])

  const switchCamera = () => {
    const next = !frontCamera
    setFrontCamera(next)
    start(next)
  }

  const handleAllowCamera = () => {
    setPermState('ready')
    start(frontCamera)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <Camera size={18} className="text-gray-700 flex-shrink-0" />
            <span className="font-semibold text-gray-900">Camera Scanner</span>
            {scanning && permState === 'ready' && !error && (
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

        {/* Permission Request Screen */}
        {permState === 'ask' && (
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={32} className="text-gray-700" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Allow Camera Access</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                To scan barcodes and QR codes, we need access to your camera.
                Your browser will ask you to confirm.
              </p>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={handleAllowCamera}
                className="flex-1 bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Camera size={16} />
                Allow Camera
              </button>
              <button
                onClick={onClose}
                className="flex-1 border border-gray-200 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Checking state */}
        {permState === 'checking' && (
          <div className="p-8 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Checking camera…</p>
          </div>
        )}

        {/* Camera Denied Screen */}
        {permState === 'denied' && (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle size={32} className="text-red-400" />
            <div>
              <p className="font-semibold text-gray-900 mb-1">Camera access blocked</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your browser has blocked camera access for this site.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-600 space-y-1.5 w-full">
              <p className="font-semibold text-gray-800">How to allow camera:</p>
              <p>📱 <strong>iPhone/iPad:</strong> Settings → Safari → Camera → Allow</p>
              <p>🤖 <strong>Android Chrome:</strong> tap 🔒 in address bar → Camera → Allow</p>
              <p>💻 <strong>Desktop:</strong> click the camera icon in the address bar → Allow</p>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={handleAllowCamera}
                className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} /> Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Camera Error (non-permission) */}
        {permState === 'ready' && error && (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{error}</p>
            <div className="flex gap-2 mt-1">
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
        )}

        {/* Camera View */}
        {permState === 'ready' && !error && (
          <>
            <div className="relative bg-black">
              <video
                ref={videoRef}
                className="w-full block"
                playsInline
                muted
                autoPlay
              />
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
