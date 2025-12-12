import { useState } from "react";
import { useStore } from "@/stores/sessionStore";
import Pinger from "@components/Pinger";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import "./GameStatus.css";

// Available player icons
const PLAYER_ICONS = ["🎯", "⚔️", "🛡️", "👑", "🏰", "🗡️", "🎪", "🎭", "🎨", "🎬", "🎲"];

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
  "#EC7578",
];

const GameStatus = (/*{ onLeave }: GameStatusProps*/) => {
  const sessionId = useStore((z) => z.currentPlayer.id);
  const leaderId = useStore((z) => z.state.room?.leaderId);
  const roomPhase = useStore((z) => z.state.room?.phase);
  const players = useStore((z) => z.state.game.players);

  // const [maxPlayersInput, setMaxPlayersInput] = useState("");
  // const [startingCashInput, setStartingCashInput] = useState("");
  const [openColor, setOpenColor] = useState(false);
  const [openIcon, setOpenIcon] = useState(false);

  // if (!sessionId) {
  //   return null;
  // }
  const isLeader = leaderId === sessionId;
  const isLobbyPhase = roomPhase === "lobby";

  // Get icons that are already taken
  const takenIcons = Object.values(players)
    .map((p) => p.icon)
    .filter(Boolean);
  const availableIcons = PLAYER_ICONS.filter((icon) => !takenIcons.includes(icon));

  const takenColors = Object.values(players)
    .map((p) => p.color)
    .filter(Boolean);
  const availableColors = PLAYER_COLORS.filter((color) => !takenColors.includes(color));

  return (
    <div className="flex w-full justify-center p-4">
      <ul className="bg-secondary flex w-full max-w-[420px] flex-col gap-2 rounded-lg p-4">
        {Object.values(players).map((player) => {
          const isYou = player.id === sessionId;
          const isThisLeader = player.id === leaderId;
          return (
            <li
              key={player.id}
              className={`bg-secondary/10 flex items-center justify-between rounded-lg px-3 py-2 transition-opacity ${!player.connected ? "opacity-40" : ""} `}
            >
              {/* LEFT SIDE — Player Info */}
              <div className="flex h-full items-center gap-3">
                {/* Color Picker */}
                <Popover
                  open={openColor}
                  onOpenChange={(open: boolean) => {
                    setOpenColor(open && isYou);
                  }}
                >
                  <PopoverTrigger asChild>
                    <span
                      className={`h-full w-3 self-stretch rounded-[2px] border ${isYou ? "cursor-pointer" : ""} `}
                      style={{ backgroundColor: player.color }}
                    />
                  </PopoverTrigger>

                  {isLobbyPhase && isYou && (
                    <PopoverContent asChild>
                      <div className="grid grid-cols-5 gap-2 p-2">
                        {availableColors.map((color) => (
                          <button
                            key={color}
                            className="h-6 w-6 rounded-full border transition hover:scale-110"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  )}
                </Popover>

                {/* Icon Picker */}
                <Popover
                  open={openIcon}
                  onOpenChange={(open: boolean) => {
                    setOpenIcon(open && isYou);
                  }}
                >
                  <PopoverTrigger asChild>
                    <span className={`text-lg select-none ${isYou ? "cursor-pointer" : ""} `}>
                      {player.icon || "❓"}
                    </span>
                  </PopoverTrigger>

                  {isLobbyPhase && isYou && (
                    <PopoverContent asChild>
                      <div className="grid grid-cols-6 gap-2 p-2">
                        {availableIcons.map((icon) => (
                          <button key={icon} className="text-xl transition hover:scale-110">
                            {icon}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  )}
                </Popover>

                {/* Player Name */}
                <span className="text-sm font-medium text-white">
                  {player.name}
                  {isYou && " (You)"}
                  {isThisLeader && " 👑"}
                  {!player.connected && " [Disconnected]"}
                </span>
              </div>

              {/* RIGHT SIDE — Player Actions */}
              <div className="flex items-center gap-2">
                {!isLobbyPhase && (
                  <span className="text-sm font-semibold tabular-nums">${player.money}</span>
                )}

                {isLeader && isLobbyPhase && !isYou && (
                  <button className="" title="Kick player">
                    ❌
                  </button>
                )}

                <Pinger playerId={player.id} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default GameStatus;
