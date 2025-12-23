import type { TileType } from "@color-wars/shared/src/config/diceTrack";

export const TILE_STYLE: Record<
  TileType,
  {
    fill: number;
    stroke: number;
    icon: string;
    label: string;
    textColor: number;
  }
> = {
  START: {
    fill: 0x0ea5e9,
    stroke: 0xe0f2fe,
    icon: "🚀",
    label: "START",
    textColor: 0xffffff,
  },
  SAFE: {
    fill: 0x2d2d2d,
    stroke: 0x4b5563,
    icon: "",
    label: "",
    textColor: 0xffffff,
  },
  INCOME: {
    fill: 0x14532d,
    stroke: 0x22c55e,
    icon: "💰",
    label: "INCOME",
    textColor: 0xbef264,
  },
  TAX: {
    fill: 0x450a0a,
    stroke: 0xef4444,
    icon: "💸",
    label: "TAX",
    textColor: 0xfca5a5,
  },
  REWARD: {
    fill: 0x1e293b,
    stroke: 0x3b82f6,
    icon: "🎁",
    label: "REWARD",
    textColor: 0x93c5fd,
  },
  PENALTY: {
    fill: 0x3c1d1d,
    stroke: 0xf87171,
    icon: "⚠️",
    label: "PENALTY",
    textColor: 0xfecaca,
  },
  SURPRISE: {
    fill: 0x312e81,
    stroke: 0xa78bfa,
    icon: "❓",
    label: "SURPRISE",
    textColor: 0xddd6fe,
  },
};
