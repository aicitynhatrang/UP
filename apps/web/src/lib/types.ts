/** Localized JSONB field: { ru: '...', en: '...', vi: '...' } */
export type LocalizedField = Record<string, string>

export interface Provider {
  id:                string
  slug:              string
  vertical_slug:     string
  name:              LocalizedField
  description:       LocalizedField
  short_description: LocalizedField
  address:           string | null
  city:              string
  lat:               number | null
  lng:               number | null
  logo_url:          string | null
  cover_url:         string | null
  photos:            string[]
  working_hours:     Record<string, { open: string; close: string }>
  pricing:           unknown
  menu:              unknown
  amenities:         string[]
  tags:              string[]
  rating:            number
  review_count:      number
  checkin_count:     number
  status:            string
  is_verified:       boolean
  is_featured:       boolean
  created_at:        string
}

export interface ProviderService {
  id:            string
  provider_id:   string
  name:          LocalizedField
  description:   LocalizedField
  price_vnd:     number | null
  price_max_vnd: number | null
  duration_min:  number | null
  photos:        string[]
  is_active:     boolean
}

export interface Review {
  id:           string
  user_id:      string
  provider_id:  string
  rating:       number
  text:         string | null
  photos:       string[]
  is_published: boolean
  created_at:   string
  user?: {
    first_name: string
    last_name:  string | null
    avatar_url: string | null
    level:      string
  }
}

export interface VerticalConfig {
  slug:              string
  emoji:             string
  name:              LocalizedField
  commission_pct:    number
  user_discount_pct: number
  avg_check_vnd:     number | null
}

export interface CatalogFilters {
  vertical?:    string
  q?:           string
  sort?:        'rating' | 'distance' | 'price_asc' | 'price_desc' | 'new'
  open_now?:    boolean
  verified?:    boolean
  min_rating?:  number
  tags?:        string[]
  lat?:         number
  lng?:         number
  radius_km?:   number
  page?:        number
  limit?:       number
}

export interface PaginatedResponse<T> {
  data:       T[]
  total:      number
  page:       number
  limit:      number
  totalPages: number
}
