import { useState } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useDiceTrackStore } from "@/stores/diceTrackStore";
import { TRACK_COORDINATES } from "../config/dice-track-config";
import { HexHop, IncrMoney } from "@/actions/actions";

// ------------------------------------------------------------------
// 1. MOCK STORE
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// 2. SUB-COMPONENTS
// ------------------------------------------------------------------

/** Section 1: Add Player */
const AddPlayerSection = () => {
  const tokens = useDiceTrackStore((state) => state.tokens);
  const upsertToken = useDiceTrackStore((state) => state.upsertToken);
  const [selectedTile, setSelectedTile] = useState<string>("");

  //   function testAnimation() {
  //     // 1. Find the target (The Hex at 0,0 on the dice track)
  //     const targetSprite = pixiTargetLocator.get<Sprite>("unit-1");
  //     GameEventBus.emit("UPDATE_ANIMATION_SPEED", {
  //       speedMultiplier: 2,
  //     });
  //     if (targetSprite) {
  //       network.actionQueue.enqueue(new HexHop({ fromTile: 0, toTile: 17 }));
  //     } else {
  //       console.error("Sprite not found in registry");
  //     }
  //   }

  const handleAdd = () => {
    if (selectedTile) {
      const tokenNumber = Object.values(tokens).length;
      upsertToken({ id: `unit-${tokenNumber}`, tileId: selectedTile, color: 0x4450d4 });
    }
  };

  let tiles = Array.from({ length: 34 }, (_, index) => index);

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">Spawn Player</Label>
      <div className="flex gap-2">
        <Select value={selectedTile} onValueChange={setSelectedTile}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Select Spawn Tile" />
          </SelectTrigger>
          <SelectContent>
            {tiles.map((tile) => (
              <SelectItem key={tile} value={`track-tile-${tile}`} className="text-xs">
                {`track-tile-[${tile}]`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={!selectedTile} size="sm" className="h-8 w-8 shrink-0 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

/** Section 2: Remove Player */
const RemovePlayerSection = () => {
  const tokens = useDiceTrackStore((state) => state.tokens);
  const removeToken = useDiceTrackStore((state) => state.removeToken);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  const handleRemove = () => {
    if (selectedPlayer) {
      removeToken(selectedPlayer);
      setSelectedPlayer("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">Remove Player</Label>
      <div className="flex gap-2">
        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Select Player" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(tokens).length === 0 ? (
              <div className="text-muted-foreground p-2 text-center text-xs">No players active</div>
            ) : (
              Object.values(tokens).map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.id}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button onClick={handleRemove} disabled={!selectedPlayer} variant="destructive" size="sm" className="h-8 w-8 shrink-0 p-0">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

/** Section 2: Remove Player */
const ActivatePlayerSection = () => {
  const tokens = useDiceTrackStore((state) => state.tokens);
  const activateToken = useDiceTrackStore((state) => state.setActiveToken);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  const handleActivate = () => {
    if (selectedPlayer) {
      if (selectedPlayer === "null") activateToken(null);
      activateToken(selectedPlayer);
      setSelectedPlayer("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">Activate Player</Label>
      <div className="flex gap-2">
        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Select Player" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="none" value="null" className="text-xs">
              None
            </SelectItem>
            {Object.values(tokens).map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleActivate} disabled={!selectedPlayer} variant="destructive" size="sm" className="h-8 w-8 shrink-0 p-0">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

/** Section 3: Move Player (Player + From + To) */
const MovePlayerSection = () => {
  const tokens = useDiceTrackStore((state) => state.tokens);
  let tiles = Array.from({ length: 34 }, (_, index) => index);

  const [targetPlayer, setTargetPlayer] = useState<string>("");
  const [fromTile, setFromTile] = useState<string>("");
  const [toTile, setToTile] = useState<string>("");

  // Auto-fill 'From' tile when player is selected (Optional UX improvement)
  const handlePlayerSelect = (pid: string) => {
    setTargetPlayer(pid);
    const player = Object.values(tokens).find((p) => p.id === pid);
    if (player) {
      setFromTile(player.tileId);
    }
  };

  const handleMove = () => {
    if (targetPlayer && fromTile && toTile) {
      new HexHop({ fromTile: Number(fromTile), toTile: Number(toTile), tokenId: targetPlayer }).execute();
    }
  };

  const isValid = targetPlayer && fromTile && toTile && fromTile !== toTile;

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">Force Move</Label>

      {/* Row 1: Who */}
      <div className="flex w-full items-center gap-2">
        <Select value={targetPlayer} onValueChange={handlePlayerSelect}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Select Player to Move" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(tokens).map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Where (From -> To) */}
      <div className="flex w-full items-center justify-between gap-2">
        <Select value={fromTile} onValueChange={setFromTile}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="From" />
          </SelectTrigger>
          <SelectContent>
            {tiles.map((t) => (
              <SelectItem key={t} value={`${t}`} className="text-xs">
                {`track-tile-[${t}]`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ArrowRight className="text-muted-foreground h-3 w-3" />

        <Select value={toTile} onValueChange={setToTile}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="To" />
          </SelectTrigger>
          <SelectContent>
            {tiles.map((t) => (
              <SelectItem key={t} value={`${t}`} className="text-xs">
                {`track-tile-[${t}]`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleMove} disabled={!isValid} className="mt-1 h-8 w-full text-xs" variant="secondary">
        Execute Move
      </Button>
    </div>
  );
};

const AnimateMoney = () => {
  const [selectedTile, setSelectedTile] = useState<string>("");

  //   function testAnimation() {
  //     // 1. Find the target (The Hex at 0,0 on the dice track)
  //     const targetSprite = pixiTargetLocator.get<Sprite>("unit-1");
  //     GameEventBus.emit("UPDATE_ANIMATION_SPEED", {
  //       speedMultiplier: 2,
  //     });
  //     if (targetSprite) {
  //       network.actionQueue.enqueue(new HexHop({ fromTile: 0, toTile: 17 }));
  //     } else {
  //       console.error("Sprite not found in registry");
  //     }
  //   }

  const handleAnimate = () => {
    if (selectedTile) {
      new IncrMoney({ playerId: "unit-0", amount: 50 }).execute();
    }
  };

  let tiles = Array.from({ length: 34 }, (_, index) => index);

  return (
    <div className="flex flex-col gap-2 pb-20">
      <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">Animate Coins</Label>
      <div className="flex gap-2">
        <Select value={selectedTile} onValueChange={setSelectedTile}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Select Spawn Tile" />
          </SelectTrigger>
          <SelectContent>
            {tiles.map((tile) => (
              <SelectItem key={tile} value={`track-tile-${tile}`} className="text-xs">
                {`track-tile-[${tile}]`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button id="animattion" onClick={handleAnimate} disabled={!selectedTile} size="sm" className="h-8 w-8 shrink-0 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 3. MAIN COMPONENT
// ------------------------------------------------------------------

export const DebugGameControls = () => {
  const clear = useDiceTrackStore((s) => s.clear);

  return (
    <div className="z-50 mb-4 h-[200px] w-full overflow-y-scroll shadow-2xl duration-300 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Card className="bg-background/95 supports-backdrop-filter:bg-background/80 border-orange-200/50 backdrop-blur">
        <CardContent className="flex flex-col gap-4">
          <Button onClick={clear} className="mt-1 h-8 w-full text-xs" variant="destructive">
            Reset
          </Button>
          <Separator />
          <ActivatePlayerSection />
          <Separator />
          <AddPlayerSection />
          <Separator />
          <RemovePlayerSection />
          <Separator />
          <MovePlayerSection />
          <Separator />
          <AnimateMoney />
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugGameControls;
