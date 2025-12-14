import { useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/stores/sessionStore";
import TurnControls from "@/components/TurnControls";
import GameStatus from "@/components/GameStatus";
import { useNetworkStore } from "@/stores/networkStore";
import { useCountdown } from "@/hooks/useCountdown";
import LobbyActions from "@/components/LobbyActions";
import ActionArea from "@/components/ActionArea";
import { PixiCanvas } from "@/components/NewGameBoard/components/PixiCanvas";

const RoomPage = () => {
  const navigate = useNavigate();
  const { state: networkState, autoReconnect } = useNetworkStore();
  const roomPhase = useStore((z) => z.state.room?.phase);
  const tryAutoReconnect = useStore((z) => z.tryAutoReconnect);
  const reconnectionToken = useStore((z) => z.room.reconnectionToken);
  const { remainingSeconds } = useCountdown(autoReconnect.nextRetryAt);

  useLayoutEffect(() => {
    const tryReconnect = async () => {
      await tryAutoReconnect();
    };
    if (networkState === "disconnected") {
      if (reconnectionToken) tryReconnect();
      else navigate("/");
    } else {
      //happy path
    }
    return () => {
      console.log("unmount");
    };
  }, []);

  if (networkState === "connecting" || networkState === "reconnecting") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-4xl">Connecting to room...</p>
      </div>
    );
  }

  if (autoReconnect.inprogress && autoReconnect.attempt < 3) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-4xl">connection lost. retrying in {remainingSeconds}s...</p>
      </div>
    );
  }

  if (networkState === "disconnected") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex h-full w-full flex-col items-center justify-center">
          <h1 className="text-4xl">Connection Lost</h1>
          <button className="bg-secondary mt-4 rounded-md p-4" onClick={() => navigate("/")}>
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Show spectator banner if in spectator mode
  //   const spectatorBanner = isSpectator && (
  //     <div className="room-spectator-banner">
  //       <span>👁️ Spectator Mode - {isGameActive ? 'Watching the game' : 'Room is full or game already started'}</span>
  //     </div>
  //   )

  // Show game board + GameStatus component for both lobby and active phases

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <div className="w-full max-w-[720px]">
        <PixiCanvas />
        <GameStatus />

        <ActionArea>
          {roomPhase === "active" && <TurnControls />}
          {roomPhase === "lobby" && <LobbyActions />}
        </ActionArea>
      </div>
    </div>
  );
};

export default RoomPage;
