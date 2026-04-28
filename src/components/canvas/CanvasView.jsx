import { useGallery } from '../../context/GalleryContext'

/**
 * Processes frame positions for mobile centering.
 * Used across step3, step4, and checkout canvas views.
 */
export function processMobileFrames(frames, scale = 0.6) {
  const processedFrames = frames.map((frame, idx) => {
    const width = parseFloat(frame.width)
    const height = parseFloat(frame.height)

    let leftPos, topPos

    // getDynamicFrames outputs centerX / centerY and sets left/top to undefined,
    // so prefer those when available.
    if (frame.centerX != null && frame.centerY != null) {
      leftPos = frame.centerX - width / 2
      topPos  = frame.centerY - height / 2
    } else {
      const hasTranslateX = frame.transform && frame.transform.includes('translateX(-50%)')
      leftPos = frame.left ? parseFloat(frame.left) : (frame.right ? 100 - parseFloat(frame.right) - width : 50 - width/2)
      if (hasTranslateX) {
        leftPos = leftPos - width / 2
      }
      topPos = frame.top ? parseFloat(frame.top) : (frame.bottom ? 100 - parseFloat(frame.bottom) - height : 50 - height/2)
    }

    return { ...frame, calcLeft: leftPos, calcTop: topPos, width, height, idx }
  })
  
  const minLeft = Math.min(...processedFrames.map(f => f.calcLeft))
  const maxRight = Math.max(...processedFrames.map(f => f.calcLeft + f.width))
  const minTop = Math.min(...processedFrames.map(f => f.calcTop))
  const maxBottom = Math.max(...processedFrames.map(f => f.calcTop + f.height))
  
  const groupWidth = maxRight - minLeft
  const groupHeight = maxBottom - minTop
  
  const centerOffsetX = 50 - (groupWidth * scale) / 2 - (minLeft * scale)
  const centerOffsetY = 50 - (groupHeight * scale) / 2 - (minTop * scale)
  
  return { processedFrames, centerOffsetX, centerOffsetY, scale }
}

/**
 * The background canvas that shows behind frames.
 * Used in steps 2-4 and checkout.
 */
export function BackgroundCanvas({ children, className = "" }) {
  const { selectedBackground, selectedPlace } = useGallery()

  const bgImage = selectedBackground 
    ? `url("${selectedBackground.image}")` 
    : selectedPlace 
      ? `url("${selectedPlace.image}")`
      : "url(https://res.cloudinary.com/desenio/image/upload/w_1400/backgrounds/welcome-bg.jpg?v=1)"

  return (
    <div
      className={`flex-1 relative bg-cover bg-center transition-all duration-500 ${className}`}
      style={{ backgroundImage: bgImage }}
    >
      {children}
    </div>
  )
}

/**
 * Draggable frame container wrapper.
 * Wraps frame elements with drag behavior and styling.
 */
export function DraggableFrameContainer({ children }) {
  const { isMobile, isDragging, groupOffset, dragOffset, handleDragStart } = useGallery()

  return (
    <div 
      className={`absolute inset-0 ${isMobile ? 'flex items-center justify-center' : ''}`}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      style={{
        cursor: isDragging ? 'grabbing' : 'default',
        transform: `translate(${groupOffset.x + dragOffset.x}px, ${groupOffset.y + dragOffset.y}px)`,
        transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 1.2)'
      }}
    >
      {children}
    </div>
  )
}
