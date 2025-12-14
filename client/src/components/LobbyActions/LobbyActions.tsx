import { useStore } from "@/stores/sessionStore";
import { useMapStore } from "@/stores/mapStateStore";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

const LobbyActions = () => {
  const navigate = useNavigate()
  const isLeader = useStore((z) => z.state.room.leaderId === z.currentPlayer.id);
  const startGame = useStore((z) => z.startGame);
  const leaveGame = useStore((z) => z.leaveGame);
  const setTerritoryColor = useMapStore((z) => z.setTerritoryColor);
  const handleLeaveGame = async ()=>{
    await leaveGame()
    navigate('/')
  }

  const ff = ()=>{
    setTerritoryColor('intn', '#ff0000')
  }
  return (
    <div className="flex flex-col gap-1">
      {isLeader && <Button onClick={startGame}>Start Game</Button>}
      <Button variant="destructive" onClick={handleLeaveGame}>
        Leave Game
      </Button>
      <Button variant="outline" onClick={ff}>
        Set Territory Color
      </Button>
    </div>
  );
};

export default LobbyActions;
