import Player from "./Player";
import { useStore } from "@/stores/sessionStore";
import { useAnimatedList } from "@/hooks/useAnimatedList";

const GameStatus = () => {
  const players = useStore((z) => z.state.game.players);

  const playerList = Object.values(players);

  const listRef = useAnimatedList(playerList, {
    duration: 0.25,
    stagger: 0.04,
  });

  return (
    <div className="flex w-full justify-center p-4">
      <ul
        ref={listRef}
        className="bg-secondary flex w-full flex-col gap-2 overflow-hidden rounded-lg p-4"
      >
        {Object.values(players).map((player) => (
          <Player key={player.id} player={player} />
        ))}
      </ul>
    </div>
  );
};

export default GameStatus;
