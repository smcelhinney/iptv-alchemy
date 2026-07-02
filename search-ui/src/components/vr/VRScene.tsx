import { useEffect, useRef, useCallback } from 'react'
import {
  World,
  SessionMode,
  createComponent,
  createSystem,
  RayInteractable,
  PokeInteractable,
  Pressed,
  Hovered,
  Types,
} from '@iwsdk/core'
import {
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  CanvasTexture,
  VideoTexture,
  LinearFilter,
  Color,
  Vector3,
} from 'three'
import mpegts from 'mpegts.js'
import type { Hit } from '../../types'

interface VRSceneProps {
  favourites: { movies: Hit[]; tv_channels: Hit[] }
}

const FAV_CANVAS_W = 800
const FAV_CANVAS_H = 1000
const PANEL_WIDTH = 1.6
const PANEL_HEIGHT = 2.0
const CURVE_RADIUS = 3.5

function createCurvedPlane(width: number, height: number, radius: number, worldCenterX = 0, segmentsW = 32) {
  const geo = new PlaneGeometry(width, height, segmentsW, 1)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const localX = pos.getX(i)
    const relX = localX + worldCenterX
    const angle = relX / radius
    pos.setX(i, radius * Math.sin(angle) - worldCenterX)
    pos.setZ(i, radius * (1 - Math.cos(angle)))
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

const FavouritesPanel = createComponent('FavouritesPanel', {
  scrollOffset: { type: Types.Int32, default: 0 },
  hoveredIndex: { type: Types.Int32, default: -1 },
})

const VideoPanel = createComponent('VideoPanel', {
  isPlaying: { type: Types.Boolean, default: false },
})

const ExitVRButton = createComponent('ExitVRButton', {})
const ResizeHandle = createComponent('ResizeHandle', {})

function buildItemList(favourites: { movies: Hit[]; tv_channels: Hit[] }): { hit: Hit; label: string }[] {
  const items: { hit: Hit; label: string }[] = []
  for (const ch of favourites.tv_channels) {
    items.push({ hit: ch, label: ch.name || 'Unknown Channel' })
  }
  for (const m of favourites.movies) {
    items.push({ hit: m, label: m.movie_name || m.name || 'Unknown Movie' })
  }
  return items
}

function renderFavouritesCanvas(
  canvas: HTMLCanvasElement,
  items: { hit: Hit; label: string }[],
  hoveredIndex: number,
  scrollOffset: number,
) {
  const ctx = canvas.getContext('2d')!
  const w = canvas.width
  const h = canvas.height

  ctx.fillStyle = '#111827'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#1f2937'
  ctx.fillRect(0, 0, w, 60)
  ctx.fillStyle = '#e5e7eb'
  ctx.font = 'bold 28px sans-serif'
  ctx.fillText('Favourites', 20, 42)

  const itemH = 70
  const startY = 70
  const visibleCount = Math.floor((h - startY) / itemH)

  for (let i = 0; i < visibleCount; i++) {
    const idx = i + scrollOffset
    if (idx >= items.length) break
    const y = startY + i * itemH

    if (idx === hoveredIndex) {
      ctx.fillStyle = '#2563eb'
      ctx.fillRect(8, y, w - 16, itemH - 4)
    } else {
      ctx.fillStyle = i % 2 === 0 ? '#1f2937' : '#111827'
      ctx.fillRect(8, y, w - 16, itemH - 4)
    }

    const isLive = items[idx].hit.type === 'live_tv'
    if (isLive) {
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(30, y + itemH / 2, 6, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = idx === hoveredIndex ? '#ffffff' : '#d1d5db'
    ctx.font = '22px sans-serif'
    const label = items[idx].label
    const maxW = w - 60
    const truncated = ctx.measureText(label).width > maxW
      ? label.substring(0, 30) + '...'
      : label
    ctx.fillText(truncated, 48, y + itemH / 2 + 7)
  }

  if (items.length > visibleCount) {
    const scrollBarH = ((h - startY) * visibleCount) / items.length
    const scrollBarY = startY + ((h - startY - scrollBarH) * scrollOffset) / Math.max(1, items.length - visibleCount)
    ctx.fillStyle = '#374151'
    ctx.fillRect(w - 8, startY, 4, h - startY)
    ctx.fillStyle = '#6b7280'
    ctx.fillRect(w - 8, scrollBarY, 4, scrollBarH)
  }
}

class IPTVSystem extends createSystem({
  favouritesPanel: { required: [FavouritesPanel, RayInteractable] },
  videoPanel: { required: [VideoPanel] },
  pressedPanel: { required: [FavouritesPanel, Pressed] },
  hoveredPanel: { required: [FavouritesPanel, Hovered] },
  pressedExit: { required: [ExitVRButton, Pressed] },
  hoveredHandle: { required: [ResizeHandle, Hovered] },
  pressedHandle: { required: [ResizeHandle, Pressed] },
}) {
  private items: { hit: Hit; label: string }[] = []
  private favCanvas: HTMLCanvasElement | null = null
  private favTexture: CanvasTexture | null = null
  private videoEl: HTMLVideoElement | null = null
  private videoTexture: VideoTexture | null = null
  private mpegtsPlayer: mpegts.Player | null = null
  private leftMesh: Mesh | null = null
  private rightMesh: Mesh | null = null
  private rightMaterial: MeshBasicMaterial | null = null
  private exitButtonMesh: Mesh | null = null
  private exitHandler: (() => void) | null = null
  private resizeHandleMesh: Mesh | null = null
  private canvasOffsetZ = 0
  private canvasOffsetY = 0
  private _tmpVec = new Vector3()
  private _lastControllerY: number | null = null
  private _resizeActive = false
  private _resizeStartW = 0
  private _resizeStartH = 0
  private _resizeStartPos = new Vector3()

  setItems(items: { hit: Hit; label: string }[]) {
    this.items = items
  }

  setFavCanvas(canvas: HTMLCanvasElement, texture: CanvasTexture) {
    this.favCanvas = canvas
    this.favTexture = texture
  }

  setVideo(videoEl: HTMLVideoElement, texture: VideoTexture) {
    this.videoEl = videoEl
    this.videoTexture = texture
  }

  setPanels(left: Mesh, right: Mesh, rightMaterial: MeshBasicMaterial) {
    this.leftMesh = left
    this.rightMesh = right
    this.rightMaterial = rightMaterial
  }

  setExitButton(mesh: Mesh) {
    this.exitButtonMesh = mesh
  }

  setExitHandler(handler: () => void) {
    this.exitHandler = handler
  }

  setResizeHandle(mesh: Mesh) {
    this.resizeHandleMesh = mesh
  }

  init() {
    this.queries.pressedPanel.subscribe('qualify', (entity) => {
      const hoveredIndex = entity.getValue(FavouritesPanel, 'hoveredIndex') ?? -1

      if (hoveredIndex >= 0 && hoveredIndex < this.items.length) {
        this.playStream(this.items[hoveredIndex].hit)
      }
    })

    this.queries.pressedExit.subscribe('qualify', () => {
      this.exitHandler?.()
    })

    this.queries.pressedHandle.subscribe('qualify', () => {
      const gripGroup = this.input.xr.xrOrigin.gripSpaces.right
      if (gripGroup && this.rightMesh) {
        gripGroup.getWorldPosition(this._resizeStartPos)
        this._resizeStartW = (this.rightMesh.geometry as PlaneGeometry).parameters.width
        this._resizeStartH = (this.rightMesh.geometry as PlaneGeometry).parameters.height
        this._resizeActive = true
      }
    })
  }

  update(delta: number) {
    const rightGamepad = this.input.xr.gamepads.right
    const gripGroup = this.input.xr.xrOrigin.gripSpaces.right

    // --- Thumbstick Z movement ---
    if (rightGamepad) {
      const thumbstick = rightGamepad.getAxesValues('xr-standard-thumbstick')
      if (thumbstick && Math.abs(thumbstick.y) > 0.1) {
        this.canvasOffsetZ += thumbstick.y * delta * 2.0
        this.canvasOffsetZ = Math.max(-5, Math.min(0, this.canvasOffsetZ))
      }
    }

    // --- Trigger + controller Y movement (disabled while resizing) ---
    if (!this._resizeActive && rightGamepad && gripGroup) {
      if (rightGamepad.getButtonPressed('xr-standard-trigger')) {
        gripGroup.getWorldPosition(this._tmpVec)
        if (this._lastControllerY !== null) {
          this.canvasOffsetY += this._tmpVec.y - this._lastControllerY
        }
        this._lastControllerY = this._tmpVec.y
      } else {
        this._lastControllerY = null
      }
    }

    // --- Resize via handle ---
    if (this._resizeActive && gripGroup && this.rightMesh && this.rightMaterial) {
      if (!rightGamepad || !rightGamepad.getButtonPressed('xr-standard-trigger')) {
        this._resizeActive = false
      } else {
        gripGroup.getWorldPosition(this._tmpVec)
        const dx = this._tmpVec.x - this._resizeStartPos.x
        const dy = this._tmpVec.y - this._resizeStartPos.y
        const newW = Math.max(0.5, this._resizeStartW + dx * 2)
        const newH = Math.max(0.3, this._resizeStartH - dy * 2)
        this.rightMesh.geometry.dispose()
        this.rightMesh.geometry = createCurvedPlane(newW, newH, CURVE_RADIUS, 1.0)
      }
    }

    // --- Position meshes ---
    if (this.leftMesh && this.rightMesh) {
      this.leftMesh.position.z = -2.0 + this.canvasOffsetZ
      this.leftMesh.position.y = 1.5 + this.canvasOffsetY
      this.rightMesh.position.z = -2.0 + this.canvasOffsetZ
      this.rightMesh.position.y = 1.5 + this.canvasOffsetY
    }

    if (this.exitButtonMesh) {
      this.exitButtonMesh.position.z = -2.0 + this.canvasOffsetZ
      this.exitButtonMesh.position.y = 0.15 + this.canvasOffsetY
    }

    if (this.resizeHandleMesh && this.rightMesh) {
      const w = (this.rightMesh.geometry as PlaneGeometry).parameters.width
      const h = (this.rightMesh.geometry as PlaneGeometry).parameters.height
      this.resizeHandleMesh.position.x = 1.0 + w / 2 + 0.08
      this.resizeHandleMesh.position.y = 1.5 - h / 2 - 0.08 + this.canvasOffsetY
      this.resizeHandleMesh.position.z = -2.0 + this.canvasOffsetZ + 0.01
    }

    // --- Hover effects ---
    if (this.resizeHandleMesh) {
      const mat = this.resizeHandleMesh.material as MeshBasicMaterial
      mat.color.setHex(this.queries.hoveredHandle.entities.size > 0 ? 0x3b82f6 : 0x6b7280)
    }

    // --- Favourites canvas render ---
    if (this.favCanvas && this.favTexture) {
      this.queries.favouritesPanel.entities.forEach((entity) => {
        const scrollOffset = entity.getValue(FavouritesPanel, 'scrollOffset') ?? 0
        const hoveredIndex = entity.getValue(FavouritesPanel, 'hoveredIndex') ?? -1

        renderFavouritesCanvas(this.favCanvas!, this.items, hoveredIndex, scrollOffset)
        this.favTexture!.needsUpdate = true
      })
    }

    // --- Video texture ---
    this.queries.videoPanel.entities.forEach((entity) => {
      const isPlaying = entity.getValue(VideoPanel, 'isPlaying')
      if (isPlaying && this.videoTexture) {
        this.videoTexture.needsUpdate = true
      }
    })
  }

  private playStream(hit: Hit) {
    if (!this.videoEl) return

    if (this.mpegtsPlayer) {
      this.mpegtsPlayer.pause()
      this.mpegtsPlayer.unload()
      this.mpegtsPlayer.detachMediaElement()
      this.mpegtsPlayer.destroy()
      this.mpegtsPlayer = null
    }

    this.videoEl.pause()
    this.videoEl.removeAttribute('src')
    this.videoEl.load()

    const contentType = hit.type === 'live_tv' ? 'live' : 'vod'

    if (contentType === 'live' && mpegts.isSupported()) {
      this.mpegtsPlayer = mpegts.createPlayer(
        { type: 'mpegts', url: hit.url, isLive: true, cors: true },
        { enableWorker: true, enableStashBuffer: false, autoCleanupSourceBuffer: true },
      )
      this.mpegtsPlayer.on(mpegts.Events.MEDIA_INFO, (info: any) => {
        console.log('[mpegts VR] audio info:', {
          hasAudio: info.hasAudio,
          audioCodec: info.audioCodec,
          audioChannelCount: info.audioChannelCount,
          audioSampleRate: info.audioSampleRate,
          hasVideo: info.hasVideo,
        })
      })
      this.mpegtsPlayer.on(mpegts.Events.ERROR, (_errorType: any, _errorDetail: any, errorInfo: any) => {
        console.warn('[mpegts VR] player error:', errorInfo)
      })
      this.mpegtsPlayer.attachMediaElement(this.videoEl)
      this.mpegtsPlayer.load()
      this.mpegtsPlayer.play()
    } else {
      this.videoEl.src = hit.url
      this.videoEl.play().catch(() => {})
    }

    this.queries.videoPanel.entities.forEach((entity) => {
      entity.setValue(VideoPanel, 'isPlaying', true)
    })
  }

  destroy() {
    if (this.mpegtsPlayer) {
      this.mpegtsPlayer.pause()
      this.mpegtsPlayer.unload()
      this.mpegtsPlayer.detachMediaElement()
      this.mpegtsPlayer.destroy()
    }
    if (this.videoEl) {
      this.videoEl.pause()
    }
  }
}

export default function VRScene({ favourites }: VRSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<World | null>(null)
  const systemRef = useRef<IPTVSystem | null>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)

  const itemsRef = useRef(buildItemList(favourites))
  useEffect(() => {
    itemsRef.current = buildItemList(favourites)
    if (systemRef.current) {
      systemRef.current.setItems(itemsRef.current)
    }
  }, [favourites])

  const init = useCallback(async () => {
    if (!containerRef.current || worldRef.current) return

    const container = containerRef.current

    const world = await World.create(container, {
      xr: {
        sessionMode: SessionMode.ImmersiveVR,
        offer: 'once',
      },
      render: {
        camera: {
          position: [0, 1.6, 0],
          lookAt: [0, 1.5, -2],
        },
      },
      input: {
        canvasPointerEvents: true,
      },
      features: {
        grabbing: false,
        locomotion: false,
        spatialUI: true,
      },
    })

    worldRef.current = world
    world.scene.background = new Color(0x0a0a1a)

    const favCanvas = document.createElement('canvas')
    favCanvas.width = FAV_CANVAS_W
    favCanvas.height = FAV_CANVAS_H
    const favTexture = new CanvasTexture(favCanvas)
    favTexture.minFilter = LinearFilter

    const favPanelMesh = new Mesh(
      createCurvedPlane(PANEL_WIDTH, PANEL_HEIGHT, CURVE_RADIUS, -1.2),
      new MeshBasicMaterial({ map: favTexture }),
    )
    favPanelMesh.position.set(-1.2, 1.5, -2.0)

    const favEntity = world.createTransformEntity(favPanelMesh)
    favEntity.addComponent(FavouritesPanel)
    favEntity.addComponent(RayInteractable)
    favEntity.addComponent(PokeInteractable)

    const videoEl = document.createElement('video')
    videoEl.setAttribute('playsinline', '')
    videoEl.setAttribute('autoplay', '')
    videoEl.muted = false
    videoEl.style.display = 'none'
    container.appendChild(videoEl)
    videoElRef.current = videoEl

    const videoTexture = new VideoTexture(videoEl)
    videoTexture.minFilter = LinearFilter

    const placeholderCanvas = document.createElement('canvas')
    placeholderCanvas.width = 1280
    placeholderCanvas.height = 720
    const pCtx = placeholderCanvas.getContext('2d')!
    pCtx.fillStyle = '#111827'
    pCtx.fillRect(0, 0, 1280, 720)
    pCtx.fillStyle = '#6b7280'
    pCtx.font = '32px sans-serif'
    pCtx.textAlign = 'center'
    pCtx.fillText('Select a favourite to start playing', 640, 360)
    const placeholderTexture = new CanvasTexture(placeholderCanvas)

    const vidAspect = 16 / 9
    const vidH = PANEL_HEIGHT * 0.75
    const vidW = vidH * vidAspect
    const vidPanelMesh = new Mesh(
      createCurvedPlane(vidW, vidH, CURVE_RADIUS, 1.0),
      new MeshBasicMaterial({ map: placeholderTexture }),
    )
    vidPanelMesh.position.set(1.0, 1.5, -2.0)

    const vidEntity = world.createTransformEntity(vidPanelMesh)
    vidEntity.addComponent(VideoPanel)

    // --- Exit VR button ---
    const exitCanvas = document.createElement('canvas')
    exitCanvas.width = 400
    exitCanvas.height = 80
    const exitCtx = exitCanvas.getContext('2d')!
    exitCtx.fillStyle = '#dc2626'
    exitCtx.fillRect(0, 0, 400, 80)
    exitCtx.fillStyle = '#ffffff'
    exitCtx.font = 'bold 28px sans-serif'
    exitCtx.textAlign = 'center'
    exitCtx.textBaseline = 'middle'
    exitCtx.fillText('Exit VR', 200, 40)
    const exitTexture = new CanvasTexture(exitCanvas)
    exitTexture.minFilter = LinearFilter

    const exitBtnMesh = new Mesh(
      createCurvedPlane(0.5, 0.1, CURVE_RADIUS, -1.2),
      new MeshBasicMaterial({ map: exitTexture, transparent: true }),
    )
    exitBtnMesh.position.set(-1.2, 0.15, -2.0)
    const exitEntity = world.createTransformEntity(exitBtnMesh)
    exitEntity.addComponent(ExitVRButton)
    exitEntity.addComponent(RayInteractable)

    // --- Resize handle ---
    const handleMesh = new Mesh(
      new PlaneGeometry(0.12, 0.12),
      new MeshBasicMaterial({ color: 0x6b7280, transparent: true, opacity: 0.8, depthTest: true, depthWrite: false }),
    )
    handleMesh.renderOrder = 1
    handleMesh.position.set(1.0 + vidW / 2 + 0.08, 1.5 - vidH / 2 - 0.08, -2.0)
    const handleEntity = world.createTransformEntity(handleMesh)
    handleEntity.addComponent(ResizeHandle)
    handleEntity.addComponent(RayInteractable)

    // --- Register components & system ---
    world.registerComponent(FavouritesPanel)
    world.registerComponent(VideoPanel)
    world.registerComponent(ExitVRButton)
    world.registerComponent(ResizeHandle)

    world.registerSystem(IPTVSystem)
    const system = world.getSystem(IPTVSystem) as IPTVSystem
    systemRef.current = system
    system.setItems(itemsRef.current)
    system.setFavCanvas(favCanvas, favTexture)
    system.setVideo(videoEl, videoTexture)
    system.setPanels(favPanelMesh, vidPanelMesh, vidPanelMesh.material as MeshBasicMaterial)
    system.setExitButton(exitBtnMesh)
    system.setExitHandler(() => {
      world.exitXR()
      window.location.href = '/'
    })
    system.setResizeHandle(handleMesh)

    world.launchXR()
  }, [])

  useEffect(() => {
    init()
    return () => {
      if (worldRef.current) {
        worldRef.current.exitXR()
        const renderer = worldRef.current.renderer
        const canvas = renderer.domElement
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas)
        }
        renderer.dispose()
        worldRef.current = null
      }
      if (videoElRef.current) {
        videoElRef.current.pause()
        videoElRef.current.removeAttribute('src')
        videoElRef.current.load()
        if (videoElRef.current.parentNode) {
          videoElRef.current.parentNode.removeChild(videoElRef.current)
        }
        videoElRef.current = null
      }
      systemRef.current = null
    }
  }, [init])

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
}
