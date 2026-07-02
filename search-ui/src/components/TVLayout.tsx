import { isTV } from '../lib/device'

export default function TVLayout({ children }: { children: React.ReactNode }) {
  if (isTV()) {
    return <div className="tv-layout">{children}</div>
  }
  return <>{children}</>
}
