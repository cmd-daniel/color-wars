import { useStore } from "@/stores/sessionStore";

const Pinger = ({ playerId }: { playerId: string }) => {
  const ping = useStore((state) => state.state?.playersPings?.[playerId]);
  if (!ping) return null;
  return <span className="text-xs text-muted-foreground absolute bottom-0">{Math.round(ping)} ms</span>;
};

export default Pinger;
