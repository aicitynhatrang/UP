export const fraudConfig = {
  receipt: {
    minAmountVnd:        parseInt(process.env.FRAUD_MIN_RECEIPT_AMOUNT    ?? '50000',  10),
    maxPerDay:           parseInt(process.env.FRAUD_MAX_RECEIPTS_PER_DAY  ?? '3',      10),
    maxAgeHours:         48,
    priceTolerangePct:   30,   // ±30% from provider listed price
    blacklistThresholdPct: 50, // >50% fraud receipts from one provider → suspend
  },
  checkin: {
    radiusMeters:        parseInt(process.env.CHECKIN_RADIUS_METERS ?? '200', 10),
    cooldownHours:       24,
    maxPerHour:          5,
    impossibleSpeedKm:   5,    // km in 5 minutes
  },
  referral: {
    inactivityDays:      30,
    simFarmPerIpPerDay:  10,
    activationRequired:  process.env.REFERRAL_ACTIVATION_REQUIRED !== 'false',
    minActiveDaysBefore: 7,    // account must be 7+ days old to be counted as active referral
    inactivePctFreeze:   80,   // >80% inactive referrals = freeze blogger payouts
  },
  review: {
    copyPastePct:        70,   // >70% text match = block both
    burstPerHour:        5,    // >5 reviews for same provider in 1h = freeze
  },
  leaderboard: {
    maxDailyGrowthPct:   500,  // >500% vs daily avg = freeze
    walletDrainPct:      80,   // >80% balance spent in 1 day = TG confirmation required
  },
  orders: {
    patternAutoConfirmPct: 90, // >90% auto-confirmed for one business = flag
    minAmountForCommission: 100000,
  },
  session: {
    maxDevicesPerDay:    5,
  },
  parser: {
    maxAiPostsPerDay:    parseInt(process.env.PARSER_MAX_AI_POSTS_PER_DAY ?? '20', 10),
  },
}
