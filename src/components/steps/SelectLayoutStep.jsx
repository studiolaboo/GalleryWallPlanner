import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useGallery } from '../../context/GalleryContext'
import { layoutOptions, squareLayoutOptions, portraitLayoutOptions, mixLayoutOptions, landscapeLayoutOptions, backgroundOptions, colorOptions } from '../../data'
import { TopNavBar, Breadcrumb, MobileBottomNav, MobileMenuModal, ResetModal } from '../layout'
import { processMobileFrames } from '../canvas'
import { getDynamicFrames } from '../../utils/helpers'
import Ruler from '../Ruler'

const SPACING_PRESETS = [
  { key: 'tight', label: 'TIGHT', cm: 2, inch: 0.8 },
  { key: 'gallery', label: 'GALLERY', cm: 5, inch: 2 },
  { key: 'breathe', label: 'BREATHE', cm: 10, inch: 4 },
  { key: 'museum', label: 'MUSEUM', cm: 15, inch: 6 },
]

const ORIENTATION_OPTIONS = ['Portrait', 'Landscape', 'Square', 'Mix']
const PRINT_STYLE_OPTIONS = ['Black', 'White', 'Light Oak', 'Walnut']

const FRAME_STYLE_COLORS = {
  Black:      { border: '#000000', shadow: 'rgba(0,0,0,0.45)', inner: '#000000' },
  White:      { border: '#ffffff', shadow: 'rgba(0,0,0,0.15)', inner: '#ffffff' },
  'Light Oak': { border: '#c8a876', shadow: 'rgba(0,0,0,0.25)', inner: '#c8a876' },
  Walnut:     { border: '#4a2c2a', shadow: 'rgba(0,0,0,0.35)', inner: '#4a2c2a' },
}

// Helper to get artwork's dominant color hex value
const getArtworkBgColor = (artwork) => {
  if (!artwork?.colors?.length) return '#1a1a1a'
  const colorName = artwork.colors[0].toLowerCase().trim()
  const colorMatch = colorOptions.find(c => c.value === colorName || c.name.toLowerCase() === colorName)
  return colorMatch?.color || '#1a1a1a'
}

// Print sizes per orientation and unit
const PRINT_SIZES = {
  Landscape: {
    cm: ['18 × 13', '35 × 27', '40 × 30', '50 × 40', '60 × 40', '70 × 50', '80 × 60', '90 × 60', '100 × 70', '100 × 75', '29.7 × 21', '42 × 29.7', '59.4 × 42', '84.1 × 59.5', '118.9 × 84.1'],
    in: ['7 × 5', '14 × 11', '16 × 12', '20 × 16', '24 × 16', '28 × 20', '32 × 24', '36 × 24', '40 × 28', '40 × 30', 'A4', 'A3', 'A2', 'A1', 'A0'],
  },
  Portrait: {
    cm: ['13 × 18', '27 × 35', '30 × 40', '40 × 50', '40 × 60', '50 × 70', '60 × 80', '60 × 90', '70 × 100', '75 × 100', '21 × 29.7', '29.7 × 42', '42 × 59.4', '59.5 × 84.1', '84.1 × 118.9'],
    in: ['5 × 7', '11 × 14', '12 × 16', '16 × 20', '16 × 24', '20 × 28', '24 × 32', '24 × 36', '28 × 40', '30 × 40', 'A4', 'A3', 'A2', 'A1', 'A0'],
  },
  Square: {
    cm: ['25 × 25', '30 × 30', '35 × 35', '40 × 40', '45 × 45', '50 × 50', '70 × 70'],
    in: ['10 × 10', '12 × 12', '14 × 14', '16 × 16', '18 × 18', '20 × 20', '28 × 28'],
  },
  Mix: {
    cm: ['13 × 18', '27 × 35', '30 × 40', '40 × 50', '40 × 60', '50 × 70', '60 × 80', '60 × 90', '70 × 100', '75 × 100', '21 × 29.7', '29.7 × 42', '42 × 59.4', '59.5 × 84.1', '84.1 × 118.9'],
    in: ['5 × 7', '11 × 14', '12 × 16', '16 × 20', '16 × 24', '20 × 28', '24 × 32', '24 × 36', '28 × 40', '30 × 40', 'A4', 'A3', 'A2', 'A1', 'A0'],
  },
}

const PRINTS_COUNT_OPTIONS = ['1 Prints', '2 Prints', '3 Prints', '4 Prints', '5 Prints', '6+ Prints']

