import { create } from "zustand";

type TimeSyncState = {
  serverTimeOffset: number;
  setServerTimeOffset: (offset: number) => void;
};

export const timeSyncStore = create<TimeSyncState>((set) => ({
  serverTimeOffset: 0,
  setServerTimeOffset: (offset) => set({ serverTimeOffset: offset }),
}));

export function getSyncedNow() {
  return Date.now() + timeSyncStore.getState().serverTimeOffset;
}
