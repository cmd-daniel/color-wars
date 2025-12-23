import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import Pinger from "./Pinger";
import { useState, useRef } from "react";
import type { PlainStateOf, PlayerState } from "@color-wars/shared/src/types/RoomState";
import { useStore } from "@/stores/sessionStore";
import { PLAYER } from "@color-wars/shared/src/config/game";
import gsap from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import Counter from "./Money";

function PickerPopover({ open, setOpen, enabled, trigger, children }: { open: boolean; setOpen: (v: boolean) => void; enabled: boolean; trigger: React.ReactNode; children: React.ReactNode }) {
  return (
    <Popover open={open} onOpenChange={(v) => setOpen(v && enabled)}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      {enabled && <PopoverContent asChild>{children}</PopoverContent>}
    </Popover>
  );
}

const Player = ({ player }: { player: PlainStateOf<PlayerState> }) => {
  const [openColor, setOpenColor] = useState(false);
  const [openIcon, setOpenIcon] = useState(false);
  const sessionId = useStore((z) => z.currentPlayer.id);
  const leaderId = useStore((z) => z.state.room.leaderId);
  const isLobbyPhase = useStore((z) => z.state.room.phase == "lobby");
  const players = useStore((z) => z.state.game.players);
  const kickPlayer = useStore((z) => z.kickPlayer);
  const ref = useRef<HTMLLIElement>(null);

  const handleKickPlayer = () => {
    kickPlayer(player.id);
  };

  useGSAP(() => {
    const tl = gsap.timeline()
    tl.from(ref.current, {
      x: 800,
      delay: 0.2,
      duration: 0.25,
      ease: "power2.out",
    })
  });

  // useEffect(() => {
  //   if (!ref.current) return;
  //   const ctx = gsap.context(() => {
  //     gsap.from(ref.current, {
  //       x: 800,
  //       delay: 0.2,
  //       duration: 0.25,
  //       ease: "power2.out",
  //     });
  //   });
  //   return () => ctx.revert();
  // }, []);

  const takenIcons = Object.values(players)
    .map((p) => p.icon)
    .filter(Boolean);
  const availableIcons = PLAYER.ICONS.filter((icon) => !takenIcons.includes(icon));

  const takenColors = Object.values(players)
    .map((p) => p.color)
    .filter(Boolean);
  const availableColors = PLAYER.COLORS.filter((color) => !takenColors.includes(color));

  const isYou = player.id === sessionId;
  const isLeader = player.id === leaderId;
  const leaderAccess = leaderId === sessionId;
  return (
    <li ref={ref} className={`player bg-secondary/10 relative flex items-center justify-between rounded-lg px-3 py-2 transition-opacity ${!player.connected ? "opacity-40" : ""}`}>
      {/* LEFT — Player Info */}
      <div className="flex h-full items-center gap-3">
        {/* Color Picker */}
        <PickerPopover
          open={openColor}
          setOpen={setOpenColor}
          enabled={isLobbyPhase && isYou}
          trigger={<span className={`h-full w-3 self-stretch rounded-[2px] border ${isYou ? "cursor-pointer" : ""}`} style={{ backgroundColor: player.color }} />}
        >
          <div className="grid grid-cols-5 gap-2 p-2">
            {availableColors.map((color) => (
              <button key={color} className="h-6 w-6 rounded-full border transition hover:scale-110" style={{ backgroundColor: color }} />
            ))}
          </div>
        </PickerPopover>

        {/* Icon Picker */}
        <PickerPopover
          open={openIcon}
          setOpen={setOpenIcon}
          enabled={isLobbyPhase && isYou}
          trigger={<span className={`text-lg select-none ${isYou ? "cursor-pointer" : ""}`}>{player.icon || "❓"}</span>}
        >
          <div className="grid grid-cols-6 gap-2 p-2">
            {availableIcons.map((icon) => (
              <button key={icon} className="text-xl transition hover:scale-110">
                {icon}
              </button>
            ))}
          </div>
        </PickerPopover>

        {/* Name */}
        <span className="text-sm font-medium text-white">
          {player.name}
          {isYou && " (You)"}
          {isLeader && " 👑"}
          {!player.connected && " [Disconnected]"}
        </span>
      </div>

      {/* RIGHT — Actions */}
      <div className="flex items-center gap-2">
        {!isLobbyPhase && <Counter playerId={player.id} />}

        {leaderAccess && isLobbyPhase && !isYou && (
          <button onClick={handleKickPlayer} title="Kick player">
            ❌
          </button>
        )}

        <Pinger playerId={player.id} />
      </div>
    </li>
  );
};

export default Player;
