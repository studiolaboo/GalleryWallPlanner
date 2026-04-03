import { useState, useRef, useCallback, useEffect } from 'react'

const RULER_LENGTH_CM  = 190
const PX_PER_CM        = 3.0   // 190 cm ≈ 570 px
const RULER_LENGTH_IN  = 75
const PX_PER_IN        = 7.6   // 75 in × 7.6 ≈ 570 px  (same screen width as CM ruler)
const RULER_H          = 38    // ruler body height
const RX               = 5     // rounded corners

// 28×28 four-way arrow cursor
const ARROW_SVG = `%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpolygon points='14,2 18,8 16,8 16,12 20,12 20,10 26,14 20,18 20,16 16,16 16,20 18,20 14,26 10,20 12,20 12,16 8,16 8,18 2,14 8,10 8,12 12,12 12,8 10,8' fill='white' stroke='%23333' stroke-width='1'/%3E%3C/svg%3E`

// ── Metric tick marks (every cm, major every 10 cm) ──────────────────────────
function buildCMTicks(pxPerUnit) {
  const ticks = []
  for (let cm = 0; cm <= RULER_LENGTH_CM; cm++) {
    const isMajor = cm % 10 === 0
    const isMid   = cm % 5  === 0 && !isMajor
    const x       = cm * pxPerUnit
    const sw      = isMajor ? 0.9 : 0.55
    const col     = isMajor ? '#444' : '#777'
    const topH    = isMajor ? RULER_H * 0.60 : isMid ? RULER_H * 0.37 : RULER_H * 0.20
    ticks.push(
      <g key={cm}>
        <line x1={x} y1={0} x2={x} y2={topH} stroke={col} strokeWidth={sw} />
        {isMajor && cm > 0 && (
          <text x={x} y={RULER_H - 4} textAnchor="middle" fontSize="6.5"
            fontFamily="Inter, sans-serif" fill="#333" fontWeight="600">
            {cm}
          </text>
        )}
      </g>
    )
  }
  return ticks
}

// ── Imperial tick marks (every inch, major every 5 in) ───────────────────────
function buildInTicks(pxPerUnit) {
  const ticks = []
  for (let inch = 0; inch <= RULER_LENGTH_IN; inch++) {
    const isMajor  = inch % 5  === 0
    const isHalf   = inch % 2  === 0 && !isMajor  // every 2nd inch = medium tick
    const x        = inch * pxPerUnit
    const sw       = isMajor ? 0.9 : 0.55
    const col      = isMajor ? '#444' : '#777'
    const topH     = isMajor ? RULER_H * 0.60 : isHalf ? RULER_H * 0.37 : RULER_H * 0.20
    ticks.push(
      <g key={inch}>
        <line x1={x} y1={0} x2={x} y2={topH} stroke={col} strokeWidth={sw} />
        {isMajor && inch > 0 && (
          <text x={x} y={RULER_H - 4} textAnchor="middle" fontSize="6.5"
            fontFamily="Inter, sans-serif" fill="#333" fontWeight="600">
            {inch}&quot;
          </text>
        )}
      </g>
    )
  }
  return ticks
}

export default function Ruler({ onClose, measurementUnit = 'cm', wallScale = 0 }) {
  const isImperial = measurementUnit === 'in'

  // Mirror the same scale factor used by getDynamicFrames
  // wallScale range: -50 … 50  →  scaleFactor: 0 … 2  (clamped to ≥ 0.25)
  const scaleFactor = Math.max(0.25, (wallScale + 50) / 50)

  const [position, setPosition] = useState({ x: 40, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const startDrag = useCallback((e) => {
    if (e.target.closest('button')) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragStart.current = { x: clientX - position.x, y: clientY - position.y }
  }, [position])

  const onMove = useCallback((e) => {
    if (!isDragging) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setPosition({
      x: clientX - dragStart.current.x,
      y: clientY - dragStart.current.y,
    })
  }, [isDragging])

  const onUp = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
      window.addEventListener('touchmove', onMove, { passive: false })
      window.addEventListener('touchend', onUp)
    }
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [isDragging, onMove, onUp])

  const pxPerUnit   = isImperial ? PX_PER_IN * scaleFactor : PX_PER_CM * scaleFactor
  const rulerLen    = isImperial ? RULER_LENGTH_IN : RULER_LENGTH_CM
  const totalWidth  = rulerLen * pxPerUnit
  const ticks       = isImperial ? buildInTicks(pxPerUnit) : buildCMTicks(pxPerUnit)
  const badgeLabel  = isImperial ? `${RULER_LENGTH_IN}" IMPERIAL RULER` : `${RULER_LENGTH_CM}CM METRIC STICK`
  const clipId      = isImperial ? 'rulerClipIn' : 'rulerClipCm'

  const moveCursor = `url("data:image/svg+xml,${ARROW_SVG}") 14 14, move`
  const grabCursor = `url("data:image/svg+xml,${ARROW_SVG}") 14 14, grabbing`
  const cursor     = isDragging ? grabCursor : moveCursor

  return (
    <div className="absolute z-[500] select-none" style={{ left: position.x, top: position.y }}>

      {/* Badge row */}
      <div
        className="flex items-center gap-1.5 mb-1"
        style={{ cursor }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <div className="flex items-center gap-1.5 bg-[#5a6e4a] text-white px-2.5 py-1 rounded-full shadow text-[10px] font-bold tracking-wide">
          {/* ruler icon — diagonal ruler with notch tick-marks (Phosphor Icons "ruler") */}
          <svg className="w-3 h-3 opacity-90" viewBox="0 0 256 256" fill="currentColor">
            <path d="M235.33,68.84,187.16,20.66a16,16,0,0,0-22.63,0L20.69,164.51a16,16,0,0,0,0,22.62l48.17,48.17a16,16,0,0,0,22.63,0L235.33,91.47A16,16,0,0,0,235.33,68.84ZM79.83,224,32,176.17,59.31,148.9l24,24a8,8,0,0,0,11.31-11.31l-24-24L88,120.23l16,16a8,8,0,0,0,11.31-11.31l-16-16L115.7,92.5l24,24a8,8,0,0,0,11.32-11.31l-24-24L155.56,52.6l47.84,47.84Z"/>
          </svg>
          <span>{badgeLabel}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-5 h-5 bg-white/90 text-gray-600 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow text-[10px] font-bold leading-none"
          style={{ cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      {/* Ruler bar */}
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        style={{ cursor, width: totalWidth + 2 }}
        className="overflow-hidden shadow-md"
      >
        <svg
          width={totalWidth + 2}
          height={RULER_H + 2}
          viewBox={`-1 -1 ${totalWidth + 2} ${RULER_H + 2}`}
          style={{ display: 'block' }}
        >
          {/* Body */}
          <rect x={0} y={0} width={totalWidth} height={RULER_H} fill="#f8f6f0" rx={RX} />
          {/* Border */}
          <rect x={0} y={0} width={totalWidth} height={RULER_H} fill="none" stroke="#bdb5a4" strokeWidth={0.9} rx={RX} />
          {/* Clip ticks to rounded rect */}
          <clipPath id={clipId}>
            <rect x={0} y={0} width={totalWidth} height={RULER_H} rx={RX} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>{ticks}</g>
        </svg>
      </div>

    </div>
  )
}