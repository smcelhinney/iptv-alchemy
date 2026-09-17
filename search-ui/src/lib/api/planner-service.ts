import { apiClient } from './client'

export interface PlannerChannel {
  uuid: string
  logo: string
  name: string
  url: string
}

export interface PlannerEpgItem {
  channelUuid: string
  id: string
  image: string
  since: string
  till: string
  title: string
  description: string
  url: string
}

export async function fetchPlannerChannels(): Promise<PlannerChannel[]> {
  const { data } = await apiClient.get<{ channels: PlannerChannel[] }>('/planner/channels')
  return data.channels
}

export async function fetchPlannerEpg(
  date?: string,
  timezoneOffsetMinutes?: number
): Promise<{ epg: PlannerEpgItem[]; date: string }> {
  const params: Record<string, string> = {}
  if (date) params.date = date
  if (timezoneOffsetMinutes !== undefined) {
    params.offset = String(timezoneOffsetMinutes)
  }
  const { data } = await apiClient.get<{ epg: PlannerEpgItem[]; date: string }>('/planner/epg', { params })
  return data
}
