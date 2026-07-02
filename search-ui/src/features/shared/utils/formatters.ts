/**
 * Formats a Unix timestamp for display in the UI.
 * Shows time only for today, "Tomorrow, HH:MM AM/PM" for tomorrow,
 * or full date/time for other days.
 */
export function formatTime(timestamp: number): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const programmeDate = new Date(timestamp * 1000)
  const programmeDay = new Date(programmeDate.getFullYear(), programmeDate.getMonth(), programmeDate.getDate())

  let datePrefix = ''
  if (programmeDay.getTime() === today.getTime()) {
    datePrefix = ''
  } else if (programmeDay.getTime() === tomorrow.getTime()) {
    datePrefix = 'Tomorrow, '
  } else {
    datePrefix = programmeDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ', '
  }

  const time = programmeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return datePrefix + time
}
