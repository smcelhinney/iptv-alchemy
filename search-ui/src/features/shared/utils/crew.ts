interface CrewMember {
  id: number
  name: string
  job: string
  profile_url?: string | null
}

export interface AggregatedCrew {
  id: number
  name: string
  profile_url?: string | null
  jobs: string[]
}

function jobPriority(job: string): number {
  if (job === 'Director') return 0
  if (job === 'Producer') return 1
  if (job === 'Writer') return 2
  return 3
}

export function aggregateCrew(crew: CrewMember[]): AggregatedCrew[] {
  const map = new Map<number, AggregatedCrew>()
  for (const member of crew) {
    const existing = map.get(member.id)
    if (existing) {
      if (!existing.jobs.includes(member.job)) {
        existing.jobs.push(member.job)
      }
    } else {
      map.set(member.id, {
        id: member.id,
        name: member.name,
        profile_url: member.profile_url,
        jobs: [member.job],
      })
    }
  }

  return Array.from(map.values())
    .map((person) => ({
      ...person,
      jobs: person.jobs.sort(
        (a, b) => jobPriority(a) - jobPriority(b) || a.localeCompare(b),
      ),
    }))
    .sort((a, b) => {
      const bestA = Math.min(...a.jobs.map(jobPriority))
      const bestB = Math.min(...b.jobs.map(jobPriority))
      return bestA - bestB || a.name.localeCompare(b.name)
    })
}
