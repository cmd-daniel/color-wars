import { useEffect, useRef } from 'react'
import styles from './PixiViewport.module.css'
import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js'
import { Viewport } from 'pixi-viewport'

/**
 * Create visual content for the PixiJS viewport
 */
const createVisualContent = (viewport: Viewport) => {
  console.log('Creating visual content for viewport')
  
  // Create a container for all visual elements
  const contentContainer = new Container()
  viewport.addChild(contentContainer)
  
  console.log('Content container created and added to viewport')

  // Create some colorful circles
  const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0xf0932b, 0xeb4d4b]
  
  for (let i = 0; i < 20; i++) {
    const circle = new Graphics()
    const color = colors[i % colors.length]
    const size = 20 + Math.random() * 30
    const x = (Math.random() - 0.5) * 1500
    const y = (Math.random() - 0.5) * 1500
    
    circle.circle(0, 0, size)
    circle.fill(color)
    circle.stroke({ width: 2, color: 0xffffff, alpha: 0.8 })
    circle.x = x
    circle.y = y
    
    // Add some rotation animation
    circle.rotation = Math.random() * Math.PI * 2
    
    contentContainer.addChild(circle)
  }
  
  console.log(`Created ${contentContainer.children.length} circles`)

  // Create some text elements
  const textStyle = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 24,
    fill: 0xffffff,
    stroke: { width: 2, color: 0x000000 },
    dropShadow: {
      color: 0x000000,
      blur: 4,
      angle: Math.PI / 6,
      distance: 6,
    },
  })

  const titleText = new Text({
    text: 'PixiJS Viewport',
    style: textStyle,
  })
  titleText.x = -100
  titleText.y = -200
  contentContainer.addChild(titleText)

  const instructionText = new Text({
    text: 'Drag to pan • Scroll to zoom',
    style: new TextStyle({
      fontFamily: 'Arial',
      fontSize: 16,
      fill: 0xcccccc,
    }),
  })
  instructionText.x = -80
  instructionText.y = -160
  contentContainer.addChild(instructionText)

  // Create a grid pattern
  const gridGraphics = new Graphics()
  gridGraphics.stroke({ width: 1, color: 0x333333, alpha: 0.3 })
  
  for (let x = -1000; x <= 1000; x += 50) {
    gridGraphics.moveTo(x, -1000)
    gridGraphics.lineTo(x, 1000)
  }
  
  for (let y = -1000; y <= 1000; y += 50) {
    gridGraphics.moveTo(-1000, y)
    gridGraphics.lineTo(1000, y)
  }
  
  contentContainer.addChild(gridGraphics)

  // Add some animated elements
  const animatedCircle = new Graphics()
  animatedCircle.circle(0, 0, 40)
  animatedCircle.fill(0xff6b6b)
  animatedCircle.stroke({ width: 3, color: 0xffffff })
  animatedCircle.x = 0
  animatedCircle.y = 0
  contentContainer.addChild(animatedCircle)
  
  // Add a simple test rectangle that should be visible
  const testRect = new Graphics()
  testRect.rect(-50, -50, 100, 100)
  testRect.fill(0x00ff00)
  testRect.stroke({ width: 2, color: 0xffffff })
  testRect.x = 200
  testRect.y = 200
  contentContainer.addChild(testRect)
  
  console.log('Added test rectangle at (200, 200)')

  // Animation loop
  let time = 0
  const animate = () => {
    time += 0.02
    
    // Animate the circle
    animatedCircle.x = Math.sin(time) * 200
    animatedCircle.y = Math.cos(time * 0.7) * 150
    animatedCircle.rotation += 0.01
    
    // Animate other circles
    contentContainer.children.forEach((child, index) => {
      if (child instanceof Graphics && child !== animatedCircle) {
        child.rotation += 0.005 * (index % 3 + 1)
      }
    })
    
    requestAnimationFrame(animate)
  }
  
  animate()
}

/**
 * PixiViewport Component
 * 
 * This component demonstrates how to integrate PixiJS with Viewport
 * for the hollow center area of the HollowGrid.
 * 
 * Note: You'll need to install the required dependencies:
 * npm install pixi.js pixi-viewport
 */
interface PixiViewportProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

const PixiViewport: React.FC<PixiViewportProps> = ({ containerRef }) => {
  const pixiAppRef = useRef<Application | null>(null)
  const viewportRef = useRef<Viewport | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize PixiJS
    const initPixi = async () => {
      const app = new Application()
      await app.init({
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        backgroundColor: 0x1a1a2e,
        antialias: true
      })

      // Set event mode for the stage
      app.stage.eventMode = 'static'

      // Create viewport
      const viewport = new Viewport({
        screenWidth: app.screen.width,
        screenHeight: app.screen.height,
        worldWidth: 2000,
        worldHeight: 2000,
        events: app.renderer.events
      })

      app.stage.addChild(viewport)

      // Configure viewport interactions
      viewport
        .drag()
        .pinch()
        .wheel()
        .decelerate()
        .clampZoom({
          minScale: 0.5,
          maxScale: 3
        })

      // Add some visual content to the viewport
      createVisualContent(viewport)
      
      // Center the viewport
      viewport.moveCenter(0, 0)
      
      console.log('PixiJS initialized with viewport:', viewport)

      // Style the canvas to fill the container
      app.canvas.style.width = '100%'
      app.canvas.style.height = '100%'
      app.canvas.style.display = 'block'
      app.canvas.style.position = 'absolute'
      app.canvas.style.top = '0'
      app.canvas.style.left = '0'
      app.canvas.style.zIndex = '1'

      // Add to container
      containerRef.current!.appendChild(app.canvas)

      // Store references
      pixiAppRef.current = app
      viewportRef.current = viewport

      // Add resize handler
      const handleResize = () => {
        if (app && containerRef.current) {
          app.renderer.resize(
            containerRef.current.clientWidth,
            containerRef.current.clientHeight
          )
          if (viewport) {
            viewport.resize(
              containerRef.current.clientWidth,
              containerRef.current.clientHeight
            )
          }
        }
      }

      window.addEventListener('resize', handleResize)

      return app
    }

    let app: Application | null = null

    initPixi().then((initializedApp) => {
      app = initializedApp
    })

    return () => {
      if (app) {
        window.removeEventListener('resize', () => {})
        app.destroy(true)
      }
    }
  }, [containerRef])

  return (
    <div className={styles.pixiViewport}>
      {/* PixiJS canvas will be rendered here */}
    </div>
  )
}

export default PixiViewport
