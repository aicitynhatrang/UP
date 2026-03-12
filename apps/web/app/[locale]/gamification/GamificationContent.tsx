'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { SeasonBanner } from '@/components/gamification/SeasonBanner'
import { LeaderboardTable } from '@/components/gamification/LeaderboardTable'
import { FlashDealCard } from '@/components/gamification/FlashDealCard'
import { GroupBuyCard } from '@/components/gamification/GroupBuyCard'
import { MysteryTaskCard } from '@/components/gamification/MysteryTaskCard'
import { Club77Section } from '@/components/gamification/Club77Section'
import { useFlashDeals } from '@/lib/queries/gamification'
import { useGroupBuys } from '@/lib/queries/gamification'
import { useMysteryTasks } from '@/lib/queries/gamification'

type Tab = 'leaderboard' | 'deals' | 'group' | 'mystery' | 'club77'

export function GamificationContent() {
  const t = useTranslations('gamification')
  const [tab, setTab] = useState<Tab>('leaderboard')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'leaderboard', label: t('leaderboard') },
    { key: 'deals', label: t('flashDeals') },
    { key: 'group', label: t('groupBuy') },
    { key: 'mystery', label: t('mysteryShopper') },
    { key: 'club77', label: 'Club 77' },
  ]

  return (
    <div className="space-y-6">
      <SeasonBanner />

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'leaderboard' && <LeaderboardTable />}
      {tab === 'deals' && <FlashDealsTab />}
      {tab === 'group' && <GroupBuysTab />}
      {tab === 'mystery' && <MysteryTab />}
      {tab === 'club77' && <Club77Section />}
    </div>
  )
}

function FlashDealsTab() {
  const t = useTranslations('gamification')
  const { data, isLoading } = useFlashDeals()

  if (isLoading) return <div className="text-center py-8 text-gray-400">{t('loading')}</div>

  const deals = data?.data ?? []
  if (deals.length === 0) return <p className="text-center text-gray-400 py-8">{t('noDeals')}</p>

  return (
    <div className="space-y-4">
      {deals.map((deal) => (
        <FlashDealCard key={deal.id} deal={deal} />
      ))}
    </div>
  )
}

function GroupBuysTab() {
  const t = useTranslations('gamification')
  const { data, isLoading } = useGroupBuys()

  if (isLoading) return <div className="text-center py-8 text-gray-400">{t('loading')}</div>

  const buys = data?.data ?? []
  if (buys.length === 0) return <p className="text-center text-gray-400 py-8">{t('noData')}</p>

  return (
    <div className="space-y-4">
      {buys.map((buy) => (
        <GroupBuyCard key={buy.id} buy={buy} />
      ))}
    </div>
  )
}

function MysteryTab() {
  const t = useTranslations('gamification')
  const { data: tasks, isLoading } = useMysteryTasks()

  if (isLoading) return <div className="text-center py-8 text-gray-400">{t('loading')}</div>

  const list = (tasks as any[]) ?? []
  if (list.length === 0) return <p className="text-center text-gray-400 py-8">{t('noTasks')}</p>

  return (
    <div className="space-y-4">
      {list.map((task) => (
        <MysteryTaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
