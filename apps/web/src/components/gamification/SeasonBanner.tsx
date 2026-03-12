'use client'

import { useTranslations } from 'next-intl'
import { useActiveSeason, useMyRank } from '@/lib/queries/gamification'
import { useAuthStore } from '@/store/authStore'

export function SeasonBanner() {
  const t = useTranslations('gamification')
  const token = useAuthStore((s) => s.token)
  const { data: season } = useActiveSeason()
  const { data: rank } = useMyRank()

  if (!season) return null

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(season.ends_at).getTime() - Date.now()) / 86_400_000),
  )

  return (
    <div className="card bg-gradient-to-r from-orange-500 to-amber-500 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{season.name}</h2>
          <p className="text-sm opacity-90">
            {t('daysLeft', { count: daysLeft })}
          </p>
        </div>

        {token && rank && (
          <div className="text-right">
            <div className="text-3xl font-black">
              #{rank.rank ?? '—'}
            </div>
            <div className="text-sm opacity-90">
              {rank.points.toLocaleString()} pts
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
