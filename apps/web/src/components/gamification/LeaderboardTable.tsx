'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useLeaderboard, type LeaderboardEntry } from '@/lib/queries/gamification'

export function LeaderboardTable() {
  const t = useTranslations('gamification')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useLeaderboard(page, 50)

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">{t('loading')}</div>
  }

  const entries: LeaderboardEntry[] = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4">{t('leaderboard')}</h3>

      <div className="space-y-2">
        {entries.map((e) => (
          <div
            key={e.user_id}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <span
              className={`w-8 text-center font-bold ${
                e.rank <= 3 ? 'text-orange-500 text-lg' : 'text-gray-500'
              }`}
            >
              {e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : `#${e.rank}`}
            </span>

            <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
              {e.avatar_url && (
                <img src={e.avatar_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {e.first_name || e.username}
              </div>
            </div>

            <div className="font-bold text-orange-600">
              {e.total_points.toLocaleString()}
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <p className="text-center text-gray-400 py-4">{t('noData')}</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            className="btn-secondary text-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ←
          </button>
          <span className="py-2 px-3 text-sm">
            {page} / {totalPages}
          </span>
          <button
            className="btn-secondary text-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
