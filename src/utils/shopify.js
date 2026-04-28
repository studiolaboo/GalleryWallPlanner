// Shopify Storefront API Configuration and Functions
// Replace these with your actual Shopify store credentials

const shopifyConfig = {
  domain: import.meta.env.VITE_SHOPIFY_DOMAIN || 'your-store.myshopify.com',
  storefrontAccessToken: import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN || 'YOUR_STOREFRONT_ACCESS_TOKEN'
}

/**
 * Fetch artwork products from Shopify Storefront API with pagination
 * @returns {Promise<Array>} Array of formatted artwork products
 */
export async function fetchArtworkProducts() {
  let allProducts = []
  let hasNextPage = true
  let cursor = null
  
  try {
    while (hasNextPage && allProducts.length < 5000) {
      const query = `
        {
          products(first: 250${cursor ? `, after: "${cursor}"` : ''}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              cursor
              node {
                id
                title
                handle
                description
                tags
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
                featuredImage {
                  url
                  altText
                }
                images(first: 1) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      availableForSale
                      priceV2 {
                        amount
                        currencyCode
                      }
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
                productType
                vendor
                metafields(identifiers: [
                  { namespace: "custom", key: "frame_sizes" },
                  { namespace: "custom", key: "category" },
                  { namespace: "custom", key: "filter_home_style" },
                  { namespace: "custom", key: "filter_rooms" },
                  { namespace: "custom", key: "filter_artists" },
                  { namespace: "custom", key: "artwork_file" },
                  { namespace: "descriptors", key: "color" }
                ]) {
                  key
                  namespace
                  value
                  type
                  reference {
                    ... on MediaImage {
                      image {
                        url
                        altText
                      }
                    }
                    ... on GenericFile {
                      url
                    }
                    ... on Metaobject {
                      id
                      type
                      handle
                      fields {
                        key
                        value
                      }
                    }
                  }
                  references(first: 20) {
                    edges {
                      node {
                        ... on Metaobject {
                          id
                          type
                          handle
                          fields {
                            key
                            value
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `

      const response = await fetch(
        `https://${shopifyConfig.domain}/api/2024-04/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': shopifyConfig.storefrontAccessToken
          },
          body: JSON.stringify({ query })
        }
      )

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.errors) {
        console.error('GraphQL errors:', data.errors)
        throw new Error('Failed to fetch products from Shopify')
      }

      const products = data.data.products.edges
      
      // Debug: log raw metafield data from first batch to check artwork_file
      if (allProducts.length === 0 && products.length > 0) {
        const first5WithMeta = products.slice(0, 5).map(p => ({
          title: p.node.title,
          metafields: p.node.metafields
        }))
        console.log('[DEBUG] First 5 products raw metafields:', JSON.stringify(first5WithMeta, null, 2))
        
        // Specifically check for artwork_file
        const withArtwork = products.filter(p => 
          p.node.metafields.some(m => m && m.key === 'artwork_file')
        )
        console.log(`[DEBUG] Products with artwork_file in first batch: ${withArtwork.length}/${products.length}`)
        if (withArtwork.length > 0) {
          console.log('[DEBUG] First artwork_file data:', JSON.stringify(
            withArtwork[0].node.metafields.find(m => m && m.key === 'artwork_file'), null, 2
          ))
        }
      }
      
      allProducts = allProducts.concat(products)
      
      hasNextPage = data.data.products.pageInfo.hasNextPage
      cursor = data.data.products.pageInfo.endCursor
      
      console.log(`Fetched ${allProducts.length} products so far...`)
    }
    
    console.log(`Total products fetched: ${allProducts.length}`)
    
    // Count products with artwork_file metafield
    const artworkFileCount = allProducts.filter(p => 
      p.node.metafields.some(m => m && m.key === 'artwork_file' && m.namespace === 'custom')
    ).length
    console.log(`🖼️ Products with frameless artwork_file: ${artworkFileCount}/${allProducts.length}`)
    
    // Batch-resolve artist metaobject GIDs to display names
    const artistGidMap = await resolveArtistMetaobjects(allProducts)
    console.log('🎨 Artist GID map:', artistGidMap)
    
    const transformedProducts = transformShopifyProducts(allProducts, artistGidMap)
    
    // Debug: log all unique artist names found across products
    const allArtistNames = new Set()
    transformedProducts.forEach(p => {
      p.artists?.forEach(a => allArtistNames.add(a))
    })
    console.log('🎨 All unique artist names found:', Array.from(allArtistNames))
    console.log('Transformed products:', transformedProducts)
    
    return transformedProducts
  } catch (error) {
    console.error('Error fetching Shopify products:', error)
    throw error
  }
}

/**
 * Batch-resolve ALL metaobject GIDs to their display names.
 * Collects unique GIDs from all metafields across all products,
 * then queries Shopify's `nodes` endpoint to get the actual metaobject fields.
 *
 * @param {Array} allProducts - Raw Shopify product edges
 * @returns {Promise<Object>} Map of GID string → display name
 */
async function resolveArtistMetaobjects(allProducts) {
  const gidMap = {}
  const allGids = new Set()

  // Metafield keys that may contain metaobject GID references
  const metaKeysToResolve = ['filter_artists', 'filter_home_style', 'category', 'color', 'filter_rooms']

  // Collect all unique GIDs from product metafields
  for (const { node } of allProducts) {
    for (const metaKey of metaKeysToResolve) {
      const meta = node.metafields.find(m => m && m.key === metaKey)
      if (!meta?.value) continue

      // First check if references were already resolved inline
      if (meta.references?.edges?.length > 0) {
        for (const edge of meta.references.edges) {
          const fields = edge.node?.fields || []
          const nameField = fields.find(f =>
            ['name', 'title', 'display_name', 'label', 'artist_name', 'color_name', 'color', 'value', 'category_name', 'style_name'].includes(f.key)
          ) || fields.find(f => f.value && typeof f.value === 'string' && !f.value.startsWith('gid://') && !f.value.startsWith('#') && f.value.length < 50)
          const displayName = nameField?.value || ''
          if (edge.node?.id && displayName) {
            gidMap[edge.node.id] = displayName
          } else if (edge.node?.id && edge.node?.handle) {
            gidMap[edge.node.id] = edge.node.handle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          }
        }
        continue
      }

      // Single reference
      if (meta.reference?.id) {
        const ref = meta.reference
        const fields = ref.fields || []
        const nameField = fields.find(f =>
          ['name', 'title', 'display_name', 'label', 'artist_name', 'color_name', 'color', 'value', 'category_name', 'style_name'].includes(f.key)
        ) || fields.find(f => f.value && typeof f.value === 'string' && !f.value.startsWith('gid://') && !f.value.startsWith('#') && f.value.length < 50)
        if (nameField?.value) {
          gidMap[ref.id] = nameField.value
        } else if (ref.handle) {
          gidMap[ref.id] = ref.handle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        }
        continue
      }

      // Otherwise parse GIDs from the value field for batch resolution
      try {
        const parsed = JSON.parse(meta.value)
        const gids = Array.isArray(parsed) ? parsed : [parsed]
        gids.forEach(gid => {
          if (typeof gid === 'string' && gid.startsWith('gid://') && !gidMap[gid]) allGids.add(gid)
        })
      } catch (e) {
        // comma-separated fallback
        meta.value.split(',').forEach(s => {
          const trimmed = s.trim()
          if (trimmed.startsWith('gid://') && !gidMap[trimmed]) allGids.add(trimmed)
        })
      }
    }
  }

  // If references were already resolved inline, return early
  if (allGids.size === 0) {
    console.log('[Metaobjects] All references resolved inline or no GIDs found. Map size:', Object.keys(gidMap).length)
    return gidMap
  }

  console.log(`[Metaobjects] Resolving ${allGids.size} unique metaobject GIDs...`)

  // Batch-resolve GIDs in chunks of 50 via the `nodes` query
  const gidArray = Array.from(allGids)
  for (let i = 0; i < gidArray.length; i += 50) {
    const chunk = gidArray.slice(i, i + 50)
    const idsString = chunk.map(id => `"${id}"`).join(', ')
    const query = `
      {
        nodes(ids: [${idsString}]) {
          ... on Metaobject {
            id
            type
            handle
            fields {
              key
              value
            }
          }
        }
      }
    `
    try {
      const response = await fetch(
        `https://${shopifyConfig.domain}/api/2024-04/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': shopifyConfig.storefrontAccessToken
          },
          body: JSON.stringify({ query })
        }
      )
      const data = await response.json()
      if (data.data?.nodes) {
        for (const metaobj of data.data.nodes) {
          if (!metaobj?.id) continue
          const fields = metaobj.fields || []
          // Try well-known field keys first
          const nameField = fields.find(f =>
            ['name', 'title', 'display_name', 'label', 'artist_name', 'color_name', 'color', 'category_name', 'style_name', 'value'].includes(f.key)
          )
          let displayName = nameField?.value || ''
          // If no well-known key found, use first non-empty text field
          if (!displayName) {
            const anyTextField = fields.find(f => f.value && !f.value.startsWith('gid://') && !f.value.startsWith('{') && !f.value.startsWith('[') && !f.value.startsWith('#'))
            displayName = anyTextField?.value || ''
          }
          // Fallback to handle → title case
          if (!displayName && metaobj.handle) {
            displayName = metaobj.handle
              .split('-')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
          }
          if (displayName) {
            gidMap[metaobj.id] = displayName
          }
          // Log for debugging
          console.log(`[Metaobject] ${metaobj.id} (${metaobj.type}) → "${displayName}"`, fields.map(f => `${f.key}=${f.value}`))
        }
      }
    } catch (err) {
      console.error('[Metaobjects] Error resolving metaobject GIDs:', err)
    }
  }

  console.log(`[Metaobjects] Resolved ${Object.keys(gidMap).length} display names`)
  return gidMap
}

