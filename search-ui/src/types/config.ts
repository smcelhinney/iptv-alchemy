export interface AppConfig {
  xtream_server_url: string
  xtream_username: string
  xtream_password: string
  emby_server_url: string
  emby_api_key: string
  jellyfin_server_url: string
  jellyfin_api_key: string
  tmdb_api_key: string
  opensubtitles_api_key: string
  opensubtitles_username: string
  opensubtitles_password: string
  exclude_categories: string
  output_directory: string
  tv_output_directory: string
  movies_output_directory: string
  [key: string]: string
}

export interface OnboardingTask {
  task_id: string
  task_type: string
  phase: string
}

export interface OnboardingStatus {
  has_onboarded: boolean
  onboarding_step?: string
  current_task?: OnboardingTask | null
}

export interface IptvValidationResult {
  valid: boolean
  error?: string
}

export interface DirValidationResult {
  valid: boolean
  path?: string
  error?: string
}

export interface DirsValidationResponse {
  valid: boolean
  results: Record<string, DirValidationResult>
}

export interface BatchFiltersPayload {
  exclude_categories?: string
  selected_categories?: Record<string, string[]>
}
