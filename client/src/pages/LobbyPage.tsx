import { useNavigate } from 'react-router-dom'
import { useStore } from '@/stores/sessionStore'
import { Input, } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Gamepad2, Zap } from 'lucide-react'

const LobbyPage = () => {
  const playerName = useStore((z) => z.room.playerName)
  const setPlayerName = useStore((z) => z.setPlayerName)
  const quickMatch = useStore((z) => z.quickMatch)

  const navigate = useNavigate()

  const handleQuickMatch = async () => {
    console.log('[LobbyPage] handleQuickMatch called')
    try {
      const roomId = await quickMatch()
      navigate(`/room/${roomId}`)
    } catch (error) {
      console.error('Error in quick match:', error)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4 font-sans selection:bg-cyan-500/30">
      
      {/* <AmbientBackground /> */}
      <div className="z-10 w-full max-w-md space-y-8 md:space-y-10">
        
        {/* Interaction Section */}
        <div className="space-y-8 relative">
            <Gamepad2 className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500 group-focus-within:text-cyan-500" />
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Player Name"
              className="h-12 border-zinc-800 bg-background pl-10 text-lg text-zinc-100 focus-visible:border-cyan-500 focus-visible:ring-0"
            />

            <Button className='w-full h-12' onClick={handleQuickMatch}>
              PLAY NOW
              <Zap className="h-4 w-4 fill-black transition-transform group-hover/btn:rotate-12 group-hover/btn:fill-white" />
            </Button>
          </div>
      </div>
    </div>
  );
}

export default LobbyPage

