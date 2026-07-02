import { apiClient } from './client'

export interface UserSettings {
  subtitle_size?: string
  subtitle_offset?: string
}

export async function fetchSettings(): Promise<UserSettings> {
  const { data } = await apiClient.get<UserSettings>('/settings')
  return data
}

export async function updateSettings(settings: Partial<UserSettings>): Promise<{ status: string }> {
  const { data } = await apiClient.put<{ status: string }>('/settings', settings)
  return data
}
