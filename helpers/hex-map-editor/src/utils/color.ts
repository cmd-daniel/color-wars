export const colorToNumber = (color: string | null | undefined, fallback = 0x424242): number => {
  if (!color) {
    return fallback;
  }

  const normalized = color.trim().replace("#", "");
  const parsed = Number.parseInt(normalized, 16);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};
