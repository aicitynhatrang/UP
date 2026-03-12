// Club 77 membership tiers
export const CLUB_77_TIERS = {
  RESIDENT: {
    slug: 'resident',
    name: 'Резидент',
    maxSlots: 77,
    entryUsd: 100,
    entryPoints: 5000,
    cashbackBonus: 3,   // additional % on top of level cashback
    canCoInvest: false,
    trialDays: 30,
    trialMinPoints: 500,
    refundPct: 80,
  },
  INVESTOR: {
    slug: 'investor',
    name: 'Инвестор',
    maxSlots: 30,
    entryMonths: 3,     // must be resident 3+ months
    entryPoints: 15000,
    entryUsd: 500,
    cashbackBonus: 5,
    canCoInvest: true,
    trialDays: 30,
    trialMinPoints: 500,
    refundPct: 80,
  },
  ARCHITECT: {
    slug: 'architect',
    name: 'Архитектор',
    maxSlots: 7,
    entryPoints: 50000,
    minCoInvests: 3,    // must have 3+ co-invest participations
    cashbackBonus: 10,
    canCoInvest: true,
    vetoPerMonth: 1,
    trialDays: 30,
    trialMinPoints: 500,
    refundPct: 80,
  },
}

// Inactivity timeout before ejection from Club 77
export const CLUB_77_INACTIVITY_DAYS = 30

// Creator thresholds to earn Creator status
export const CREATOR_THRESHOLDS = {
  MIN_BUSINESSES: 10,
  MIN_USERS: 100,
}

// Commission split from every confirmed order
export const COMMISSION_SPLIT = {
  PLATFORM_PCT:          50,
  BUSINESS_REFERRER_PCT: 25,
  USER_REFERRER_PCT:     15,
  GAMIFICATION_POOL_PCT: 10,
}

// Multi-level referral chain percentages (of the referral %)
export const REFERRAL_CHAIN = {
  L1: 1.0,   // 100% of referral %
  L2: 0.3,   // 30% of referral %
  L3: 0.1,   // 10% of referral %
}

// Co-invest fund rules
export const CO_INVEST_RULES = {
  MIN_PROJECT_USD:        70000,
  MIN_CONTRIBUTION_USD:   500,
  MAX_PERSON_SHARE_PCT:   30,
  MAX_BUSINESSES:         5,
  FUNDRAISE_DAYS:         21,
  FUNDRAISE_THRESHOLD_PCT: 80,
  PLATFORM_FEE_PCT:       8,
  SALE_FEE_PCT:           2,
  LOCKUP_MONTHS:          6,
  INSURANCE_FUND_PCT:     5,
  VOTE_DAYS:              7,
}
