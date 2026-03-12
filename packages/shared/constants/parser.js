// Telegram Channel Parser — hashtag routing config

// Maps hashtags to provider profile fields
export const PARSER_HASHTAGS = {
  // Menu data → providers.menu_data (JSONB)
  MENU: ['#меню', '#menu', '#менью'],

  // Pricing → providers.pricing_data (JSONB)
  PRICES: ['#цены', '#prices', '#прайс', '#price'],

  // Working hours → providers.working_hours (JSONB)
  HOURS: ['#часы', '#hours', '#расписание', '#schedule'],

  // Flash deal / promo → flash_deals table (pending moderation)
  PROMO: ['#акция', '#promo', '#скидка', '#sale', '#offer'],

  // Photo update → Supabase Storage, providers gallery
  PHOTO: ['#фото', '#photo', '#photos', '#gallery'],

  // Social post → social_posts table
  NEWS: ['#новости', '#news', '#пост', '#post'],
}

// Extracted type identifiers stored in parsed_posts.extracted_type
export const PARSER_POST_TYPES = {
  DESCRIPTION: 'description',
  MENU:        'menu',
  PRICE:       'price',
  HOURS:       'hours',
  PROMO:       'promo',
  PHOTO:       'photo',
  NEWS:        'news',
  GENERAL:     'general',
}

// Redis cache key for post hash dedup (TTL 24h)
export const PARSER_HASH_CACHE_KEY = (hash) => `parsed_posts:hash:${hash}`

// Minimum subscription tier required to use parser
export const PARSER_MIN_TIER = 'business'

// Max photos extracted per post
export const PARSER_MAX_PHOTOS_PER_POST = 10

// AI language detection + translation config
export const PARSER_AI_MODEL = 'gpt-4o-mini'
