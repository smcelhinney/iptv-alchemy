import { createContext, useContext, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api/client'

interface ConnectionStatus {
  max_connections: number
  active_cons: number
  is_full: boolean
}

const ConnectionStatusContext = createContext<ConnectionStatus | null>(null)

export function ConnectionStatusProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ['connection-status'],
    queryFn: async () => {
      const resp = await apiClient.get('/connection-status')
      return resp.data as ConnectionStatus
    },
    refetchInterval: 10_000,
    staleTime: 10_000,
    retry: false,
  })

  return (
    <ConnectionStatusContext.Provider value={data ?? null}>
      {children}
    </ConnectionStatusContext.Provider>
  )
}

export function useConnectionStatus() {
  return useContext(ConnectionStatusContext)
}
