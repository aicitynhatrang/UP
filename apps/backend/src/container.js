import { createContainer, asValue, asClass, asFunction, InjectionMode } from 'awilix'
import { logger }           from './utils/logger.js'
import { supabase, supabaseAdmin } from './config/database.js'
import { redis, createBullMQConnection } from './config/redis.js'
import { telegramConfig }   from './config/telegram.js'
import { openai, aiConfig } from './config/ai.js'
import { voiceConfig }      from './config/voice.js'
import { securityConfig }   from './config/security.js'
import { fraudConfig }      from './config/fraud.js'
import { monetizationConfig } from './config/monetization.js'
import { integrationsConfig } from './config/integrations.js'

// ─── Services (lazy imports — loaded only when registered) ───────────────────
// Core services
import { EncryptionService }    from './services/core/encryption.js'
import { NotificationService }  from './services/core/notifications.js'
import { GeoService }           from './services/core/geo.js'

// User services
import { PointsService }        from './services/user/points.js'

// Commerce
import { CommissionEngine }     from './services/commerce/commissionEngine.js'

// Orders
import { OrderService }         from './services/order/orderService.js'
import { CheckinService }       from './services/order/checkinService.js'

// Parser
import { ChannelParserService }  from './services/parser/channelParserService.js'
import { ContentExtractor }      from './services/parser/contentExtractor.js'
import { ParsedPostsRepo }       from './services/parser/parsedPostsRepo.js'
import { AiProfileUpdater }      from './services/parser/aiProfileUpdater.js'

// Auth
import { AuthService }            from './services/auth/authService.js'

// Gamification
import { SeasonService }          from './services/gamification/seasonService.js'
import { FlashDealService }       from './services/gamification/flashDealService.js'
import { GroupBuyService }        from './services/gamification/groupBuyService.js'
import { MysteryShopperService }  from './services/gamification/mysteryShopperService.js'
import { Club77Service }          from './services/gamification/club77Service.js'

// Commerce (monetization)
import { SubscriptionService }    from './services/commerce/subscriptionService.js'
import { PaymentService }         from './services/commerce/paymentService.js'
import { DiscountCodeService }    from './services/commerce/discountCodeService.js'

// Creator economy
import { CreatorService }          from './services/creator/creatorService.js'
import { CreatorPayoutService }    from './services/creator/creatorPayoutService.js'
import { BloggerReferralService }  from './services/creator/bloggerReferralService.js'
import { CreatorProductService }   from './services/creator/creatorProductService.js'
import { CoInvestService }         from './services/creator/coInvestService.js'
import { SkillSwapService }        from './services/creator/skillSwapService.js'
import { NftService }              from './services/creator/nftService.js'

// AI
import { ChatbotService }              from './services/ai/chatbotService.js'
import { ModerationService }           from './services/ai/moderationService.js'
import { ReceiptValidationService }    from './services/ai/receiptValidationService.js'

// Voice
import { VoiceCallService }            from './services/voice/voiceCallService.js'

// Integrations
import { EventService }          from './services/integrations/eventService.js'
import { WeatherService }        from './services/integrations/weatherService.js'
import { PushService }           from './services/integrations/pushService.js'
import { WebhookService }        from './services/integrations/webhookService.js'
import { ApiKeyService }         from './services/integrations/apiKeyService.js'

// Admin
import { AdminService }          from './services/admin/adminService.js'
import { AnalyticsService }      from './services/admin/analyticsService.js'

// i18n
import { AiTranslationService }  from './services/i18n/aiTranslation.js'

/**
 * Build and return the Awilix DI container.
 * All services are registered here and injected by name into constructors.
 */
