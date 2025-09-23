import { useState, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, FreeMode } from 'swiper/modules'
import type { DiceTrackTile, PlayerPosition } from '@/types/diceTrack'
import { TileType } from '@/types/diceTrack'
import { getTileIcon, getTileBackgroundColor } from '@/lib/diceTrackUtils'
import styles from './DiceTrack.module.css'

// Import Swiper styles - bundle version to avoid module resolution issues
import 'swiper/swiper-bundle.css'

interface DiceTrackProps {
  tiles: DiceTrackTile[]
  playerPositions?: PlayerPosition[]
  onTileClick?: (tile: DiceTrackTile) => void
  currentPlayerId?: string
  isAnimating?: boolean
}

const DiceTrack = ({ tiles, playerPositions = [], onTileClick, currentPlayerId, isAnimating = false }: DiceTrackProps) => {
  const [swiperInstance, setSwiperInstance] = useState<any>(null)

  // Auto-scroll to follow current player
  useEffect(() => {
    if (currentPlayerId && playerPositions.length > 0 && swiperInstance) {
      const currentPlayerPosition = playerPositions.find(p => p.playerId === currentPlayerId)?.position
      if (currentPlayerPosition !== undefined) {
        // Slide to the current player's position (with some offset for better viewing)
        const slideIndex = Math.max(0, currentPlayerPosition - 2)
        swiperInstance.slideTo(slideIndex, 800) // Smooth scroll with 800ms duration
      }
    }
  }, [currentPlayerId, playerPositions, swiperInstance])


  const getPlayersAtPosition = (position: number): PlayerPosition[] => {
    return playerPositions.filter(player => player.position === position)
  }


  const renderTile = (tile: DiceTrackTile) => {
    const playersHere = getPlayersAtPosition(tile.position)
    const isPropertyTile = tile.type === TileType.PROPERTY
    const isCurrentPlayerTile = currentPlayerId && playersHere.some(p => p.playerId === currentPlayerId)
    const currentPlayer = playersHere.find(p => p.playerId === currentPlayerId)

    return (
      <div
        key={tile.id}
        className={`${styles.tile} ${styles[tile.type]} ${isCurrentPlayerTile ? styles.currentPlayerTile : ''} ${isAnimating && isCurrentPlayerTile ? styles.animating : ''}`}
        onClick={() => onTileClick?.(tile)}
        style={{
          background: isPropertyTile && tile.color ? 
            `linear-gradient(135deg, ${tile.color} 0%, ${tile.color}80 100%)` : 
            getTileBackgroundColor(tile.type),
          ...(isCurrentPlayerTile && {
            boxShadow: `0 0 20px ${currentPlayer?.color || '#3b82f6'}80, 0 0 40px ${currentPlayer?.color || '#3b82f6'}40`,
            border: `2px solid ${currentPlayer?.color || '#3b82f6'}`,
            transform: 'scale(1.05)',
            zIndex: 10
          })
        }}
      >
        <div className={styles.tileHeader}>
          <span className={styles.tileIcon}>{getTileIcon(tile.type)}</span>
          <span className={styles.tilePosition}>{tile.position + 1}</span>
        </div>
        
        <div className={styles.tileContent}>
          <h4 className={styles.tileTitle}>{tile.title}</h4>
          {tile.value !== undefined && (
            <div className={styles.tileValue}>
              {tile.type === TileType.PENALTY_CHEST ? '-' : '+'}${tile.value}
            </div>
          )}
          {tile.description && (
            <p className={styles.tileDescription}>{tile.description}</p>
          )}
        </div>

        {/* Player indicators */}
        {playersHere.length > 0 && (
          <div className={styles.playersContainer}>
            {playersHere.map((player, playerIndex) => (
              <div
                key={player.playerId}
                className={styles.playerIndicator}
                style={{
                  backgroundColor: player.color,
                  transform: `translateX(${playerIndex * 8}px)`
                }}
                title={player.playerName}
              >
                {player.playerName.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (tiles.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading dice track...</p>
      </div>
    )
  }

  return (
    <div className={styles.diceTrackContainer}>

      <div className={styles.swiperContainer}>
        <Swiper
          modules={[Navigation, FreeMode]}
          slidesPerView="auto"
          loop={true}
          loopAdditionalSlides={6}
          // Enhanced drag physics
          grabCursor={true}
          simulateTouch={true}
          // FreeMode - using only valid Swiper.js parameters
          freeMode={true}
          // Speed and smoothness
          speed={600}
          navigation={{
            nextEl: `.${styles.swiperButtonNext}`,
            prevEl: `.${styles.swiperButtonPrev}`,
          }}
          onSwiper={setSwiperInstance}
          className={styles.swiper}
        >
          {tiles.map((tile) => (
            <SwiperSlide key={tile.id} className={styles.swiperSlide}>
              <div className={styles.tileContainer}>
                {renderTile(tile)}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom navigation buttons */}
        <div className={`${styles.swiperButtonPrev} ${styles.swiperButton}`}>
          ←
        </div>
        <div className={`${styles.swiperButtonNext} ${styles.swiperButton}`}>
          →
        </div>

      </div>

      <div className={styles.legendContainer}>
        <div className={styles.legendItem}>
          <span>🏰 Property</span>
        </div>
        <div className={styles.legendItem}>
          <span>💰 Treasure</span>
        </div>
        <div className={styles.legendItem}>
          <span>🎁 Surprise</span>
        </div>
        <div className={styles.legendItem}>
          <span>💸 Penalty</span>
        </div>
        <div className={styles.legendItem}>
          <span>🎲 Roll Again</span>
        </div>
      </div>
    </div>
  )
}

export default DiceTrack
