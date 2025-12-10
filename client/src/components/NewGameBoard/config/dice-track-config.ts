// src/config/dice-track.ts

export type AxialCoord = { q: number; r: number };

// 1. The 34 Tiles (Ordered)
export const TRACK_COORDINATES: AxialCoord[] = [
	{ q: 0, r: 0 },
	{ q: 1, r: -1 },
	{ q: 2, r: -1 },
	{ q: 3, r: -2 },
	{ q: 4, r: -2 },
	{ q: 5, r: -3 },
	{ q: 6, r: -3 },
	{ q: 7, r: -4 },
	{ q: 8, r: -4 },
	{ q: 9, r: -5 },
	{ q: 10, r: -5 },
	{ q: 10, r: -4 },
	{ q: 10, r: -3 },
	{ q: 10, r: -2 },
	{ q: 10, r: -1 },
	{ q: 10, r: 0 },
	{ q: 10, r: 1 },
	{ q: 10, r: 2 },
	{ q: 9, r: 3 },
	{ q: 8, r: 3 },
	{ q: 7, r: 4 },
	{ q: 6, r: 4 },
	{ q: 5, r: 5 },
	{ q: 4, r: 5 },
	{ q: 3, r: 6 },
	{ q: 2, r: 6 },
	{ q: 1, r: 7 },
	{ q: 0, r: 7 },
	{ q: 0, r: 6 },
	{ q: 0, r: 5 },
	{ q: 0, r: 4 },
	{ q: 0, r: 3 },
	{ q: 0, r: 2 },
	{ q: 0, r: 1 },
];

// 2. Inner Edge Spec (Maps Hex Coordinate -> List of Edge Indices to cutout)
// Flat Top Edges: 0=SE, 1=S, 2=SW, 3=NW, 4=N, 5=NE
export const INNER_EDGE_SPEC: Record<string, number[]> = {
	// Top edge
	'0,0': [0], // SE
	'1,-1': [1], // S
	'2,-1': [2, 1, 0], // SW, S, SE
	'3,-2': [1], // S
	'4,-2': [2, 1, 0], // SW, S, SE
	'5,-3': [1], // S
	'6,-3': [2, 1, 0], // SW, S, SE
	'7,-4': [1], // S
	'8,-4': [2, 1, 0], // SW, S, SE
	'9,-5': [1], // S
	'10,-5': [2], // SW

	// Right edge
	'10,-4': [3, 2], // NW, SW
	'10,-3': [3, 2], // NW, SW
	'10,-2': [3, 2], // NW, SW
	'10,-1': [3, 2], // NW, SW
	'10,0': [3, 2], // NW, SW
	'10,1': [3, 2], // NW, SW
	'10,2': [3], // NW

	// Bottom edge
	'9,3': [4], // N
	'8,3': [5, 4, 3], // NE, N, NW
	'7,4': [4], // N
	'6,4': [5, 4, 3], // NE, N, NW
	'5,5': [4], // N
	'4,5': [5, 4, 3], // NE, N, NW
	'3,6': [4], // N
	'2,6': [5, 4, 3], // NE, N, NW
	'1,7': [4], // N
	'0,7': [5], // NE

	// Left edge
	'0,6': [0, 5], // SE, NE
	'0,5': [0, 5], // SE, NE
	'0,4': [0, 5], // SE, NE
	'0,3': [0, 5], // SE, NE
	'0,2': [0, 5], // SE, NE
	'0,1': [0, 5], // SE, NE
};

// 3. Tile Types (Placeholder for now)
export const TILE_TYPES: Record<string, number> = {
	DEFAULT: 0x333333,
	SPECIAL: 0xaa3333,
};
