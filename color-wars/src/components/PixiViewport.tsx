import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Application, extend, useApplication } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import styles from './PixiViewport.module.css'

extend({ Container, Graphics, Viewport })

interface PixiViewportProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

const BACKGROUND_COLOR = 0x0b1120

const InteractiveViewport = ({
  width,
  height,
  children,
}: {
  width: number
  height: number
  children: ReactNode
}) => {
  const { app } = useApplication()
  const viewportRef = useRef<Viewport | null>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    viewport.options.events = app.renderer.events
    viewport.options.ticker = app.ticker
    viewport.drag().wheel().decelerate().clampZoom({ minScale: 0.5, maxScale: 3 })
    viewport.resize(width, height, width, height)
    viewport.moveCenter(width / 2, height / 2)

    return () => {
      viewport.plugins.removeAll()
    }
  }, [app.renderer.events, app.ticker, width, height])

  return (
    <pixiViewport
      ref={viewportRef}
      screenWidth={width}
      screenHeight={height}
      worldWidth={width}
      worldHeight={height}
      events={app.renderer.events}
      ticker={app.ticker}
    >
      {children}
    </pixiViewport>
  )
}

const buildPlaceholderTokens = (width: number, height: number) => {
  const radius = Math.min(width, height) * 0.3
  return new Array(4).fill(null).map((_, index) => {
    const angle = (Math.PI * 2 * index) / 4
    return {
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
      color: [0xf97316, 0x22d3ee, 0x34d399, 0xf43f5e][index % 4],
    }
  })
}

const PixiViewport = ({ containerRef }: PixiViewportProps) => {
  const [size, setSize] = useState({ width: 480, height: 480 })

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({
        width: Math.max(240, Math.round(width)),
        height: Math.max(240, Math.round(height)),
      })
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [containerRef])

  const tokens = useMemo(() => buildPlaceholderTokens(size.width, size.height), [size.width, size.height])

  if (!containerRef.current) {
    return <div className={styles.loading}>Preparing viewport…</div>
  }

  return (
    <div className={styles.container}>
      <Application
        width={size.width}
        height={size.height}
        antialias
        background={BACKGROUND_COLOR}
        eventMode="static"
      >
        <InteractiveViewport width={size.width} height={size.height}>
          <pixiContainer>
            <pixiGraphics
              draw={(graphics: Graphics) => {
                graphics.clear()
                const baseRadius = Math.min(size.width, size.height)
                graphics.circle(size.width / 2, size.height / 2, baseRadius * 0.42)
                graphics.fill({ color: 0x1f2937, alpha: 0.6 })
                graphics.circle(size.width / 2, size.height / 2, baseRadius * 0.45)
                graphics.stroke({ width: 4, color: 0x334155 })
              }}
            />
            {tokens.map((token, index) => (
              <pixiGraphics
                key={index}
                draw={(graphics: Graphics) => {
                  graphics.clear()
                  graphics.circle(token.x, token.y, 14)
                  graphics.fill({ color: token.color })
                  graphics.circle(token.x, token.y, 14)
                  graphics.stroke({ width: 2, color: 0xffffff })
                }}
              />
            ))}
            <pixiGraphics
              draw={(graphics: Graphics) => {
                graphics.clear()
                const radius = Math.min(size.width, size.height) * 0.45
                for (let i = 0; i < 24; i += 1) {
                  const angle = (Math.PI * 2 * i) / 24
                  const x = size.width / 2 + Math.cos(angle) * radius
                  const y = size.height / 2 + Math.sin(angle) * radius
                  graphics.moveTo(size.width / 2, size.height / 2)
                  graphics.lineTo(x, y)
                }
                graphics.stroke({ width: 1, color: 0x475569, alpha: 0.6 })
              }}
            />
            <pixiGraphics
              draw={(graphics: Graphics) => {
                graphics.clear()
                graphics.circle(size.width / 2, size.height / 2, Math.min(size.width, size.height) * 0.55)
                graphics.stroke({ width: 2, color: 0x93c5fd })
              }}
            />
            <pixiGraphics
              draw={(graphics: Graphics) => {
                graphics.clear()
                graphics.rect(size.width / 2 - 120, 24, 240, 48)
                graphics.fill({ color: 0x0f172a, alpha: 0.9 })
                graphics.rect(size.width / 2 - 120, 24, 240, 48)
                graphics.stroke({ width: 1, color: 0x1d4ed8, alpha: 0.6 })
              }}
            />
            <pixiContainer>
              <pixiGraphics
                draw={(graphics: Graphics) => {
                  graphics.clear()
                  graphics.rect(0, 0, 1, 1)
                  graphics.fill({ color: 0xffffff })
                }}
                visible={false}
              />
            </pixiContainer>
          </pixiContainer>
        </InteractiveViewport>
      </Application>
    </div>
  )
}

export default PixiViewport
