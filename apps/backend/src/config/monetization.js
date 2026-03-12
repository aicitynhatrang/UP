export const monetizationConfig = {
  // Commission split from every confirmed order (must sum to 100)
  commissionSplit: {
    platformPct:         50,
    businessReferrerPct: 25,
    userReferrerPct:     15,
    gamificationPct:     10,
  },
  // Marketplace & investment fees
  coInvestPlatformFeePct:    parseInt(process.env.CO_INVEST_PLATFORM_FEE_PCT    ?? '8',  10),
  coInvestSaleFeePct:        parseInt(process.env.CO_INVEST_SALE_FEE_PCT        ?? '2',  10),
  groupBuyPlatformFeePct:    parseInt(process.env.GROUP_BUY_PLATFORM_FEE_PCT    ?? '3',  10),
  creatorMarketplaceFeePct:  parseInt(process.env.CREATOR_MARKETPLACE_FEE_PCT   ?? '10', 10),
  skillSwapFeePct:           parseInt(process.env.SKILL_SWAP_FEE_PCT            ?? '5',  10),
  // One-time prices (USD)
  prices: {
    boostWeek:          15,
    questPointMin:      30,
    questPointMax:      150,
    pushMin:            20,
    pushMax:            80,
    club77EntryMin:     100,
    club77EntryMax:     500,
    flashDealPerDay:    5,
    storyPerDay:        5,
    mysteryMin:         15,
    mysteryMax:         40,
    eventListing:       8,
    digitalCard:        5,
    voiceClone:         29,
  },
  // Season config
  seasonDurationDays: parseInt(process.env.SEASON_DURATION_DAYS ?? '90', 10),
  // Mystery Shopper max cashback in VND
  mysteryShopperMaxVnd: 500000,
}
