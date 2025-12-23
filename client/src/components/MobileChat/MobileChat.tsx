"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chatStore";
import { gsap } from "gsap";
import { Send } from "lucide-react";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { MessageItem } from "./MessageItem";
import { PreviewTicker } from "./PreviewTicker";
export default function ChatInterface() {
  // 1. Store State
  const messages = useChatStore((state) => state.messages);
  const sendMessage = useChatStore((state) => state.sendMessage);

  // 2. Local State
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // 3. Refs
  const previewTextRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  // 4. GSAP Animation: Scroll up effect for new messages in the preview bar
  useEffect(() => {
    if (previewTextRef.current && lastMessage && !isOpen) {
      // Kill previous animations on this element to prevent conflicts
      gsap.killTweensOf(previewTextRef.current);

      // Animate: Start slightly below and transparent, move to natural position
      gsap.fromTo(previewTextRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" });
    }
  }, [lastMessage, isOpen]);

  useEffect(() => {
    if (isOpen) {
      // slight timeout to allow drawer animation/keyboard resize to finish
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      // slight timeout to allow drawer animation/keyboard resize to finish
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue("");
    // Keep focus on input after sending for rapid chatting
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <Drawer open={isOpen} fixed onOpenChange={setIsOpen} disablePreventScroll={true} repositionInputs={false}>
      {/* 
        The Trigger acts as the "Fixed Bottom Bar" 
        It is visible when the drawer is closed.
      */}
      <DrawerTrigger asChild>
        {/* <div className="hover:bg-accent/10 w-full cursor-pointer p-4 transition-colors">
          <div className="mx-auto flex w-full items-center gap-1">
            <div className="bg-primary/10 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
              <CircleUserRound size={20} />
            </div>

            <div className="flex h-10 flex-1 items-center overflow-hidden">
              {lastMessage ? (
                <div ref={previewTextRef} className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs font-bold">{lastMessage.senderId}</span>:<span className="text-foreground flex-1 truncate text-sm">{lastMessage.content}</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">Click to send message</span>
              )}
            </div>
          </div>
        </div> */}
        <div className="w-full h-full px-2 flex items-center">
          <PreviewTicker message={lastMessage} isOpen={isOpen}/>
        </div>
      </DrawerTrigger>

      {/* 
        The Drawer Content (Expanded View) 
        This overlays the bottom bar when opened.
      */}
      <DrawerContent className="fixed bottom-0 left-0 right-0 flex h-[45dvh] flex-col rounded-[10px] outline-none">
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden">
          <DrawerHeader className="border-b">
            <DrawerTitle>Live Chat</DrawerTitle>
          </DrawerHeader>

          {/* Messages List */}
          <div className="min-h-0 flex-1 overflow-y-scroll p-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex flex-col gap-4 pb-4">
              {messages.map((msg, index) => 
                // Determine if the message is from the current user (optional logic if you have currentUserId)
                // For now, we just list them.
                <MessageItem message={msg} key={`${msg.timeStamp}-${index}`}/>
              )}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area (Replaces bottom bar visual) */}
          <DrawerFooter className="bg-background z-50 shrink-0 border-t pt-2 pb-6">
            <div className="flex w-full items-center space-x-2">
              <Input placeholder="Type a message..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} className="flex-1" autoFocus />
              <Button onClick={handleSend} onPointerDown={(e) => e.preventDefault()} size="icon" disabled={!inputValue.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
