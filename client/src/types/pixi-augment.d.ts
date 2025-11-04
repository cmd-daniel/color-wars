import type { PixiReactElementProps } from '@pixi/react'
import type { Viewport } from 'pixi-viewport'
import type { Application, Renderer, Container } from 'pixi.js'

declare module '@pixi/react' {
  interface PixiElements {
    pixiViewport: PixiReactElementProps<typeof Viewport>
  }
}

declare global {
  // PIXI DevTools support
  var __PIXI_APP__: Application | undefined
  var __PIXI_STAGE__: Container | undefined
  var __PIXI_RENDERER__: Renderer | undefined
}
