// Utility functions for the Gallery Wall Configurator

/**
 * Format currency values
 */
export const formatPrice = (price) => {
  return `$${parseFloat(price).toFixed(2)}`;
};

/**
 * Generate unique ID
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Filter products by category
 */
export const filterByCategory = (products, category) => {
  if (!category || category === 'all') return products;
  return products.filter((product) => product.category === category);
};

/**
 * Search products by name or description
 */
export const searchProducts = (products, query) => {
  if (!query) return products;
  const lowerQuery = query.toLowerCase();
  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(lowerQuery) ||
      (product.description && product.description.toLowerCase().includes(lowerQuery)) ||
      (product.artist && product.artist.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Sort products by specified field
 */
export const sortProducts = (products, sortBy) => {
  const sorted = [...products];
  
  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    case 'price-desc':
      return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
};

/**
 * Get unique categories from products
 */
export const getCategories = (products) => {
  const categories = new Set();
  products.forEach((product) => {
    if (product.category) {
      categories.add(product.category);
    }
  });
  return ['all', ...Array.from(categories)];
};

/**
 * Calculate position for frame on canvas
 */
export const calculateFramePosition = (position, canvasWidth, canvasHeight) => {
  return {
    left: `${position.x}%`,
    top: `${position.y}%`,
    width: `${position.width}%`,
    height: `${position.height}%`,
    transform: 'translate(-50%, -50%)',
  };
};

/**
 * Validate configuration before checkout
 */
export const validateConfiguration = (config) => {
  const errors = [];
  
  if (!config.selectedBackground) {
    errors.push('Please select a background');
  }
  
  if (!config.selectedLayout) {
    errors.push('Please select a layout');
  }
  
  if (config.selectedArtworks.length === 0) {
    errors.push('Please select at least one artwork');
  }
  
  if (config.selectedFrames.length === 0) {
    errors.push('Please select at least one frame');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Parse a print size string like "50 × 70" into numeric width/height (in the
 * unit the string represents).  Also handles A-series labels (A0–A4) which
 * are returned in **centimetres**.
 *
 * Returns { w, h, isCm } or null if invalid.
 *   isCm === true  → the returned values are already in cm (A-labels)
 *   isCm === false → caller should apply any in→cm conversion if needed
 */
const A_SIZES = {
  A0: { w: 84.1, h: 118.9 },
  A1: { w: 59.4, h: 84.1 },
  A2: { w: 42, h: 59.4 },
  A3: { w: 29.7, h: 42 },
  A4: { w: 21, h: 29.7 },
}

export const parsePrintSize = (printSize) => {
  if (!printSize) return null
  // Handle A-series labels
  const upper = printSize.trim().toUpperCase()
  if (A_SIZES[upper]) {
    return { w: A_SIZES[upper].w, h: A_SIZES[upper].h, isCm: true }
  }
  const parts = printSize.split('×').map(s => parseFloat(s.trim()))
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
  return { w: parts[0], h: parts[1], isCm: false }
}

/**
 * Determine the visual orientation of a single frame within a layout.
 *
 * For non-Mix orientations (Portrait / Landscape / Square) the answer is
 * simply the printOrientation itself.
 *
 * For Mix layouts each frame can have a different orientation which is
 * derived from the CSS-percentage width / height and the canvas aspect ratio
 * (≈ 1.6 : 1).  We compare the *pixel-proportional* width to height:
 *   pixelW = parseFloat(frame.width) × CANVAS_AR
 *   pixelH = parseFloat(frame.height)
 *   → landscape / portrait / square
 *
 * @param {Object} frame            – a layout frame { width, height, … }
 * @param {string} printOrientation  – "Portrait" | "Landscape" | "Square" | "Mix"
 * @returns {string} "portrait" | "landscape" | "square"
 */
export const getFrameOrientation = (frame, printOrientation) => {
  if (!frame) return 'portrait'

  // Non-Mix: every frame shares the chosen orientation
  if (printOrientation !== 'Mix') {
    return printOrientation.toLowerCase()  // "portrait" | "landscape" | "square"
  }

  // Mix: derive from the frame's CSS dimensions
  const CANVAS_AR = 1.6
  const w = parseFloat(frame.width) * CANVAS_AR
  const h = parseFloat(frame.height)
  const ratio = w / h

  // Allow a ±15 % tolerance around 1.0 to count as square
  if (ratio >= 0.85 && ratio <= 1.15) return 'square'
  if (w > h) return 'landscape'
  return 'portrait'
}

/**
 * Compute dynamically sized frames based on the selected print size.
 *
 * Scale approach:
 *   - A single CM_SCALE converts centimetres → % of canvas height.
 *   - CANVAS_ASPECT_RATIO corrects for the wider-than-tall canvas so that
 *     visual proportions (aspect ratio of each frame) are accurate.
 *   - Centre positions from the original layout are preserved; only the
 *     width / height around that centre change.
 *
 * For Mix orientation the function detects whether each individual frame
 * is landscape- or portrait-shaped and swaps the print-size dimensions
 * accordingly so that landscape frames stay landscape even though the
 * dropdown value is given in portrait format.
 *
 * @param {Array}  frames           – the layout's frames array
 * @param {string} printSize        – e.g. "50 × 70"
 * @param {string} measurementUnit  – "cm" | "in"
 * @param {string} printOrientation – "Portrait" | "Landscape" | "Square" | "Mix"
 * @param {number} wallScale        – slider value (default 50); sizes scale by wallScale/50
 * @returns {Array} new frames array with computed width/height/top/left
 */
export const getDynamicFrames = (frames, printSizes, measurementUnit, printOrientation, wallScale = 50, spacingValue = 5) => {
  if (!printSizes || !frames || frames.length === 0) return frames

  // Normalise: string → same size for every frame; array → one size per frame
  const sizesArr = Array.isArray(printSizes)
    ? printSizes
    : new Array(frames.length).fill(printSizes)

  const firstParsed = parsePrintSize(sizesArr[0])
  if (!firstParsed) return frames

  // 1 cm ≈ 0.29% of canvas width  (canvas represents ≈ 192 cm wall)
  // Adjusted so frames appear at the correct natural size when wallScale = 0
  const CM_SCALE = 0.29

  // Canvas aspect ratio (width / height) — the canvas container is typically
  // ~1.6 : 1 landscape.  We need this to convert width-% to height-% so we
  // can check vertical overflow.
  const CANVAS_AR = 1.6

  // Safe inset — frames must stay within this margin (%)
  const MARGIN = 2

  // ---------- Pass 1: compute raw sizes & centres ----------
  const scaleFactor = (wallScale + 50) / 50
  const raw = frames.map((frame, i) => {
    const sizeStr = sizesArr[i] ?? sizesArr[0]
    const parsed = parsePrintSize(sizeStr) || firstParsed

    // Keep original parsed values for label display
    const parsedW = parsed.w
    const parsedH = parsed.h
    const isInches = !parsed.isCm && measurementUnit === 'in'
    let widthCm = parsed.w
    let heightCm = parsed.h
    if (isInches) {
      widthCm *= 2.54
      heightCm *= 2.54
    }

    const origW = parseFloat(frame.width)
    const origH = parseFloat(frame.height)

    let fwCm = widthCm
    let fhCm = heightCm
    const isLandscapeFrame = origW > origH
    const isPortraitSize  = widthCm < heightCm
    if (printOrientation === 'Mix') {
      if (isLandscapeFrame && isPortraitSize) {
        fwCm = heightCm
        fhCm = widthCm
      }
    }

    // Force square aspect ratio when the layout explicitly marks frames as square
    if (frame.forceSquare) {
      const sq = Math.min(fwCm, fhCm)
      fwCm = sq
      fhCm = sq
    }

    const wPct = fwCm * CM_SCALE * scaleFactor
    // Height in the same %-of-width units (so we can compare apples-to-apples)
    const hPctW = fhCm * CM_SCALE * scaleFactor
    // Actual height as %-of-container-height = hPctW * CANVAS_AR
    const hPctH = hPctW * CANVAS_AR

    // Original centre
    const hasTranslateX = frame.transform?.includes('translateX(-50%)')
    let origLeft = frame.left
      ? parseFloat(frame.left)
      : frame.right
        ? 100 - parseFloat(frame.right) - origW
        : 50
    if (hasTranslateX) origLeft -= origW / 2
    const origTop = frame.top
      ? parseFloat(frame.top)
      : frame.bottom
        ? 100 - parseFloat(frame.bottom) - origH
        : 50

    const cx = origLeft + origW / 2
    const cy = origTop  + origH / 2

    // Size label
    const isALabel = parsed.isCm && /^A\d$/i.test(sizeStr.trim())
    // For the label, show original values (inches when in inch mode, cm otherwise)
    const labelW = isInches ? (isLandscapeFrame && isPortraitSize ? parsedH : parsedW) : fwCm
    const labelH = isInches ? (isLandscapeFrame && isPortraitSize ? parsedW : parsedH) : fhCm
    const sizeLabel = isALabel
      ? sizeStr.trim().toUpperCase()
      : Number.isInteger(labelW) && Number.isInteger(labelH)
        ? `${labelW}X${labelH}`
        : `${parseFloat(labelW.toFixed(1))}X${parseFloat(labelH.toFixed(1))}`

    const avgDim = (fwCm + fhCm) / 2
    const borderWidth = avgDim < 25 ? 2 : avgDim < 55 ? 3 : 4

    return { frame, wPct, hPctH, cx, cy, fwCm, fhCm, sizeLabel, borderWidth }
  })

  // User spacing converted to width-% space — used in Pass 2b collision clearance
  const spacingCm    = measurementUnit === 'in' ? spacingValue * 2.54 : spacingValue
  const spacingGap_w = spacingCm * CM_SCALE   // user gap in width-% space

  // ---------- Pass 1b: spread/compress frames from their original layout centres ----------
  // Use the selected spacing directly so default Tight (2cm) is respected.
  const targetGap  = spacingGap_w
  if (raw.length > 1) {
    const gcx = raw.reduce((s, r) => s + r.cx, 0) / raw.length
    const gcy = raw.reduce((s, r) => s + r.cy, 0) / raw.length
    let bestK = 0
    for (let i = 0; i < raw.length; i++) {
      for (let j = i + 1; j < raw.length; j++) {
        const ri = raw[i], rj = raw[j]
        const dx   = Math.abs(rj.cx - ri.cx)              // width-%
        const dy_w = Math.abs(rj.cy - ri.cy) / CANVAS_AR  // height-% → width-%
        let k_ij
        if (dx >= dy_w) {
          if (dx === 0) continue
          const hwSum = (ri.wPct + rj.wPct) / 2
          k_ij = (hwSum + targetGap) / dx
        } else {
          if (dy_w === 0) continue
          const hhSum_w = (ri.hPctH + rj.hPctH) / (2 * CANVAS_AR)
          k_ij = (hhSum_w + targetGap) / dy_w
        }
        if (k_ij > bestK) bestK = k_ij
      }
    }
    if (bestK > 0) {
      for (const r of raw) {
        r.cx = gcx + (r.cx - gcx) * bestK
        r.cy = gcy + (r.cy - gcy) * bestK
      }
    }
  }

  // ---------- Pass 2: compute bounding box & shrink factor ----------
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const r of raw) {
    const l = r.cx - r.wPct / 2
    const rr = r.cx + r.wPct / 2
    const t = r.cy - r.hPctH / 2
    const b = r.cy + r.hPctH / 2
    if (l < minX) minX = l
    if (rr > maxX) maxX = rr
    if (t < minY) minY = t
    if (b > maxY) maxY = b
  }

  const usableW = 100 - MARGIN * 2
  const usableH = 100 - MARGIN * 2
  const groupW = maxX - minX
  const groupH = maxY - minY

  let shrink = 1
  if (groupW > usableW) shrink = Math.min(shrink, usableW / groupW)
  if (groupH > usableH) shrink = Math.min(shrink, usableH / groupH)

  // Also clamp individual frames (single-frame edge case)
  for (const r of raw) {
    if (r.wPct * shrink > usableW) shrink = Math.min(shrink, usableW / r.wPct)
    if (r.hPctH * shrink > usableH) shrink = Math.min(shrink, usableH / r.hPctH)
  }

  // Compute group centre so we can keep the group centred after shrinking
  const groupCX = (minX + maxX) / 2
  const groupCY = (minY + maxY) / 2

  // ---------- Pass 2b: axis-aware ROW-GROUP separation ----------
  // Axis is inferred from ORIGINAL layout centres so the visual pattern is preserved.
  //   • Vertically dominant pair  (oDy_w ≥ AXIS_RATIO × oDx, or oDx ≈ 0)
  //       → push the ENTIRE ROW GROUP of both frames vertically.
  //         This keeps every frame in a row at the same height (prevents
  //         "2 Over 3"-style stagger where middle frames get double-pushed).
  //   • Horizontally dominant pair (oDx ≥ AXIS_RATIO × oDy_w, or oDy_w ≈ 0)
  //       → push these two frames horizontally only.
  //   • Diagonal pair (neither axis dominates)
  //       → skip entirely (preserves step / triangle / pyramid layouts).
  const LABEL_PAD  = spacingGap_w
  const HORIZ_GAP  = spacingGap_w
  const AXIS_RATIO = 2.0   // dominance threshold: catches grid rows (≈2.5) but skips triangle apex (≈1.96)

  // Pre-compute original centres for axis classification
  const origCX = frames.map(frame => {
    const w = parseFloat(frame.width)
    const hasT = frame.transform?.includes('translateX(-50%)')
    let left = frame.left
      ? parseFloat(frame.left)
      : frame.right
        ? 100 - parseFloat(frame.right) - w
        : 50
    if (hasT) left -= w / 2
    return left + w / 2
  })
  const origCY = frames.map(frame => {
    const h = parseFloat(frame.height)
    const top = frame.top
      ? parseFloat(frame.top)
      : frame.bottom
        ? 100 - parseFloat(frame.bottom) - h
        : 50
    return top + h / 2
  })

  // Group frames that share the same original cy into row groups.
  // Frames in the same group always move together vertically.
  const ROW_TOL   = 2  // height-% — frames within this are the "same row"
  const rowOf     = new Array(raw.length).fill(-1)
  const rowGroups = []
  for (let i = 0; i < raw.length; i++) {
    if (rowOf[i] !== -1) continue
    const group = [i]
    for (let j = i + 1; j < raw.length; j++) {
      if (rowOf[j] === -1 && Math.abs(origCY[j] - origCY[i]) < ROW_TOL) {
        group.push(j)
      }
    }
    const gid = rowGroups.length
    rowGroups.push(group)
    for (const idx of group) rowOf[idx] = gid
  }

  // Work in width-% space so horizontal and vertical distances are comparable
  const pos = raw.map(r => ({
    cx: groupCX + (r.cx - groupCX) * shrink,
    cy: (groupCY + (r.cy - groupCY) * shrink) / CANVAS_AR,  // height-% → width-%
    hw: (r.wPct * shrink) / 2,
    hh: (r.wPct * shrink) / 2 / (r.fwCm / r.fhCm),
  }))

  for (let iter = 0; iter < 60; iter++) {
    let moved = false
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const a = pos[i], b = pos[j]
        const oDx   = Math.abs(origCX[j] - origCX[i])
        const oDy_w = Math.abs(origCY[j] - origCY[i]) / CANVAS_AR

        if (oDx < 0.5 || oDy_w >= AXIS_RATIO * oDx) {
          // Vertically dominant — push entire row groups apart uniformly
          const dy   = Math.abs(b.cy - a.cy)
          const need = a.hh + b.hh + LABEL_PAD
          const ov   = need - dy
          if (ov > 0) {
            const push  = ov / 2
            const pushI = a.cy <= b.cy ? -push : push  // i goes up if it's above j
            for (const idx of rowGroups[rowOf[i]]) pos[idx].cy += pushI
            for (const idx of rowGroups[rowOf[j]]) pos[idx].cy -= pushI
            moved = true
          }
        } else if (oDy_w < 0.5 || oDx >= AXIS_RATIO * oDy_w) {
          // Horizontally dominant — push only these two frames apart horizontally
          const dx   = Math.abs(b.cx - a.cx)
          const need = a.hw + b.hw + HORIZ_GAP
          const ov   = need - dx
          if (ov > 0) {
            const push = ov / 2
            if (a.cx <= b.cx) { a.cx -= push; b.cx += push }
            else               { a.cx += push; b.cx -= push }
            moved = true
          }
        } else {
          // Diagonal pair (staggered / step / pyramid layouts) —
          // push apart along the actual centre-to-centre direction so the
          // diagonal angle is preserved but spacing slider still works.
          const ddx  = b.cx - a.cx
          const ddy  = b.cy - a.cy
          const dist = Math.sqrt(ddx * ddx + ddy * ddy)
          if (dist < 0.001) continue
          const nx = ddx / dist  // unit vector
          const ny = ddy / dist
          // Rectangle "reach" in direction (nx, ny): hw·|nx| + hh·|ny|
          const rA = a.hw * Math.abs(nx) + a.hh * Math.abs(ny)
          const rB = b.hw * Math.abs(nx) + b.hh * Math.abs(ny)
          // Gap = selected spacing along diagonal direction
          const need = rA + rB + spacingGap_w
          const ov   = need - dist
          if (ov > 0) {
            const push = ov / 2
            a.cx -= nx * push
            a.cy -= ny * push
            b.cx += nx * push
            b.cy += ny * push
            moved = true
          }
        }
      }
    }
    if (!moved) break
  }

  // Convert cy back to height-% — clamp horizontally only so frames
  // can extend off-screen top/bottom to maintain label clearance
  for (const p of pos) {
    p.cy = p.cy * CANVAS_AR
    p.cx = Math.max(MARGIN + p.hw, Math.min(100 - MARGIN - p.hw, p.cx))
  }

  // ---------- Pass 3: emit final frame objects using separated positions ----------
  return raw.map((r, i) => ({
    ...r.frame,
    width:       `${(r.wPct * shrink).toFixed(1)}%`,
    height:      `${(r.hPctH * shrink).toFixed(1)}%`,
    top:         undefined,
    left:        undefined,
    bottom:      undefined,
    right:       undefined,
    transform:   undefined,
    centerX:     pos[i].cx,
    centerY:     pos[i].cy,
    aspectRatio: r.fwCm / r.fhCm,
    size:        r.sizeLabel,
    borderWidth: r.borderWidth,
  }))
}

/**
 * Resolve the best-matching variant for a given print size.
 *
 * The function normalises the size string (strips spaces, replaces ×/x, uppercases)
 * and looks for a variant whose `title` or `selectedOptions` value contains that
 * normalised size.  If a match is found the variant's price is returned; otherwise
 * the product-level (minVariantPrice) price is used as fallback.
 *
 * @param {Object}  artwork   – a transformed Shopify product (must have .variants[])
 * @param {string}  printSize – current print size, e.g. "50 × 70"
 * @returns {{ variantId: string, variantPrice: string, variantTitle: string } | null}
 */
export const getVariantForSize = (artwork, printSize) => {
  if (!artwork?.variants || artwork.variants.length === 0 || !printSize) return null

  // Normalise the incoming size string: "50 × 70" → "50X70"
  const normalise = (s) =>
    s.replace(/\s+/g, '').toUpperCase().replace(/[×]/g, 'X')

  const target = normalise(printSize)

  // Try to find a variant whose title or size option contains the target
  const match = artwork.variants.find((v) => {
    // Check variant title (e.g. "50 x 70 cm")
    if (v.title && normalise(v.title).includes(target)) return true

    // Check selectedOptions for a "Size" option
    if (v.selectedOptions) {
      const sizeOpt = v.selectedOptions.find(
        (o) => o.name.toLowerCase() === 'size'
      )
      if (sizeOpt && normalise(sizeOpt.value).includes(target)) return true
    }

    return false
  })

  if (match) {
    return {
      variantId: match.id,
      variantPrice: match.price,
      variantTitle: match.title,
    }
  }

  return null
}

/**
 * Get the display price for an artwork at a specific print size.
 * Returns the variant price if a matching variant is found, otherwise
 * falls back to the product's base price (minVariantPrice).
 *
 * @param {Object} artwork   – transformed Shopify product
 * @param {string} printSize – e.g. "50 × 70"
 * @returns {string} price formatted to 2 decimal places
 */
export const getVariantPrice = (artwork, printSize) => {
  if (!artwork) return '0.00'
  const resolved = getVariantForSize(artwork, printSize)
  return resolved ? resolved.variantPrice : artwork.price
}

/**
 * Prepare cart data for Shopify Ajax API
 * (For future Shopify integration)
 */
export const prepareShopifyCart = (config) => {
  const items = [];
  
  // Add background
  if (config.selectedBackground && config.selectedBackground.price > 0) {
    items.push({
      id: config.selectedBackground.id,
      quantity: 1,
      properties: {
        type: 'background',
      },
    });
  }
  
  // Add artworks
  config.selectedArtworks.forEach((artwork, index) => {
    if (artwork) {
      items.push({
        id: artwork.id,
        quantity: 1,
        properties: {
          type: 'artwork',
          position: index + 1,
        },
      });
    }
  });
  
  // Add frames
  config.selectedFrames.forEach((frame, index) => {
    if (frame) {
      items.push({
        id: frame.id,
        quantity: 1,
        properties: {
          type: 'frame',
          position: index + 1,
        },
      });
    }
  });
  
  return {
    items,
    attributes: {
      layout: config.selectedLayout?.name,
      total: config.calculateTotal(),
    },
  };
};
