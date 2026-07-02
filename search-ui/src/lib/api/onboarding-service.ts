import { apiClient } from './client'
import type {
  OnboardingStatus,
  OnboardingTask,
  IptvValidationResult,
  DirsValidationResponse,
  BatchFiltersPayload,
} from '../../types/config'

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const { data } = await apiClient.get<OnboardingStatus>('/onboarding/status')
  return data
}

export async function validateIptvCredentials(payload: {
  xtream_server_url: string
  xtream_username: string
  xtream_password: string
}): Promise<IptvValidationResult> {
  const { data } = await apiClient.post<IptvValidationResult>('/onboarding/validate-iptv', payload)
  return data
}

export async function validateOutputDirs(payload: {
  output_directory: string
  tv_output_directory: string
  movies_output_directory: string
}): Promise<DirsValidationResponse> {
  const { data } = await apiClient.post<DirsValidationResponse>('/onboarding/validate-dirs', payload)
  return data
}

export async function batchSaveFilters(payload: BatchFiltersPayload): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>('/onboarding/filters', payload)
  return data
}

export async function completeOnboarding(): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>('/onboarding/complete')
  return data
}

export async function saveOnboardingStep(
  step?: string,
  currentTask?: OnboardingTask | null,
): Promise<{ status: string }> {
  const body: Record<string, unknown> = {}
  if (step !== undefined) body.step = step
  if (currentTask !== undefined) body.current_task = currentTask
  const { data } = await apiClient.put<{ status: string }>('/onboarding/step', body)
  return data
}
