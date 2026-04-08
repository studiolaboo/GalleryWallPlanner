import { useGallery } from '../../context/GalleryContext'
import {
  colorOptions,
  orientationOptions,
  styleOptions,
  categoryOptions,
  artistOptions,
  roomOptions
} from '../../data'

/**
 * Collapsible filter section component used in both desktop and mobile filter panels.
 */
function FilterSection({ title, sectionKey, children, isMobile = false }) {
  const { expandedFilterSection, setExpandedFilterSection } = useGallery()
  
  const isExpanded = expandedFilterSection === sectionKey

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setExpandedFilterSection(isExpanded ? null : sectionKey)}
        className={`w-full ${isMobile ? 'px-3 py-2.5' : 'p-6'} flex items-center justify-between hover:bg-gray-50 transition-colors`}
      >
        <h3 className={`${isMobile ? 'text-[10px]' : 'text-sm'} font-bold text-black`}>{title}</h3>
        <svg 
          className={`${isMobile ? 'w-3 h-3' : 'w-5 h-5'} transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className={isMobile ? 'px-3 pb-2' : 'px-6 pb-6'}>
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Desktop filter panel - flyout to the right of sidebar
 */
export function DesktopFilterPanel() {
  const {
    showFilter,
    searchQuery, setSearchQuery,
    selectedColorFilters, setSelectedColorFilters,
    selectedOrientationFilters, setSelectedOrientationFilters,
    selectedStyleFilters, setSelectedStyleFilters,
    selectedCollectionFilters, setSelectedCollectionFilters,
    selectedArtistFilters, setSelectedArtistFilters,
    selectedRoomFilters, setSelectedRoomFilters,
    toggleFilter
  } = useGallery()

  if (!showFilter) return null

  return (
    <div className="hidden lg:block fixed lg:left-80 top-0 lg:top-[132px] h-full lg:h-[calc(100%-132px)] w-full lg:w-80 bg-white border-r border-gray-200 shadow-xl z-50 overflow-y-auto">
      {/* Header with Clear Filter and Search */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-end mb-4">
          <button 
            onClick={() => {
              setSearchQuery('')
              setSelectedColorFilters([])
              setSelectedOrientationFilters([])
              setSelectedStyleFilters([])
              setSelectedCollectionFilters([])
              setSelectedArtistFilters([])
              setSelectedRoomFilters([])
            }}
            className="text-xs font-semibold text-black hover:text-gray-600 transition-colors cursor-pointer border border-gray-300 px-3 py-1.5"
          >
            CLEAR FILTER
          </button>
        </div>
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder="Search abstract, typography..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pr-10 border border-gray-300 text-sm focus:outline-none focus:border-black"
          />
          <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Orientation */}
      <FilterSection title="Orientation" sectionKey="orientation">
        <div className="space-y-2">
          {orientationOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleFilter('orientation', option.value)}
              className={`w-full text-left px-4 py-2 border-2 transition-all ${
                selectedOrientationFilters.includes(option.value) ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <span className="text-sm font-medium">{option.name}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Color */}
      <FilterSection title="Color" sectionKey="color">
        <div className="grid grid-cols-4 gap-2">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              onClick={() => toggleFilter('color', color.value)}
              aria-label={color.name}
              title={color.name}
              className={`aspect-square p-1 border-2 transition-all cursor-pointer bg-white ${
                selectedColorFilters.includes(color.value)
                  ? 'border-black ring-2 ring-black ring-offset-2'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="w-full h-full border border-gray-300" style={{ background: color.color }} />
              <span className="sr-only">{color.name}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Style */}
      <FilterSection title="Style" sectionKey="style">
        <div className="grid grid-cols-2 gap-2">
          {styleOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleFilter('style', option.value)}
              className={`px-4 py-2 border-2 transition-all ${
                selectedStyleFilters.includes(option.value) ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <span className="text-sm font-medium">{option.name}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Category */}
      {categoryOptions.length > 0 && (
        <FilterSection title="Category" sectionKey="collection">
          <div className="space-y-2">
            {categoryOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleFilter('collection', option.value)}
                className={`w-full text-left px-4 py-2 border-2 transition-all ${
                  selectedCollectionFilters.includes(option.value) ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className="text-sm font-medium">{option.name}</span>
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Artist */}
      <FilterSection title="Artist" sectionKey="artist">
        <div className="space-y-2">
          {artistOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleFilter('artist', option.value)}
              className={`w-full text-left px-4 py-2 border-2 transition-all ${
                selectedArtistFilters.includes(option.value) ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <span className="text-sm font-medium">{option.name}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Room */}
      <FilterSection title="Room" sectionKey="room">
        <div className="grid grid-cols-2 gap-2">
          {roomOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleFilter('room', option.value)}
              className={`px-4 py-2 border-2 transition-all ${
                selectedRoomFilters.includes(option.value) ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <span className="text-sm font-medium">{option.name}</span>
            </button>
          ))}
        </div>
      </FilterSection>
    </div>
  )
}

/**
 * Mobile filter panel - column adjacent to sidebar
 */
export function MobileFilterPanel() {
  const {
    showFilter, setShowFilter,
    searchQuery, setSearchQuery,
    setSelectedColorFilters,
    selectedColorFilters,
    selectedOrientationFilters,
    selectedStyleFilters,
    selectedCollectionFilters,
    selectedArtistFilters,
    selectedRoomFilters,
    setSelectedOrientationFilters,
    setSelectedStyleFilters,
    setSelectedCollectionFilters,
    setSelectedArtistFilters,
    setSelectedRoomFilters,
    toggleFilter
  } = useGallery()

  if (!showFilter) return null

  return (
    <div className="lg:hidden w-40 bg-white border-r border-gray-300 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-gray-200">
        <button 
          onClick={() => setShowFilter(false)}
          className="text-xl font-light text-gray-600 hover:text-black transition-colors cursor-pointer"
        >
          ✕
        </button>
        <button 
          onClick={() => {
            setSearchQuery('')
            setSelectedColorFilters([])
            setSelectedOrientationFilters([])
            setSelectedStyleFilters([])
            setSelectedCollectionFilters([])
            setSelectedArtistFilters([])
            setSelectedRoomFilters([])
          }}
          className="text-[8px] font-semibold text-black hover:text-gray-600 transition-colors cursor-pointer border border-gray-300 px-2 py-1"
        >
          CLEAR FILTER
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-gray-200">
        <div className="flex items-center border border-gray-300">
          <svg className="w-3 h-3 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1 text-[10px] focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Orientation */}
        <FilterSection title="Orientation" sectionKey="orientation" isMobile>
          <div className="space-y-1">
            {orientationOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleFilter('orientation', option.value)}
                className={`w-full text-left px-2 py-1.5 border transition-all text-[9px] ${
                  selectedOrientationFilters.includes(option.value) ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className="font-medium">{option.name}</span>
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Color */}
        <FilterSection title="Color" sectionKey="color" isMobile>
          <div className="grid grid-cols-4 gap-1.5">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                onClick={() => toggleFilter('color', color.value)}
                aria-label={color.name}
                title={color.name}
                className={`aspect-square p-0.5 border transition-all bg-white ${
                  selectedColorFilters.includes(color.value)
                    ? 'border-black ring-2 ring-black ring-offset-1'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-full h-full border border-gray-300" style={{ background: color.color }} />
                <span className="sr-only">{color.name}</span>
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Style */}
        <FilterSection title="Style" sectionKey="style" isMobile>
          <div className="space-y-1">
            {styleOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleFilter('style', option.value)}
                className={`w-full text-left px-2 py-1.5 border transition-all text-[9px] ${
                  selectedStyleFilters.includes(option.value) ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className="font-medium">{option.name}</span>
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Category */}
        {categoryOptions.length > 0 && (
          <FilterSection title="Category" sectionKey="collection" isMobile>
            <div className="space-y-1">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleFilter('collection', option.value)}
                  className={`w-full text-left px-2 py-1.5 border transition-all text-[9px] ${
                    selectedCollectionFilters.includes(option.value) ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="font-medium">{option.name}</span>
                </button>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Artist */}
        <FilterSection title="Artist" sectionKey="artist" isMobile>
          <div className="space-y-1">
            {artistOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleFilter('artist', option.value)}
                className={`w-full text-left px-2 py-1.5 border transition-all text-[9px] ${
                  selectedArtistFilters.includes(option.value) ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className="font-medium">{option.name}</span>
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Room */}
        <FilterSection title="Room" sectionKey="room" isMobile>
          <div className="space-y-1">
            {roomOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleFilter('room', option.value)}
                className={`w-full text-left px-2 py-1.5 border transition-all text-[9px] ${
                  selectedRoomFilters.includes(option.value) ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className="font-medium">{option.name}</span>
              </button>
            ))}
          </div>
        </FilterSection>
      </div>
    </div>
  )
}
