import { apiClient } from './client'
import type { Task } from '../../types/tasks'

export async function createTask(endpoint: string, body?: Record<string, unknown>): Promise<{ task_id: string }> {
  const { data } = await apiClient.post<{ task_id: string }>(endpoint, body)
  return data
}

export async function fetchTask(taskId: string): Promise<Task> {
  const { data } = await apiClient.get<Task>(`/task/${taskId}`)
  return data
}

export async function fetchAllTasks(): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>('/tasks')
  return data
}
