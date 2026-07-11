/**
 * Wrap non-HTTPS image URLs in the backend image proxy.
 * HTTPS URLs pass through unchanged.
 */
export function proxyImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('https://')) return url
  if (url.startsWith('data:')) return url
  return `${window.location.origin}/api/proxy/img?url=${encodeURIComponent(url)}`
}
