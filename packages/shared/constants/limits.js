// Rate limits — requests per window
export const RATE_LIMITS = {
  GENERAL_PER_MIN:         100,
  HEAVY_PER_MIN:           20,   // AI, search, file uploads
  ORDERS_PER_HOUR:         3,
  REVIEWS_PER_DAY:         1,
  CHECKINS_PER_HOUR:       5,
  RECEIPTS_PER_DAY:        3,
  AI_BOT_REQUESTS_PER_MIN: 10,
}

// Fraud detection thresholds
export const FRAUD_THRESHOLDS = {
  MIN_RECEIPT_AMOUNT_VND:     50000,
  MAX_RECEIPT_AGE_HOURS:      48,
  MAX_RECEIPTS_PER_DAY:       3,
  RECEIPT_PRICE_TOLERANCE_PCT: 30,   // ±30% from provider price
  CHECKIN_RADIUS_METERS:      200,
  CHECKIN_COOLDOWN_HOURS:     24,
  CHECKIN_IMPOSSIBLE_SPEED_KM: 5,    // km in 5 minutes
  REFERRAL_INACTIVITY_DAYS:   30,
  SIM_FARM_REFERRALS_PER_IP:  10,    // per 24h
  FRAUD_REVIEW_COPY_PASTE_PCT: 70,
  FRAUD_REVIEWS_BURST_PER_HOUR: 5,
  FRAUD_LEADERBOARD_GROWTH_PCT: 500, // >500% daily growth = freeze
  FRAUD_WALLET_DRAIN_PCT:     80,    // >80% spend in one day = confirm
  BLOGGER_INACTIVE_REFERRALS_PCT: 80, // >80% inactive = freeze payouts
  MIN_ORDER_AMOUNT_FOR_COMMISSION: 100000,
  MAX_ACTIVE_SESSIONS:        3,
  MAX_DEVICES_PER_DAY:        5,
}

// Parser limits
export const PARSER_LIMITS = {
  MAX_AI_POSTS_PER_DAY: 20,
}

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE:     100,
}

// Flash deal limits
export const FLASH_DEAL_LIMITS = {
  MAX_PER_CITY_PER_DAY: 1,
  DURATION_HOURS:       2,
  RADIUS_KM:            3,
  PRICE_USD_PER_DAY:    5,
}

// Mystery Shopper
export const MYSTERY_SHOPPER = {
  MAX_CASHBACK_VND:  500000,
  FREQUENCY_MONTHS:  1,
}

// Streak protection
export const STREAK = {
  PROTECTION_COST_POINTS: 50,
  PROTECTION_PER_MONTH:   1,
}

// Group Buy
export const GROUP_BUY = {
  MIN_PARTICIPANTS: 3,
  PLATFORM_FEE_PCT: 3,
}

// Early Bird
export const EARLY_BIRD = {
  MAX_SLOTS: 20,
}

// Season
export const SEASON = {
  DURATION_DAYS: 90,
}

// JWT
export const JWT = {
  ACCESS_EXPIRES_MINUTES:  15,
  REFRESH_EXPIRES_DAYS:    7,
  ADMIN_TIMEOUT_HOURS:     2,
}
