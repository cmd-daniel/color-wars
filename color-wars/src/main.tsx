import React from 'react'
import { createRoot } from 'react-dom/client'
import HexGrid from '@/components/HexGrid.tsx'
import GameStatus from '@/components/GameStatus.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(

    <App>
      <GameStatus/>
      <HexGrid/>
    </App>
)
