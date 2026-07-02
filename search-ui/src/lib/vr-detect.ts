export function isVRHeadset(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  if (/oculus|quest|pico|vive|vr/.test(ua)) return true
  return false
}

export async function hasImmersiveVR(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('xr' in navigator)) return false
  try {
    return await (navigator as Navigator & { xr: XRSystem }).xr.isSessionSupported('immersive-vr')
  } catch {
    return false
  }
}

export async function shouldRedirectToVR(): Promise<boolean> {
  if (!isVRHeadset()) return false
  return hasImmersiveVR()
}
