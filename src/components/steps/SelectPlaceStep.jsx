import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useGallery } from '../../context/GalleryContext'
import { placeCategories, backgroundOptions, roomImages, colorOptions } from '../../data'
import { TopNavBar, Breadcrumb, MobileBottomNav, MobileMenuModal, ResetModal } from '../layout'
import { processMobileFrames } from '../canvas'
import { getDynamicFrames } from '../../utils/helpers'
import Ruler from '../Ruler'

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

export default function SelectPlaceStep() {
  const {
    setCurrentStep,
    selectedPlace, setSelectedPlace,
    selectedBackground, setSelectedBackground,
    selectedLayout,
    selectedArtworks,
    activeFrameIndex, setActiveFrameIndex,
    activeVariants, setActiveVariants,
    isMobile,
    isDragging,
    groupOffset, dragOffset,
    handleDragStart,
    wasDraggingRef,
    canvasRef,
    isLocked, setIsLocked,
    individualOffsets, activeDragFrameIdx, individualDragLive,
    handleIndividualDragStart,
    resetPositions,
    duplicateFrame,
    measurementUnit, setMeasurementUnit,
    printOrientation,
    printStyle, setPrintStyle,
    printSize, setPrintSize,
    perFrameSizes, setPerFrameSizes,
    spacingValue,
    innerShadow,
    wallScale, setWallScale,
    showGrid, setShowGrid,
    showRuler, setShowRuler,
    undo, redo, canUndo, canRedo,
    handleReset,
  } = useGallery()

  // Compute dynamically-sized frames when a print size is selected
  const dynamicFrames = useMemo(() =>
    getDynamicFrames(selectedLayout?.frames, perFrameSizes.length > 0 ? perFrameSizes : printSize, measurementUnit, printOrientation, wallScale, spacingValue),
    [selectedLayout, perFrameSizes, printSize, measurementUnit, printOrientation, wallScale, spacingValue]
  )

  const innerShadowCSS = `inset ${innerShadow.xOffset}px ${innerShadow.yOffset}px ${innerShadow.blur}px ${innerShadow.spread}px rgba(0,0,0,${(innerShadow.opacity / 100).toFixed(1)})`

  const unit = measurementUnit === 'cm' ? 'cm' : 'in'
  const sizeOptions = PRINT_SIZES[printOrientation]?.[unit] || PRINT_SIZES['Portrait'][unit]

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

  // Auto-select the first local image whenever the room changes and nothing is selected
  useEffect(() => {
    if (!selectedPlace) return
    const imgs = roomImages[selectedPlace.id] || []
    if (imgs.length === 0) return
    const firstId = `${selectedPlace.id}-local-0`
    if (!selectedBackground || !selectedBackground.id?.startsWith(selectedPlace.id)) {
      setSelectedBackground({ id: firstId, image: imgs[0], name: `${selectedPlace.name} 1` })
    }
  }, [selectedPlace])

  // Build background grid items:
  // - If a room is selected AND has local images → show those images
  // - Otherwise fall back to the static backgroundOptions list
  const backgroundItems = useMemo(() => {
    if (selectedPlace) {
      const imgs = roomImages[selectedPlace.id] || []
      if (imgs.length > 0) {
        return imgs.map((url, idx) => {
          const id = `${selectedPlace.id}-local-${idx}`
          return {
            sectionIdx: idx,
            label: `${selectedPlace.name} ${idx + 1}`,
            image: url,
            variant: { id, image: url, name: `${selectedPlace.name} ${idx + 1}` },
            isSelected: selectedBackground?.id === id,
          }
        })
      }
    }
    // Fallback: static backgroundOptions
    return backgroundOptions.map((section, idx) => {
      const activeVariant = activeVariants[idx] || section.variants[0]
      return {
        sectionIdx: idx,
        label: section.label || section.section,
        image: activeVariant.image,
        variant: activeVariant,
        isSelected: selectedBackground?.id === activeVariant.id,
      }
    })
  }, [selectedPlace, selectedBackground, activeVariants])

  // Resolve the human-readable background label
  const getBackgroundLabel = () => {
    if (!selectedBackground) return ''
    // Local room image: id is "{roomId}-local-{idx}"
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
  const layoutLabel = selectedLayout?.name || selectedLayout?.label || 'Single Portrait'

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

  // Custom photo upload
  const uploadInputRef = useRef(null)
  const [customBgObjectUrl, setCustomBgObjectUrl] = useState(null)

  const handleCustomUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Revoke previous object URL to avoid memory leaks
    if (customBgObjectUrl) URL.revokeObjectURL(customBgObjectUrl)
    const url = URL.createObjectURL(file)
    setCustomBgObjectUrl(url)
    setSelectedBackground({ id: 'custom-upload', image: url, name: 'My Photo' })
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }, [customBgObjectUrl, setSelectedBackground])

  // Dropdown arrow style
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
        <div className="flex flex-row flex-1 overflow-hidden">

          {/* ========== LEFT SIDEBAR ========== */}
          <div className="flex w-28 lg:w-[35%] bg-white border-r border-gray-300 px-2 lg:px-5 pt-4 lg:pt-6 pb-2 lg:pb-3 flex-col h-full">

            {/* Header: Choose Room + Save Changes */}
            <div className="flex items-center justify-between pb-2.5 lg:pb-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                <h2 className="text-[10px] lg:text-lg font-semibold tracking-normal text-gray-800 font-['Inter']">Choose Room</h2>
              </div>
              <button className="flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-3 py-0.5 lg:py-1.5 border border-gray-300 text-gray-600 rounded-md text-[7px] lg:text-[11px] font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer tracking-wide">
                <svg className="hidden lg:block w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3.75 3.75 0 013.572 5.345A4.5 4.5 0 0118.75 19.5H6.75z" />
                </svg>
                SAVE CHANGES
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0 py-2 lg:py-3">
              {/* Room Type Dropdown */}
              <div className="mb-3 lg:mb-4">
                <label className="block text-[7px] lg:text-[11px] font-bold text-gray-400 tracking-widest mb-1 lg:mb-1.5">ROOM TYPE</label>
                <div className="relative inline-flex rounded-lg border border-gray-300 focus-within:border-[#4a6741] focus-within:border-2 bg-white transition-colors">
                  <select
                    value={selectedPlace?.id || ''}
                    onChange={(e) => {
                      const place = placeCategories.find(p => p.id === e.target.value)
                      setSelectedPlace(place || null)
                      setSelectedBackground(null)  // clear old background when room changes
                    }}
                    className="rounded-lg px-2 lg:px-3 py-1.5 lg:py-2.5 text-[9px] lg:text-sm font-medium text-gray-800 bg-transparent focus:outline-none cursor-pointer appearance-none pr-7 lg:pr-8"
                  >
                    {placeCategories.map(place => (
                      <option key={place.id} value={place.id}>{place.name}</option>
                    ))}
                  </select>
                  <svg className="absolute right-2 lg:right-3 top-1/2 -translate-y-1/2 w-3 h-3 lg:w-4 lg:h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>

              {/* Background Options Grid */}
              <div>
                <label className="block text-[7px] lg:text-[11px] font-bold text-gray-400 tracking-widest mb-1.5 lg:mb-2">BACKGROUND OPTIONS</label>
                <div className="grid grid-cols-3 gap-1.5 lg:gap-2.5">
                  {backgroundItems.map((item) => (
                    <div
                      key={item.sectionIdx}
                      onClick={() => setSelectedBackground(item.variant)}
                      className="cursor-pointer group"
                    >
                      <div className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        item.isSelected ? 'border-[#4a6741] shadow-md' : 'border-transparent hover:border-gray-300'
                      }`}>
                        <img
                          src={item.image}
                          alt={item.label}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        {item.isSelected && (
                          <div className="absolute top-0.5 left-0.5 lg:top-1.5 lg:left-1.5 w-4 h-4 lg:w-5 lg:h-5 bg-[#4a6741]/90 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {/* Placeholder icon */}
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 -z-10">
                          <svg className="w-6 h-6 lg:w-8 lg:h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-[6px] lg:text-[10px] font-bold text-gray-500 text-center mt-0.5 lg:mt-1 uppercase leading-tight tracking-wide">{item.label}</p>
                    </div>
                  ))}

                  {/* ── Upload Your Own Photo card ── */}
                  <div
                    onClick={() => uploadInputRef.current?.click()}
                    className="cursor-pointer group"
                  >
                    <div className={`relative aspect-square rounded-lg border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                      selectedBackground?.id === 'custom-upload'
                        ? 'border-[#4a6741] bg-green-50/60 shadow-md'
                        : 'border-gray-300 bg-gray-50 hover:border-[#4a6741] hover:bg-green-50/40'
                    }`}>
                      {/* Show thumbnail if an image was uploaded, else show icon */}
                      {customBgObjectUrl ? (
                        <>
                          <img
                            src={customBgObjectUrl}
                            alt="Your photo"
                            className="absolute inset-0 w-full h-full object-cover rounded-md opacity-60"
                          />
                          {selectedBackground?.id === 'custom-upload' && (
                            <div className="absolute top-0.5 left-0.5 lg:top-1.5 lg:left-1.5 w-4 h-4 lg:w-5 lg:h-5 bg-[#4a6741]/90 rounded-full flex items-center justify-center z-10">
                              <svg className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          {/* Re-upload icon overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <svg className="w-5 h-5 lg:w-6 lg:h-6 text-[#4a6741] drop-shadow" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Photo placeholder icon */}
                          <svg className={`w-5 h-5 lg:w-7 lg:h-7 transition-colors ${
                            selectedBackground?.id === 'custom-upload' ? 'text-[#4a6741]' : 'text-gray-400 group-hover:text-[#4a6741]'
                          }`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                          <span className={`text-[5px] lg:text-[8px] font-bold text-center uppercase tracking-wide leading-tight px-1 transition-colors ${
                            selectedBackground?.id === 'custom-upload' ? 'text-[#4a6741]' : 'text-gray-400 group-hover:text-[#4a6741]'
                          }`}>ADD TO LIVING<br/>ROOM</span>
                        </>
                      )}
                    </div>
                    <p className="text-[6px] lg:text-[10px] font-bold text-gray-500 text-center mt-0.5 lg:mt-1 uppercase leading-tight tracking-wide">
                      {customBgObjectUrl ? 'CHANGE PHOTO' : 'QUICK ADD'}
                    </p>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCustomUpload}
                  />
                </div>
              </div>
            </div>

            {/* Bottom: Previous Step (left) + Customize Your Prints (right) */}
            <div className="pt-2 lg:pt-3 flex-shrink-0 flex items-center justify-between gap-2">
              <button
                disabled
                className="flex items-center gap-1 text-gray-400 text-[7px] lg:text-[10px] font-bold tracking-widest uppercase cursor-not-allowed flex-shrink-0"
              >
                <svg className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span className="hidden lg:inline">Previous Step</span>
              </button>
              <button
                disabled={!selectedPlace || !selectedBackground}
                onClick={() => setCurrentStep('step2')}
                className="flex items-center gap-1 lg:gap-1.5 bg-[#4a6741] text-white px-2 lg:px-5 py-1.5 lg:py-2.5 font-bold text-[7px] lg:text-[11px] tracking-widest uppercase rounded-md hover:bg-[#3d5636] transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="hidden lg:inline">Customize Your Prints</span>
                <span className="lg:hidden">Next</span>
                <svg className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>

          </div>

          {/* ========== RIGHT SECTION ========== */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ---- Canvas Header Bar ---- */}
            <div className="hidden lg:flex items-center justify-between px-8 pt-7 pb-4 bg-white flex-shrink-0">
              {/* Left: background name + layout subtitle */}
              <div className="flex-shrink-0">
                <h3 className="text-base font-bold tracking-wider text-gray-900 capitalize leading-tight font-['Inter']">
                  {(getBackgroundLabel() || 'Select a Background').toLowerCase()}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-['Inter']">
                  Previewing Layout: {layoutLabel}
                </p>
              </div>

              {/* Right: Action buttons */}
              <div className="flex items-center gap-1">
                {/* Drag to Reposition */}
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="tracking-wide leading-tight text-left">DRAG TO REPOSITION<br/>GALLERY</span>
                </button>

                <div className="w-px h-8 bg-gray-200 mx-1" />

                {/* Grid Toggle */}
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

                {/* Ruler Toggle */}
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

                {/* Enlarge */}
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
                    ? `url(${selectedBackground.image})`
                    : selectedPlace
                      ? `url(${selectedPlace.image})`
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
                              onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e) }}
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
                              <div className="absolute bottom-[-14px] left-0 right-0 flex justify-center pointer-events-none">
                                <span className="bg-white/90 text-gray-600 text-[5px] font-bold tracking-wider px-1 py-0.5 rounded whitespace-nowrap uppercase">
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
                          const artwork = selectedArtworks[idx]
                          const indivBase = individualOffsets[idx] || { x: 0, y: 0 }
                          const indivLive = (!isLocked && activeDragFrameIdx === idx) ? individualDragLive : { x: 0, y: 0 }
                          const indivX = indivBase.x + indivLive.x
                          const indivY = indivBase.y + indivLive.y
                          return (
                          <div
                            key={idx}
                            className="absolute select-none"
                            onMouseDown={(e) => { e.stopPropagation(); isLocked ? handleDragStart(e) : handleIndividualDragStart(e, idx) }}
                            onTouchStart={(e) => { e.stopPropagation(); isLocked ? handleDragStart(e) : handleIndividualDragStart(e, idx) }}
                            style={{
                              top: `${frame.centerY}%`,
                              left: `${frame.centerX}%`,
                              width: frame.width,
                              aspectRatio: frame.aspectRatio,
                              transform: `translate(calc(-50% + ${indivX}px), calc(-50% + ${indivY}px))`,
                              zIndex: activeDragFrameIdx === idx ? 999 : Math.round(100 - frame.centerY),
                              cursor: (isDragging || activeDragFrameIdx === idx) ? 'grabbing' : 'grab',
                              transition: activeDragFrameIdx === idx ? 'none' : 'transform 0.2s ease',
                            }}
                          >
                            {/* Frame with colored border */}
                            <div
                              onClick={() => {
                                if (!wasDraggingRef.current) setActiveFrameIndex(idx)
                                wasDraggingRef.current = false
                              }}
                              className="w-full h-full overflow-hidden cursor-pointer group relative"
                              style={{
                                border: `${frame.borderWidth}px solid ${frameColor.border}`,
                                borderRadius: '2px',
                                boxShadow: `0 6px 24px ${frameColor.shadow}, 0 2px 8px rgba(0,0,0,0.12), ${innerShadowCSS}`,
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
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                  </svg>
                                </div>
                              )}
                              {activeFrameIndex === idx && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-[#4a6741] rounded-full flex items-center justify-center shadow-md z-10 pointer-events-none">
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                              {/* Duplicate button - appears on hover */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  duplicateFrame(idx)
                                }}
                                className="absolute bottom-1 right-1 w-6 h-6 bg-white/95 hover:bg-[#4a6741] rounded-full flex items-center justify-center shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer hover:scale-110 border border-gray-200 hover:border-[#4a6741]"
                                title="Duplicate frame"
                              >
                                <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                            {/* Size label inside frame at bottom */}
                            <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ bottom: '-18px' }}>
                              <span className="bg-white/90 backdrop-blur-sm text-gray-600 text-[7px] font-bold tracking-wider px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap uppercase">
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
                  /* No layout selected yet */
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

                {/* Wall Scale Slider - top left */}
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

                {/* Undo / Redo - top right */}
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

                {/* CM / IN Toggle - bottom left */}
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

                {/* Rotate / Lock - bottom right */}
                <div className="hidden lg:flex absolute bottom-4 right-4 z-20 items-center gap-2">
                  <button
                    onClick={resetPositions}
                    title="Restore original positions"
                    className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h13a5 5 0 010 10h-3" />
                    </svg>
                  </button>
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
              {/* Print Size */}
              <div className="flex-shrink-0">
                <label className="block text-[9px] font-bold tracking-widest text-gray-400 mb-0.5">{activeFrameIndex !== null ? `PRINT SIZE — FRAME ${activeFrameIndex + 1}` : 'PRINT SIZE'}</label>
                <div className="relative">
                  <select
                    value={activeFrameIndex !== null ? (perFrameSizes[activeFrameIndex] ?? printSize) : printSize}
                    onChange={(e) => {
                      const newSize = e.target.value
                      const frameCount = selectedLayout?.frames?.length || 0
                      if (activeFrameIndex !== null && frameCount > 0) {
                        setPerFrameSizes(prev => {
                          const sizes = prev.length >= frameCount ? [...prev] : new Array(frameCount).fill(printSize)
                          sizes[activeFrameIndex] = newSize
                          return sizes
                        })
                      } else {
                        setPrintSize(newSize)
                        setPerFrameSizes(prev => prev.length > 0 ? prev.map(() => newSize) : prev)
                      }
                    }}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#4a6741] cursor-pointer appearance-none pr-7 min-w-[130px]"
                    style={selectArrowStyle}
                  >
                    <option value="">Select size...</option>
                    {sizeOptions.map(s => { const cmA = unit === 'cm' ? {'21 × 29.7':'A4','29.7 × 42':'A3','42 × 59.4':'A2','59.5 × 84.1':'A1','84.1 × 118.9':'A0'}[s] : null; return <option key={s} value={s}>{cmA ? `${cmA} - ${s} cm` : s.startsWith('A') ? s : `${s} ${unit === 'in' ? '"' : unit}`}</option>; })}
                  </select>
                </div>
              </div>

              {/* Frame Style */}
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

              {/* Description */}
              <div className="flex-1 text-right">
                <p className="text-sm text-gray-400 italic leading-snug">
                  {selectedPlace
                    ? `A ${selectedPlace.name?.toLowerCase()} is the heart of the home.`
                    : 'Choose a room to begin.'}
                </p>
              </div>
            </div>

            <MobileBottomNav />
          </div>
        </div>
      </div>

      <MobileMenuModal />

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
                  ? `url(${selectedBackground.image})`
                  : selectedPlace
                    ? `url(${selectedPlace.image})`
                    : "url(https://res.cloudinary.com/desenio/image/upload/w_1400/backgrounds/welcome-bg.jpg?v=1)",
                aspectRatio: `${enlargeCanvasAspectRatio}`,
                maxWidth: '100%',
                objectFit: 'contain',
              }}
            >
              {enlargeRuler && (
                <Ruler onClose={() => setEnlargeRuler(false)} measurementUnit={measurementUnit} wallScale={wallScale} />
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
                              boxShadow: `0 6px 24px ${frameColor.shadow}, 0 2px 8px rgba(0,0,0,0.12), ${innerShadowCSS}`,
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
                          <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ bottom: '-18px' }}>
                            <span className="bg-white/90 backdrop-blur-sm text-gray-600 text-[7px] font-bold tracking-wider px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap uppercase">
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
