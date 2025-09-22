import { ThemeProvider } from '@/components/theme-provider'
import './App.css'

type AppProps = {
  children?:React.ReactNode
}

function App({children}:AppProps) {

  return (
    <ThemeProvider defaultTheme='dark' storageKey='vite-ui-theme'>
      {children}
    </ThemeProvider>
  )
}

export default App
