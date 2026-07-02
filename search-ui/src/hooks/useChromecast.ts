import { useEffect, useState, useRef } from 'react'

interface CastState {
  available: boolean
  connected: boolean
  deviceName: string
  loading: boolean
}

export function useChromecast() {
  const [castState, setCastState] = useState<CastState>({
    available: false,
    connected: false,
    deviceName: '',
    loading: true
  })
  const castContextRef = cast.framework.CastContext.getInstance()
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return

    initializedRef.current = true

    const initializeCast = async () => {
      try {
        // Check if Cast API is available
        if (!window.cast || !window.cast.framework) {
          setCastState(prev => ({ ...prev, loading: false }))
          return
        }

        const CastContext = cast.framework.CastContext.getInstance()

        // Set up Cast options
        const options: cast.framework.CastOptions = {
          receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
          language: 'en-US'
        }

        await CastContext.setOptions(options)

        // Set up event listeners
        const castSession = CastContext.getCurrentSession()
        const castStateEventListener = (state: cast.framework.CastState) => {
          const available = state !== cast.framework.CastState.NO_DEVICES_AVAILABLE
          setCastState(prev => ({ ...prev, available, loading: false }))
        }

        const sessionStateChangeListener = (isAlive: boolean) => {
          const session = CastContext.getCurrentSession()
          if (session && session.getCastDevice()) {
            setCastState(prev => ({
              ...prev,
              connected: isAlive,
              deviceName: session.getCastDevice().friendlyName || ''
            }))
          } else {
            setCastState(prev => ({
              ...prev,
              connected: false,
              deviceName: ''
            }))
          }
        }

        CastContext.addEventListener(
          cast.framework.CastContextEventType.CAST_STATE_CHANGED,
          castStateEventListener as any
        )

        CastContext.addEventListener(
          cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
          sessionStateChangeListener as any
        )

        // Initial state check
        const initialState = CastContext.getCastState()
        setCastState({
          available: initialState !== cast.framework.CastState.NO_DEVICES_AVAILABLE,
          connected: !!castSession,
          deviceName: castSession?.getCastDevice()?.friendlyName || '',
          loading: false
        })

        return () => {
          CastContext.removeEventListener(
            cast.framework.CastContextEventType.CAST_STATE_CHANGED,
            castStateEventListener as any
          )
          CastContext.removeEventListener(
            cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            sessionStateChangeListener as any
          )
        }
      } catch (error) {
        console.error('Failed to initialize Cast:', error)
        setCastState(prev => ({ ...prev, loading: false }))
      }
    }

    initializeCast()
  }, [])

  const castMedia = async (contentUrl: string, title?: string) => {
    try {
      if (!castState.available) {
        throw new Error('Chromecast not available')
      }

      const castSession = castContextRef.getCurrentSession()
      if (!castSession) {
        // Request a new session
        const result = await castContextRef.requestSession()
        if (!result) {
          throw new Error('Failed to start cast session')
        }
      }

      const session = castContextRef.getCurrentSession()
      if (!session) {
        throw new Error('No active cast session')
      }

      const mediaInfo = new chrome.cast.media.MediaInfo(contentUrl, 'application/x-mpegurl')
      if (title) {
        mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata()
        mediaInfo.metadata.title = title
      }

      const request = new chrome.cast.media.LoadRequest(mediaInfo)
      await session.loadMedia(request)
    } catch (error) {
      console.error('Failed to cast media:', error)
      throw error
    }
  }

  const disconnect = () => {
    const session = castContextRef.getCurrentSession()
    if (session) {
      session.endSession(true)
    }
  }

  return {
    ...castState,
    castMedia,
    disconnect
  }
}
