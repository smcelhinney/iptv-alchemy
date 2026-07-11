import { createContext, useContext, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSettings, updateSettings } from '../lib/api/settings-service'
import type { UserSettings } from '../lib/api/settings-service'
import { useToast } from '../components/Toast'

interface SettingsContextValue {
  settings: UserSettings
  setSetting: (key: string, value: string) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

const _DEFAULTS: UserSettings = {
  subtitle_enabled: 'true',
  subtitle_size: 'normal',
  subtitle_offset: '0',
  transcode_enabled: 'true',
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => {
      showToast('error', 'Failed to save setting')
    },
  })

  const settings = { ..._DEFAULTS, ...settingsData }

  const setSetting = useCallback((key: string, value: string) => {
    mutation.mutate({ [key]: value })
  }, [mutation])

  return (
    <SettingsContext.Provider value={{ settings, setSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return ctx
}
