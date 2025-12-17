import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { CircleUserRound } from "lucide-react";
import { useStore } from "@/stores/sessionStore"; // Adjust path to your session store
import type { Message } from "@color-wars/shared/src/types/RoomState";
import { getTextColor } from "@/lib/utils";

const TickerItem = ({ message }: { message: Message }) => {
    const player = useStore((z) =>
      // @ts-ignore 
      z.state.game.players ? z.state.game.players[message.senderId] : null,
    );
  
    const color = player?.color || "#64748b";
    const name = player?.name || message.senderId;
  
    return (
      <div className="flex w-full h-full items-center gap-2 px-2">
        {/* Avatar */}
        <div className="shrink-0">
          <CircleUserRound className="h-6 w-6 rounded-full" style={{ color: getTextColor(color), background: color }} />
        </div>
  
        {/* 
           Text Wrapper: 
           1. flex-1: Takes up remaining width 
           2. min-w-0: CRITICAL. Allows the child text to truncate properly. 
        */}
        <div className="flex flex-1 items-center min-w-0 gap-1">
          
          {/* Name: prevents wrapping so it stays solid */}
          <span 
              className="text-sm font-bold whitespace-nowrap shrink-0" 
              style={{ color: color }}
          >
              {name}
          </span>
  
          <span className=" text-xs shrink-0 mr-2">:</span>
  
          {/* Message: truncate will now work because parent has min-w-0 */}
          <span className="text-sm truncate w-full text-foreground">
              {message.content}
          </span>
          
        </div>
      </div>
    );
  };

interface PreviewTickerProps {
  message: Message | null;
  isOpen: boolean;
}

export function PreviewTicker({ message, isOpen }: PreviewTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Local state to track transition between old and new message
  const [activeMsg, setActiveMsg] = useState<Message | null>(message);
  const [prevMsg, setPrevMsg] = useState<Message | null>(null);

  // 1. Sync Props to State
  useEffect(() => {
    // If the message object actually changed
    if (message !== activeMsg) {
      setPrevMsg(activeMsg); // The current one becomes "previous"
      setActiveMsg(message); // The new one becomes "active"
    }
  }, [message, activeMsg]);

  // 2. GSAP Animation Logic
  useEffect(() => {
    // Only animate if drawer is CLOSED (user is watching the ticker)
    if (!containerRef.current || isOpen) return;

    if (activeMsg) {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        // Slide Old Message UP and OUT
        if (prevMsg) {
          tl.to(
            ".prev-msg",
            {
              y: -20,
              opacity: 0,
              duration: 0.3,
            },
            0,
          );
        }

        // Slide New Message UP and IN
        tl.fromTo(
          ".active-msg",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4 },
          0, // Start simultaneously
        );
      }, containerRef);

      return () => ctx.revert();
    }
  }, [activeMsg, prevMsg, isOpen]);

  // Empty State
  if (!activeMsg && !prevMsg) {
    return (
      <div className="text-muted-foreground flex h-10 items-center justify-center w-full gap-3">
        <span className="text-sm">Click to send message</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden pointer-events-none">
      {/* We render both items absolutely so they can overlap during the animation */}

      {prevMsg && (
        <div className="prev-msg absolute top-0 left-0 w-full h-full">
          <TickerItem message={prevMsg} />
        </div>
      )}

      {activeMsg && (
        <div className="active-msg absolute top-0 left-0 w-full h-full">
          <TickerItem message={activeMsg} />
        </div>
      )}
    </div>
  );
}
