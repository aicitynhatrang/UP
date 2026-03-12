import { OrderDetailContent } from './OrderDetailContent'

interface Props {
  params: { id: string }
}

export default function OrderDetailPage({ params: { id } }: Props) {
  return <OrderDetailContent orderId={id} />
}
