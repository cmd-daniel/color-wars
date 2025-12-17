import { useStore } from "@/stores/sessionStore";
import type { Message } from "@color-wars/shared/src/types/RoomState";
import { cn, getTextColor } from "@/lib/utils";
import { CircleUserRound } from "lucide-react";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const currentPlayerId = useStore((z) => z.currentPlayer?.id);
  const isMe = currentPlayerId === message.senderId;

  // Retrieve sender info for color
  const sender = useStore((z) => 
    // @ts-ignore
    z.state.game.players ? z.state.game.players[message.senderId] : null
  );
  const senderName = sender?.name || message.senderId;
  const senderColor = sender?.color || "currentColor";

  return (
    <div className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
      <div className={cn("flex flex-col max-w-[80%]", isMe ? "items-end" : "items-start")}>
        
        {/* Name Label (Only for others) */}
        {!isMe && (
          <span 
            className="text-sm font-bold mb-1 ml-1 opacity-80 flex items-center gap-2" 
            style={{ color: senderColor !== "currentColor" ? senderColor : undefined }}
          >
            <CircleUserRound className="h-6 w-6 rounded-full" style={{ color: getTextColor(senderColor), background: senderColor }} />
            {senderName}
          </span>
        )}
        
        <div
          className={cn(
            "px-4 py-2 text-sm break-words shadow-sm",
            isMe 
              ? "bg-primary text-primary-foreground rounded-xl rounded-tr-xs" 
              : "ml-10 bg-secondary text-secondary-foreground rounded-xl rounded-tl-xs"
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}