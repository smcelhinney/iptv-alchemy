export interface Task {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_at: string
  started_at: string | null
  completed_at: string | null
  result: string | null
  error: string | null
  logs: string
}
