import { useNavigate } from "react-router-dom";
import { useStore } from "@/stores/sessionStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Gamepad2, Zap } from "lucide-react";
import { PixiCanvas } from "@/components/NewGameBoard/components/PixiCanvas";

const LobbyPage = () => {
  const playerName = useStore((z) => z.room.playerName);
  const setPlayerName = useStore((z) => z.setPlayerName);
  const quickMatch = useStore((z) => z.quickMatch);

  const navigate = useNavigate();

  const handleQuickMatch = async () => {
    console.log("[LobbyPage] handleQuickMatch called");
    try {
      const roomId = await quickMatch();
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error("Error in quick match:", error);
    }
  };

  return (
    <div className="bg-background relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-4 font-sans selection:bg-cyan-500/30">
      <div className="z-10 w-full max-w-md space-y-8 md:space-y-10">
        <div className="relative space-y-8">
          <Gamepad2 className="absolute top-3.5 left-3 h-5 w-5 text-zinc-500 group-focus-within:text-cyan-500" />
          <Input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Player Name"
            className="bg-background h-12 border-zinc-800 pl-10 text-lg text-zinc-100 focus-visible:border-cyan-500 focus-visible:ring-0"
          />

          <Button className="h-12 w-full" onClick={handleQuickMatch}>
            PLAY NOW
            <Zap className="h-4 w-4 fill-black transition-transform group-hover/btn:rotate-12 group-hover/btn:fill-white" />
          </Button>
        </div>
      </div>
      <div className="h-full w-full">
        <PixiCanvas />
      </div>
    </div>
  );
};

export default LobbyPage;
