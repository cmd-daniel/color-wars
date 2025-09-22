import { useState, useEffect } from 'react'

export type ScreenSize = 'mobile' | 'tablet' | 'desktop-medium' | 'desktop-large'

export const useScreenSize = (): ScreenSize => {
  const [screenSize, setScreenSize] = useState<ScreenSize>('mobile')

  useEffect(() => {
    const getScreenSize = (): ScreenSize => {
      const width = window.innerWidth
      if (width < 600) return 'mobile'
      if (width < 1100) return 'tablet'
      if (width < 1366) return 'desktop-medium'
      return 'desktop-large'
    }

    const handleResize = () => {
      setScreenSize(getScreenSize())
    }

    // Set initial size
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return screenSize
}
