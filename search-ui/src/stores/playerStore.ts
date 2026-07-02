import { create } from 'zustand'
import { detectDevice, type DeviceType } from '../lib/device'

export type PlayerMode = 'floating' | 'fullscreen'

export interface PlayerOptions {
  favouriteId?: string
  initialTime?: number
  savePlaybackId?: string
}

interface PlayerState {
  open: boolean
  url: string
  title: string
  contentType: 'live' | 'vod'
  playerMode: PlayerMode
  deviceType: DeviceType
  favouriteId?: string
  initialTime?: number
  savePlaybackId?: string
  openPlayer: (url: string, title: string, contentType: 'live' | 'vod', options?: PlayerOptions) => void
  closePlayer: () => void
}

const detectedDevice = detectDevice()

export const usePlayerStore = create<PlayerState>((set) => ({
  open: false,
  url: '',
  title: '',
  contentType: 'live',
  playerMode: detectedDevice === 'tv' ? 'fullscreen' : 'floating',
  deviceType: detectedDevice,
  openPlayer: (url, title, contentType, options) =>
    set({
      open: true,
      url,
      title,
      contentType,
      favouriteId: options?.favouriteId,
      initialTime: options?.initialTime,
      savePlaybackId: options?.savePlaybackId,
      playerMode: detectedDevice === 'tv' ? 'fullscreen' : 'floating',
    }),
  closePlayer: () => set({ open: false, url: '', title: '', favouriteId: undefined, initialTime: undefined, savePlaybackId: undefined }),
}))
