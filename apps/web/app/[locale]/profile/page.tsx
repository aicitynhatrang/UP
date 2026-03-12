import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { ProfileContent } from './ProfileContent'

interface Props {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('profile') }
}

export default function ProfilePage() {
  return <ProfileContent />
}
