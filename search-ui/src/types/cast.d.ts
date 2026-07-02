declare global {
  interface Window {
    cast?: typeof cast
    chrome?: typeof chrome
  }

  const cast: cast.framework.CastFrameworkNamespace
  const chrome: typeof chrome
}

declare namespace cast.framework {
  export interface CastOptions {
    receiverApplicationId: string
    autoJoinPolicy?: chrome.cast.AutoJoinPolicy
    language?: string
  }

  export enum CastState {
    NO_DEVICES_AVAILABLE = 'NO_DEVICES_AVAILABLE',
    NOT_CONNECTED = 'NOT_CONNECTED',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED'
  }

  export enum CastContextEventType {
    CAST_STATE_CHANGED = 'CAST_STATE_CHANGED',
    SESSION_STATE_CHANGED = 'SESSION_STATE_CHANGED'
  }

  export interface CastContext {
    setOptions(options: CastOptions): Promise<void>
    getCastState(): CastState
    getCurrentSession(): cast.framework.RemotePlayer | null
    requestSession(): Promise<boolean>
    addEventListener(eventType: CastContextEventType, handler: Function): void
    removeEventListener(eventType: CastContextEventType, handler: Function): void
    endSession(stopCurrentApp?: boolean): void
  }

  export interface CastFrameworkNamespace {
    framework: {
      CastContext: {
        getInstance(): CastContext
      }
      CastState: typeof CastState
      CastContextEventType: typeof CastContextEventType
      RemotePlayer: any
      RemotePlayerController: any
    }
  }
}

declare namespace chrome.cast {
  export enum AutoJoinPolicy {
    TAB_AND_ORIGIN_SCOPED = 'TAB_AND_ORIGIN_SCOPED',
    ORIGIN_SCOPED = 'ORIGIN_SCOPED',
    PAGE_SCOPED = 'PAGE_SCOPED'
  }

  export const DEFAULT_MEDIA_RECEIVER_APP_ID: string

  export namespace media {
    export interface MediaInfo {
      contentId: string
      contentType: string
      streamType?: chrome.cast.media.StreamType
      metadata?: GenericMediaMetadata | MovieMediaMetadata | TvShowMediaMetadata | MusicTrackMediaMetadata
      duration?: number
    }

    export interface GenericMediaMetadata {
      title?: string
      subtitle?: string
      images?: chrome.cast.Image[]
      releaseDate?: string
    }

    export interface LoadRequest {
      mediaInfo: MediaInfo
      autoplay?: boolean
      currentTime?: number
    }

    export enum StreamType {
      BUFFERED = 'BUFFERED',
      LIVE = 'LIVE'
    }
  }

  export interface Image {
    url: string
    width?: number
    height?: number
  }
}

export {}
