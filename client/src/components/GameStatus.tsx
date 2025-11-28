import { useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import type { GamePlayer } from "@/stores/sessionStore";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import "./GameStatus.css";

// Available player icons
const PLAYER_ICONS = [
  "🎯",
  "⚔️",
  "🛡️",
  "👑",
  "🏰",
  "🗡️",
  "🎪",
  "🎭",
  "🎨",
  "🎬",
  "🎲",
];

const PLAYER_COLORS = [
  "#D71E22",
  "#1D3CE9",
  "#FF63D4",
  "#FF8D1C",
  "#FFFF67",
  "#4A565E",
  "#5470FF",
  "#1B913E",
  "#80582D",
  "#44FFF7",
  "#6C2B3D",
  "#EC7578"
]

interface GameStatusProps {
  onLeave: () => void;
}

const GameStatus = ({ onLeave }: GameStatusProps) => {
  const {
    roomView,
    sessionId,
    isSpectator,
    setIcon,
    setColor,
    // updateRoomSettings,
    kickPlayer,
    startGame,
  } = useSessionStore();

  const [_, setShowIconSelector] = useState(false);
  // const [maxPlayersInput, setMaxPlayersInput] = useState("");
  // const [startingCashInput, setStartingCashInput] = useState("");
  const [openColor, setOpenColor] = useState(false)
  const [openIcon, setOpenIcon] = useState(false)

  if (!roomView) {
    return null;
  }

  const isLeader = roomView.leaderId === sessionId;
  const isLobbyPhase = roomView.phase === "lobby";

  // Get icons that are already taken
  const takenIcons = roomView.players.map((p) => p.icon).filter(Boolean);
  const availableIcons = PLAYER_ICONS.filter(
    (icon) => !takenIcons.includes(icon)
  );

  const takenColors = roomView.players.map((p) => p.color).filter(Boolean);
  const availableColors = PLAYER_COLORS.filter(
    (color) => !takenColors.includes(color)
  );

  const handleIconSelect = (icon: string) => {
    setIcon(icon);
    setShowIconSelector(false);
  };

  // const handleUpdateMaxPlayers = () => {
  //   const value = parseInt(maxPlayersInput);
  //   if (value >= 1 && value <= 12) {
  //     updateRoomSettings({ maxPlayers: value });
  //     setMaxPlayersInput("");
  //   }
  // };

  // const handleUpdateStartingCash = () => {
  //   const value = parseInt(startingCashInput);
  //   if (value >= 0) {
  //     updateRoomSettings({ startingCash: value });
  //     setStartingCashInput("");
  //   }
  // };

  const handleStartGame = () => {
    // Check if all players have icons
    const playersWithoutIcon = roomView.players.filter((p) => !p.icon);
    if (playersWithoutIcon.length > 0) {
      alert("All players must select an icon before starting");
      return;
    }
    startGame();
  };


  return (
    <div className="game-status">
      {/* Players List */}
      <div className="game-status-players">
        <ul className="players-list">
          {roomView.players.map((player: GamePlayer) => {
            const isYou = player.sessionId === sessionId;
            const isThisLeader = player.sessionId === roomView.leaderId;

            return (
              <li
                key={player.sessionId}
                className={`player-item ${isYou ? "player-item--you" : ""} ${
                  !player.connected ? "player-item--disconnected" : ""
                }`}
              >
                <div className="player-info">
                  <Popover open={openColor} onOpenChange={(open:boolean)=>{setOpenColor(open && isYou)}}>
                    <PopoverTrigger asChild>
                      <span
                        className="player-color"
                        style={{ 
                          backgroundColor: player.color,
                          ...(isYou ? { cursor: "pointer" } : {})
                         }}
                      />
                    </PopoverTrigger>
                    {isLobbyPhase && isYou && <PopoverContent asChild>
                      <div className="color-grid">
                        {availableColors.map((color) => (
                          <button
                            key={color}
                            className="color-option"
                            style={{
                              backgroundColor:color
                            }}
                            onClick={() => setColor(color)}
                          >
                          </button>
                        ))}
                      </div>
                    </PopoverContent>}
                  </Popover>
                  <Popover open={openIcon} onOpenChange={(open:boolean)=>{setOpenIcon(open && isYou)}}>
                    <PopoverTrigger asChild>
                      <span 
                        className="player-icon"
                        style={{ 
                          ...(isYou ? { cursor: "pointer" } : {})
                         }}
                        >{player.icon || "❓"}</span>
                    </PopoverTrigger>
                    {isLobbyPhase && isYou && <PopoverContent asChild>
                      <div className="icon-grid">
                        {availableIcons.map((icon) => (
                          <button
                            key={icon}
                            className="icon-option"
                            onClick={() => handleIconSelect(icon)}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>}
                  </Popover>

                  <span className="player-name">
                    {player.name}
                    {isThisLeader && " 👑"}
                    {isYou && " (You)"}
                    {!player.connected && " [Disconnected]"}
                  </span>
                </div>
                <div className="player-actions">
                  {!isLobbyPhase && (
                    <span className="player-money">${player.money}</span>
                  )}
                  {isLeader && isLobbyPhase && !isYou && (
                    <button
                      className="kick-button"
                      onClick={() => kickPlayer(player.sessionId)}
                      title="Kick player"
                    >
                      ❌
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Actions */}
      <div className="game-status-actions">
        {isLeader && isLobbyPhase && (
          <button className="start-game-button" onClick={handleStartGame}>
            🚀 Start Game
          </button>
        )}
        {isLobbyPhase && (
          <button className="leave-button" onClick={onLeave}>
            Leave Room
          </button>
        )}
      </div>

      {isSpectator && (
        <div className="spectator-notice">👁️ You are spectating</div>
      )}
    </div>
  );
};

export default GameStatus;
