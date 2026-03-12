'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface Props {
  referralCode: string
}

export function ReferralCard({ referralCode }: Props) {
  const ta = useTranslations('auth')
  const tg = useTranslations('gamification')
  const tc = useTranslations('common')
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = `https://allcity.vn?ref=${referralCode}`

  function share() {
    if (navigator.share) {
      navigator.share({ title: 'AllCity', url: shareUrl })
    } else {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-sm mb-1">{ta('referral_code')}</h3>
      <p className="text-xs text-gray-500 mb-3">{tg('invite_hint')}</p>

      <div className="flex items-center gap-2">
        <div className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl font-mono text-sm font-semibold text-brand-600 tracking-wider">
          {referralCode}
        </div>
        <button onClick={copy} className="btn-secondary text-xs py-2.5 px-4">
          {copied ? tc('copied') : tc('copy')}
        </button>
        <button onClick={share} className="btn-primary text-xs py-2.5 px-4">
          {tc('share')}
        </button>
      </div>
    </div>
  )
}
