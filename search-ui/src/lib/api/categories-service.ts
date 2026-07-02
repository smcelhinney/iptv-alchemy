import { apiClient } from './client'
import type { CategoriesResponse } from '../../types/api'

export async function fetchCategories(contentType: string): Promise<CategoriesResponse> {
  const { data } = await apiClient.get<CategoriesResponse>(`/categories/${contentType}`)
  return data
}

export async function updateSelectedCategories(
  contentType: string,
  categories: string[],
): Promise<{ status: string }> {
  const { data } = await apiClient.put<{ status: string }>(`/categories/${contentType}/selected`, {
    categories,
  })
  return data
}
