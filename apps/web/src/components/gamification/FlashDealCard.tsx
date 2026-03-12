'use client'

import { useTranslations, useLocale } from 'next-intl'
import { getLocalized, formatVnd } from '@/lib/utils'
import { usePurchaseFlashDeal, type FlashDeal } from '@/lib/queries/gamification'
import { useAuthStore } from '@/store/authStore'

interface Props {
  deal: FlashDeal
}

export function FlashDealCard({ deal }: Props) {
  const t = useTranslations('gamification')
  const locale = useLocale()
  const token = useAuthStore((s) => s.token)
  const purchase = usePurchaseFlashDeal()

  const timeLeft = Math.max(0, new Date(deal.ends_at).getTime() - Date.now())
  const hours = Math.floor(timeLeft / 3_600_000)
  const mins = Math.floor((timeLeft % 3_600_000) / 60_000)

  const isEarlyBird =
    deal.early_bird_price !== null &&
    deal.remaining_slots > deal.total_slots - deal.early_bird_slots

  const currentPrice = isEarlyBird ? deal.early_bird_price! : deal.deal_price
  const discountPct = Math.round((1 - currentPrice / deal.original_price) * 100)

  return (
    <div className="card border-2 border-orange-200 relative overflow-hidden">
      {isEarlyBird && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          EARLY BIRD
        </div>
      )}

      <h4 className="font-bold text-lg pr-20">
        {getLocalized(deal.title, locale)}
      </h4>
      <p className="text-sm text-gray-500 mb-2">
        {getLocalized(deal.provider_name, locale)}
      </p>

      <div className="flex items-end gap-3 mb-3">
        <span className="text-2xl font-black text-orange-600">
          {formatVnd(currentPrice)}
        </span>
        <span className="text-sm text-gray-400 line-through">
          {formatVnd(deal.original_price)}
        </span>
        <span className="text-sm font-bold text-green-600">-{discountPct}%</span>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
        <span>
          {deal.remaining_slots}/{deal.total_slots} {t('slotsLeft')}
        </span>
        <span>
          {hours}h {mins}m
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
        <div
          className="h-full bg-orange-500 rounded-full transition-all"
          style={{
            width: `${((deal.total_slots - deal.remaining_slots) / deal.total_slots) * 100}%`,
          }}
        />
      </div>

      <button
        className="btn-primary w-full"
        disabled={!token || deal.remaining_slots === 0 || purchase.isPending}
        onClick={() => purchase.mutate(deal.id)}
      >
        {deal.remaining_slots === 0
          ? t('soldOut')
          : purchase.isPending
            ? '...'
            : t('buyNow')}
      </button>
    </div>
  )
}
