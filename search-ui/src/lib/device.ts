export type DeviceType = 'tv' | 'desktop' | 'mobile'

export function detectDevice(): DeviceType {
  if (typeof window === 'undefined') return 'desktop'

  const ua = navigator.userAgent.toLowerCase()

  // Android TV / Nvidia Shield / Amazon Fire TV
  if (/android/.test(ua) && /tv|aft|shield|nvidia|leanback/.test(ua)) {
    return 'tv'
  }

  // Standalone display mode with large screen and no touch
  if (window.matchMedia('(display-mode: standalone)').matches) {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isLargeScreen = window.screen.width >= 1920 && window.screen.height >= 1080
    if (isLargeScreen && !hasTouch) {
      return 'tv'
    }
  }

  // Mobile detection
  if (/mobile|iphone|ipod|android(?!.*tv)/i.test(ua)) {
    return 'mobile'
  }

  return 'desktop'
}

export function isTV(): boolean {
  return detectDevice() === 'tv'
}
