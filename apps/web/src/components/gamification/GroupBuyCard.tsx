'use client'

import { useTranslations, useLocale } from 'next-intl'
import { getLocalized, formatVnd } from '@/lib/utils'
import { useJoinGroupBuy, type GroupBuy } from '@/lib/queries/gamification'
import { useAuthStore } from '@/store/authStore'

interface Props {
  buy: GroupBuy
}

export function GroupBuyCard({ buy }: Props) {
  const t = useTranslations('gamification')
  const locale = useLocale()
  const token = useAuthStore((s) => s.token)
  const join = useJoinGroupBuy()

  const activeTier = [...buy.tiers]
    .sort((a, b) => b.count - a.count)
    .find((tier) => buy.current_participants >= tier.count)

  const currentDiscount = activeTier?.discount_pct ?? 0
  const currentPrice = Math.round(buy.base_price * (1 - currentDiscount / 100))

  const nextTier = buy.tiers
    .sort((a, b) => a.count - b.count)
    .find((tier) => buy.current_participants < tier.count)

  const progress = (buy.current_participants / buy.max_participants) * 100

  return (
    <div className="card">
      <h4 className="font-bold text-lg">{getLocalized(buy.title, locale)}</h4>
      <p className="text-sm text-gray-500 mb-2">
        {getLocalized(buy.provider_name, locale)}
      </p>

      <div className="flex items-end gap-3 mb-2">
        <span className="text-2xl font-black text-orange-600">
          {formatVnd(currentPrice)}
        </span>
        <span className="text-sm text-gray-400 line-through">
          {formatVnd(buy.base_price)}
        </span>
        {currentDiscount > 0 && (
          <span className="text-sm font-bold text-green-600">-{currentDiscount}%</span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-3">
        {buy.current_participants}/{buy.max_participants} {t('participants')}
      </p>

      {/* Tier progress */}
      <div className="w-full h-3 bg-gray-200 rounded-full mb-2 relative">
        <div
          className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
        {buy.tiers.map((tier) => (
          <div
            key={tier.count}
            className="absolute top-0 w-0.5 h-3 bg-gray-400"
            style={{ left: `${(tier.count / buy.max_participants) * 100}%` }}
          />
        ))}
      </div>

      {nextTier && (
        <p className="text-xs text-gray-500 mb-4">
          {t('nextTier')}: {nextTier.count} {t('participants')} → -{nextTier.discount_pct}%
        </p>
      )}

      <button
        className="btn-primary w-full"
        disabled={
          !token ||
          buy.current_participants >= buy.max_participants ||
          join.isPending
        }
        onClick={() => join.mutate(buy.id)}
      >
        {buy.current_participants >= buy.max_participants
          ? t('full')
          : join.isPending
            ? '...'
            : t('joinGroup')}
      </button>
    </div>
  )
}
