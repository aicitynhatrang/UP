'use client'

import { useSubscriptionTiers, useCreateStripeCheckout, useTransactions, useValidateDiscount } from '@/lib/queries/payments'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'

export default function PaymentsPage() {
  const t = useTranslations('payments')
  const token = useAuthStore(s => s.accessToken)
  const user = useAuthStore(s => s.user)
  const [discount, setDiscount] = useState('')
  const [discountResult, setDiscountResult] = useState<any>(null)

  const { data: tiersData, isLoading: tiersLoading } = useSubscriptionTiers()
  const { data: txData } = useTransactions()
  const checkout = useCreateStripeCheckout()
  const validateDiscount = useValidateDiscount()

  const tiers = tiersData?.data ?? []
  const transactions = txData?.data ?? []

  if (!token) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
        <p className="text-gray-500">{t('login_required')}</p>
      </main>
    )
  }

  const handleCheckout = (tier: any) => {
    checkout.mutate(
      {
        providerId: user?.provider_id || user?.id || '',
        tierSlug: tier.slug || tier.id,
        successUrl: window.location.href + '?success=1',
        cancelUrl: window.location.href,
      },
      {
        onSuccess: (data: any) => {
          const url = data?.data?.url || data?.url
          if (url) window.location.href = url
        },
      },
    )
  }

  const handleValidateDiscount = () => {
    if (!discount.trim()) return
    validateDiscount.mutate(
      { code: discount, orderAmountVnd: 0 },
      { onSuccess: (data: any) => setDiscountResult(data?.data || data) },
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Current subscription */}
      {currentSub && (
        <div className="card p-5 bg-brand-50 border-brand-200">
          <h2 className="font-semibold mb-2">{t('current_plan')}</h2>
          <p className="text-sm text-gray-600">
            {t('plan_name')}: <span className="font-medium">{currentSub.tier}</span>
          </p>
          <p className="text-sm text-gray-600">
            {t('expires')}: {new Date(currentSub.expires_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Subscription tiers */}
      <section>
        <h2 className="text-xl font-bold mb-4">{t('plans')}</h2>
        {tiersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-64 animate-pulse bg-gray-100 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier: any) => (
              <div key={tier.id} className="card p-6 flex flex-col">
                <h3 className="text-lg font-bold mb-2">{tier.name}</h3>
                <p className="text-3xl font-bold text-brand-600 mb-1">
                  {tier.price?.toLocaleString()} ₫
                </p>
                <p className="text-xs text-gray-400 mb-4">/ {t('month')}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {(tier.features ?? []).map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleCheckout(tier)}
                  disabled={checkout.isPending}
                  className="w-full py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {t('subscribe')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Discount code */}
      <section className="card p-5">
        <h2 className="font-semibold mb-3">{t('discount_code')}</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={discount}
            onChange={e => setDiscount(e.target.value.toUpperCase())}
            placeholder={t('enter_code')}
            className="flex-1 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleValidateDiscount}
            disabled={validateDiscount.isPending}
            className="px-4 py-2 bg-gray-100 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {t('apply')}
          </button>
        </div>
        {discountResult && (
          <p className={`text-sm mt-2 ${discountResult.valid ? 'text-green-600' : 'text-red-500'}`}>
            {discountResult.valid
              ? t('discount_applied', { percent: discountResult.discount_percent })
              : t('discount_invalid')}
          </p>
        )}
      </section>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">{t('transactions')}</h2>
          <div className="space-y-2">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="card px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{tx.description || tx.type}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount?.toLocaleString()} ₫
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
