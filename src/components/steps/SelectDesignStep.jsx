import { useState, useMemo, useEffect } from 'react'
import { useGallery } from '../../context/GalleryContext'
import {
  colorOptions,
  styleOptions,
  categoryOptions,
  artistOptions,
  roomOptions,
  backgroundOptions,
} from '../../data'
import { TopNavBar, Breadcrumb, MobileBottomNav, MobileMenuModal, ResetModal } from '../layout'
import { MobileFilterPanel } from '../filters'
import { processMobileFrames } from '../canvas'
import { getDynamicFrames, getFrameOrientation, getVariantPrice, getVariantForSize } from '../../utils/helpers'
import Ruler from '../Ruler'

export default function SelectDesignStep() {

const PRINT_STYLE_OPTIONS = ['Black', 'White', 'Light Oak', 'Walnut']

const FRAME_STYLE_COLORS = {
  Black:      { border: '#000000', shadow: 'rgba(0,0,0,0.45)', inner: '#000000' },
  White:      { border: '#ffffff', shadow: 'rgba(0,0,0,0.15)', inner: '#ffffff' },
  'Light Oak': { border: '#c8a876', shadow: 'rgba(0,0,0,0.25)', inner: '#c8a876' },
  Walnut:     { border: '#4a2c2a', shadow: 'rgba(0,0,0,0.35)', inner: '#4a2c2a' },
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

// Helper to get artwork's dominant color hex value
const getArtworkBgColor = (artwork) => {
  if (!artwork?.colors?.length) return '#1a1a1a'
  const colorName = artwork.colors[0].toLowerCase().trim()
  const colorMatch = colorOptions.find(c => c.value === colorName || c.name.toLowerCase() === colorName)
  return colorMatch?.color || '#1a1a1a'
}
  const {
    setCurrentStep,
    selectedLayout,
    selectedBackground,
    selectedArtworks, setSelectedArtworks,
    activeFrameIndex, setActiveFrameIndex,
    selectedFrames,
    showFilter, setShowFilter,
    searchQuery, setSearchQuery,
    selectedColorFilters, setSelectedColorFilters,
    selectedStyleFilters, setSelectedStyleFilters,
    selectedCollectionFilters, setSelectedCollectionFilters,
    selectedArtistFilters, setSelectedArtistFilters,
    selectedRoomFilters, setSelectedRoomFilters,
    toggleFilter,
    getArtworksForFrameSize,
    showCart, setShowCart,
    cartItems, setCartItems,
    quantities, setQuantities,
    showEmptyArtworkModal, setShowEmptyArtworkModal,
    showMobileMenu, setShowMobileMenu,
    displayedArtworkCount,
    isLoadingMore,
    artworkScrollRef,
    handleAddToCart,
    handleCheckout,
    calculateCartTotal,
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
    handleReset,
    handleQuantityChange,
    printOrientation,
    printStyle, setPrintStyle,
    printSize, setPrintSize,
    perFrameSizes, setPerFrameSizes,
    spacingValue,
    measurementUnit, setMeasurementUnit,
    innerShadow,
    wallScale, setWallScale,
    showGrid, setShowGrid,
    showRuler, setShowRuler,
    undo, redo, canUndo, canRedo,
    selectedPlace,
  } = useGallery()

  const [detailArtwork, setDetailArtwork] = useState(null)
  const [showEnlarge, setShowEnlarge] = useState(false)
  const [enlargeRuler, setEnlargeRuler] = useState(false)

  // Compute dynamically-sized frames when a print size is selected
  const dynamicFrames = useMemo(() =>
    getDynamicFrames(selectedLayout?.frames, perFrameSizes.length > 0 ? perFrameSizes : printSize, measurementUnit, printOrientation, wallScale, spacingValue),
    [selectedLayout, perFrameSizes, printSize, measurementUnit, printOrientation, wallScale, spacingValue]
  )

  // Get available artworks for the currently active frame
  const activeFrame = activeFrameIndex !== null && selectedLayout ? selectedLayout.frames[activeFrameIndex] : null
  const activeFrameOrientation = activeFrame ? getFrameOrientation(activeFrame, printOrientation) : null
  const availableArtworks = activeFrame ? getArtworksForFrameSize(activeFrame.size, activeFrameOrientation) : []

  // Resolve the print size for the currently active frame (used for variant price lookup)
  const activeFramePrintSize = activeFrameIndex !== null
    ? (perFrameSizes.length > 0 ? (perFrameSizes[activeFrameIndex] || printSize) : printSize)
    : printSize

  // Auto-select frame 0 when entering the step (if nothing already active)
  useEffect(() => {
    if (selectedLayout?.frames?.length > 0 && activeFrameIndex === null) {
      setActiveFrameIndex(0)
    }
  }, [selectedLayout])

  // Advance to next unassigned frame after an artwork is picked
  const advanceToNextFrame = (newArtworks, currentIdx) => {
    const total = selectedLayout?.frames?.length || 0
    // Find the next frame without an assigned artwork, starting after current
    for (let i = 1; i < total; i++) {
      const next = (currentIdx + i) % total
      if (!newArtworks[next]) {
        setActiveFrameIndex(next)
        return
      }
    }
    // All frames assigned — keep current selected
    setActiveFrameIndex(currentIdx)
  }

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

  // Determine orientation label from active frame
  const getOrientationLabel = () => {
    if (!activeFrameOrientation) return ''
    return activeFrameOrientation.toUpperCase()
  }

  // Dropdown arrow style for selects
  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundPosition: 'right 0.5rem center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5em 1.5em',
    paddingRight: '2.5rem',
  }

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedColorFilters([])
    setSelectedStyleFilters([])
    setSelectedCollectionFilters([])
    setSelectedArtistFilters([])
    setSelectedRoomFilters([])
  }

  // Handle single-select filter dropdown changes
  const handleColorDropdown = (val) => {
    if (val === 'All') {
      setSelectedColorFilters([])
    } else {
      setSelectedColorFilters([val])
    }
  }

  const handleCategoryDropdown = (val) => {
    if (val === 'All') {
      setSelectedCollectionFilters([])
    } else {
      setSelectedCollectionFilters([val])
    }
  }

  const handleStyleDropdown = (val) => {
    if (val === 'All') {
      setSelectedStyleFilters([])
    } else {
      setSelectedStyleFilters([val])
    }
  }

  const handleRoomDropdown = (val) => {
    if (val === 'All') {
      setSelectedRoomFilters([])
    } else {
      setSelectedRoomFilters([val])
    }
  }

  const handleArtistDropdown = (val) => {
    if (val === 'All') {
      setSelectedArtistFilters([])
    } else {
      setSelectedArtistFilters([val])
    }
  }

  return (
    <>
      <ResetModal />
      <div className="h-screen bg-white flex flex-col overflow-hidden">
        <TopNavBar />
        {/* Mobile/Desktop Layout Container */}
        <div className="flex flex-row flex-1 overflow-hidden pb-12 lg:pb-0">
          {/* Left Sidebar */}
          <div className="flex w-28 lg:w-[35%] bg-white border-r border-gray-300 flex-col h-full">

            {/* Mobile: Header */}
            <div className="lg:hidden flex-shrink-0 mb-1 border-b border-gray-200 pb-1 pt-1 px-1">
              <p className="text-[7px] font-bold tracking-wide text-gray-500">SELECT ART</p>
            </div>

            {/* Scrollable sidebar content */}
            <div ref={artworkScrollRef} className="flex-1 overflow-y-auto px-1 lg:px-5 pt-4 lg:pt-6 pb-1 lg:pb-3">

              {/* Desktop: Header with refresh icon */}
              <div className="hidden lg:flex items-center justify-between pb-1">
                <h2 className="text-lg font-semibold tracking-normal text-gray-800 font-['Inter']">Select Art</h2>
                <button
                  onClick={handleClearFilters}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer rounded-full hover:bg-gray-100"
                  title="Reset filters"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {/* Desktop: Subtitle - orientation + print number */}
              <div className="hidden lg:flex items-center gap-2 pb-4">
                {activeFrame && (
                  <>
                    <span className="text-[10px] font-bold tracking-widest text-gray-400">{getOrientationLabel()} PRINTS ONLY</span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] font-bold tracking-widest text-gray-400">PRINT #{activeFrameIndex !== null ? activeFrameIndex + 1 : '–'}</span>
                  </>
                )}
                {!activeFrame && (
                  <span className="text-[10px] font-bold tracking-widest text-gray-400">CLICK A FRAME TO SELECT ART</span>
                )}
              </div>

              {/* Desktop: Filter Dropdowns - 5 filters in flexible layout */}
              <div className="hidden lg:grid grid-cols-5 gap-2 pb-4">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-500 mb-1.5 block">CATEGORIES</label>
                  <select
                    value={selectedCollectionFilters.length > 0 ? selectedCollectionFilters[0] : 'All'}
                    onChange={e => handleCategoryDropdown(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#4a6741] cursor-pointer appearance-none"
                    style={selectArrowStyle}
                  >
                    <option value="All">All</option>
                    {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-500 mb-1.5 block">COLOR</label>
                  <select
                    value={selectedColorFilters.length > 0 ? selectedColorFilters[0] : 'All'}
                    onChange={e => handleColorDropdown(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#4a6741] cursor-pointer appearance-none"
                    style={selectArrowStyle}
                  >
                    <option value="All">All</option>
                    {colorOptions.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-500 mb-1.5 block">STYLE</label>
                  <select
                    value={selectedStyleFilters.length > 0 ? selectedStyleFilters[0] : 'All'}
                    onChange={e => handleStyleDropdown(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#4a6741] cursor-pointer appearance-none"
                    style={selectArrowStyle}
                  >
                    <option value="All">All</option>
                    {styleOptions.map(s => <option key={s.value} value={s.value}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-500 mb-1.5 block">ROOM</label>
                  <select
                    value={selectedRoomFilters.length > 0 ? selectedRoomFilters[0] : 'All'}
                    onChange={e => handleRoomDropdown(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#4a6741] cursor-pointer appearance-none"
                    style={selectArrowStyle}
                  >
                    <option value="All">All</option>
                    {roomOptions.map(r => <option key={r.value} value={r.value}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-500 mb-1.5 block">ARTIST</label>
                  <select
                    value={selectedArtistFilters.length > 0 ? selectedArtistFilters[0] : 'All'}
                    onChange={e => handleArtistDropdown(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#4a6741] cursor-pointer appearance-none"
                    style={selectArrowStyle}
                  >
                    <option value="All">All</option>
                    {artistOptions.map(a => <option key={a.value} value={a.value}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Mobile: Quick filter toggle */}
              <div className="lg:hidden mb-1">
                <button 
                  onClick={() => setShowFilter(!showFilter)}
                  className="flex items-center gap-1 text-[8px] font-bold text-black hover:text-gray-600 transition-colors cursor-pointer py-0.5 border-b border-gray-200"
                >
                  {showFilter ? 'HIDE FILTER' : 'SHOW FILTER'}
                  <span className="text-[8px]">×</span>
                </button>
              </div>

              {/* Art Grid */}
              {activeFrameIndex === null ? (
                /* Show instructions when no frame is selected */
                <div className="flex flex-col items-center justify-center h-48 lg:h-64 text-center px-2">
                  <div className="mb-2 lg:mb-4">
                    <svg className="w-8 h-8 lg:w-14 lg:h-14 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-[9px] lg:text-sm font-semibold text-gray-600 mb-1">
                    Click on a frame to select art
                  </p>
                  <p className="text-[8px] lg:text-xs text-gray-400">
                    Select each frame on the wall to choose artwork
                  </p>
                </div>
              ) : (
                <div>
                  {availableArtworks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm">No artworks available</p>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-2 gap-x-1.5 gap-y-4 lg:gap-x-2 lg:gap-y-5">
                        {/* ADD ART placeholder card - first item */}
                        <div
                          onClick={() => {
                            // Clear current selection for this frame
                            const newArtworks = { ...selectedArtworks }
                            delete newArtworks[activeFrameIndex]
                            setSelectedArtworks(newArtworks)
                          }}
                          className="cursor-pointer group"
                        >
                          <div className="aspect-square lg:aspect-[5/6] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-[#4a6741] hover:bg-gray-50 transition-all duration-200">
                            <span className="text-xl lg:text-2xl text-gray-300 group-hover:text-[#4a6741] transition-colors mb-0.5">+</span>
                            <span className="text-[7px] lg:text-[10px] font-semibold text-gray-400 group-hover:text-[#4a6741] tracking-wide transition-colors">ADD ART</span>
                          </div>
                        </div>

                        {/* Artwork cards */}
                        {availableArtworks.slice(0, displayedArtworkCount).map((artwork) => (
                          <div
                            key={artwork.id}
                            onClick={() => {
                              const newArtworks = {
                                ...selectedArtworks,
                                [activeFrameIndex]: artwork
                              }
                              setSelectedArtworks(newArtworks)
                              advanceToNextFrame(newArtworks, activeFrameIndex)
                            }}
                            className={`relative cursor-pointer transition-all duration-200 group rounded-lg overflow-hidden ${
                              selectedArtworks[activeFrameIndex]?.id === artwork.id
                                ? 'ring-2 ring-[#4a6741] ring-offset-1'
                                : 'hover:shadow-lg'
                            }`}
                          >
                            {/* Artwork Image */}
                            <div className="relative aspect-square lg:aspect-[5/6] bg-gray-100 overflow-hidden rounded-t-lg">
                              <img 
                                src={artwork.image}
                                alt={artwork.title}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              {/* Enlarge + Cross buttons — top-right stack */}
                              <div className="absolute top-1 right-1 lg:top-1.5 lg:right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                {/* Enlarge button */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDetailArtwork(artwork) }}
                                  className="w-6 h-6 lg:w-7 lg:h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors cursor-pointer"
                                  title="View details"
                                >
                                  <svg className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 14l0 6m0 0l6 0m-6 0l7-7m10-3V4m0 0h-6m6 0l-7 7" />
                                  </svg>
                                </button>
                                {/* Cross / remove button */}
                                {selectedArtworks[activeFrameIndex]?.id === artwork.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const newArtworks = { ...selectedArtworks }
                                      delete newArtworks[activeFrameIndex]
                                      setSelectedArtworks(newArtworks)
                                    }}
                                    className="w-6 h-6 lg:w-7 lg:h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                                    title="Remove from frame"
                                  >
                                    <svg className="w-3 h-3 lg:w-3.5 lg:h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Artwork Info - artist + title */}
                            <div className="p-1 lg:p-1.5 bg-white">
                              {artwork.artists && artwork.artists.length > 0 && (
                                <p className="text-[6px] lg:text-[9px] font-bold tracking-widest text-gray-400 uppercase mb-0.5 truncate">
                                  {artwork.artists[0]}
                                </p>
                              )}
                              <h3 className="text-[7px] lg:text-[10px] font-semibold text-gray-800 line-clamp-1">{artwork.title}</h3>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Show count & loading */}
                      <div className="text-center py-2 mt-1">
                        <p className="text-[7px] lg:text-[10px] text-gray-400">
                          Showing {Math.min(displayedArtworkCount, availableArtworks.length)} of {availableArtworks.length} products
                        </p>
                      </div>
                      {isLoadingMore && displayedArtworkCount < availableArtworks.length && (
                        <div className="flex justify-center py-2">
                          <div className="flex items-center gap-2 text-gray-400">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-xs">Loading more...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Navigation Buttons - pinned */}
            <div className="hidden lg:flex flex-shrink-0 px-5 py-3 items-center justify-between gap-2">
              {/* Previous Step */}
              <button
                onClick={() => {
                  setActiveFrameIndex(null)
                  setCurrentStep("step2")
                }}
                className="flex items-center gap-1 text-gray-400 text-[10px] font-bold tracking-widest uppercase hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Previous Step
              </button>

              {/* Checkout */}
              {(() => {
                const totalFrames = selectedLayout?.frames?.length || 0
                const assignedCount = Object.keys(selectedArtworks).length
                const allAssigned = totalFrames > 0 && assignedCount >= totalFrames
                return (
                  <button
                    disabled={!allAssigned}
                    onClick={() => {
                      if (allAssigned) setCurrentStep("checkout")
                    }}
                    className={`flex items-center gap-1 lg:gap-1.5 px-2 lg:px-5 py-1.5 lg:py-2.5 font-bold text-[7px] lg:text-[11px] tracking-widest uppercase rounded-md transition-all duration-200 ${
                      allAssigned
                        ? 'bg-[#4a6741] text-white hover:bg-[#3d5636] cursor-pointer'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    CHECKOUT
                    <svg className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                )
              })()}
            </div>

            {/* Mobile: Bottom buttons */}
            <div className="lg:hidden flex-shrink-0 px-1 py-1.5 border-t border-gray-200 space-y-1">
              <button 
                onClick={() => {
                  const hasArtworks = Object.keys(selectedArtworks).length > 0
                  if (!hasArtworks) {
                    setShowEmptyArtworkModal(true)
                  } else {
                    if (isMobile) {
                      const artworksWithSize = {}
                      Object.entries(selectedArtworks).forEach(([frameIdx, artwork]) => {
                        const frameSize = selectedLayout?.frames[parseInt(frameIdx)]?.size || artwork.size
                        const framePrintSize = perFrameSizes.length > 0
                          ? (perFrameSizes[parseInt(frameIdx)] || printSize)
                          : printSize
                        const resolved = getVariantForSize(artwork, framePrintSize)
                        artworksWithSize[frameIdx] = {
                          ...artwork,
                          frameSize,
                          resolvedVariantId: resolved?.variantId || artwork.variants?.[0]?.id || null,
                          resolvedPrice: resolved?.variantPrice || artwork.price,
                          resolvedVariantTitle: resolved?.variantTitle || '',
                        }
                      })
                      setCartItems({ artworks: artworksWithSize, frames: { ...selectedFrames } })
                      const newQuantities = { ...quantities }
                      Object.keys(selectedArtworks).forEach(frameIdx => {
                        if (!newQuantities.artworks[frameIdx]) newQuantities.artworks[frameIdx] = 1
                      })
                      Object.keys(selectedFrames).forEach(frameIdx => {
                        if (!newQuantities.frames[frameIdx]) newQuantities.frames[frameIdx] = 1
                      })
                      setQuantities(newQuantities)
                    }
                    setCurrentStep("checkout")
                  }
                }}
                className="w-full bg-black text-white py-2 font-bold text-[10px] tracking-widest"
              >
                NEXT
              </button>
              <button 
                onClick={() => setCurrentStep("step1")}
                className="w-full bg-white text-black py-1.5 font-bold text-[10px] tracking-wide border-2 border-black flex items-center justify-center gap-1"
              >
                <span className="text-xs">✕</span> CLOSE
              </button>
            </div>
          </div>

          {/* Mobile: Filter Panel */}
          <MobileFilterPanel />

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
                          const { processedFrames, centerOffsetX, centerOffsetY, scale } = processMobileFrames(dynamicFrames, 0.6)
                          const frameColor = FRAME_STYLE_COLORS[printStyle] || FRAME_STYLE_COLORS.Black
                          return processedFrames.map((frame, idx) => (
                            <div key={idx} className="absolute select-none"
                              onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e) }}
                              style={{
                              left: `${frame.calcLeft * scale + centerOffsetX}%`,
                              top: `${frame.calcTop * scale + centerOffsetY}%`,
                            }}>
                              <div
                                onClick={() => {
                                  if (!wasDraggingRef.current) setActiveFrameIndex(frame.idx)
                                  wasDraggingRef.current = false
                                }}
                                className="relative overflow-hidden cursor-pointer group"
                                style={{
                                  width: `${frame.width * scale}vw`,
                                  height: `${frame.height * scale}vw`,
                                  border: `${Math.max(1, frame.borderWidth - 1)}px solid ${frameColor.border}`,
                                  borderRadius: '1px',
                                  boxShadow: `0 4px 16px ${frameColor.shadow}, ${innerShadowCSS}`,
                                  backgroundColor: selectedArtworks[frame.idx] ? frameColor.inner : '#ffffff',
                                }}
                              >
                                {selectedArtworks[frame.idx] ? (
                                  <>
                                    <img src={selectedArtworks[frame.idx].artworkFile || selectedArtworks[frame.idx].image} alt={selectedArtworks[frame.idx].title} className="absolute inset-0 w-full h-full object-fill pointer-events-none" draggable={false} />
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
              <div className="flex-1 text-right">
                <p className="text-sm text-gray-400 italic leading-snug">
                  {selectedPlace
                    ? `A ${selectedPlace.name?.toLowerCase()} is the heart of the home.`
                    : 'Choose a room to begin.'}
                </p>
              </div>
            </div>

            <MobileBottomNav />
          </div>{/* End of Right Section */}

          {/* Validation Modal - No Artworks Selected */}
          {showEmptyArtworkModal && (
            <div className="fixed inset-0 bg-white bg-opacity-50 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 sm:p-8 max-w-md w-full relative shadow-2xl border border-gray-200 rounded-lg">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-yellow-100 mb-4">
                    <svg className="h-7 w-7 sm:h-8 sm:w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">No Designs Selected</h2>
                  <p className="text-sm text-gray-600 mb-5">
                    Please select at least one design for your gallery wall before proceeding to checkout.
                  </p>
                  <button
                    onClick={() => setShowEmptyArtworkModal(false)}
                    className="w-full bg-black text-white px-6 py-2.5 font-bold text-xs tracking-wider hover:bg-gray-800 transition-all duration-200 cursor-pointer rounded"
                  >
                    OK, GOT IT
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Bottom Menu Bar */}
          <div className="lg:hidden fixed bottom-0 left-28 right-0 bg-white border-t border-gray-300 flex items-center z-40">
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="px-2 py-2 text-[8px] font-bold tracking-wide text-black hover:bg-gray-100 transition-colors cursor-pointer border-r border-gray-300 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              MENU
            </button>
            <button 
              className="flex-1 px-3 py-3 text-[9px] font-bold tracking-wide text-black hover:bg-gray-100 transition-colors cursor-pointer border-r border-gray-300 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              SAVED GALLERY WALLS
            </button>
            <button 
              onClick={() => setShowCart(!showCart)}
              className="relative px-3 py-3 hover:bg-gray-100 transition-colors cursor-pointer border-r border-gray-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                {Object.keys(cartItems.artworks).length + Object.keys(cartItems.frames).length}
              </span>
            </button>
            <button 
              onClick={handleAddToCart}
              className="px-4 py-3 text-[10px] font-bold tracking-wide bg-black text-white hover:bg-gray-800 transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              ADD TO 
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              £{(Object.keys(cartItems.artworks).length > 0 || Object.keys(cartItems.frames).length > 0) ? calculateCartTotal() : '0'}
            </button>
          </div>
        </div>{/* End of flex-row container */}
      </div>

      <MobileMenuModal />

      {/* ---- Artwork Detail Modal ---- */}
      {detailArtwork && (() => {
        // Derive orientation from product tags
        const orientationTag = detailArtwork.tags?.find(t =>
          ['portrait', 'landscape', 'square', 'horizontal', 'vertical'].includes(t.toLowerCase())
        )
        const orientationLabelMap = { horizontal: 'Landscape', vertical: 'Portrait', portrait: 'Portrait', landscape: 'Landscape', square: 'Square' }
        const orientationLabel = orientationTag
          ? (orientationLabelMap[orientationTag.toLowerCase()] || 'Portrait')
          : 'Portrait'

        // Resolve style — metafield → productType → tags
        const styleLabel = detailArtwork.styles?.[0]
          || detailArtwork.productType
          || detailArtwork.tags?.find(t => !['portrait','landscape','square','horizontal','vertical'].includes(t.toLowerCase()))
          || 'Mixed'

        // Resolve category — metafield → productType → fallback
        const categoryLabel = (detailArtwork.category && detailArtwork.category !== 'Uncategorized')
          ? detailArtwork.category
          : detailArtwork.productType || 'Art Print'

        // Resolve dominant color — metafield colors array → tags → fallback
        const rawColor = detailArtwork.colors?.[0] || ''
        // If the raw value is a hex color, convert to a name
        const hexToName = {
          '#ef4444': 'Red', '#3b82f6': 'Blue', '#22c55e': 'Green', '#f97316': 'Orange',
          '#ec4899': 'Pink', '#a8a29e': 'Neutral', '#1a1a1a': 'Black', '#e5e5e5': 'White',
          '#eab308': 'Yellow', '#a855f7': 'Purple', '#92400e': 'Brown', '#9ca3af': 'Grey',
          '#ff0000': 'Red', '#0000ff': 'Blue', '#00ff00': 'Green', '#ffffff': 'White', '#000000': 'Black',
        }
        const dominantColor = rawColor.startsWith('#')
          ? (hexToName[rawColor.toLowerCase()] || rawColor)
          : (rawColor || 'Neutral')

        const artistLabel = detailArtwork.artists?.[0] || detailArtwork.vendor || 'Unknown Artist'

        // Color dot mapping
        const colorDotMap = {
          red: '#ef4444', blue: '#3b82f6', green: '#22c55e', orange: '#f97316',
          pink: '#ec4899', neutral: '#a8a29e', black: '#1a1a1a', white: '#e5e5e5',
          yellow: '#eab308', purple: '#a855f7', brown: '#92400e', grey: '#9ca3af', gray: '#9ca3af',
          beige: '#d4b896', teal: '#14b8a6', navy: '#1e3a5f', gold: '#d4a017', cream: '#f5f0e1',
        }
        // If raw color is already a hex, use it directly for the dot; otherwise look up
        const dotColor = rawColor.startsWith('#') ? rawColor : (colorDotMap[dominantColor.toLowerCase()] || '#9ca3af')

        // Generated contextual description
        const contextDescription = `"This piece from our ${styleLabel} collection perfectly complements the room's ${printStyle} frames. The ${orientationLabel} layout provides a focused visual anchor for your gallery wall."`

        return (
          <div className="fixed inset-0 z-[9999] bg-white flex flex-col lg:flex-row" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Close button */}
            <button
              onClick={() => setDetailArtwork(null)}
              className="absolute top-4 right-4 lg:top-6 lg:right-6 z-10 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Left — Product Image */}
            <div className="flex-1 bg-[#f5f5f3] flex items-center justify-center p-8 lg:p-16">
              <div className="max-w-sm w-full flex items-center justify-center">
                <img
                  src={detailArtwork.image}
                  alt={detailArtwork.title}
                  className="max-w-full max-h-[65vh] object-contain"
                  style={{
                    border: `10px solid ${(FRAME_STYLE_COLORS[printStyle] || FRAME_STYLE_COLORS.Black).border}`,
                    boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
                  }}
                />
              </div>
            </div>

            {/* Right — Product Details */}
            <div className="w-full lg:w-[440px] flex flex-col justify-center px-8 py-6 lg:px-12 lg:py-16 overflow-y-auto bg-white">
              {/* Artist */}
              <p className="text-[10px] lg:text-[11px] font-bold tracking-[0.2em] text-[#6b8f71] uppercase mb-2">
                {artistLabel}
              </p>
              {/* Title */}
              <h2 className="text-3xl lg:text-[36px] font-extrabold text-gray-900 mb-4 leading-[1.1]">
                {detailArtwork.title}
              </h2>
              {/* Divider */}
              <div className="w-8 h-[2px] bg-[#b0c4b8] mb-5" />

              {/* Info grid */}
              <div className="mb-5">
                {/* Row 1: Style + Orientation */}
                <div className="grid grid-cols-2 gap-x-10 pb-3.5 mb-3.5 border-b border-gray-100">
                  <div>
                    <p className="text-[9px] lg:text-[10px] font-bold tracking-[0.15em] text-[#6b8f71] uppercase mb-1.5">Style</p>
                    <p className="text-sm lg:text-[15px] text-gray-900 font-semibold">{styleLabel}</p>
                  </div>
                  <div>
                    <p className="text-[9px] lg:text-[10px] font-bold tracking-[0.15em] text-[#6b8f71] uppercase mb-1.5">Orientation</p>
                    <p className="text-sm lg:text-[15px] text-gray-900 font-semibold">{orientationLabel}</p>
                  </div>
                </div>
                {/* Row 2: Category + Dominant Color */}
                <div className="grid grid-cols-2 gap-x-10">
                  <div>
                    <p className="text-[9px] lg:text-[10px] font-bold tracking-[0.15em] text-[#6b8f71] uppercase mb-1.5">Category</p>
                    <p className="text-sm lg:text-[15px] text-gray-900 font-semibold">{categoryLabel}</p>
                  </div>
                  <div>
                    <p className="text-[9px] lg:text-[10px] font-bold tracking-[0.15em] text-[#6b8f71] uppercase mb-1.5">Dominant Color</p>
                    <p className="text-sm lg:text-[15px] text-gray-900 font-semibold flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                      {dominantColor}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description card with SELECT button inside */}
              <div className="bg-[#f8faf8] rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-[13px] text-gray-400 italic leading-relaxed mb-4">
                  {contextDescription}
                </p>
                <button
                  onClick={() => {
                    const newArtworks = {
                      ...selectedArtworks,
                      [activeFrameIndex]: detailArtwork
                    }
                    setSelectedArtworks(newArtworks)
                    advanceToNextFrame(newArtworks, activeFrameIndex)
                    setDetailArtwork(null)
                  }}
                  className="w-full py-3.5 bg-[#6b8f71] hover:bg-[#5a7a60] text-white text-[13px] font-bold tracking-[0.2em] rounded-xl transition-colors cursor-pointer"
                >
                  SELECT THIS ART
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
              className="relative w-full h-full max-h-full bg-cover bg-center rounded-2xl overflow-hidden shadow-2xl"
              style={{
                backgroundImage: selectedBackground
                  ? `url(${selectedBackground.image})`
                  : selectedPlace
                    ? `url(${selectedPlace.image})`
                    : "url(https://res.cloudinary.com/desenio/image/upload/w_1400/backgrounds/welcome-bg.jpg?v=1)",
                aspectRatio: '16 / 10',
                maxWidth: '100%',
                objectFit: 'contain',
              }}
            >
              {/* Ruler Overlay inside enlarged canvas */}
              {enlargeRuler && (
                <Ruler onClose={() => setEnlargeRuler(false)} measurementUnit={measurementUnit} wallScale={wallScale} />
              )}

              {/* Frames */}
              {selectedLayout && dynamicFrames && (() => {
                const frameColor = FRAME_STYLE_COLORS[printStyle] || FRAME_STYLE_COLORS.Black
                return (
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `translate(${groupOffset.x}px, ${groupOffset.y}px)`,
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
                            transform: `translate(calc(-50% + ${indivBase.x}px), calc(-50% + ${indivBase.y}px))`,
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
