import { apiClient } from './client'

export interface PersonCredit {
  id: number
  title: string
  media_type: 'movie' | 'tv'
  date: string
  year: string | null
  character: string
  job: string
  poster_url?: string | null
}

export interface Person {
  id: number
  name: string
  biography: string
  birthday: string
  deathday: string
  place_of_birth: string
  known_for_department: string
  profile_url?: string | null
  credits: PersonCredit[]
}

export interface PersonCreditAggregate {
  id: number
  title: string
  media_type: 'movie' | 'tv'
  date: string
  year: string | null
  poster_url?: string | null
  roles: string[]
  url: string
}

function rolePriority(role: string): number {
  if (role === 'Director') return 0
  if (role === 'Producer') return 1
  if (role === 'Writer') return 2
  return 3
}

export function aggregatePersonCredits(
  credits: PersonCredit[],
): PersonCreditAggregate[] {
  const map = new Map<string, PersonCreditAggregate>()

  for (const credit of credits) {
    const key = `${credit.media_type}-${credit.id}`
    const roles: string[] = []
    if (credit.character) roles.push(`as ${credit.character}`)
    if (credit.job) roles.push(credit.job)

    const existing = map.get(key)
    if (existing) {
      for (const role of roles) {
        if (!existing.roles.includes(role)) existing.roles.push(role)
      }
    } else {
      map.set(key, {
        id: credit.id,
        title: credit.title,
        media_type: credit.media_type,
        date: credit.date,
        year: credit.year,
        poster_url: credit.poster_url,
        roles,
        url: `https://www.themoviedb.org/${credit.media_type}/${credit.id}`,
      })
    }
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      roles: item.roles.sort(
        (a, b) => rolePriority(a) - rolePriority(b) || a.localeCompare(b),
      ),
    }))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .reverse()
    .slice(0, 50)
}

export async function fetchPerson(personId: number): Promise<Person> {
  const { data } = await apiClient.get<Person>(`/person/${personId}`)
  return data
}
