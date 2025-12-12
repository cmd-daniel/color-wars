//networkStore.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { NetworkState } from "@/lib/managers/network";

interface NetworkSlice {
  state: NetworkState;
  autoReconnect: {
    inprogress: boolean;
    attempt: number;
    nextRetryAt: number | null;
  };
  setConnectionState: (state: NetworkState) => void;
}

export const useNetworkStore = create<NetworkSlice>()(
  subscribeWithSelector((set) => ({
    state: "disconnected",
    autoReconnect: {
      inprogress: false,
      attempt: 0,
      nextRetryAt: null,
    },
    setConnectionState: (state: NetworkState) => {
      set({ state });
    },
  })),
);
