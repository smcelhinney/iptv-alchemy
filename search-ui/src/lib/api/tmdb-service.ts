import { apiClient } from './client'

// --- Movie types ---

export interface TMDBSearchResult {
  id: number
  title: string
  original_title?: string
  release_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  overview?: string
  vote_average?: number
  _poster_url?: string | null
  _backdrop_url?: string | null
}

export interface TMDBMovieMetadata {
  tmdb_id: number
  title?: string
  original_title?: string
  overview?: string
  tagline?: string
  release_date?: string
  runtime?: number
  vote_average?: number
  vote_count?: number
  genres: string[]
  production_companies: { name: string; logo_path?: string | null }[]
  production_countries: string[]
  spoken_languages: string[]
  poster_url?: string | null
  backdrop_url?: string | null
  director?: string
  cast: {
    id: number
    name: string
    character: string
    profile_path?: string | null
    profile_url?: string | null
    order: number
  }[]
  crew: {
    id: number
    name: string
    job: string
    department: string
    profile_path?: string | null
    profile_url?: string | null
  }[]
}

// --- TV types ---

export interface TMDBTVSearchResult {
  id: number
  name: string
  original_name?: string
  first_air_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  overview?: string
  vote_average?: number
  _poster_url?: string | null
  _backdrop_url?: string | null
}

export interface TMDBEpisode {
  id?: number
  name?: string
  overview?: string
  air_date?: string
  runtime?: number
  season_number?: number
  episode_number?: number
  still_url?: string | null
}

export interface TMDBSeason {
  season_number?: number
  name?: string
  episode_count: number
  overview?: string
  poster_url?: string | null
  episodes: TMDBEpisode[]
}

export interface TMDBSeriesMetadata {
  tmdb_id: number
  title?: string
  original_name?: string
  overview?: string
  tagline?: string
  first_air_date?: string
  last_air_date?: string
  number_of_seasons?: number
  number_of_episodes?: number
  vote_average?: number
  vote_count?: number
  genres: string[]
  production_companies: { name: string; logo_path?: string | null }[]
  poster_url?: string | null
  backdrop_url?: string | null
  creator?: string
  cast: {
    id: number
    name: string
    character: string
    profile_path?: string | null
    profile_url?: string | null
    order: number
  }[]
  crew: {
    id: number
    name: string
    job: string
    department: string
    profile_path?: string | null
    profile_url?: string | null
  }[]
  seasons: TMDBSeason[]
}

// --- Movie API ---

export async function searchTMDB(query: string): Promise<TMDBSearchResult[]> {
  const { data } = await apiClient.get<{ results: TMDBSearchResult[] }>('/tmdb/search', {
    params: { q: query },
  })
  return data.results
}

export async function getTMDBMovie(docId: string): Promise<TMDBMovieMetadata | null> {
  try {
    const { data } = await apiClient.get<TMDBMovieMetadata>(`/tmdb/movie/${docId}`)
    return data
  } catch (error: any) {
    if (error.response?.status === 404) return null
    throw error
  }
}

export async function linkTMDBMovie(docId: string, tmdbId: number): Promise<TMDBMovieMetadata> {
  const { data } = await apiClient.post<TMDBMovieMetadata>(`/tmdb/movie/${docId}/link`, {
    tmdb_id: tmdbId,
  })
  return data
}

export async function deleteTMDBMovieMetadata(docId: string): Promise<void> {
  await apiClient.delete(`/tmdb/movie/${docId}`)
}

// --- TV API ---

export async function searchTMDBTV(query: string): Promise<TMDBTVSearchResult[]> {
  const { data } = await apiClient.get<{ results: TMDBTVSearchResult[] }>('/tmdb/search/tv', {
    params: { q: query },
  })
  return data.results
}

export async function getTMDBSeries(docId: string): Promise<TMDBSeriesMetadata | null> {
  try {
    const { data } = await apiClient.get<TMDBSeriesMetadata>(`/tmdb/series/${docId}`)
    return data
  } catch (error: any) {
    if (error.response?.status === 404) return null
    throw error
  }
}

export async function linkTMDBSeries(docId: string, tmdbId: number): Promise<TMDBSeriesMetadata> {
  const { data } = await apiClient.post<TMDBSeriesMetadata>(`/tmdb/series/${docId}/link`, {
    tmdb_id: tmdbId,
  })
  return data
}

export async function deleteTMDBSeriesMetadata(docId: string): Promise<void> {
  await apiClient.delete(`/tmdb/series/${docId}`)
}
