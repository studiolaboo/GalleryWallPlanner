"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react"
import { fetchArtworkProducts, createCheckout } from '../utils/shopify'
import { useMobileDetection, useFullscreen } from '../hooks'
import { portraitLayoutOptions, placeCategories, roomImages } from '../data'
import { getVariantForSize, getVariantPrice } from '../utils/helpers'

const DEFAULT_LAYOUT = portraitLayoutOptions[0] // Single Portrait

const GalleryContext = createContext(null)

export function GalleryProvider({ children }) {
  // Mobile and fullscreen detection hooks
  const { isMobile, isLandscape, isIOS, showRotatePrompt, setShowRotatePrompt } = useMobileDetection()
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(isIOS)

  const [currentStep, setCurrentStep] = useState(() => {
    const savedStep = localStorage.getItem('galleryCurrentStep')
    // Migration: "intro" step was removed, redirect to step1
    if (savedStep === 'intro') return "step1"
    return savedStep || "step1"
  })
  const _defaultPlace = placeCategories.find(p => p.id === 'living-room') || placeCategories[0]
  const _defaultBgUrl  = (roomImages['living-room'] || [])[0] || null
  const _defaultBg     = _defaultBgUrl
    ? { id: 'living-room-local-0', image: _defaultBgUrl, name: 'Living Room 1' }
    : null

  const [selectedPlace, setSelectedPlace] = useState(() => {
    const saved = localStorage.getItem('gallerySelectedPlace')
    return saved ? JSON.parse(saved) : _defaultPlace
  })
  const [selectedBackground, setSelectedBackground] = useState(() => {
    const saved = localStorage.getItem('gallerySelectedBackground')
    return saved ? JSON.parse(saved) : _defaultBg
  })
  const [selectedLayout, setSelectedLayout] = useState(() => {
    const saved = localStorage.getItem('gallerySelectedLayout')
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUT
  })
  const [activeVariants, setActiveVariants] = useState(() => {
    const saved = localStorage.getItem('galleryActiveVariants')
    return saved ? JSON.parse(saved) : {}
  })
  const [expandedSection, setExpandedSection] = useState(null)
  const [selectedArtworks, setSelectedArtworks] = useState(() => {
    const saved = localStorage.getItem('gallerySelectedArtworks')
    return saved ? JSON.parse(saved) : {}
  })
  const [activeFrameIndex, setActiveFrameIndex] = useState(null)
  const [artworkProducts, setArtworkProducts] = useState([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedColorFilters, setSelectedColorFilters] = useState([])
  const [selectedOrientationFilters, setSelectedOrientationFilters] = useState([])
  const [selectedSizeFilters, setSelectedSizeFilters] = useState([])
  const [selectedStyleFilters, setSelectedStyleFilters] = useState([])
  const [selectedCollectionFilters, setSelectedCollectionFilters] = useState([])
  const [selectedArtistFilters, setSelectedArtistFilters] = useState([])
  const [selectedRoomFilters, setSelectedRoomFilters] = useState([])
  const [expandedFilterSection, setExpandedFilterSection] = useState(null)
  const [selectedFrames, setSelectedFrames] = useState(() => {
    const saved = localStorage.getItem('gallerySelectedFrames')
    return saved ? JSON.parse(saved) : {}
  })
  const [activeFrameForStyle, setActiveFrameForStyle] = useState(null)
  const [showCart, setShowCart] = useState(false)
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('galleryCart')
    return savedCart ? JSON.parse(savedCart) : { artworks: {}, frames: {} }
  })
  const [quantities, setQuantities] = useState(() => {
    const savedQuantities = localStorage.getItem('galleryQuantities')
    return savedQuantities ? JSON.parse(savedQuantities) : { artworks: {}, frames: {} }
  })
  const [displayedArtworkCount, setDisplayedArtworkCount] = useState(120)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const artworkScrollRef = useRef(null)
  const [showLayoutChangeModal, setShowLayoutChangeModal] = useState(false)
  const [pendingLayout, setPendingLayout] = useState(null)
  const [showEmptyArtworkModal, setShowEmptyArtworkModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showResetToast, setShowResetToast] = useState(false)
  const [savedGalleryWalls, setSavedGalleryWalls] = useState([])
  const [showCartDropdown, setShowCartDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Customize Your Prints settings
  const [measurementUnit, setMeasurementUnit] = useState('cm')
  const [printOrientation, setPrintOrientation] = useState('Portrait')
  const [printStyle, setPrintStyle] = useState('Black')
  const [printSize, setPrintSize] = useState('50 × 70')
  const [perFrameSizes, setPerFrameSizes] = useState([]) // per-frame size overrides
  const [spacingPreset, setSpacingPreset] = useState('tight')
  const [spacingValue, setSpacingValue] = useState(2) // in cm
  const [innerShadow, setInnerShadow] = useState(() => {
    const saved = localStorage.getItem('galleryInnerShadow')
    return saved ? JSON.parse(saved) : { xOffset: 0, yOffset: 2, blur: 10, spread: 0, opacity: 20 }
  })

  // Canvas overlay controls
  const [wallScale, setWallScale] = useState(0)
  const [showGrid, setShowGrid] = useState(false)
  const [showRuler, setShowRuler] = useState(false)

  // Draggable group position
  const [groupOffset, setGroupOffset] = useState(() => {
    const saved = localStorage.getItem('galleryGroupOffset')
    return saved ? JSON.parse(saved) : { x: 0, y: 0 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const wasDraggingRef = useRef(false)
  const canvasRef = useRef(null)

  // Lock / individual-drag state
  const [isLocked, setIsLocked] = useState(() => {
    const saved = localStorage.getItem('galleryIsLocked')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [individualOffsets, setIndividualOffsets] = useState(() => {
    const saved = localStorage.getItem('galleryIndividualOffsets')
    return saved ? JSON.parse(saved) : {}
  })
  const [activeDragFrameIdx, setActiveDragFrameIdx] = useState(null)
  const [individualDragStart, setIndividualDragStart] = useState({ x: 0, y: 0 })
  const [individualDragLive, setIndividualDragLive] = useState({ x: 0, y: 0 })

  // ===== UNDO / REDO HISTORY =====
  const historyRef = useRef([])
  const futureRef = useRef([])
  const isRestoringRef = useRef(false)
  const MAX_HISTORY = 50

  const getSnapshot = useCallback(() => ({
    selectedPlace, selectedBackground, selectedLayout,
    selectedArtworks: { ...selectedArtworks },
    selectedFrames: { ...selectedFrames },
    printOrientation, printStyle, printSize, measurementUnit,
    wallScale, spacingPreset, spacingValue,
    groupOffset: { ...groupOffset },
  }), [selectedPlace, selectedBackground, selectedLayout, selectedArtworks, selectedFrames,
    printOrientation, printStyle, printSize, measurementUnit, wallScale, spacingPreset, spacingValue, groupOffset])

  const pushHistory = useCallback(() => {
    if (isRestoringRef.current) return
    const snap = getSnapshot()
    historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), snap]
    futureRef.current = []
  }, [getSnapshot])

  // Auto-push on meaningful state changes
  const prevSnapRef = useRef(null)
  useEffect(() => {
    if (isRestoringRef.current) return
    const snap = getSnapshot()
    const prev = prevSnapRef.current
    if (prev && JSON.stringify(prev) !== JSON.stringify(snap)) {
      historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), prev]
      futureRef.current = []
    }
    prevSnapRef.current = snap
  }, [getSnapshot])

  const restoreSnapshot = useCallback((snap) => {
    isRestoringRef.current = true
    if (snap.selectedPlace !== undefined) setSelectedPlace(snap.selectedPlace)
    if (snap.selectedBackground !== undefined) setSelectedBackground(snap.selectedBackground)
    if (snap.selectedLayout !== undefined) setSelectedLayout(snap.selectedLayout)
    if (snap.selectedArtworks !== undefined) setSelectedArtworks(snap.selectedArtworks)
    if (snap.selectedFrames !== undefined) setSelectedFrames(snap.selectedFrames)
    if (snap.printOrientation !== undefined) setPrintOrientation(snap.printOrientation)
    if (snap.printStyle !== undefined) setPrintStyle(snap.printStyle)
    if (snap.printSize !== undefined) setPrintSize(snap.printSize)
    if (snap.measurementUnit !== undefined) setMeasurementUnit(snap.measurementUnit)
    if (snap.wallScale !== undefined) setWallScale(snap.wallScale)
    if (snap.spacingPreset !== undefined) setSpacingPreset(snap.spacingPreset)
    if (snap.spacingValue !== undefined) setSpacingValue(snap.spacingValue)
    if (snap.groupOffset !== undefined) setGroupOffset(snap.groupOffset)
    // Allow state to settle, then re-enable tracking
    setTimeout(() => {
      prevSnapRef.current = getSnapshot()
      isRestoringRef.current = false
    }, 0)
  }, [getSnapshot])

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return
    const current = getSnapshot()
    futureRef.current = [current, ...futureRef.current]
    const prev = historyRef.current.pop()
    restoreSnapshot(prev)
  }, [getSnapshot, restoreSnapshot])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    const current = getSnapshot()
    historyRef.current = [...historyRef.current, current]
    const next = futureRef.current.shift()
    restoreSnapshot(next)
  }, [getSnapshot, restoreSnapshot])

  const canUndo = historyRef.current.length > 0
  const canRedo = futureRef.current.length > 0

  // ===== EFFECTS =====

  // Fetch artwork products from Shopify on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true)
        const products = await fetchArtworkProducts()
        console.log('=== LOADED PRODUCTS ===', products.length)
        if (products.length > 0) {
          console.log('Sample product structure:', {
            title: products[0].title,
            colors: products[0].colors,
            sizes: products[0].sizes,
            styles: products[0].styles,
            rooms: products[0].rooms,
            artists: products[0].artists,
            tags: products[0].tags,
            productType: products[0].productType
          })
        }
        setArtworkProducts(products)
      } catch (error) {
        console.error('Failed to fetch artwork products:', error)
      } finally {
        setIsLoadingProducts(false)
      }
    }
    loadProducts()
  }, [])

  // Save to localStorage effects
  useEffect(() => { localStorage.setItem('galleryCart', JSON.stringify(cartItems)) }, [cartItems])
  useEffect(() => { localStorage.setItem('galleryQuantities', JSON.stringify(quantities)) }, [quantities])
  useEffect(() => { localStorage.setItem('galleryCurrentStep', currentStep) }, [currentStep])
  useEffect(() => { if (selectedPlace) localStorage.setItem('gallerySelectedPlace', JSON.stringify(selectedPlace)) }, [selectedPlace])
  useEffect(() => { if (selectedBackground) localStorage.setItem('gallerySelectedBackground', JSON.stringify(selectedBackground)) }, [selectedBackground])
  useEffect(() => { if (selectedLayout) localStorage.setItem('gallerySelectedLayout', JSON.stringify(selectedLayout)) }, [selectedLayout])
  useEffect(() => { localStorage.setItem('galleryActiveVariants', JSON.stringify(activeVariants)) }, [activeVariants])
  useEffect(() => { localStorage.setItem('gallerySelectedArtworks', JSON.stringify(selectedArtworks)) }, [selectedArtworks])
  useEffect(() => { localStorage.setItem('gallerySelectedFrames', JSON.stringify(selectedFrames)) }, [selectedFrames])
  useEffect(() => { localStorage.setItem('galleryGroupOffset', JSON.stringify(groupOffset)) }, [groupOffset])
  useEffect(() => { localStorage.setItem('galleryIsLocked', JSON.stringify(isLocked)) }, [isLocked])
  useEffect(() => { localStorage.setItem('galleryIndividualOffsets', JSON.stringify(individualOffsets)) }, [individualOffsets])
  useEffect(() => { localStorage.setItem('galleryInnerShadow', JSON.stringify(innerShadow)) }, [innerShadow])

  // Ensure perFrameSizes is initialized whenever a layout with frames exists
  useEffect(() => {
    if (selectedLayout?.frames?.length > 0 && perFrameSizes.length === 0) {
      setPerFrameSizes(new Array(selectedLayout.frames.length).fill(printSize))
    }
  }, [selectedLayout?.id])

  // Reset displayed count when active frame or filter changes
  useEffect(() => {
    setDisplayedArtworkCount(120)
  }, [activeFrameIndex, searchQuery, selectedColorFilters, selectedOrientationFilters, selectedStyleFilters, selectedCollectionFilters, selectedArtistFilters, selectedRoomFilters])

  // ===== FILTER LOGIC =====

  const toggleFilter = (filterType, value) => {
    const setterMap = {
      'color': setSelectedColorFilters,
      'orientation': setSelectedOrientationFilters,
      'size': setSelectedSizeFilters,
      'style': setSelectedStyleFilters,
      'collection': setSelectedCollectionFilters,
      'artist': setSelectedArtistFilters,
      'room': setSelectedRoomFilters
    }
    const setter = setterMap[filterType]
    if (setter) {
      setter(prev => {
        if (prev.includes(value)) {
          return prev.filter(item => item !== value)
        } else {
          return [...prev, value]
        }
      })
    }
  }

  const COLLECTION_FILTER_ALIASES = {
    'popular themes': ['botanical wall art', 'coastal wall art', 'travel wall art', 'space astronomy', 'typography wall art', 'motivational quotes', 'animal wall art'],
    'japanese cult styles': ['japanese wall art', 'japanese pop art', 'japanese mythology art', 'ukiyo e prints', 'ink wash art', 'wabi sabi wall art'],
    sports: ['basketball', 'cars', 'cycling', 'football soccer', 'formula 1', 'golf', 'skiing', 'surfing', 'tennis'],
    'food drinks': ['bar wall art', 'cocktail wall art', 'coffee wall art', 'food wall art', 'fruit wall art', 'italian kitchen art', 'ramen posters'],
    animals: ['birds', 'cats', 'dogs', 'elephants', 'fish', 'foxes', 'horses', 'insects', 'leopards', 'lions', 'panthers', 'wildlife', 'tigers'],
    'culture travel': ['greek wall art', 'indian wall art', 'italian wall art', 'japanese wall art', 'mexican wall art'],
    'maps cities': ['all travel', 'all cities', 'london', 'new york', 'paris', 'rome', 'tokyo'],
    seasons: ['all seasons', 'summer prints', 'spring prints', 'autumn prints', 'winter prints', 'holiday posters'],
    nature: ['all nature', 'botanical', 'beaches', 'forests', 'landscapes', 'mountains', 'seas and oceans', 'tropical'],
    'kids teens': ['all kids wall art', 'teen wall art'],
    'art styles': ['botanical', 'illustrations', 'graphical', 'line art', 'paintings', 'black and white'],
    lifestyle: ['fashion', 'music', 'architecture'],
  }

  const normalizeFilterText = (value) => String(value ?? '')
    .toLowerCase()
    .replace(/[&/]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  const compactFilterText = (value) => String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

  const COLOR_FILTER_ALIASES = {
    neutral: ['beige', 'grey', 'gray', 'brown', 'cream', 'tan', 'ivory', 'taupe', 'sand', 'khaki', 'earthy', 'natural', 'warm', 'muted', 'earth'],
    'black white': ['black and white', 'black/white', 'black & white', 'monochrome', 'monochromatic', 'b&w', 'bw'],
    rainbow: ['multicolor', 'multi color', 'multi-colour', 'colourful', 'colorful', 'prismatic', 'prism'],
    indigo: ['blue', 'navy', 'cobalt', 'purple', 'violet'],
    purple: ['violet', 'lavender', 'lilac'],
    violet: ['purple', 'lavender', 'lilac'],
  }

  const getColorFilterTerms = (filterValue) => {
    const normalized = normalizeFilterText(filterValue)
    const compact = compactFilterText(filterValue)
    const aliases = COLOR_FILTER_ALIASES[normalized] || COLOR_FILTER_ALIASES[compact] || []
    const normalizedAliases = aliases.map(normalizeFilterText).filter(Boolean)

    return Array.from(new Set([
      normalized,
      compact,
      ...normalizedAliases,
      ...normalizedAliases.map(compactFilterText),
    ].filter(Boolean)))
  }

  const matchesColorFilter = (artwork, filterValue) => {
    const terms = getColorFilterTerms(filterValue)
    const searchableParts = [
      ...(Array.isArray(artwork?.colors) ? artwork.colors : []),
      ...(Array.isArray(artwork?.tags) ? artwork.tags : []),
      artwork?.category,
      artwork?.title,
      artwork?.productType,
    ].filter(Boolean).map(part => String(part))

    return terms.some(term => {
      const normalizedTerm = normalizeFilterText(term)
      const compactTerm = compactFilterText(term)
      return searchableParts.some(part => {
        const normalizedPart = normalizeFilterText(part)
        const compactPart = compactFilterText(part)
        return (
          normalizedPart.includes(normalizedTerm) ||
          normalizedTerm.includes(normalizedPart) ||
          compactPart.includes(compactTerm) ||
          compactTerm.includes(compactPart)
        )
      })
    })
  }

  const getCollectionFilterTerms = (filterValue) => {
    const normalized = normalizeFilterText(filterValue)
    const compact = compactFilterText(filterValue)
    const aliases = COLLECTION_FILTER_ALIASES[normalized] || COLLECTION_FILTER_ALIASES[compact] || []
    const normalizedAliases = aliases.map(normalizeFilterText).filter(Boolean)
    return Array.from(new Set([normalized, compact, ...normalizedAliases, ...normalizedAliases.map(compactFilterText)].filter(Boolean)))
  }

  const matchesCollectionFilter = (artwork, filterValue) => {
    const terms = getCollectionFilterTerms(filterValue)
    const searchableParts = [
      artwork?.category,
      artwork?.productType,
      artwork?.title,
      ...(Array.isArray(artwork?.tags) ? artwork.tags : []),
      ...(Array.isArray(artwork?.styles) ? artwork.styles : []),
      ...(Array.isArray(artwork?.artists) ? artwork.artists : []),
    ].filter(Boolean).map(part => String(part).toLowerCase())

    return terms.some(term => {
      const normalizedTerm = normalizeFilterText(term)
      const compactTerm = compactFilterText(term)
      return searchableParts.some(part => {
        const normalizedPart = normalizeFilterText(part)
        const compactPart = compactFilterText(part)
        return (
          normalizedPart.includes(normalizedTerm) ||
          normalizedTerm.includes(normalizedPart) ||
          compactPart.includes(compactTerm) ||
          compactTerm.includes(compactPart)
        )
      })
    })
  }

  // Memoized filtered artworks — only recalculates when products or filters change
  const filteredArtworks = useMemo(() => {
    let filtered = artworkProducts

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(artwork => {
        const searchableText = `${artwork.title} ${artwork.category} ${artwork.tags?.join(' ')}`.toLowerCase()
        return searchableText.includes(query)
      })
    }

    // Apply size filters
    if (selectedSizeFilters.length > 0) {
      filtered = filtered.filter(artwork => {
        if (!artwork.sizes || !Array.isArray(artwork.sizes) || artwork.sizes.length === 0) {
          return true
        }
        return selectedSizeFilters.some(sizeFilter => {
          return artwork.sizes.some(size => {
            const normalizedSize = String(size).toLowerCase().replace(/[×\s×]/gi, 'x').replace(/cm/gi, '').trim()
            const normalizedFilter = String(sizeFilter).toLowerCase().replace(/[×\s×]/gi, 'x').replace(/cm/gi, '').trim()
            return normalizedSize === normalizedFilter || normalizedSize.includes(normalizedFilter) || normalizedFilter.includes(normalizedSize)
          })
        })
      })
    }

    // Apply color filters
    if (selectedColorFilters.length > 0) {
      filtered = filtered.filter(artwork => {
        return selectedColorFilters.some(colorFilter => matchesColorFilter(artwork, colorFilter))
      })
    }

    // Apply orientation filters
    if (selectedOrientationFilters.length > 0) {
      filtered = filtered.filter(artwork => {
        const hasOrientationTags = artwork.tags && Array.isArray(artwork.tags) && artwork.tags.some(tag =>
          ['portrait', 'landscape', 'square', 'horizontal', 'vertical'].includes(tag.toLowerCase())
        )
        if (!hasOrientationTags) {
          return true
        }
        return selectedOrientationFilters.some(orientation => {
          if (!artwork.tags || !Array.isArray(artwork.tags)) return false
          return artwork.tags.some(tag => tag.toLowerCase() === orientation.toLowerCase())
        })
      })
    }

    // Apply style filters
    if (selectedStyleFilters.length > 0) {
      filtered = filtered.filter(artwork => {
        return selectedStyleFilters.some(style => {
          const normalizedStyle = style.toLowerCase().trim()
          // Match against styles metafield
          if (artwork.styles && Array.isArray(artwork.styles) && artwork.styles.length > 0) {
            const hasStyle = artwork.styles.some(artworkStyle => {
              const normalized = artworkStyle.toLowerCase().trim()
              return normalized.includes(normalizedStyle) || normalizedStyle.includes(normalized)
            })
            if (hasStyle) return true
          }
          // Match against tags
          if (artwork.tags && Array.isArray(artwork.tags)) {
            const matchesTag = artwork.tags.some(tag => {
              const normalizedTag = tag.toLowerCase().trim()
              return normalizedTag.includes(normalizedStyle) || normalizedStyle.includes(normalizedTag)
            })
            if (matchesTag) return true
          }
          // Match against productType
          if (artwork.productType) {
            const pt = artwork.productType.toLowerCase().trim()
            if (pt.includes(normalizedStyle) || normalizedStyle.includes(pt)) return true
          }
          // Match against category
          if (artwork.category) {
            const cat = artwork.category.toLowerCase().trim()
            if (cat.includes(normalizedStyle) || normalizedStyle.includes(cat)) return true
          }
          // Match against title
          if (artwork.title) {
            const t = artwork.title.toLowerCase().trim()
            if (t.includes(normalizedStyle)) return true
          }
          return false
        })
      })
    }

    // Apply category filters (matches against category, productType, tags, and title)
    if (selectedCollectionFilters.length > 0) {
      filtered = filtered.filter(artwork => {
        return selectedCollectionFilters.some(cat => matchesCollectionFilter(artwork, cat))
      })
    }

    // Apply artist filters
    if (selectedArtistFilters.length > 0) {
      filtered = filtered.filter(artwork => {
        return selectedArtistFilters.some(artist => {
          const normalizedArtist = artist.toLowerCase().trim()
          // Match against artists metafield
          if (artwork.artists && Array.isArray(artwork.artists) && artwork.artists.length > 0) {
            const hasArtist = artwork.artists.some(artworkArtist => {
              const normalized = artworkArtist.toLowerCase().trim()
              return normalized.includes(normalizedArtist) || normalizedArtist.includes(normalized)
            })
            if (hasArtist) return true
          }
          // Match against vendor
          if (artwork.vendor) {
            const normalizedVendor = artwork.vendor.toLowerCase().trim()
            if (normalizedVendor.includes(normalizedArtist) || normalizedArtist.includes(normalizedVendor)) return true
          }
          // Match against tags
          if (artwork.tags && Array.isArray(artwork.tags)) {
            const hasTag = artwork.tags.some(tag => {
              const normalizedTag = tag.toLowerCase().trim()
              return normalizedTag.includes(normalizedArtist) || normalizedArtist.includes(normalizedTag)
            })
            if (hasTag) return true
          }
          // Match against title
          if (artwork.title) {
            const t = artwork.title.toLowerCase().trim()
            if (t.includes(normalizedArtist)) return true
          }
          return false
        })
      })
    }

    // Apply room filters
    if (selectedRoomFilters.length > 0) {
      filtered = filtered.filter(artwork => {
        const hasRoomData = artwork.rooms && Array.isArray(artwork.rooms) && artwork.rooms.length > 0
        const hasRoomTags = artwork.tags && Array.isArray(artwork.tags) && artwork.tags.some(tag =>
          selectedRoomFilters.some(room => tag.toLowerCase().includes(room.toLowerCase()))
        )
        if (!hasRoomData && !hasRoomTags) {
          return true
        }
        return selectedRoomFilters.some(room => {
          const normalizedRoom = room.toLowerCase().trim()
          if (artwork.rooms && Array.isArray(artwork.rooms) && artwork.rooms.length > 0) {
            const hasRoom = artwork.rooms.some(artworkRoom => {
              const normalized = artworkRoom.toLowerCase().trim()
              return normalized.includes(normalizedRoom) || normalizedRoom.includes(normalized)
            })
            if (hasRoom) return true
          }
          if (artwork.tags && Array.isArray(artwork.tags)) {
            const hasTag = artwork.tags.some(tag => {
              const normalizedTag = tag.toLowerCase().trim()
              return normalizedTag.includes(normalizedRoom) || normalizedRoom.includes(normalizedTag)
            })
            if (hasTag) return true
          }
          return false
        })
      })
    }

    console.log(`🎨 Filter results: ${filtered.length}/${artworkProducts.length} products`)

    return filtered
  }, [artworkProducts, searchQuery, selectedSizeFilters, selectedColorFilters, selectedOrientationFilters, selectedStyleFilters, selectedCollectionFilters, selectedArtistFilters, selectedRoomFilters])

  // Filter artworks by the active frame's orientation so only matching
  // products are shown (portrait frame → portrait products, etc.).
  const getArtworksForFrameSize = (frameSize, frameOrientation) => {
    if (!frameOrientation) return filteredArtworks

    const orient = frameOrientation.toLowerCase() // "portrait" | "landscape" | "square"

    // Build the set of orientation keywords that should match
    const matchKeywords = orient === 'landscape'
      ? ['landscape', 'horizontal']
      : orient === 'portrait'
        ? ['portrait', 'vertical']
        : ['square']

    return filteredArtworks.filter(artwork => {
      const tags = artwork.tags
      if (!tags || !Array.isArray(tags) || tags.length === 0) return true

      // Check if the product has ANY orientation tag at all
      const orientationTags = tags.filter(tag =>
        ['portrait', 'landscape', 'square', 'horizontal', 'vertical'].includes(tag.toLowerCase())
      )

      // If the product has no orientation tags, show it in every orientation
      if (orientationTags.length === 0) return true

      // If it does have orientation tags, it must match the active frame's orientation
      return orientationTags.some(tag => matchKeywords.includes(tag.toLowerCase()))
    })
  }

  // ===== INFINITE SCROLL =====

  const handleScroll = useCallback(() => {
    if (!artworkScrollRef.current || isLoadingMore) return
    const container = artworkScrollRef.current
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      if (displayedArtworkCount >= filteredArtworks.length) return
      setIsLoadingMore(true)
      setTimeout(() => {
        setDisplayedArtworkCount(prev => Math.min(prev + 80, filteredArtworks.length))
        setIsLoadingMore(false)
      }, 200)
    }
  }, [isLoadingMore, displayedArtworkCount, filteredArtworks.length])

  useEffect(() => {
    const container = artworkScrollRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // ===== PRICE CALCULATIONS =====

  const calculateTotalPrice = () => {
    let total = 0
    Object.entries(selectedArtworks).forEach(([frameIdx, artwork]) => {
      const quantity = quantities.artworks[frameIdx] || 1
      // Resolve the print size for this frame
      const framePrintSize = perFrameSizes.length > 0
        ? (perFrameSizes[parseInt(frameIdx)] || printSize)
        : printSize
      const price = parseFloat(getVariantPrice(artwork, framePrintSize)) || 0
      total += price * quantity
    })
    Object.entries(selectedFrames).forEach(([frameIdx, frame]) => {
      const quantity = quantities.frames[frameIdx] || 1
      total += (parseFloat(frame.price) || 0) * quantity
    })
    return total.toFixed(2)
  }

  const calculateCartTotal = () => {
    let total = 0
    if (cartItems.artworks && typeof cartItems.artworks === 'object') {
      Object.entries(cartItems.artworks).forEach(([frameIdx, artwork]) => {
        const quantity = quantities.artworks?.[frameIdx] || 1
        // Use resolvedPrice (set during addToCart) if available, otherwise fall back
        const price = parseFloat(artwork.resolvedPrice || artwork.price) || 0
        total += price * quantity
      })
    }
    if (cartItems.frames && typeof cartItems.frames === 'object') {
      Object.entries(cartItems.frames).forEach(([frameIdx, frame]) => {
        const quantity = quantities.frames?.[frameIdx] || 1
        const price = parseFloat(frame.price) || 0
        total += price * quantity
      })
    }
    return total.toFixed(2)
  }

  // ===== DRAG HANDLERS =====

  const DRAG_BOUNDARY = {
    left: 250,
    right: 250,
    top: 50,
    bottom: 200
  }

  const handleDragStart = (e) => {
    e.preventDefault()
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY
    setIsDragging(true)
    setDragStart({ x: clientX, y: clientY })
    setDragOffset({ x: 0, y: 0 })
    wasDraggingRef.current = false
  }

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY
    let deltaX = clientX - dragStart.x
    let deltaY = clientY - dragStart.y
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      wasDraggingRef.current = true
    }
    const totalX = groupOffset.x + deltaX
    const totalY = groupOffset.y + deltaY
    const elasticFactor = 0.3
    if (totalX > DRAG_BOUNDARY.right) {
      const overflow = totalX - DRAG_BOUNDARY.right
      deltaX = DRAG_BOUNDARY.right - groupOffset.x + (overflow * elasticFactor)
    } else if (totalX < -DRAG_BOUNDARY.left) {
      const overflow = -DRAG_BOUNDARY.left - totalX
      deltaX = -DRAG_BOUNDARY.left - groupOffset.x - (overflow * elasticFactor)
    }
    if (totalY > DRAG_BOUNDARY.bottom) {
      const overflow = totalY - DRAG_BOUNDARY.bottom
      deltaY = DRAG_BOUNDARY.bottom - groupOffset.y + (overflow * elasticFactor)
    } else if (totalY < -DRAG_BOUNDARY.top) {
      const overflow = -DRAG_BOUNDARY.top - totalY
      deltaY = -DRAG_BOUNDARY.top - groupOffset.y - (overflow * elasticFactor)
    }
    setDragOffset({ x: deltaX, y: deltaY })
  }, [isDragging, dragStart, groupOffset])

  const GRID_SNAP_PX = 30

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    let finalX = groupOffset.x + dragOffset.x
    let finalY = groupOffset.y + dragOffset.y
    finalX = Math.max(-DRAG_BOUNDARY.left, Math.min(DRAG_BOUNDARY.right, finalX))
    finalY = Math.max(-DRAG_BOUNDARY.top, Math.min(DRAG_BOUNDARY.bottom, finalY))
    if (showGrid) {
      finalX = Math.round(finalX / GRID_SNAP_PX) * GRID_SNAP_PX
      finalY = Math.round(finalY / GRID_SNAP_PX) * GRID_SNAP_PX
    }
    setGroupOffset({ x: finalX, y: finalY })
    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })
  }, [isDragging, dragOffset, groupOffset, showGrid])

  // Reset group offset when layout changes
  useEffect(() => {
    if (selectedLayout) {
      setGroupOffset({ x: 0, y: 0 })
      setIndividualOffsets({})
    }
  }, [selectedLayout?.id])

  // ===== INDIVIDUAL FRAME DRAG (unlocked mode) =====
  const handleIndividualDragStart = useCallback((e, idx) => {
    e.preventDefault()
    e.stopPropagation()
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY
    setActiveDragFrameIdx(idx)
    setIndividualDragStart({ x: clientX, y: clientY })
    setIndividualDragLive({ x: 0, y: 0 })
    wasDraggingRef.current = false
  }, [])

  const handleIndividualDragMove = useCallback((e) => {
    if (activeDragFrameIdx === null) return
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY
    const deltaX = clientX - individualDragStart.x
    const deltaY = clientY - individualDragStart.y
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) wasDraggingRef.current = true
    setIndividualDragLive({ x: deltaX, y: deltaY })
  }, [activeDragFrameIdx, individualDragStart])

  const handleIndividualDragEnd = useCallback(() => {
    if (activeDragFrameIdx === null) return
    const prev = individualOffsets[activeDragFrameIdx] || { x: 0, y: 0 }
    let newX = prev.x + individualDragLive.x
    let newY = prev.y + individualDragLive.y
    if (showGrid) {
      newX = Math.round(newX / GRID_SNAP_PX) * GRID_SNAP_PX
      newY = Math.round(newY / GRID_SNAP_PX) * GRID_SNAP_PX
    }
    setIndividualOffsets(o => ({
      ...o,
      [activeDragFrameIdx]: { x: newX, y: newY }
    }))
    setActiveDragFrameIdx(null)
    setIndividualDragLive({ x: 0, y: 0 })
  }, [activeDragFrameIdx, individualOffsets, individualDragLive, showGrid])

  useEffect(() => {
    if (activeDragFrameIdx !== null) {
      window.addEventListener('mousemove', handleIndividualDragMove)
      window.addEventListener('mouseup', handleIndividualDragEnd)
      window.addEventListener('touchmove', handleIndividualDragMove, { passive: false })
      window.addEventListener('touchend', handleIndividualDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleIndividualDragMove)
        window.removeEventListener('mouseup', handleIndividualDragEnd)
        window.removeEventListener('touchmove', handleIndividualDragMove)
        window.removeEventListener('touchend', handleIndividualDragEnd)
      }
    }
  }, [activeDragFrameIdx, handleIndividualDragMove, handleIndividualDragEnd])

  // Reset both group and individual positions to centre
  const resetPositions = useCallback(() => {
    setGroupOffset({ x: 0, y: 0 })
    setIndividualOffsets({})
  }, [])

  // ===== DUPLICATE FRAME =====
  const duplicateFrame = useCallback((frameIdx) => {
    if (!selectedLayout?.frames || frameIdx < 0 || frameIdx >= selectedLayout.frames.length) return
    
    // Get the frame to duplicate
    const frameToClone = selectedLayout.frames[frameIdx]
    const artworkToClone = selectedArtworks[frameIdx]
    const sizeToClone = perFrameSizes[frameIdx] || printSize
    const offsetToClone = individualOffsets[frameIdx] || { x: 0, y: 0 }
    
    // Find all frames that share the same base position (same layout position)
    // These are frames that were duplicated from the same source
    const samePositionFrames = selectedLayout.frames
      .map((frame, idx) => ({
        frame,
        idx,
        offset: individualOffsets[idx] || { x: 0, y: 0 }
      }))
      .filter(item => 
        item.frame.left === frameToClone.left && 
        item.frame.top === frameToClone.top
      )
    
    // Find the rightmost frame among those with the same base position
    const rightmostOffset = Math.max(...samePositionFrames.map(item => item.offset.x))
    
    // Calculate the new offset position
    const frameWidthOffset = 240 // Frame width + gap (increased for better spacing)
    const newXOffset = rightmostOffset + frameWidthOffset
    
    // Check if the new frame would go off-screen (canvas is roughly 1400px wide, frames are ~180px)
    // Keep a 200px margin from the right edge
    const maxOffset = 1000 // Maximum safe x-offset to keep frames visible
    if (newXOffset > maxOffset) {
      alert('Cannot add more frames - they would go off screen. Please rearrange existing frames or use a different layout.')
      return
    }
    
    // Create a new frame with the SAME position as the original (keep identical layout position)
    const newFrame = {
      ...frameToClone,
      // Keep the same position - we'll offset it using individualOffsets
    }
    
    // Update the layout with the new frame
    const newFrames = [...selectedLayout.frames, newFrame]
    const updatedLayout = {
      ...selectedLayout,
      frames: newFrames,
      frameCount: newFrames.length,
      name: selectedLayout.name // Keep original name
    }
    setSelectedLayout(updatedLayout)
    
    // Update per-frame sizes
    setPerFrameSizes(prev => [...prev, sizeToClone])
    
    // Copy the artwork to the new frame
    if (artworkToClone) {
      const newIdx = newFrames.length - 1
      setSelectedArtworks(prev => ({
        ...prev,
        [newIdx]: { ...artworkToClone }
      }))
    }
    
    // Position the new frame to the right of the rightmost frame with same base position
    setIndividualOffsets(prev => ({
      ...prev,
      [newFrames.length - 1]: { x: newXOffset, y: offsetToClone.y }
    }))
    
    // Set the new frame as active
    setActiveFrameIndex(newFrames.length - 1)
  }, [selectedLayout, selectedArtworks, perFrameSizes, printSize, individualOffsets])

  // Add global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      window.addEventListener('touchmove', handleDragMove, { passive: false })
      window.addEventListener('touchend', handleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
        window.removeEventListener('touchmove', handleDragMove)
        window.removeEventListener('touchend', handleDragEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // ===== CART HANDLERS =====

  const handleQuantityChange = (type, frameIdx, newQuantity) => {
    setQuantities(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [frameIdx]: parseInt(newQuantity)
      }
    }))
  }

  const handleAddToCart = () => {
    const artworksWithSize = {}
    Object.entries(selectedArtworks).forEach(([frameIdx, artwork]) => {
      const frameSize = selectedLayout?.frames[parseInt(frameIdx)]?.size || artwork.size
      // Resolve the print size for this frame (from per-frame overrides or global)
      const framePrintSize = perFrameSizes.length > 0
        ? (perFrameSizes[parseInt(frameIdx)] || printSize)
        : printSize
      // Resolve the matching variant for this size
      const resolved = getVariantForSize(artwork, framePrintSize)
      artworksWithSize[frameIdx] = {
        ...artwork,
        frameSize: frameSize,
        resolvedVariantId: resolved?.variantId || artwork.variants?.[0]?.id || null,
        resolvedPrice: resolved?.variantPrice || artwork.price,
        resolvedVariantTitle: resolved?.variantTitle || '',
      }
    })
    setCartItems({
      artworks: artworksWithSize,
      frames: { ...selectedFrames }
    })
    const newQuantities = { ...quantities }
    Object.keys(selectedArtworks).forEach(frameIdx => {
      if (!newQuantities.artworks[frameIdx]) {
        newQuantities.artworks[frameIdx] = 1
      }
    })
    Object.keys(selectedFrames).forEach(frameIdx => {
      if (!newQuantities.frames[frameIdx]) {
        newQuantities.frames[frameIdx] = 1
      }
    })
    setQuantities(newQuantities)
    setShowCart(true)
  }

  // ===== CHECKOUT =====

  const handleCheckout = async () => {
    console.log("=== CHECKOUT FUNCTION CALLED ===");
    console.log("Cart items:", cartItems);
    console.log("Quantities:", quantities);
    try {
      const lineItems = []
      Object.entries(cartItems.artworks).forEach(([frameIdx, artwork]) => {
        console.log('=== PROCESSING ARTWORK ===')
        console.log('Artwork title:', artwork.title)
        console.log('Artwork frameSize:', artwork.frameSize)
        console.log('Artwork has variants:', artwork.variants?.length || 0)

        // Prefer the pre-resolved variant ID from handleAddToCart
        let variantId = artwork.resolvedVariantId || artwork.variants?.[0]?.id || artwork.shopifyProductId

        // Fallback: if no pre-resolved variant, try matching by frame size
        if (!artwork.resolvedVariantId && artwork.frameSize && artwork.variants && artwork.variants.length > 0) {
          const normalizedFrameSize = artwork.frameSize.replace(/\s+/g, '').toUpperCase().replace(/[×]/g, 'X')
          console.log('Normalized frame size to match:', normalizedFrameSize)
          console.log('Available variants:')
          artwork.variants.forEach((v, idx) => {
            console.log(`  ${idx + 1}. "${v.title}" (ID: ${v.id})`)
          })
          const matchingVariant = artwork.variants.find(variant => {
            const variantTitle = variant.title || ''
            const normalizedVariantTitle = variantTitle.replace(/\s+/g, '').toUpperCase().replace(/[×]/g, 'X')
            const matches = normalizedVariantTitle.includes(normalizedFrameSize)
            console.log(`  Comparing "${variantTitle}" -> "${normalizedVariantTitle}" contains "${normalizedFrameSize}"? ${matches}`)
            return matches
          })
          if (matchingVariant) {
            variantId = matchingVariant.id
            console.log('✓ FOUND MATCHING VARIANT:', matchingVariant.title, 'ID:', matchingVariant.id)
          } else {
            console.warn('✗ NO MATCH FOUND for size', artwork.frameSize, '- Using first variant:', artwork.variants[0]?.title)
          }
        } else if (artwork.resolvedVariantId) {
          console.log('✓ Using pre-resolved variant ID:', artwork.resolvedVariantId, 'Title:', artwork.resolvedVariantTitle)
        } else {
          console.log('Skipping variant matching (no frameSize or no variants)')
        }
        const quantity = quantities.artworks?.[frameIdx] || 1
        console.log('Final: Variant ID:', variantId, 'Quantity:', quantity, 'Frame Size:', artwork.frameSize)
        console.log('=========================\n')
        if (variantId) {
          const lineItem = {
            variantId: variantId,
            quantity: quantity
          }
          if (artwork.frameSize) {
            lineItem.customAttributes = [
              { key: "Frame Size", value: artwork.frameSize }
            ]
          }
          lineItems.push(lineItem)
        }
      })
      console.log('Line items prepared:', lineItems)
      if (lineItems.length === 0) {
        alert('Please add items to cart before checkout')
        return
      }
      console.log('Creating checkout with line items:', lineItems)
      const checkout = await createCheckout(lineItems)
      console.log('Checkout response:', checkout)
      if (checkout?.webUrl) {
        window.location.href = checkout.webUrl
      } else {
        throw new Error('Could not get checkout URL')
      }
    } catch (error) {
      console.error('Checkout error details:', error)
      alert(`Failed to create checkout: ${error.message}`)
    }
  }

  // ===== RESET =====

  const handleReset = () => {
    localStorage.removeItem('galleryCurrentStep')
    localStorage.removeItem('gallerySelectedPlace')
    localStorage.removeItem('gallerySelectedBackground')
    localStorage.removeItem('gallerySelectedLayout')
    localStorage.removeItem('galleryActiveVariants')
    localStorage.removeItem('gallerySelectedArtworks')
    localStorage.removeItem('gallerySelectedFrames')
    localStorage.removeItem('galleryCart')
    localStorage.removeItem('galleryQuantities')
    localStorage.removeItem('galleryGroupOffset')
    localStorage.removeItem('galleryIsLocked')
    localStorage.removeItem('galleryIndividualOffsets')
    localStorage.removeItem('galleryInnerShadow')
    setCurrentStep('step1')
    setSelectedPlace(_defaultPlace)
    setSelectedBackground(_defaultBg)
    setSelectedLayout(DEFAULT_LAYOUT)
    setActiveVariants({})
    setSelectedArtworks({})
    setSelectedFrames({})
    setCartItems({ artworks: {}, frames: {} })
    setQuantities({ artworks: {}, frames: {} })
    setActiveFrameIndex(null)
    setActiveFrameForStyle(null)
    setExpandedSection(null)
    setShowFilter(false)
    setSearchQuery('')
    setSelectedColorFilters([])
    setShowCart(false)
    setShowResetModal(false)
    setShowResetToast(true)
    setTimeout(() => setShowResetToast(false), 4000)
    setPrintOrientation('Portrait')
    setPrintSize('50 × 70')
    setPrintStyle('Black')
    setMeasurementUnit('cm')
    setInnerShadow({ xOffset: 0, yOffset: 2, blur: 10, spread: 0, opacity: 20 })
    setWallScale(0)
    setGroupOffset({ x: 0, y: 0 })
    setIsLocked(true)
    setIndividualOffsets({})
  }

  const value = {
    // Mobile / Fullscreen
    isMobile, isLandscape, isIOS, showRotatePrompt, setShowRotatePrompt,
    isFullscreen, enterFullscreen, exitFullscreen,
    // Steps
    currentStep, setCurrentStep,
    // Checkout readiness: all frames have artworks assigned
    isCheckoutReady: (selectedLayout?.frames?.length > 0) &&
      (Object.keys(selectedArtworks).length >= (selectedLayout?.frames?.length || 0)),
    // Selections
    selectedPlace, setSelectedPlace,
    selectedBackground, setSelectedBackground,
    selectedLayout, setSelectedLayout,
    activeVariants, setActiveVariants,
    expandedSection, setExpandedSection,
    selectedArtworks, setSelectedArtworks,
    activeFrameIndex, setActiveFrameIndex,
    selectedFrames, setSelectedFrames,
    activeFrameForStyle, setActiveFrameForStyle,
    // Products
    artworkProducts, isLoadingProducts,
    // Filters
    showFilter, setShowFilter,
    searchQuery, setSearchQuery,
    selectedColorFilters, setSelectedColorFilters,
    selectedOrientationFilters, setSelectedOrientationFilters,
    selectedSizeFilters, setSelectedSizeFilters,
    selectedStyleFilters, setSelectedStyleFilters,
    selectedCollectionFilters, setSelectedCollectionFilters,
    selectedArtistFilters, setSelectedArtistFilters,
    selectedRoomFilters, setSelectedRoomFilters,
    expandedFilterSection, setExpandedFilterSection,
    toggleFilter,
    getArtworksForFrameSize,
    // Cart
    showCart, setShowCart,
    cartItems, setCartItems,
    quantities, setQuantities,
    showCartDropdown, setShowCartDropdown,
    // Scroll
    displayedArtworkCount, setDisplayedArtworkCount,
    isLoadingMore,
    artworkScrollRef,
    // Modals
    showLayoutChangeModal, setShowLayoutChangeModal,
    pendingLayout, setPendingLayout,
    showEmptyArtworkModal, setShowEmptyArtworkModal,
    showResetModal, setShowResetModal,
    showResetToast, setShowResetToast,
    showMobileMenu, setShowMobileMenu,
    // Customize prints settings
    measurementUnit, setMeasurementUnit,
    printOrientation, setPrintOrientation,
    printStyle, setPrintStyle,
    printSize, setPrintSize,
    perFrameSizes, setPerFrameSizes,
    spacingPreset, setSpacingPreset,
    spacingValue, setSpacingValue,
    innerShadow, setInnerShadow,
    // Canvas overlay controls
    wallScale, setWallScale,
    showGrid, setShowGrid,
    showRuler, setShowRuler,
    // Undo / Redo
    undo, redo, canUndo, canRedo,
    // Saved
    savedGalleryWalls, setSavedGalleryWalls,
    // Drag
    groupOffset, setGroupOffset,
    isDragging, dragOffset,
    wasDraggingRef, canvasRef,
    handleDragStart,
    // Lock / individual drag
    isLocked, setIsLocked,
    individualOffsets, activeDragFrameIdx, individualDragLive,
    handleIndividualDragStart,
    resetPositions,
    duplicateFrame,
    // Handlers
    handleQuantityChange,
    handleAddToCart,
    handleCheckout,
    handleReset,
    calculateTotalPrice,
    calculateCartTotal,
  }

  return (
    <GalleryContext.Provider value={value}>
      {children}
    </GalleryContext.Provider>
  )
}

export function useGallery() {
  const context = useContext(GalleryContext)
  if (!context) {
    throw new Error('useGallery must be used within a GalleryProvider')
  }
  return context
}
