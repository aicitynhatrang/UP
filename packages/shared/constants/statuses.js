// User level configuration — never downgrade, lifetime_points only grows
export const USER_LEVELS = [
  { level: 1, slug: 'novice',    emoji: '🌱', name: 'Новичок',        minPoints: 0,     maxPoints: 99,       cashbackPct: 0 },
  { level: 2, slug: 'traveler',  emoji: '🧭', name: 'Путешественник', minPoints: 100,   maxPoints: 499,      cashbackPct: 0 },
  { level: 3, slug: 'local',     emoji: '🏠', name: 'Местный',        minPoints: 500,   maxPoints: 1499,     cashbackPct: 0 },
  { level: 4, slug: 'star',      emoji: '⭐', name: 'Звезда',         minPoints: 1500,  maxPoints: 3999,     cashbackPct: 1 },
  { level: 5, slug: 'fire',      emoji: '🔥', name: 'Огонь',          minPoints: 4000,  maxPoints: 9999,     cashbackPct: 2 },
  { level: 6, slug: 'boss',      emoji: '👑', name: 'Босс',           minPoints: 10000, maxPoints: 24999,    cashbackPct: 3 },
  { level: 7, slug: 'founder',   emoji: '🦄', name: 'Основатель',     minPoints: 25000, maxPoints: 49999,    cashbackPct: 4 },
  { level: 8, slug: 'architect', emoji: '🏛', name: 'Архитектор',     minPoints: 50000, maxPoints: Infinity, cashbackPct: 5 },
]

export const ORDER_STATUSES = {
  PENDING:     'pending',
  ACCEPTED:    'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED:   'completed',
  CANCELLED:   'cancelled',
  DISPUTED:    'disputed',
}

export const BAN_RULES = {
  SOFT_BAN_DURATION_DAYS:    7,
  PERMANENT_BAN_THRESHOLD:   3,
  AUTO_CONFIRM_TIMEOUT_DAYS: 7,
}

export const SUBSCRIPTION_TIERS = {
  FREE:       { slug: 'free',       name: 'Free',       priceUsd: 0,   parserEnabled: false },
  STARTER:    { slug: 'starter',    name: 'Starter',    priceUsd: 19,  parserEnabled: false },
  PRO:        { slug: 'pro',        name: 'Pro',        priceUsd: 49,  parserEnabled: false },
  BUSINESS:   { slug: 'business',   name: 'Business',   priceUsd: 99,  parserEnabled: true  },
  ENTERPRISE: { slug: 'enterprise', name: 'Enterprise', priceUsd: 199, parserEnabled: true  },
}

// Points awarded per action
export const POINTS_CONFIG = {
  REGISTRATION:          50,
  FIRST_ORDER:           100,
  RECEIPT_UPLOAD:        30,
  REVIEW_WITH_ORDER:     50,
  INVITE_USER:           100,
  INVITE_BUSINESS:       500,
  QUEST_MIN:             200,
  QUEST_MAX:             1000,
  QR_CHECKIN:            25,
  DAILY_LOGIN:           10,
  STREAK_7_DAYS:         150,
  STREAK_30_DAYS:        1000,
  STREAK_PROTECTION:     50,   // cost in balance_points
  CHALLENGE_MIN:         100,
  CHALLENGE_MAX:         300,
  MYSTERY_SHOPPER:       500,
  PAIRED_QUEST:          300,
  KARMA_HELP:            30,
  FIRST_VERTICAL_VISIT:  75,
  EARLY_BIRD:            150,
  GROUP_BUY:             40,
  LONG_REVIEW:           200,
  P2P_REFERRAL:          50,
  BIRTHDAY:              100,
  REFERRAL_PASSIVE_PCT:  10,   // % of referral's earned points
}

export const MODERATION_STATUSES = {
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}
