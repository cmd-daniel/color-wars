export const hexPolygonCommands = (points: { x: number; y: number }[]) =>
  points.flatMap((point) => [point.x, point.y])
