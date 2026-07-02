import { apiClient } from './client'
import type { AppConfig } from '../../types/config'

export async function fetchConfig(): Promise<AppConfig> {
  const { data } = await apiClient.get<AppConfig>('/config')
  return data
}

export async function updateConfig(config: Partial<AppConfig>): Promise<{ status: string }> {
  const { data } = await apiClient.put<{ status: string }>('/config', config)
  return data
}
