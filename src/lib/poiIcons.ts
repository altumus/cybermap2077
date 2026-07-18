import type { Map as MapLibreMap } from 'maplibre-gl'
import type { PoiIconId } from '../types'

export const POI_ICON_IDS: readonly PoiIconId[] = [
  'food',
  'drink',
  'clothes',
  'shop',
  'tourism',
  'leisure',
  'healthcare',
  'office',
  'craft',
  'default',
]

const FOOD_TYPES = new Set([
  'restaurant',
  'cafe',
  'fast_food',
  'food_court',
  'bakery',
  'ice_cream',
  'biergarten',
  'canteen',
  'bbq',
])

const DRINK_TYPES = new Set([
  'bar',
  'pub',
  'nightclub',
  'stripclub',
  'wine',
  'alcohol',
  'beverages',
  'coffee',
  'tea',
])

const CLOTHES_TYPES = new Set([
  'clothes',
  'fashion',
  'shoes',
  'boutique',
  'jewelry',
  'watches',
  'bag',
  'tailor',
])

const HEALTH_TYPES = new Set([
  'hospital',
  'clinic',
  'doctors',
  'dentist',
  'pharmacy',
  'chemist',
  'veterinary',
  'healthcare',
])

const TOURISM_TYPES = new Set([
  'hotel',
  'hostel',
  'guest_house',
  'motel',
  'attraction',
  'museum',
  'gallery',
  'viewpoint',
  'zoo',
  'theme_park',
  'information',
])

const LEISURE_TYPES = new Set([
  'park',
  'cinema',
  'theatre',
  'sports_centre',
  'stadium',
  'fitness_centre',
  'swimming_pool',
  'pitch',
  'playground',
  'escape_game',
  'amusement_arcade',
])

function frame(inner: string, accent: string): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect x="1" y="1" width="30" height="30" fill="#121212" stroke="${accent}" stroke-width="2"/>
  <rect x="4" y="4" width="6" height="2" fill="${accent}"/>
  <rect x="22" y="26" width="6" height="2" fill="${accent}"/>
  ${inner}
</svg>`.trim()
}

const ICON_SVG: Record<PoiIconId, string> = {
  food: frame(
    `<path d="M10 11h2v10h-2zm4-2c0 0 1 2 1 5v7h2V14c0-3 1-5 1-5h-4z" fill="#fcee0a"/>
     <path d="M20 12h2v9h-2z" fill="#00f0ff"/>`,
    '#fcee0a',
  ),
  drink: frame(
    `<path d="M11 10h10l-1 3v7a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-7l-1-3z" fill="none" stroke="#00f0ff" stroke-width="1.8"/>
     <path d="M13 13h6" stroke="#fcee0a" stroke-width="1.5"/>`,
    '#00f0ff',
  ),
  clothes: frame(
    `<path d="M11 11l-3 3 2 2 2-1v7h8v-7l2 1 2-2-3-3-2 1h-4l-2-1z" fill="#ff6b00"/>`,
    '#ff6b00',
  ),
  shop: frame(
    `<path d="M9 13l1-3h12l1 3v9H9v-9z" fill="none" stroke="#fcee0a" stroke-width="1.8"/>
     <path d="M12 17h8v5h-8z" fill="#00f0ff"/>`,
    '#fcee0a',
  ),
  tourism: frame(
    `<path d="M16 8l2.2 4.5 5 .7-3.6 3.5.9 5L16 19.2 11.5 21.7l.9-5L8.8 13.2l5-.7z" fill="#ff003c"/>`,
    '#ff003c',
  ),
  leisure: frame(
    `<circle cx="16" cy="16" r="6" fill="none" stroke="#00f0ff" stroke-width="1.8"/>
     <path d="M16 10v6l4 2" stroke="#fcee0a" stroke-width="1.8" stroke-linecap="square"/>`,
    '#00f0ff',
  ),
  healthcare: frame(
    `<path d="M14 10h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="#ff003c"/>`,
    '#ff003c',
  ),
  office: frame(
    `<path d="M10 22V10h12v12H10z" fill="none" stroke="#fcee0a" stroke-width="1.8"/>
     <path d="M13 13h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2z" fill="#00f0ff"/>`,
    '#fcee0a',
  ),
  craft: frame(
    `<path d="M18 9l5 5-2 2-2-2-3 3 4 4-2 2-4-4-3 3-2-2 3-3-2-2 2-2 2 2 3-3-2-2z" fill="#ff6b00"/>`,
    '#ff6b00',
  ),
  default: frame(
    `<circle cx="16" cy="16" r="4" fill="#00f0ff"/>
     <circle cx="16" cy="16" r="7" fill="none" stroke="#fcee0a" stroke-width="1.5"/>`,
    '#fcee0a',
  ),
}

export function resolvePoiIcon(category: string, type: string): PoiIconId {
  if (FOOD_TYPES.has(type)) return 'food'
  if (DRINK_TYPES.has(type)) return 'drink'
  if (CLOTHES_TYPES.has(type)) return 'clothes'
  if (HEALTH_TYPES.has(type) || category === 'healthcare') return 'healthcare'
  if (TOURISM_TYPES.has(type) || category === 'tourism') return 'tourism'
  if (LEISURE_TYPES.has(type) || category === 'leisure') return 'leisure'
  if (category === 'office' || type === 'coworking_space') return 'office'
  if (category === 'craft') return 'craft'
  if (category === 'shop') return 'shop'

  // amenity leftovers that feel like food/drink/shop-ish
  if (category === 'amenity') {
    if (type.includes('food') || type.includes('restaurant')) return 'food'
    if (type.includes('bar') || type.includes('pub')) return 'drink'
  }

  return 'default'
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(32, 32)
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load POI icon'))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

const LABEL_BG_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect x="1" y="1" width="30" height="30" rx="2" fill="#182533" fill-opacity="0.92" stroke="#4B95B9" stroke-opacity="0.45" stroke-width="1.5"/>
</svg>`.trim()

export const POI_LABEL_BG_ID = 'poi-label-bg'

export async function registerPoiIcons(map: MapLibreMap): Promise<void> {
  await Promise.all(
    POI_ICON_IDS.map(async (id) => {
      const imageId = `poi-${id}`
      if (map.hasImage(imageId)) return
      const image = await loadSvgImage(ICON_SVG[id])
      map.addImage(imageId, image, { pixelRatio: 2 })
    }),
  )

  if (!map.hasImage(POI_LABEL_BG_ID)) {
    const image = await loadSvgImage(LABEL_BG_SVG)
    // 9-slice stretch so the plate grows with label text
    map.addImage(POI_LABEL_BG_ID, image, {
      pixelRatio: 2,
      content: [6, 6, 26, 26],
      stretchX: [[6, 26]],
      stretchY: [[6, 26]],
    })
  }
}
