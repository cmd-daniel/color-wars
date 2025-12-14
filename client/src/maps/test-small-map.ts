export const TEST_SMALL_MAP = {
  id: "test-small",
  grid: {
    orientation: "pointy",
    hexSize: 40,
    origin: { q: 0, r: 0 },
  },

  hexes: [
    // --- Territory A (center cluster) ---
    { q: 0, r: 0, s: 0, stateId: "A" },
    { q: 1, r: 0, s: -1, stateId: "A" },
    { q: 0, r: 1, s: -1, stateId: "A" },
    { q: -1, r: 1, s: 0, stateId: "A" },
    { q: -1, r: 0, s: 1, stateId: "A" },
    { q: 0, r: -1, s: 1, stateId: "A" },
    { q: 1, r: -1, s: 0, stateId: "A" },

    // --- Territory B (side blob) ---
    { q: 3, r: 0, s: -3, stateId: "B" },
    { q: 3, r: 1, s: -4, stateId: "B" },
    { q: 4, r: 0, s: -4, stateId: "B" },
    { q: 4, r: 1, s: -5, stateId: "B" },
    { q: 2, r: 1, s: -3, stateId: "B" },
    { q: 2, r: 0, s: -2, stateId: "B" },
  ],
};
