'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime:        1000 * 60,     // 1 min
          gcTime:           1000 * 60 * 5, // 5 min
          retry:            1,
          refetchOnWindowFocus: false,
        },
      },
    })
  )

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  )
}
