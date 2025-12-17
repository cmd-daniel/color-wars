import { network } from "@/lib/managers/network";
import { create } from "zustand";
import { devtools, combine } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useStore } from "./sessionStore";
import type { Message } from "@color-wars/shared/src/types/RoomState";

interface ChatStore {
  messages: Message[];
}

export const useChatStore = create(
  devtools(
    immer(
      combine(
        {
          messages: [],
        } as ChatStore,
        (set) => ({
          sendMessage: (message: string) => {
            const trimmedMessage = message.trim();
            if (trimmedMessage) {
              try {
                network.send("SEND_MESSAGE", {
                  senderId: useStore.getState().currentPlayer.id,
                  content: trimmedMessage,
                  timeStamp: Date.now(),
                });
              } catch (error) {
                console.warn(error);
              }
            }
          },
          addMessage: (message: Message) => {
            set((z) => {z.messages.push(message)});
          },
          reset: () => {
            set(useChatStore.getInitialState());
          },
        }),
      ),
    ),
    { name: "chatStore" },
  ),
);
