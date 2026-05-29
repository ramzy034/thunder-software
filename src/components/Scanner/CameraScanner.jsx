import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Camera, AlertCircle, RefreshCw, FlipHorizontal2, ShieldCheck, Zap } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'

// Beep sound on successful scan via Web Audio API
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 1800
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.12)
  } catch {}
}

// ZXing hints: try harder + all common barcode formats
const HINTS = new Map([
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.CODABAR,
    BarcodeFormat.ITF,
  ]],
])

export default function CameraScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const streamRef = useRef(null)
  const lastScanRef = useRef({ value: '', time: 0 })

  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [frontCamera, setFrontCamera] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [flashFrame, setFlashFrame] = useState(false)
  // 'checking' | 'ask' | 'denied' | 'ready'
  const [permState, setPermState] = useState('checking')

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    readerRef.current?.reset()
    readerRef.current = null
  }, [])

  const start = useCallback(
    async (front = false) => {
      stopStream()
      setError(null)
      setScanning(false)
      setTorchSupported(false)

      const reader = new BrowserMultiFormatReader(HINTS, { delayBetweenScanAttempts: 50 })
      readerRef.current = reader

      // HD resolution + continuous autofocus
      const constraints = {
        video: {
          facingMode: { ideal: front ? 'user' : 'environment' },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
      }

      try {
        const controls = await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result, err, ctrl) => {
            if (result) {
              const value = result.getText()
              const now = Date.now()
              const last = lastScanRef.current
              // Debounce: ignore same code within 1.5s
              if (value !== last.value || now - last.time >= 1500) {
                lastScanRef.current = { value, time: now }
                beep()
                if (navigator.vibrate) navigator.vibrate(80)
                setFlashFrame(true)
                setTimeout(() => setFlashFrame(false), 300)
                onScan(value)
              }
            }
          }
        )

        setScanning(true)
        setPermState('ready')

        // Save stream reference for torch control
        const videoEl = videoRef.current
        if (videoEl?.srcObject) {
          streamRef.current = videoEl.srcObject
          const track = videoEl.srcObject.getVideoTracks()[0]
          const caps = track?.getCapabilities?.()
          if (caps?.torch) setTorchSupported(true)
        }
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermState('denied')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found on this device.')
          setPermState('ready')
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is in use by another app. Close other apps and try again.')
          setPermState('ready')
        } else if (err.name === 'OverconstrainedError') {
          // Retry without resolution constraints
          try {
            await reader.decodeFromConstraints(
              { video: { facingMode: { ideal: front ? 'user' : 'environment' } } },
              videoRef.current,
              (result) => {
                if (result) {
                  const value = result.getText()
                  const now = Date.now()
                  const last = lastScanRef.current
                  if (value !== last.value || now - last.time >= 1500) {
                    lastScanRef.current = { value, time: now }
                    beep()
                    setFlashFrame(true)
                    setTimeout(() => setFlashFrame(false), 300)
                    onScan(value)
                  }
                }
              }
            )
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
    [onScan, stopStream]
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
            setPermState('ask')
          }
        } catch {
          setPermState('ready')
          start(false)
        }
      } else {
        setPermState('ready')
        start(false)
      }
    }
    checkAndStart()
    return () => stopStream()
  }, [start, stopStream])

  const switchCamera = () => {
    const next = !frontCamera
    setFrontCamera(next)
    start(next)
  }

  const toggleTorch = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return
    try {
      const next = !torchOn
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch {}
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
                <Camera size={16} /> Allow Camera
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

        {/* Checking */}
        {permState === 'checking' && (
          <div className="p-8 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Checking camera…</p>
          </div>
        )}

        {/* Camera Denied */}
        {permState === 'denied' && (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle size={32} className="text-red-400" />
            <div>
              <p className="font-semibold text-gray-900 mb-1">Camera access blocked</p>
              <p className="text-sm text-gray-600 leading-relaxed">Your browser has blocked camera access for this site.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-600 space-y-1.5 w-full">
              <p className="font-semibold text-gray-800 mb-2">How to allow camera:</p>
              <p>📱 <strong>iPhone/iPad:</strong> Settings → Safari → Camera → Allow</p>
              <p>🤖 <strong>Android:</strong> tap 🔒 in address bar → Camera → Allow</p>
              <p>💻 <strong>Desktop:</strong> click 🔒 in address bar → Camera → Allow</p>
            </div>
            <div className="flex gap-2 w-full">
              <button onClick={handleAllowCamera} className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                <RefreshCw size={14} /> Try Again
              </button>
              <button onClick={onClose} className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Close</button>
            </div>
          </div>
        )}

        {/* Camera Error (non-permission) */}
        {permState === 'ready' && error && (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm text-gray-700 leading-relaxed">{error}</p>
            <div className="flex gap-2">
              <button onClick={() => start(frontCamera)} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium">
                <RefreshCw size={14} /> Retry
              </button>
              <button onClick={onClose} className="border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">Close</button>
            </div>
          </div>
        )}

        {/* Camera View */}
        {permState === 'ready' && !error && (
          <>
            <div className="relative bg-black">
              {/* Video feed */}
              <video ref={videoRef} className="w-full block" playsInline muted autoPlay />

              {/* Success flash overlay */}
              {flashFrame && (
                <div className="absolute inset-0 bg-green-400/30 pointer-events-none transition-opacity" />
              )}

              {/* Scanning frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-40">
                  {/* Corner brackets */}
                  <div className={`absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 rounded-tl-lg transition-colors ${flashFrame ? 'border-green-400' : 'border-white'}`} />
                  <div className={`absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 rounded-tr-lg transition-colors ${flashFrame ? 'border-green-400' : 'border-white'}`} />
                  <div className={`absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 rounded-bl-lg transition-colors ${flashFrame ? 'border-green-400' : 'border-white'}`} />
                  <div className={`absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 rounded-br-lg transition-colors ${flashFrame ? 'border-green-400' : 'border-white'}`} />
                  {/* Scan line */}
                  {scanning && !flashFrame && (
                    <div
                      className="absolute left-2 right-2 h-0.5 bg-red-400 shadow-[0_0_6px_2px_rgba(248,113,113,0.6)]"
                      style={{ animation: 'scanline 2s ease-in-out infinite' }}
                    />
                  )}
                  {flashFrame && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">✓ Scanned!</div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-center text-xs text-white/80 bg-black/50 py-2">
                {flashFrame ? '✓ Barcode detected!' : scanning ? 'Align barcode inside the frame' : 'Starting camera…'}
              </p>
            </div>

            {/* Controls */}
            <div className="p-3 border-t border-gray-100 flex items-center justify-center gap-2">
              <button
                onClick={switchCamera}
                className="flex items-center gap-2 text-sm text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <FlipHorizontal2 size={16} />
                {frontCamera ? 'Back Camera' : 'Front Camera'}
              </button>
              {torchSupported && (
                <button
                  onClick={toggleTorch}
                  className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-colors ${torchOn ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Zap size={16} />
                  {torchOn ? 'Torch On' : 'Torch'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes scanline {
          0%, 100% { top: 10%; }
          50% { top: 85%; }
        }
      `}</style>
    </div>
  )
}
