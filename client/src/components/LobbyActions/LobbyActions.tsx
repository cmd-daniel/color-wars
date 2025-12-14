import { useStore } from "@/stores/sessionStore";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

const LobbyActions = () => {
  const navigate = useNavigate()
  const isLeader = useStore((z) => z.state.room.leaderId === z.currentPlayer.id);
  const startGame = useStore((z) => z.startGame);
  const leaveGame = useStore((z) => z.leaveGame);
  const handleLeaveGame = async ()=>{
    await leaveGame()
    navigate('/')
  }
  return (
    <div className="flex flex-col gap-1">
      {isLeader && <Button onClick={startGame}>Start Game</Button>}
      <Button variant="destructive" onClick={handleLeaveGame}>
        Leave Game
      </Button>
    </div>
  );
};

export default LobbyActions;
