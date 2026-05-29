import { useEffect, useRef, useState } from 'react'
import { X, Camera, AlertCircle } from 'lucide-react'

export default function CameraScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setError('Camera scanning is not supported in this browser. Use Chrome or Edge, or use a hardware barcode scanner.')
      return
    }

    let stream = null
    let intervalId = null
    let lastScan = ''
    let lastScanTime = 0

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setScanning(true)

        const detector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
        })

        intervalId = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return
          try {
            const results = await detector.detect(videoRef.current)
            if (results.length > 0) {
              const value = results[0].rawValue
              const now = Date.now()
              // Debounce: same barcode within 2s = ignore
              if (value === lastScan && now - lastScanTime < 2000) return
              lastScan = value
              lastScanTime = now
              onScan(value)
            }
          } catch {
            // Detection frame error — ignore
          }
        }, 300)
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access in your browser settings.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.')
        } else {
          setError(`Camera error: ${err.message}`)
        }
      }
    }

    start()

    return () => {
      clearInterval(intervalId)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-gray-700" />
            <span className="font-semibold text-gray-900">Camera Scanner</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm text-gray-600">{error}</p>
            <button
              onClick={onClose}
              className="mt-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="relative">
            <video ref={videoRef} className="w-full" playsInline muted />
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white/80 rounded-xl w-56 h-32 relative">
                <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-white rounded-br-lg" />
                {scanning && (
                  <div className="absolute left-0 right-0 h-0.5 bg-red-400 animate-[scanline_2s_ease-in-out_infinite]" />
                )}
              </div>
            </div>
            <p className="text-center text-xs text-white/80 bg-black/40 py-2">
              Point camera at a barcode — it will scan automatically
            </p>
          </div>
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