export default function SelectLayoutStep() {
  const {
    setCurrentStep,
    selectedLayout, setSelectedLayout,
    selectedBackground,
    selectedArtworks, setSelectedArtworks,
    setActiveFrameIndex,
    showLayoutChangeModal, setShowLayoutChangeModal,
    pendingLayout, setPendingLayout,
    isMobile,
    isDragging,
    groupOffset, dragOffset,
    handleDragStart,
    wasDraggingRef,
    canvasRef,
    canvasAspectRatio,
    selectedPlace,
    isLocked, setIsLocked,
    individualOffsets, activeDragFrameIdx, individualDragLive,
    handleIndividualDragStart,
    resetPositions,
    duplicateFrame,
    measurementUnit, setMeasurementUnit,
    printOrientation, setPrintOrientation,
    printStyle, setPrintStyle,
    printSize, setPrintSize,
    perFrameSizes, setPerFrameSizes,
    spacingPreset, setSpacingPreset,
    spacingValue, setSpacingValue,
    innerShadow,
    wallScale, setWallScale,
    showGrid, setShowGrid,
    showRuler, setShowRuler,
    undo, redo, canUndo, canRedo,
    handleReset,
  } = useGallery()

  const [printsFilter, setPrintsFilter] = useState('2')
  const [selectedFrameIdx, setSelectedFrameIdx] = useState(null)
  const prevLayoutIdRef = useRef(selectedLayout?.id)

  const filteredLayouts = useMemo(() => {
    // Use square-specific layouts when Square orientation is selected
    if (printOrientation === 'Square') {
      return squareLayoutOptions.filter(layout => {
        if (printsFilter === 'All') return true
        const count = layout.frameCount
        if (printsFilter === '6+') return count >= 6
        return count === parseInt(printsFilter)
      })
    }

    // Use portrait-specific layouts when Portrait orientation is selected
    if (printOrientation === 'Portrait') {
      return portraitLayoutOptions.filter(layout => {
        if (printsFilter === 'All') return true
        const count = layout.frameCount
        if (printsFilter === '6+') return count >= 6
        return count === parseInt(printsFilter)
      })
    }

    // Use mix-specific layouts when Mix orientation is selected
    if (printOrientation === 'Mix') {
      return mixLayoutOptions.filter(layout => {
        if (printsFilter === 'All') return true
        const count = layout.frameCount
        if (printsFilter === '6+') return count >= 6
        return count === parseInt(printsFilter)
      })
    }

    // Use landscape-specific layouts when Landscape orientation is selected
    if (printOrientation === 'Landscape') {
      return landscapeLayoutOptions.filter(layout => {
        if (printsFilter === 'All') return true
        const count = layout.frameCount
        if (printsFilter === '6+') return count >= 6
        return count === parseInt(printsFilter)
      })
    }

    return layoutOptions.filter(layout => {
      // Prints (frame count) filter
      if (printsFilter !== 'All') {
        const count = layout.frames.length
        if (printsFilter === '6+') {
          if (count < 6) return false
        } else {
          if (count !== parseInt(printsFilter)) return false
        }
      }
      // Orientation filter
      if (printOrientation !== 'Mix') {
        const hasMatchingOrientation = layout.frames.some(frame => {
          const [w, h] = frame.size.split(/x/i).map(Number)
          if (printOrientation === 'Portrait') return h > w
          if (printOrientation === 'Landscape') return w > h
          return true
        })
        if (!hasMatchingOrientation) return false
      }
      return true
    })
  }, [printsFilter, printOrientation])

  // Compute dynamically-sized frames when a print size is selected
  const dynamicFrames = useMemo(() =>
    getDynamicFrames(selectedLayout?.frames, perFrameSizes.length > 0 ? perFrameSizes : printSize, measurementUnit, printOrientation, wallScale, spacingValue, canvasAspectRatio),
    [selectedLayout, perFrameSizes, printSize, measurementUnit, printOrientation, wallScale, spacingValue, canvasAspectRatio]
  )

  const handleLayoutSelect = (layout) => {
    const hasSelectedArtworks = Object.keys(selectedArtworks).length > 0
    if (hasSelectedArtworks && selectedLayout?.id !== layout.id) {
      setPendingLayout(layout)
      setShowLayoutChangeModal(true)
    } else {
      setSelectedLayout(layout)
    }
  }

  const handleSpacingPreset = (preset) => {
    setSpacingPreset(preset.key)
    setSpacingValue(measurementUnit === 'cm' ? preset.cm : preset.inch)
  }

  // const handleShadowChange = useCallback((key, value) => {
  //   setInnerShadow(prev => ({ ...prev, [key]: value }))
  // }, [setInnerShadow])

  // const resetShadow = () => {
  //   setInnerShadow({ xOffset: 0, yOffset: 2, blur: 10, spread: 0, opacity: 20 })
  // }

  const innerShadowCSS = `inset ${innerShadow.xOffset}px ${innerShadow.yOffset}px ${innerShadow.blur}px ${innerShadow.spread}px rgba(0,0,0,${(innerShadow.opacity / 100).toFixed(1)})`

  const unit = measurementUnit === 'cm' ? 'cm' : 'in'
  const sizeOptions = PRINT_SIZES[printOrientation]?.[unit] || PRINT_SIZES['Landscape'][unit]
  const spacingUnit = unit

  const handleOrientationChange = (newOrientation) => {
    setPrintOrientation(newOrientation)
    const sizes = PRINT_SIZES[newOrientation]?.[unit] || PRINT_SIZES['Landscape'][unit]
    if (sizes?.length) setPrintSize(sizes[0])
  }

  const handleUnitChange = (newUnit) => {
    const oldUnit = measurementUnit
    const oldSizes = PRINT_SIZES[printOrientation]?.[oldUnit] || PRINT_SIZES['Portrait'][oldUnit]
    const newSizes = PRINT_SIZES[printOrientation]?.[newUnit] || PRINT_SIZES['Portrait'][newUnit]
    // Find the index of the current size in the old unit list, map to the same index in the new unit list
    const currentIdx = oldSizes?.indexOf(printSize) ?? -1
    const newSize = (currentIdx >= 0 && newSizes?.[currentIdx]) ? newSizes[currentIdx] : (newSizes?.[0] || printSize)
    setMeasurementUnit(newUnit)
    setPrintSize(newSize)
    // Also map per-frame sizes to the corresponding values in the new unit
    if (perFrameSizes.length > 0 && oldSizes && newSizes) {
      setPerFrameSizes(prev => prev.map(s => {
        const idx = oldSizes.indexOf(s)
        return (idx >= 0 && newSizes[idx]) ? newSizes[idx] : newSize
      }))
    }
  }

  // Reset per-frame sizes whenever the layout changes to a DIFFERENT layout
  // (not on re-mount when navigating back from another step)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedLayout?.frames) {
      if (prevLayoutIdRef.current !== selectedLayout.id) {
        setPerFrameSizes(new Array(selectedLayout.frames.length).fill(printSize))
        setSelectedFrameIdx(null)
      }
      prevLayoutIdRef.current = selectedLayout.id
    }
  }, [selectedLayout?.id])

  // Change size of the selected frame only, or all frames when none is selected
  const handlePrintSizeChange = (newSize) => {
    const frameCount = selectedLayout?.frames?.length || 0
    if (selectedFrameIdx !== null && frameCount > 0) {
      setPerFrameSizes(prev => {
        const sizes = prev.length >= frameCount ? [...prev] : new Array(frameCount).fill(printSize)
        sizes[selectedFrameIdx] = newSize
        return sizes
      })
    } else {
      setPrintSize(newSize)
      setPerFrameSizes(prev => prev.length > 0 ? prev.map(() => newSize) : (frameCount > 0 ? new Array(frameCount).fill(newSize) : prev))
    }
  }

  // Resolve the human-readable background label
  const getBackgroundLabel = () => {
    if (!selectedBackground) return ''
    if (selectedBackground.id?.includes('-local-')) {
      return selectedBackground.name?.toUpperCase() || ''
    }
    for (const section of backgroundOptions) {
      for (const v of section.variants) {
        if (v.id === selectedBackground.id) return (section.label || section.section).toUpperCase()
      }
    }
    return ''
  }

  // Layout name for the subtitle
  const layoutLabel = selectedLayout?.name || selectedLayout?.label || 'Select a layout'

  const [showEnlarge, setShowEnlarge] = useState(false)
  const [enlargeRuler, setEnlargeRuler] = useState(false)
  const [enlargeCanvasAspectRatio, setEnlargeCanvasAspectRatio] = useState(1.6)
  const [enlargeOffsetScale, setEnlargeOffsetScale] = useState({ x: 1, y: 1 })
  const enlargeCanvasPreviewRef = useRef(null)

  useEffect(() => {
    if (!showEnlarge) return

    const updateEnlargeCanvasAspectRatio = () => {
      const sourceCanvasEl = canvasRef?.current
      if (!sourceCanvasEl) return

      const sourceRect = sourceCanvasEl.getBoundingClientRect()
      const { width, height } = sourceRect
      if (width > 0 && height > 0) {
        setEnlargeCanvasAspectRatio(width / height)
      }

      const enlargedRect = enlargeCanvasPreviewRef.current?.getBoundingClientRect()
      if (enlargedRect && width > 0 && height > 0 && enlargedRect.width > 0 && enlargedRect.height > 0) {
        setEnlargeOffsetScale({
          x: enlargedRect.width / width,
          y: enlargedRect.height / height,
        })
      }
    }

    const rafId = window.requestAnimationFrame(updateEnlargeCanvasAspectRatio)
    window.addEventListener('resize', updateEnlargeCanvasAspectRatio)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updateEnlargeCanvasAspectRatio)
    }
  }, [showEnlarge, canvasRef])

  // Handle prints filter from dropdown
  const handlePrintsDropdownChange = (val) => {
    const match = val.match(/(\d+)/)
    if (match) {
      const num = parseInt(match[1])
      if (num >= 6) {
        setPrintsFilter('6+')
      } else {
        setPrintsFilter(String(num))
      }
    }
  }

  // Dropdown arrow SVG for select styling
  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundPosition: 'right 0.5rem center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5em 1.5em',
    paddingRight: '2.5rem',
  }

  return (
    <>
      <ResetModal />
      <div className="h-screen bg-white flex flex-col overflow-hidden">
        <TopNavBar />
        <div className="flex flex-row flex-1 overflow-hidden pb-12 lg:pb-0">
          {/* Left Sidebar */}
          <div className="flex w-28 lg:w-[35%] bg-white border-r border-gray-300 flex-col h-full">

            {/* Mobile label */}
            <div className="lg:hidden flex-shrink-0 mb-1 text-center border-b border-gray-200 pb-1 pt-1 px-1">
              <p className="text-[7px] font-bold tracking-wide">CUSTOMIZE</p>
            </div>

            {/* Scrollable sidebar content */}
            <div className="flex-1 overflow-y-auto px-1 lg:px-5 pt-4 lg:pt-6 pb-1 lg:pb-3">

              {/* Step heading - desktop */}
              <div className="hidden lg:flex items-center justify-between pb-3 mb-1 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    {/* top bar */}
                    <rect x="3" y="4" width="20" height="5" rx="1" />
                    {/* bottom-left panel */}
                    <rect x="3" y="10" width="8" height="13" rx="1" />
                    {/* bottom-right large panel */}
                    <rect x="10" y="10" width="13" height="13" rx="1" />
                  </svg>
                  <p className="text-lg font-semibold tracking-normal text-gray-800 font-['Inter']">Customize Your Prints</p>
                </div>
              </div>

              {/* ===== MEASUREMENT UNIT ===== */}
              <div className="hidden lg:flex items-center justify-between pb-4">
                <label className="text-[10px] font-bold tracking-widest text-gray-500">MEASUREMENT UNIT</label>
                <div className="flex">
                  <button
                    onClick={() => handleUnitChange('cm')}
                    className={`px-4 py-1.5 text-xs font-bold tracking-wide border transition-all duration-150 cursor-pointer ${
                      measurementUnit === 'cm'
                        ? 'bg-[#4a6741] text-white border-[#4a6741]'
                        : 'bg-white/90 text-gray-400 border-gray-300 hover:bg-gray-100'
                    } rounded-l-md`}
                  >
                    CM
                  </button>
                  <button
                    onClick={() => handleUnitChange('in')}
                    className={`px-4 py-1.5 text-xs font-bold tracking-wide border-t border-b border-r transition-all duration-150 cursor-pointer ${
                      measurementUnit === 'in'
                        ? 'bg-[#4a6741] text-white border-[#4a6741]'
                        : 'bg-white/90 text-gray-400 border-gray-300 hover:bg-gray-100'
                    } rounded-r-md`}
                  >
                    IN
                  </button>
                </div>
              </div>

              {/* ===== ORIENTATION + PRINT STYLE row ===== */}
              <div className="hidden lg:grid grid-cols-2 gap-3 pb-4">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-500 mb-1.5 block">ORIENTATION</label>
                  <select
                    value={printOrientation}
                    onChange={e => handleOrientationChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#4a6741] cursor-pointer appearance-none"
                    style={selectArrowStyle}
                  >
                    {ORIENTATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-500 mb-1.5 block">PRINT STYLE</label>
                  <select
                    value={printStyle}
                    onChange={e => setPrintStyle(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#4a6741] cursor-pointer appearance-none"
                    style={selectArrowStyle}
                  >
                    {PRINT_STYLE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* ===== PRINT SIZE + NUMBER OF PRINTS row ===== */}
              <div className="hidden lg:grid grid-cols-2 gap-3 pb-4">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-500 mb-1.5 block">PRINT SIZE</label>
                  <select
                    value={printSize}
                    onChange={e => { setPrintSize(e.target.value); setPerFrameSizes(prev => prev.map(() => e.target.value)) }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#4a6741] cursor-pointer appearance-none"
                    style={selectArrowStyle}
                  >
                    <option value="" disabled className="text-gray-400 italic">Select global size...</option>
                    {sizeOptions.map(s => { const cmA = unit === 'cm' ? {'21 × 29.7':'A4','29.7 × 42':'A3','42 × 59.4':'A2','59.5 × 84.1':'A1','84.1 × 118.9':'A0'}[s] : null; return <option key={s} value={s}>{cmA ? `${cmA} - ${s} cm` : s.startsWith('A') ? s : `${s} ${unit === 'in' ? '"' : unit}`}</option>; })}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-500 mb-1.5 block">NUMBER OF PRINTS</label>
                  <select
                    onChange={e => handlePrintsDropdownChange(e.target.value)}
                    value={printsFilter === '6+' ? '6+ Prints' : `${printsFilter} Prints`}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#4a6741] cursor-pointer appearance-none"
                    style={selectArrowStyle}
                  >
                    {PRINTS_COUNT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* ===== Layout Options - 2 column grid ===== */}
              <div className="pb-4">
                <div className="grid grid-cols-2 gap-2 lg:gap-3">
                  {filteredLayouts.map((layout) => {
                    const isSelected = selectedLayout?.id === layout.id
                    // Scale the whole group down based on frame count to prevent clashing
                    const frameCount = layout.frames?.length || 1
                    const groupScale = frameCount === 1 ? 1.3
                      : frameCount === 2 ? 1.15
                      : frameCount === 3 ? 1.0
                      : frameCount <= 5 ? 0.88
                      : 0.76
                    return (
                    <div
                      key={layout.id}
                      onClick={() => handleLayoutSelect(layout)}
                      className={`relative cursor-pointer transition-all duration-200 group rounded-xl overflow-hidden ${
                        isSelected
                          ? 'border-[2.5px] border-[#4a6741] shadow-[0_2px_12px_rgba(74,103,65,0.18)]'
                          : 'border-[1.5px] border-gray-200 hover:border-gray-300 shadow-[0_1px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_10px_rgba(0,0,0,0.10)]'
                      }`}
                    >
                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 z-10 w-5 h-5 lg:w-6 lg:h-6 bg-[#4a6741] rounded-full flex items-center justify-center shadow-sm">
                          <svg className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <div className="relative bg-gray-50/80 pb-0 overflow-hidden" style={{ aspectRatio: '5 / 3' }}>
                        {layout.image ? (
                          <img 
                            src={layout.image} 
                            alt={layout.name}
                            className="w-full h-full object-contain transition-all duration-200 group-hover:opacity-80 cursor-pointer"
                          />
                        ) : (
                          /* Wrapper scales all frames as a group, then shifts down toward title */
                          <div
                            className="absolute inset-0"
                            style={{
                              transform: `scale(${groupScale}) translateY(14%)`,
                              transformOrigin: 'center center',
                            }}
                          >
                            {layout.frames.map((frame, idx) => {
                              const isSquareLayout = typeof layout.id === 'string' && layout.id.startsWith('sq-')
                              const isPortraitLayout = typeof layout.id === 'string' && layout.id.startsWith('pt-')
                              const isSquareFrame = frame.forceSquare === true
                              const thumbHeight = isPortraitLayout ? `${parseFloat(frame.height) * 0.85}%` : frame.height
                              return (
                                <div
                                  key={idx}
                                  className={`absolute transition-all duration-200 ${
                                    isSelected ? 'bg-[#a8b8a0]' : 'bg-[#c5c5c5] group-hover:bg-[#b0b0b0]'
                                  }`}
                                  style={{
                                    width: frame.width,
                                    ...(isSquareLayout || isSquareFrame ? { aspectRatio: '1' } : { height: thumbHeight }),
                                    top: frame.top || undefined,
                                    bottom: frame.bottom || undefined,
                                    left: frame.left || undefined,
                                    right: frame.right || undefined,
                                    transform: frame.transform,
                                    boxShadow: '3px 3px 8px rgba(0,0,0,0.18)',
                                  }}
                                />
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <div className="px-1.5 pt-1 pb-2 lg:px-2 lg:pt-1.5 lg:pb-2.5 text-center">
                        <p className={`text-[7px] lg:text-[11px] font-semibold tracking-wide uppercase truncate transition-colors duration-200 ${
                          isSelected ? 'text-[#4a6741]' : 'text-gray-500'
                        }`}>{layout.name}</p>
                      </div>
                    </div>
                    )
                  })}
                  {filteredLayouts.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-gray-400 text-sm">
                      No layouts match your filters
                    </div>
                  )}
                </div>
              </div>

              {/* ===== SPACING Section ===== */}
              <div className="hidden lg:block pb-4 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-[10px] font-bold tracking-widest text-gray-500">SPACING</label>
                  {spacingPreset === null && (
                    <button
                      onClick={() => handleSpacingPreset(SPACING_PRESETS[1])}
                      className="text-[9px] font-bold tracking-widest text-[#4a6741] bg-white border border-[#4a6741] hover:bg-green-50 px-2.5 py-1 rounded transition-colors cursor-pointer"
                    >
                      USE PRESETS
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {SPACING_PRESETS.map(preset => {
                    const displayVal = measurementUnit === 'cm' ? preset.cm : preset.inch
                    const isActive = spacingPreset === preset.key
                    return (
                      <button
                        key={preset.key}
                        onClick={() => handleSpacingPreset(preset)}
                        className={`py-2.5 rounded-xl border-2 text-center transition-all duration-150 cursor-pointer ${
                          isActive
                            ? 'border-[#4a6741] bg-white shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <p className={`text-[10px] font-bold tracking-wide ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
                          {preset.label}
                        </p>
                        <p className="text-[10px] mt-0.5 text-gray-400">
                          {displayVal}{spacingUnit}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ===== Fine-Tune Spacing Slider ===== */}
              <div className="hidden lg:block pb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold tracking-widest text-gray-400">FINE-TUNE SPACING</label>
                  {spacingPreset !== null ? (
                    <span className="text-[10px] font-bold tracking-widest text-gray-400">ADJUST TO CUSTOMIZE</span>
                  ) : (
                    <span className="text-[10px] font-bold tracking-widest text-[#4a6741]">
                      {spacingValue.toFixed(1).replace(/\.0$/, '')}{measurementUnit === 'cm' ? ' CM' : ' IN'}
                    </span>
                  )}
                </div>
                <input
                  type="range"
                  min={0}
                  max={measurementUnit === 'cm' ? 40 : 16}
                  step={measurementUnit === 'cm' ? 0.5 : 0.2}
                  value={spacingValue}
                  onChange={e => {
                    setSpacingValue(parseFloat(e.target.value))
                    setSpacingPreset(null)
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#4a6741]"
                />
              </div>

              {/* ===== INNER SHADOW TUNING (HIDDEN FOR NOW) =====
              <div className="hidden lg:block pb-4 border-t border-gray-200 pt-6 mt-2">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 tracking-wide">INNER SHADOW TUNING</h3>
                    <p className="text-[10px] text-gray-400 italic">Simulate depth inside the frame</p>
                  </div>
                  <button
                    onClick={resetShadow}
                    className="text-[10px] font-bold tracking-widest text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                  >
                    RESET
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold tracking-widest text-gray-500">X OFFSET</label>
                      <span className="text-[10px] font-bold text-gray-500">{innerShadow.xOffset}PX</span>
                    </div>
                    <input
                      type="range" min={-50} max={50}
                      value={innerShadow.xOffset}
                      onChange={e => handleShadowChange('xOffset', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#4a6741]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold tracking-widest text-gray-500">Y OFFSET</label>
                      <span className="text-[10px] font-bold text-gray-500">{innerShadow.yOffset}PX</span>
                    </div>
                    <input
                      type="range" min={-50} max={50}
                      value={innerShadow.yOffset}
                      onChange={e => handleShadowChange('yOffset', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#4a6741]"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold tracking-widest text-gray-500">BLUR RADIUS</label>
                    <span className="text-[10px] font-bold text-gray-500">{innerShadow.blur}PX</span>
                  </div>
                  <input
                    type="range" min={0} max={100}
                    value={innerShadow.blur}
                    onChange={e => handleShadowChange('blur', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#4a6741]"
                  />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold tracking-widest text-gray-500">SPREAD</label>
                    <span className="text-[10px] font-bold text-gray-500">{innerShadow.spread}PX</span>
                  </div>
                  <input
                    type="range" min={-50} max={50}
                    value={innerShadow.spread}
                    onChange={e => handleShadowChange('spread', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#4a6741]"
                  />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold tracking-widest text-gray-500">OPACITY</label>
                    <span className="text-[10px] font-bold text-gray-500">{innerShadow.opacity}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100}
                    value={innerShadow.opacity}
                    onChange={e => handleShadowChange('opacity', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#4a6741]"
                  />
                </div>

                <div className="mt-5 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 mb-1.5 block">INNER SHADOW CODE:</label>
                  <p className="text-[11px] text-gray-600 font-sans break-all">{innerShadowCSS}</p>
                </div>
              </div>
              */}

            </div>

            {/* Bottom Navigation Buttons - pinned at bottom */}
            <div className="hidden lg:flex flex-shrink-0 px-5 py-3 items-center justify-between gap-2">
              <button
                onClick={() => setCurrentStep('step1')}
                className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold tracking-widest uppercase hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Previous Step
              </button>
              <button
                disabled={!selectedLayout}
                onClick={() => selectedLayout && setCurrentStep('step3')}
                className="flex items-center gap-1.5 bg-[#4a6741] text-white px-5 py-2.5 font-bold text-[11px] tracking-widest uppercase rounded-md hover:bg-[#3d5636] transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
              >
                Select Art
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>

          {/* ========== RIGHT SECTION ========== */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ---- Canvas Header Bar ---- */}
            <div className="hidden lg:flex items-center justify-between px-8 pt-7 pb-4 bg-white flex-shrink-0">
              <div className="flex-shrink-0">
                <h3 className="text-base font-bold tracking-wider text-gray-900 capitalize leading-tight font-['Inter']">
                  {(getBackgroundLabel() || 'Select a Background').toLowerCase()}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-['Inter']">
                  Previewing Layout: {layoutLabel}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="tracking-wide leading-tight text-left">DRAG TO REPOSITION<br/>GALLERY</span>
                </button>
                <div className="w-px h-8 bg-gray-200 mx-1" />
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                    showGrid ? 'text-[#4a6741] bg-green-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                  <span className="tracking-wide leading-tight text-left">GRID<br/>{showGrid ? 'ON' : 'OFF'}</span>
                </button>
                <div className="w-px h-8 bg-gray-200 mx-1" />
                <button
                  onClick={() => setShowRuler(!showRuler)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                    showRuler ? 'text-[#4a6741] bg-green-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
                  </svg>
                  <span className="tracking-wide">RULER</span>
                </button>
                <div className="w-px h-8 bg-gray-200 mx-1" />
                <button
                  onClick={() => setShowEnlarge(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                  <span className="tracking-wide">ENLARGE</span>
                </button>

                <div className="w-px h-8 bg-gray-200 mx-1" />

                {/* Reset App */}
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  <span className="tracking-wide">RESET APP</span>
                </button>
              </div>
            </div>

            {/* ---- Canvas Area ---- */}
            <div className="flex-1 flex flex-col overflow-hidden no-scroll-fullscreen p-4 lg:p-6">
              <div
                ref={canvasRef}
                className="flex-1 relative bg-cover bg-center overflow-hidden transition-all duration-500 rounded-2xl"
                style={{
                  backgroundImage: selectedBackground
                    ? `url("${selectedBackground.image}")`
                    : selectedPlace
                      ? `url("${selectedPlace.image}")`
                      : "url(https://res.cloudinary.com/desenio/image/upload/w_1400/backgrounds/welcome-bg.jpg?v=1)",
                }}
              >
                {/* Grid Overlay */}
                {showGrid && (
                  <div
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                      backgroundSize: '30px 30px',
                    }}
                  />
                )}

                {/* Ruler Overlay */}
                {showRuler && (
                  <Ruler onClose={() => setShowRuler(false)} measurementUnit={measurementUnit} wallScale={wallScale} />
                )}

                {/* Frame Preview on Canvas */}
                {selectedLayout && dynamicFrames ? (
                  <div
                    className={`absolute inset-0 ${isMobile ? 'flex items-center justify-center' : ''}`}
                    onClick={() => setSelectedFrameIdx(null)}
                    style={{
                      cursor: 'default',
                      transform: `translate(${groupOffset.x + dragOffset.x}px, ${groupOffset.y + dragOffset.y}px)`,
                      transformOrigin: 'center center',
                      transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 1.2)'
                    }}
                  >
                    {isMobile ? (
                      <div className="relative flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
                        {(() => {
                          const { processedFrames, centerOffsetX, centerOffsetY, scale } = processMobileFrames(dynamicFrames)
                          const frameColor = FRAME_STYLE_COLORS[printStyle] || FRAME_STYLE_COLORS.Black
                          return processedFrames.map((frame, idx) => (
                            <div key={idx} className="absolute select-none"
                              onTouchStart={isLocked ? (e) => { e.stopPropagation(); handleDragStart(e) } : undefined}
                              style={{
                              left: `${frame.calcLeft * scale + centerOffsetX}%`,
                              top: `${frame.calcTop * scale + centerOffsetY}%`,
                            }}>
                              <div
                                className="relative overflow-hidden"
                                style={{
                                  width: `${frame.width * scale}vw`,
                                  height: `${frame.height * scale}vw`,
                                  border: `${Math.max(1, frame.borderWidth - 1)}px solid ${frameColor.border}`,
                                  borderRadius: '1px',
                                  boxShadow: `0 4px 16px ${frameColor.shadow}, ${innerShadowCSS}`,
                                  backgroundColor: selectedArtworks[idx] ? frameColor.inner : '#ffffff',
                                }}
                              >
                                {selectedArtworks[idx] ? (
                                  <>
                                    <img src={selectedArtworks[idx].artworkFile || selectedArtworks[idx].image} alt={selectedArtworks[idx].title} className="absolute inset-0 w-full h-full object-fill pointer-events-none" draggable={false} />
                                    <div className="absolute inset-0 pointer-events-none rounded-[1px]" style={{boxShadow: innerShadowCSS}} />
                                  </>
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="absolute bottom-[-18px] left-0 right-0 flex justify-center pointer-events-none">
                                <span className="bg-white/90 text-gray-600 text-[8px] font-bold tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap uppercase">
                                  {frame.size}{/^A\d$/i.test(frame.size) ? '' : ` ${measurementUnit.toUpperCase()}`}
                                </span>
                              </div>
                            </div>
                          ))
                        })()}
                      </div>
                    ) : (
                      (() => {
                        const frameColor = FRAME_STYLE_COLORS[printStyle] || FRAME_STYLE_COLORS.Black
                        return dynamicFrames.map((frame, idx) => {
                          const isSelected = selectedFrameIdx === idx
                          const indivBase = individualOffsets[idx] || { x: 0, y: 0 }
                          const indivLive = (!isLocked && activeDragFrameIdx === idx) ? individualDragLive : { x: 0, y: 0 }
                          const indivX = indivBase.x + indivLive.x
                          const indivY = indivBase.y + indivLive.y
                          return (
                            <div
                              key={idx}
                              className="absolute select-none"
                              onClick={(e) => { e.stopPropagation(); if (!wasDraggingRef.current) setSelectedFrameIdx(idx) }}
                              onMouseDown={(e) => { e.stopPropagation(); isLocked ? handleDragStart(e) : handleIndividualDragStart(e, idx) }}
                              onTouchStart={(e) => { e.stopPropagation(); isLocked ? handleDragStart(e) : handleIndividualDragStart(e, idx) }}
                              style={{
                                top: `${frame.centerY}%`,
                                left: `${frame.centerX}%`,
                                width: frame.width,
                                aspectRatio: `${frame.aspectRatio}`,
                                transform: `translate(calc(-50% + ${indivX}px), calc(-50% + ${indivY}px))`,
                                zIndex: activeDragFrameIdx === idx ? 999 : Math.round(100 - frame.centerY),
                                cursor: (isDragging || activeDragFrameIdx === idx) ? 'grabbing' : 'grab',
                                transition: activeDragFrameIdx === idx ? 'none' : 'transform 0.2s ease',
                              }}
                            >
                              <div
                                className="w-full h-full overflow-hidden relative cursor-pointer group"
                                style={{
                                  border: `${frame.borderWidth}px solid ${frameColor.border}`,
                                  borderRadius: '2px',
                                  boxShadow: `0 6px 24px ${frameColor.shadow}, 0 2px 8px rgba(0,0,0,0.12), ${innerShadowCSS}`,
                                  backgroundColor: selectedArtworks[idx] ? frameColor.inner : '#ffffff',
                                }}
                              >
                                {selectedArtworks[idx] ? (
                                  <>
                                    <img
                                      src={selectedArtworks[idx].artworkFile || selectedArtworks[idx].image}
                                      alt={selectedArtworks[idx].title}
                                      className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                                      draggable={false}
                                      onClick={(e) => { e.stopPropagation(); setActiveFrameIndex(idx); setCurrentStep('step3') }}
                                    />
                                    <div className="absolute inset-0 pointer-events-none" style={{boxShadow: innerShadowCSS}} />
                                  </>
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <button
                                      className="flex items-center justify-center text-gray-300 hover:text-[#4a6741] transition-colors cursor-pointer"
                                      style={{ width: '20px', height: '20px' }}
                                      onClick={(e) => { e.stopPropagation(); setActiveFrameIndex(idx); setCurrentStep('step3') }}
                                      title="Select art for this frame"
                                    >
                                      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className="w-full h-full">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                                {selectedFrameIdx === idx && (
                                  <div className="absolute top-1 right-1 w-4 h-4 bg-[#4a6741] rounded-full flex items-center justify-center shadow-md z-10 pointer-events-none">
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    duplicateFrame(idx)
                                  }}
                                  className="absolute bottom-1 right-1 w-6 h-6 bg-[#4a6741]/90 hover:bg-[#3d5636] rounded-full flex items-center justify-center shadow-lg z-10 opacity-100 transition-all duration-200 cursor-pointer hover:scale-110 border border-[#4a6741]"
                                  title="Duplicate frame"
                                >
                                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                              <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ bottom: '-22px' }}>
                                <span className="bg-white/90 backdrop-blur-sm text-gray-600 text-[9px] font-bold tracking-wider px-2.5 py-1 rounded-md shadow-sm whitespace-nowrap uppercase">
                                  {frame.size}{/^A\d$/i.test(frame.size) ? '' : ` ${measurementUnit.toUpperCase()}`}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      })()
                    )}
                  </div>
                ) : (
                  !selectedPlace && !selectedBackground && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur-sm px-6 lg:px-12 py-4 lg:py-8 rounded-lg shadow-xl">
                        <p className="text-xs lg:text-2xl font-light text-gray-700 text-center">
                          Select a room to continue
                        </p>
                      </div>
                    </div>
                  )
                )}
                
                {/* ---- Canvas Overlay Controls ---- */}
                <div className="hidden lg:flex absolute top-4 left-4 z-20 items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-3 shadow-md">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Wall Scale</span>
                  <span className="text-[15px] font-bold text-gray-400 leading-none select-none">−</span>
                  <div className="relative" style={{marginBottom: '10px'}}>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={wallScale}
                      onChange={(e) => setWallScale(parseInt(e.target.value))}
                      className="w-24 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#4a6741] block"
                    />
                    <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[8px] font-bold text-gray-400 leading-none whitespace-nowrap">0</span>
                  </div>
                  <span className="text-[15px] font-bold text-gray-400 leading-none select-none">+</span>
                  <span className="text-[11px] font-bold text-gray-500 min-w-[20px] text-right">{wallScale}</span>
                </div>
                <div className="hidden lg:flex absolute top-4 right-4 z-20 items-center gap-2">
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className={`w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center transition-colors cursor-pointer ${canUndo ? 'hover:bg-gray-100' : 'opacity-40 cursor-default'}`}
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                  </button>
                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    className={`w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center transition-colors cursor-pointer ${canRedo ? 'hover:bg-gray-100' : 'opacity-40 cursor-default'}`}
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                    </svg>
                  </button>
                </div>
                <div className="hidden lg:flex absolute bottom-4 left-4 z-20">
                  <button
                    onClick={() => handleUnitChange('cm')}
                    className={`px-3 py-1.5 text-[10px] font-bold tracking-wide border transition-all duration-150 cursor-pointer rounded-l-md ${
                      measurementUnit === 'cm'
                        ? 'bg-[#4a6741] text-white border-[#4a6741]'
                        : 'bg-white/90 text-gray-400 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    CM
                  </button>
                  <button
                    onClick={() => handleUnitChange('in')}
                    className={`px-3 py-1.5 text-[10px] font-bold tracking-wide border-t border-b border-r transition-all duration-150 cursor-pointer rounded-r-md ${
                      measurementUnit === 'in'
                        ? 'bg-[#4a6741] text-white border-[#4a6741]'
                        : 'bg-white/90 text-gray-400 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    IN
                  </button>
                </div>
                <div className="hidden lg:flex absolute bottom-4 right-4 z-20 items-center gap-2">
                  {/* Restore: resets all frames to original centred position */}
                  <button
                    onClick={resetPositions}
                    title="Restore original positions"
                    className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h13a5 5 0 010 10h-3" />
                    </svg>
                  </button>
                  {/* Lock: locked = collective drag, unlocked = individual drag */}
                  <button
                    onClick={() => setIsLocked(l => !l)}
                    title={isLocked ? 'Unlock to drag frames individually' : 'Lock to drag all frames together'}
                    className={`w-8 h-8 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center transition-colors cursor-pointer ${
                      isLocked ? 'bg-white/90 hover:bg-gray-100' : 'bg-[#4a6741]/10 hover:bg-[#4a6741]/20'
                    }`}
                  >
                    {isLocked ? (
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-[#4a6741]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ---- Bottom Bar: Print Size + Frame Style + Description ---- */}
            <div className="hidden lg:flex items-center gap-4 px-8 pt-3 pb-5 bg-white flex-shrink-0">
              <div className="flex-shrink-0">
                <label className="block text-[9px] font-bold tracking-widest text-gray-400 mb-0.5">
                  {selectedFrameIdx !== null ? `PRINT SIZE — FRAME ${selectedFrameIdx + 1}` : 'PRINT SIZE'}
                </label>
                <div className="relative">
                  <select
                    value={selectedFrameIdx !== null ? (perFrameSizes[selectedFrameIdx] ?? printSize) : printSize}
                    onChange={(e) => handlePrintSizeChange(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#4a6741] cursor-pointer appearance-none pr-7 min-w-[130px]"
                    style={selectArrowStyle}
                  >
                    <option value="">Select size...</option>
                    {sizeOptions.map(s => { const cmA = unit === 'cm' ? {'21 × 29.7':'A4','29.7 × 42':'A3','42 × 59.4':'A2','59.5 × 84.1':'A1','84.1 × 118.9':'A0'}[s] : null; return <option key={s} value={s}>{cmA ? `${cmA} - ${s} cm` : s.startsWith('A') ? s : `${s} ${unit === 'in' ? '"' : unit}`}</option>; })}
                  </select>
                </div>
              </div>
              <div className="flex-shrink-0">
                <label className="block text-[9px] font-bold tracking-widest text-gray-400 mb-0.5">YOUR FRAME STYLE</label>
                <div className="relative">
                  <select
                    value={printStyle}
                    onChange={(e) => setPrintStyle(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#4a6741] cursor-pointer appearance-none pr-7 min-w-[110px]"
                    style={selectArrowStyle}
                  >
                    {PRINT_STYLE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <MobileBottomNav />
          </div>
        </div>
      </div>

      <MobileMenuModal />

      {/* Layout Change Confirmation Modal */}
      {showLayoutChangeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-12 sm:p-16 max-w-[700px] w-full relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
            {/* Close button */}
            <button
              onClick={() => {
                setShowLayoutChangeModal(false)
                setPendingLayout(null)
              }}
              className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content */}
            <div className="mb-12">
              <h2 className="font-inter text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                WOULD YOU LIKE TO CONTINUE?
              </h2>
              <p className="font-inter text-base sm:text-lg text-gray-600 leading-relaxed">
                YOU HAVE MADE CHANGES THAT HAVE NOT BEEN SAVED. WOULD YOU LIKE TO SAVE YOUR PICTURE WALL NOW?
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowLayoutChangeModal(false)
                    setPendingLayout(null)
                  }}
                  className="font-inter flex-1 bg-[#4a6741] text-white px-6 py-3 font-semibold text-sm tracking-wide uppercase rounded-xl hover:bg-[#3d5636] transition-all duration-300 cursor-pointer"
                >
                  SAVE
                </button>
                <button
                  onClick={() => {
                    setSelectedArtworks({})
                    setActiveFrameIndex(null)
                    setSelectedLayout(pendingLayout)
                    setShowLayoutChangeModal(false)
                    setPendingLayout(null)
                  }}
                  className="font-inter flex-1 bg-white text-gray-700 px-6 py-3 font-semibold text-sm tracking-wide uppercase rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-all duration-300 cursor-pointer"
                >
                  DON'T SAVE
                </button>
                <button
                  onClick={() => {
                    setShowLayoutChangeModal(false)
                    setPendingLayout(null)
                  }}
                  className="font-inter flex-1 bg-white text-gray-700 px-6 py-3 font-semibold text-sm tracking-wide uppercase rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-all duration-300 cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FULLSCREEN ENLARGE MODAL ===== */}
      {showEnlarge && (
        <div className="fixed inset-0 z-[9999] bg-[#1a1e2e] flex flex-col items-center overflow-hidden">
          {/* Close button */}
          <button
            onClick={() => { setShowEnlarge(false); setEnlargeRuler(false) }}
            className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full bg-gray-700/60 hover:bg-gray-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="flex flex-col items-center pt-6 pb-2 flex-shrink-0">
            <h1 className="text-white text-2xl lg:text-3xl font-extrabold tracking-[0.25em] uppercase mb-2">
              {layoutLabel}
            </h1>
            <div className="w-10 h-[2px] bg-[#6b8f71] mb-1.5" />
            <p className="text-gray-400 text-[10px] font-bold tracking-[0.3em] uppercase">
              Full Screen Immersive View
            </p>
          </div>

          {/* Show Measurement Ruler button */}
          <button
            onClick={() => setEnlargeRuler(!enlargeRuler)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-bold tracking-widest uppercase transition-colors cursor-pointer mb-4 flex-shrink-0 ${
              enlargeRuler
                ? 'bg-[#4a6741] text-white'
                : 'bg-gray-700/60 text-white hover:bg-gray-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
            </svg>
            {enlargeRuler ? 'HIDE MEASUREMENT RULER' : 'SHOW MEASUREMENT RULER'}
          </button>

          {/* Canvas Preview */}
          <div className="flex-1 w-full max-w-5xl px-8 pb-6 min-h-0 flex items-center justify-center">
            <div
              ref={enlargeCanvasPreviewRef}
              className="relative w-full h-full max-h-full bg-cover bg-center rounded-2xl overflow-hidden shadow-2xl"
              style={{
                backgroundImage: selectedBackground
                  ? `url("${selectedBackground.image}")`
                  : selectedPlace
                    ? `url("${selectedPlace.image}")`
                    : "url(https://res.cloudinary.com/desenio/image/upload/w_1400/backgrounds/welcome-bg.jpg?v=1)",
                aspectRatio: `${enlargeCanvasAspectRatio}`,
                maxWidth: '100%',
                objectFit: 'contain',
              }}
            >
              {enlargeRuler && (
                <Ruler onClose={() => setEnlargeRuler(false)} />
              )}

              {selectedLayout && dynamicFrames && (() => {
                const frameColor = FRAME_STYLE_COLORS[printStyle] || FRAME_STYLE_COLORS.Black
                return (
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `translate(${(groupOffset.x + dragOffset.x) * enlargeOffsetScale.x}px, ${(groupOffset.y + dragOffset.y) * enlargeOffsetScale.y}px)`,
                    }}
                  >
                    {dynamicFrames.map((frame, idx) => {
                      const artwork = selectedArtworks[idx]
                      const indivBase = individualOffsets[idx] || { x: 0, y: 0 }
                      return (
                        <div
                          key={idx}
                          className="absolute select-none"
                          style={{
                            top: `${frame.centerY}%`,
                            left: `${frame.centerX}%`,
                            width: frame.width,
                            aspectRatio: frame.aspectRatio,
                            transform: `translate(calc(-50% + ${indivBase.x * enlargeOffsetScale.x}px), calc(-50% + ${indivBase.y * enlargeOffsetScale.y}px))`,
                            zIndex: Math.round(100 - frame.centerY),
                          }}
                        >
                          <div
                            className="w-full h-full overflow-hidden relative"
                            style={{
                              border: `${frame.borderWidth}px solid ${frameColor.border}`,
                              borderRadius: '2px',
                              boxShadow: `0 6px 24px ${frameColor.shadow}, 0 2px 8px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.08)`,
                              backgroundColor: artwork ? frameColor.inner : '#ffffff',
                            }}
                          >
                            {artwork ? (
                              <>
                                <img src={artwork.artworkFile || artwork.image} alt={artwork.title} className="absolute inset-0 w-full h-full object-fill pointer-events-none" draggable={false} />
                                <div className="absolute inset-0 pointer-events-none" style={{boxShadow: innerShadowCSS}} />
                              </>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ bottom: '-22px' }}>
                            <span className="bg-white/90 backdrop-blur-sm text-gray-600 text-[9px] font-bold tracking-wider px-2.5 py-1 rounded-md shadow-sm whitespace-nowrap uppercase">
                              {frame.size}{/^A\d$/i.test(frame.size) ? '' : ` ${measurementUnit.toUpperCase()}`}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
