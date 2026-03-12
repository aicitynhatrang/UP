import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { OrdersContent } from './OrdersContent'

interface Props {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'nav' })
  return { title: t('orders') }
}

export default function OrdersPage() {
  return <OrdersContent />
}
