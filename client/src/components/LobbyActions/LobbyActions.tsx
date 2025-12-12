import { useStore } from "@/stores/sessionStore";
import { Button } from "../ui/button";

const LobbyActions = () => {
  const isLeader = useStore((z) => z.state.room.leaderId === z.currentPlayer.id);
  const startGame = useStore((z) => z.startGame);
  const leaveGame = useStore((z) => z.leaveGame);

  return (
    <div className="flex flex-col gap-1">
      {isLeader && <Button onClick={startGame}>Start Game</Button>}
      <Button variant="destructive" onClick={leaveGame}>
        Leave Game
      </Button>
    </div>
  );
};

export default LobbyActions;
