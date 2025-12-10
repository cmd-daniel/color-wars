// src/utils/color-utils.ts

/**
 * Parses "hsl(205 65% 55%)" or "hsl(205, 65%, 55%)" to a hex number 0xRRGGBB
 */
export function hslStringToHex(hslString: string): number {
    const sep = hslString.indexOf(",") > -1 ? "," : " ";
    const parts = hslString
      .substring(4, hslString.length - 1)
      .split(sep)
      .map((s) => parseFloat(s));
  
    if (parts.length < 3) return 0xffffff;
  
    const h = parts[0];
    const s = parts[1];
    const l = parts[2];
  
    return hslToHex(h, s, l);
  }
  
  function hslToHex(h: number, s: number, l: number): number {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    return parseInt(`0x${f(0)}${f(8)}${f(4)}`, 16);
  }