/**
 * Transform Shopify product data to match our application format
 * @param {Array} shopifyProducts - Raw Shopify product data
 * @param {Object} artistGidMap - Map of artist GID → display name
 * @returns {Array} Formatted products
 */
function transformShopifyProducts(shopifyProducts, artistGidMap = {}) {
  return shopifyProducts.map(({ node }) => {
    // Find metafields for sizes and category
    const sizesMetafield = node.metafields.find(m => m && m.key === 'frame_sizes')
    const categoryMetafield = node.metafields.find(m => m && m.key === 'category')
    const colorMetafield = node.metafields.find(m => m && m.key === 'color' && m.namespace === 'descriptors')
    const styleMetafield = node.metafields.find(m => m && m.key === 'filter_home_style')
    const roomsMetafield = node.metafields.find(m => m && m.key === 'filter_rooms')
    const artistsMetafield = node.metafields.find(m => m && m.key === 'filter_artists')
    const artworkFileMetafield = node.metafields.find(m => m && m.key === 'artwork_file' && m.namespace === 'custom')

    // Helper: extract display names from Metaobject references on a metafield
    const getRefDisplayNames = (metafield) => {
      if (!metafield) return []
      const names = []
      // Single reference
      if (metafield.reference) {
        const ref = metafield.reference
        if (ref.fields) {
          // Try known display-name keys first, then fall back to any non-empty text field
          const displayField = ref.fields.find(f => ['display_name', 'name', 'title', 'label', 'color_name', 'color', 'value'].includes(f.key))
            || ref.fields.find(f => f.value && typeof f.value === 'string' && !f.value.startsWith('gid://') && !f.value.startsWith('#') && f.value.length < 50)
          if (displayField?.value) names.push(displayField.value)
          else if (ref.handle) names.push(ref.handle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
        } else if (ref.handle) {
          names.push(ref.handle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
        }
      }
      // List of references
      if (metafield.references?.edges) {
        for (const edge of metafield.references.edges) {
          const obj = edge.node
          if (!obj) continue
          if (obj.fields) {
            const displayField = obj.fields.find(f => ['display_name', 'name', 'title', 'label', 'color_name', 'color', 'value'].includes(f.key))
              || obj.fields.find(f => f.value && typeof f.value === 'string' && !f.value.startsWith('gid://') && !f.value.startsWith('#') && f.value.length < 50)
            if (displayField?.value) names.push(displayField.value)
            else if (obj.handle) names.push(obj.handle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
          } else if (obj.handle) {
            names.push(obj.handle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
          }
        }
      }
      return names.filter(n => n)
    }

    // Helper: resolve GID references in a metafield value using the pre-built artistGidMap
    // (works for any metaobject GID, not just artists)
    const resolveGidsFromValue = (metafield) => {
      if (!metafield?.value) return []
      try {
        const parsed = JSON.parse(metafield.value)
        const items = Array.isArray(parsed) ? parsed : [parsed]
        return items
          .filter(v => typeof v === 'string' && v.startsWith('gid://'))
          .map(gid => artistGidMap[gid] || '')
          .filter(n => n)
      } catch (e) {
        return []
      }
    }
    
    // Debug: log artwork_file metafield for first few products
    if (artworkFileMetafield) {
      console.log(`[artwork_file] ${node.title}:`, JSON.stringify(artworkFileMetafield, null, 2))
    }
    
    // Parse frame sizes from metafield
    let sizes = ['50x70'] // default
    if (sizesMetafield?.value) {
      try {
        sizes = JSON.parse(sizesMetafield.value)
      } catch (e) {
        // If it's a comma-separated string instead of JSON
        sizes = sizesMetafield.value.split(',').map(s => s.trim())
      }
    }

    // Get category: try reference display name → GID resolution → metafield value → tags
    const categoryRefNames = getRefDisplayNames(categoryMetafield)
    let category = categoryRefNames[0] || ''
    if (!category) {
      const catGids = resolveGidsFromValue(categoryMetafield)
      if (catGids.length > 0) category = catGids[0]
    }
    if (!category && categoryMetafield?.value) {
      // Plain text value (skip if it's a GID)
      const val = categoryMetafield.value.trim()
      if (!val.startsWith('gid://') && !val.startsWith('[')) category = val
      // Try JSON array of plain strings
      if (!category && val.startsWith('[')) {
        try {
          const arr = JSON.parse(val).filter(s => typeof s === 'string' && !s.startsWith('gid://'))
          if (arr.length > 0) category = arr[0]
        } catch (e) {}
      }
    }
    if (!category) {
      // Try to find category from tags
      const categoryTag = node.tags.find(tag => 
        ['Abstract', 'Botanical', 'Line Art', 'Geometric', 'Typography', 'Nature', 'Urban', 'Animals', 'Landscape', 'Figurative', 'Still Life', 'Architecture'].includes(tag)
      )
      category = categoryTag || ''
    }
    // Final fallback: use productType
    if (!category && node.productType) category = node.productType
    
    // Get artwork image from artwork_file metafield (frameless version for canvas frames)
    // Try multiple paths: MediaImage reference, GenericFile reference, or direct URL in value
    let artworkFileUrl = ''
    if (artworkFileMetafield) {
      // Path 1: MediaImage reference (reference.image.url)
      artworkFileUrl = artworkFileMetafield.reference?.image?.url
        // Path 2: GenericFile reference (reference.url)
        || artworkFileMetafield.reference?.url
        // Path 3: Value is a direct CDN URL string
        || (artworkFileMetafield.value?.startsWith?.('http') ? artworkFileMetafield.value : '')
        || ''
    }
    // Normal product image (with borders/frame) — used for sidebar browsing
    const imageUrl = node.featuredImage?.url || node.images.edges[0]?.node.url || artworkFileUrl || ''
    // Frameless artwork file — used inside canvas frames
    const artworkFileImage = artworkFileUrl || imageUrl
    
    // Extract size options from variants
    const sizeOptions = new Set()
    node.variants.edges.forEach(variant => {
      const sizeOption = variant.node.selectedOptions?.find(opt => opt.name.toLowerCase() === 'size')
      if (sizeOption?.value) {
        sizeOptions.add(sizeOption.value)
      }
    })
    
    // Helper function to parse metafield values (handles JSON arrays and comma-separated strings)
    const parseMetafieldArray = (metafield) => {
      if (!metafield?.value) return []
      try {
        const parsed = JSON.parse(metafield.value)
        // If it's an array, filter out empty values and GID references
        if (Array.isArray(parsed)) {
          return parsed.filter(item => item && typeof item === 'string' && item.trim() && !item.startsWith('gid://'))
        }
        // If it's a single string, wrap in array (skip GID references)
        if (typeof parsed === 'string' && parsed.trim() && !parsed.startsWith('gid://')) {
          return [parsed.trim()]
        }
        return []
      } catch (e) {
        // If JSON parse fails, try comma-separated
        return metafield.value.split(',')
          .map(s => s.trim())
          .filter(s => s && !s.startsWith('gid://')) // Remove empty strings and GID references
      }
    }
    
    // Parse all metafields — prefer reference display names → GID resolution → parsed text values
    // Colors
    let colors = getRefDisplayNames(colorMetafield)
    if (colors.length === 0) colors = resolveGidsFromValue(colorMetafield)
    if (colors.length === 0) colors = parseMetafieldArray(colorMetafield)
    // If color metafield has a hex value, try to map it
    if (colors.length === 0 && colorMetafield?.value) {
      const val = colorMetafield.value.trim()
      if (val.startsWith('#') || val.startsWith('rgb')) {
        // Store raw hex/rgb as-is; the detail modal will handle display
        colors = [val]
      }
    }
    // Fallback: extract color names from product tags
    if (colors.length === 0 && node.tags) {
      const colorWords = ['red','blue','green','orange','pink','neutral','black','white','yellow','purple','brown','grey','gray','beige','teal','navy','gold','cream']
      const colorTag = node.tags.find(t => colorWords.includes(t.toLowerCase()))
      if (colorTag) colors = [colorTag.charAt(0).toUpperCase() + colorTag.slice(1).toLowerCase()]
    }

    // Styles
    let styles = getRefDisplayNames(styleMetafield)
    if (styles.length === 0) styles = resolveGidsFromValue(styleMetafield)
    if (styles.length === 0) styles = parseMetafieldArray(styleMetafield)
    // Fallback: try tags for style keywords
    if (styles.length === 0 && node.tags) {
      const styleWords = ['japanese','minimalist','modern','abstract','botanical','geometric','scandinavian','boho','vintage','retro','contemporary','classic','art deco','impressionist','pop art','watercolor']
      const styleTag = node.tags.find(t => styleWords.includes(t.toLowerCase()))
      if (styleTag) styles = [styleTag.charAt(0).toUpperCase() + styleTag.slice(1).toLowerCase()]
    }

    const roomsFromRefs = getRefDisplayNames(roomsMetafield)
    const rooms = roomsFromRefs.length > 0 ? roomsFromRefs : parseMetafieldArray(roomsMetafield)

    // Debug: log metafield raw data for first 3 products
    const debugIdx = shopifyProducts.findIndex(p => p.node.id === node.id)
    if (debugIdx < 3 && debugIdx >= 0) {
      console.log(`[Metafield Debug] Product "${node.title}":`, {
        colorMeta: colorMetafield ? { value: colorMetafield.value, type: colorMetafield.type, ref: colorMetafield.reference, refs: colorMetafield.references?.edges?.length } : null,
        styleMeta: styleMetafield ? { value: styleMetafield.value, type: styleMetafield.type, ref: styleMetafield.reference, refs: styleMetafield.references?.edges?.length } : null,
        categoryMeta: categoryMetafield ? { value: categoryMetafield.value, type: categoryMetafield.type, ref: categoryMetafield.reference, refs: categoryMetafield.references?.edges?.length } : null,
        resolvedColors: colors,
        resolvedStyles: styles,
      })
    }
    // Resolve artist names from the pre-built GID map
    let artists = []
    if (artistsMetafield?.value) {
      try {
        const parsed = JSON.parse(artistsMetafield.value)
        const gids = Array.isArray(parsed) ? parsed : [parsed]
        artists = gids
          .map(gid => {
            if (typeof gid === 'string' && gid.startsWith('gid://')) {
              return artistGidMap[gid] || ''
            }
            // If value is already a plain text name, keep it
            return (typeof gid === 'string' && gid.trim()) ? gid.trim() : ''
          })
          .filter(name => name)
      } catch (e) {
        // Comma-separated fallback
        artists = artistsMetafield.value.split(',')
          .map(s => {
            const trimmed = s.trim()
            if (trimmed.startsWith('gid://')) return artistGidMap[trimmed] || ''
            return trimmed
          })
          .filter(s => s)
      }
    }
    // Final fallback to vendor if still empty
    if (artists.length === 0 && node.vendor) {
      artists = [node.vendor]
    }
    
    const finalSizes = sizeOptions.size > 0 ? Array.from(sizeOptions) : sizes
    
    const product = {
      id: node.id,
      title: node.title,
      category: category,
      sizes: finalSizes,
      tags: node.tags || [], // Include tags for orientation filtering
      colors: colors, // Color metafield
      styles: styles, // Filter Home Style metafield
      rooms: rooms, // Filter Rooms metafield
      artists: artists, // Filter Artists metafield
      productType: node.productType || '', // Collection filtering
      vendor: node.vendor || '', // Vendor/Artist name
      image: imageUrl,
      artworkFile: artworkFileImage,
      price: parseFloat(node.priceRange.minVariantPrice.amount).toFixed(2),
      currency: node.priceRange.minVariantPrice.currencyCode,
      shopifyProductId: node.id,
      handle: node.handle,
      description: node.description,
      variants: node.variants.edges.map(v => ({
        id: v.node.id,
        title: v.node.title,
        price: parseFloat(v.node.priceV2.amount).toFixed(2),
        available: v.node.availableForSale,
        selectedOptions: v.node.selectedOptions || []
      }))
    }
    
    // Log first 3 products for debugging (use index from map)
    const productIndex = shopifyProducts.findIndex(p => p.node.id === node.id)
    if (productIndex < 3 && productIndex >= 0) {
      console.log(`Product ${productIndex + 1}:`, {
        title: product.title,
        image: product.image,
        colors: product.colors,
        sizes: product.sizes,
        styles: product.styles,
        rooms: product.rooms,
        artists: product.artists,
        tags: product.tags,
        productType: product.productType
      })
    }
    
    return product
  })
}

/**
 * Fetch a single product by handle
 * @param {string} handle - Product handle (URL slug)
 * @returns {Promise<Object>} Product details
 */
export async function fetchProductByHandle(handle) {
  const query = `
    {
      productByHandle(handle: "${handle}") {
        id
        title
        description
        images(first: 5) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 100) {
          edges {
            node {
              id
              title
              priceV2 {
                amount
                currencyCode
              }
              availableForSale
            }
          }
        }
      }
    }
  `

  try {
    const response = await fetch(
      `https://${shopifyConfig.domain}/api/2024-04/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': shopifyConfig.storefrontAccessToken
        },
        body: JSON.stringify({ query })
      }
    )

    const data = await response.json()
    return data.data.productByHandle
  } catch (error) {
    console.error('Error fetching product:', error)
    throw error
  }
}

/**
 * Create a cart and get checkout URL (using new Cart API)
 * @param {Array} lineItems - Array of {variantId, quantity}
 * @returns {Promise<Object>} Cart object with checkoutUrl
 */
export async function createCheckout(lineItems) {
  const mutation = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const variables = {
    input: {
      lines: lineItems.map(item => ({
        merchandiseId: item.variantId,
        quantity: item.quantity
      }))
    }
  }

  try {
    console.log('Creating checkout with config:', shopifyConfig)
    console.log('Line items:', lineItems)
    
    const response = await fetch(
      `https://${shopifyConfig.domain}/api/2024-04/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': shopifyConfig.storefrontAccessToken
        },
        body: JSON.stringify({ query: mutation, variables })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('HTTP error response:', errorText)
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Full Checkout API response:', JSON.stringify(data, null, 2))
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors)
      throw new Error(`GraphQL Error: ${data.errors[0].message}`)
    }
    
    if (!data.data) {
      console.error('No data in response:', data)
      throw new Error('Invalid response from Shopify API - no data field')
    }
    
    if (!data.data.cartCreate) {
      console.error('No cartCreate in response:', data)
      throw new Error('Invalid response from Shopify API - no cartCreate field')
    }
    
    if (data.data.cartCreate.userErrors && data.data.cartCreate.userErrors.length > 0) {
      console.error('Cart user errors:', data.data.cartCreate.userErrors)
      throw new Error(`Cart Error: ${data.data.cartCreate.userErrors[0].message}`)
    }

    if (!data.data.cartCreate.cart) {
      console.error('No cart object in response:', data.data.cartCreate)
      throw new Error('Cart creation failed - no cart object returned')
    }

    // Return cart with checkoutUrl (matches the old checkout.webUrl structure)
    return {
      ...data.data.cartCreate.cart,
      webUrl: data.data.cartCreate.cart.checkoutUrl
    }
  } catch (error) {
    console.error('Error creating checkout:', error)
    throw error
  }
}

/**
 * Fetch frame products from Shopify
 * @returns {Promise<Array>} Array of frame products with variants
 */
export async function fetchFrameProducts() {
  const query = `
    {
      products(first: 10, query: "tag:frame") {
        edges {
          node {
            id
            title
            handle
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  priceV2 {
                    amount
                    currencyCode
                  }
                  availableForSale
                }
              }
            }
          }
        }
      }
    }
  `

  try {
    const response = await fetch(
      `https://${shopifyConfig.domain}/api/2024-04/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': shopifyConfig.storefrontAccessToken
        },
        body: JSON.stringify({ query })
      }
    )

    const data = await response.json()
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors)
      return []
    }

    return data.data.products.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      variants: node.variants.edges.map(v => ({
        id: v.node.id,
        title: v.node.title,
        price: parseFloat(v.node.priceV2.amount).toFixed(2),
        available: v.node.availableForSale
      }))
    }))
  } catch (error) {
    console.error('Error fetching frame products:', error)
    return []
  }
}

export default shopifyConfig