export function buildContainer() {
  const container = createContainer({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  })

  container.register({
    // ── Infrastructure ────────────────────────────────────────────────────────
    logger:           asValue(logger),
    supabase:         asValue(supabase),
    supabaseAdmin:    asValue(supabaseAdmin),
    redis:            asValue(redis),
    bullMQConnection: asValue(createBullMQConnection()),
    openai:           asValue(openai),

    // ── Config ────────────────────────────────────────────────────────────────
    telegramConfig:     asValue(telegramConfig),
    aiConfig:           asValue(aiConfig),
    voiceConfig:        asValue(voiceConfig),
    securityConfig:     asValue(securityConfig),
    fraudConfig:        asValue(fraudConfig),
    monetizationConfig: asValue(monetizationConfig),
    integrationsConfig: asValue(integrationsConfig),

    // ── Core services ─────────────────────────────────────────────────────────
    encryptionService:   asClass(EncryptionService).singleton(),
    notificationService: asClass(NotificationService).singleton(),
    geoService:          asClass(GeoService).singleton(),

    // ── Auth ─────────────────────────────────────────────────────────────────
    authService:         asClass(AuthService).singleton(),

    // ── User services ─────────────────────────────────────────────────────────
    pointsService:       asClass(PointsService).singleton(),

    // ── Commerce ──────────────────────────────────────────────────────────────
    commissionEngine:    asClass(CommissionEngine).singleton(),
    subscriptionService: asClass(SubscriptionService).singleton(),
    paymentService:      asClass(PaymentService).singleton(),
    discountCodeService: asClass(DiscountCodeService).singleton(),

    // ── Orders ──────────────────────────────────────────────────────────────
    orderService:        asClass(OrderService).singleton(),
    checkinService:      asClass(CheckinService).singleton(),

    // ── Parser ────────────────────────────────────────────────────────────────
    parsedPostsRepo:     asClass(ParsedPostsRepo).singleton(),
    contentExtractor:    asClass(ContentExtractor).singleton(),
    aiProfileUpdater:    asClass(AiProfileUpdater).singleton(),
    channelParserService:asClass(ChannelParserService).singleton(),

    // ── Gamification ────────────────────────────────────────────────────────
    seasonService:         asClass(SeasonService).singleton(),
    flashDealService:      asClass(FlashDealService).singleton(),
    groupBuyService:       asClass(GroupBuyService).singleton(),
    mysteryShopperService: asClass(MysteryShopperService).singleton(),
    club77Service:         asClass(Club77Service).singleton(),

    // ── Creator economy ─────────────────────────────────────────────────────
    creatorService:         asClass(CreatorService).singleton(),
    creatorPayoutService:   asClass(CreatorPayoutService).singleton(),
    bloggerReferralService: asClass(BloggerReferralService).singleton(),
    creatorProductService:  asClass(CreatorProductService).singleton(),
    coInvestService:        asClass(CoInvestService).singleton(),
    skillSwapService:       asClass(SkillSwapService).singleton(),
    nftService:             asClass(NftService).singleton(),

    // ── AI ──────────────────────────────────────────────────────────────────
    chatbotService:            asClass(ChatbotService).singleton(),
    moderationService:         asClass(ModerationService).singleton(),
    receiptValidationService:  asClass(ReceiptValidationService).singleton(),

    // ── Voice ────────────────────────────────────────────────────────────────
    voiceCallService:          asClass(VoiceCallService).singleton(),

    // ── Integrations ────────────────────────────────────────────────────────
    eventService:          asClass(EventService).singleton(),
    weatherService:        asClass(WeatherService).singleton(),
    pushService:           asClass(PushService).singleton(),
    webhookService:        asClass(WebhookService).singleton(),
    apiKeyService:         asClass(ApiKeyService).singleton(),

    // ── Admin ─────────────────────────────────────────────────────────────────
    adminService:        asClass(AdminService).singleton(),
    analyticsService:    asClass(AnalyticsService).singleton(),

    // ── i18n ──────────────────────────────────────────────────────────────────
    aiTranslationService:asClass(AiTranslationService).singleton(),
  })

  return container
}
