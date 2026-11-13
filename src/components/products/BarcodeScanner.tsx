import { Camera, CameraOff, ImageUp, ScanLine } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'

interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement | ImageBitmap) => Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

const formats = ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39', 'qr_code']
const getDetector = (): BarcodeDetectorCtor | undefined => (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector

interface Props {
  onDetected: (code: string) => void
  /** Barcodes used by the "Use sample barcode" demo action. */
  sampleCodes: string[]
}

/**
 * Camera barcode / QR scanner. Uses the browser BarcodeDetector API when it
 * exists; otherwise the user can type the code or use a sample barcode.
 */
export function BarcodeScanner({ onDetected, sampleCodes }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState('')
  const [manual, setManual] = useState('')
  const sampleIndex = useRef(0)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  useEffect(() => stop, [stop])

  useEffect(() => {
    if (!scanning) return
    const Detector = getDetector()
    const video = videoRef.current
    if (!Detector || !video) return
    const detector = new Detector({ formats })
    const timer = window.setInterval(async () => {
      if (video.readyState < 2) return
      try {
        const [hit] = await detector.detect(video)
        if (hit?.rawValue) {
          stop()
          onDetected(hit.rawValue)
        }
      } catch {
        /* frame not decodable yet */
      }
    }, 400)
    return () => window.clearInterval(timer)
  }, [scanning, onDetected, stop])

  const start = async () => {
    setMessage('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Camera is not available in this browser. Enter the code below instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setScanning(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      if (!getDetector()) setMessage('Live decoding is not supported in this browser — type the code shown on the product below.')
    } catch {
      setMessage('Camera permission was denied. Enter the code below instead.')
    }
  }

  const onImage = async (file: File | undefined) => {
    if (!file) return
    setMessage('')
    const Detector = getDetector()
    if (!Detector) {
      setMessage('Reading a barcode from a photo is not supported in this browser. Type the code below instead.')
      return
    }
    try {
      const bitmap = await createImageBitmap(file)
      const [hit] = await new Detector({ formats }).detect(bitmap)
      bitmap.close()
      if (hit?.rawValue) {
        stop()
        onDetected(hit.rawValue)
      } else {
        setMessage('No barcode or QR code was found in that photo. Try a sharper photo or type the code below.')
      }
    } catch {
      setMessage('That file could not be read as an image.')
    }
  }

  const useSample = () => {
    const code = sampleCodes[sampleIndex.current % sampleCodes.length]
    sampleIndex.current += 1
    stop()
    onDetected(code)
  }

  return (
    <div>
      <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-card bg-surface-muted">
        <video ref={videoRef} muted playsInline className={scanning ? 'h-full w-full object-cover' : 'hidden'} />
        {!scanning && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-text-subtle">
            <ScanLine className="h-16 w-16" strokeWidth={1.25} />
            <p className="text-xs font-medium">Camera preview appears here</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-primary/70">
          <span className="animate-scanline absolute inset-x-2 h-0.5 rounded-full bg-primary shadow-brand" />
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="font-bold">Scan Barcode, IMEI or QR</p>
        <p className="mt-1 text-xs text-text-muted">Point the camera at the code on the product box. We'll find it automatically.</p>
        {message && (
          <p role="status" className="mx-auto mt-3 max-w-md rounded-control bg-warning-soft px-3 py-2 text-xs font-medium text-warning">
            {message}
          </p>
        )}
      </div>

      <div className="mx-auto mt-4 grid max-w-md gap-2 sm:grid-cols-2">
        {scanning ? (
          <Button variant="outline" icon={<CameraOff className="h-4 w-4" />} onClick={stop}>
            Stop Camera
          </Button>
        ) : (
          <Button icon={<Camera className="h-4 w-4" />} onClick={start}>
            Start Scanning
          </Button>
        )}
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text transition-colors focus-within:ring-2 focus-within:ring-primary hover:border-primary hover:text-primary">
          <ImageUp className="h-4 w-4" />
          Upload Image
          <input type="file" accept="image/*" className="sr-only" onChange={(event) => { void onImage(event.target.files?.[0]); event.target.value = '' }} />
        </label>
      </div>
      <div className="mx-auto mt-2 max-w-md text-center">
        <button type="button" onClick={useSample} className="text-xs font-semibold text-primary hover:underline">
          No product to hand? Try a sample barcode
        </button>
      </div>

      <form
        className="mx-auto mt-4 flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (manual.trim()) {
            stop()
            onDetected(manual.trim())
            setManual('')
          }
        }}
      >
        <input className="field flex-1" value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Or type the barcode / IMEI" aria-label="Barcode or IMEI" inputMode="numeric" />
        <Button type="submit" variant="outline">
          Find
        </Button>
      </form>
    </div>
  )
}
