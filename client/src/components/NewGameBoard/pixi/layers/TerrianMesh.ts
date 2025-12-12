// src/pixi/layers/TerrainMesh.ts
import * as PIXI from "pixi.js";
import type { AxialHex } from "../engine"; // Adjust path as needed

export class TerrainMesh extends PIXI.Container {
  private mesh: PIXI.Mesh<PIXI.Geometry, PIXI.Shader> | null = null;
  private hexIndexMap = new Map<string, number>();
  private colorBuffer: Float32Array | null = null;

  constructor() {
    super();
  }

  init(hexes: AxialHex[], hexSize: number, texture: PIXI.Texture) {
    this.clear();

    const totalHexes = hexes.length;

    // --- 1. Allocate Buffers ---
    const verts = new Float32Array(totalHexes * 4 * 2); // 4 verts * 2 pos
    const uvs = new Float32Array(totalHexes * 4 * 2); // 4 verts * 2 uv
    const colors = new Float32Array(totalHexes * 4 * 4); // 4 verts * 4 rgba
    const indices = new Uint32Array(totalHexes * 6); // 2 triangles

    // --- 2. Math & Loop (Same as before) ---
    const width = hexSize * Math.sqrt(3);
    const height = hexSize * 2;
    const w2 = width / 2;
    const h2 = height / 2;

    let vPtr = 0,
      iPtr = 0,
      vertexCount = 0;

    for (let i = 0; i < totalHexes; i++) {
      const hex = hexes[i];
      this.hexIndexMap.set(`${hex.q},${hex.r}`, i);

      const cx = width * (hex.q + hex.r / 2);
      const cy = hexSize * 1.5 * hex.r;

      // Verts (TL, TR, BR, BL)
      verts[vPtr++] = cx - w2;
      verts[vPtr++] = cy - h2;
      verts[vPtr++] = cx + w2;
      verts[vPtr++] = cy - h2;
      verts[vPtr++] = cx + w2;
      verts[vPtr++] = cy + h2;
      verts[vPtr++] = cx - w2;
      verts[vPtr++] = cy + h2;

      // UVs
      uvs[i * 8 + 0] = 0;
      uvs[i * 8 + 1] = 0;
      uvs[i * 8 + 2] = 1;
      uvs[i * 8 + 3] = 0;
      uvs[i * 8 + 4] = 1;
      uvs[i * 8 + 5] = 1;
      uvs[i * 8 + 6] = 0;
      uvs[i * 8 + 7] = 1;

      // Indices
      const offset = vertexCount;
      indices[iPtr++] = offset + 0;
      indices[iPtr++] = offset + 1;
      indices[iPtr++] = offset + 2;
      indices[iPtr++] = offset + 0;
      indices[iPtr++] = offset + 2;
      indices[iPtr++] = offset + 3;
      vertexCount += 4;

      // Colors (Init white)
      const cStart = i * 16;
      for (let k = 0; k < 16; k++) colors[cStart + k] = 1;
    }

    this.colorBuffer = colors;

    // --- 3. FIX: V8 Geometry Construction ---
    const geometry = new PIXI.Geometry({
      attributes: {
        aPosition: { buffer: verts, size: 2 },
        aUV: { buffer: uvs, size: 2 },
        aColor: { buffer: colors, size: 4 }, // We define aColor here
      },
      indexBuffer: indices,
    });

    // --- 4. FIX: Custom Shader for Vertex Colors ---
    // Standard Pixi Mesh sometimes ignores aColor unless we explicitly tell it to use it.
    const shader = PIXI.Shader.from({
      gl: {
        vertex: `
          attribute vec2 aPosition;
          attribute vec2 aUV;
          attribute vec4 aColor;

          uniform mat3 uProjectionMatrix;
          uniform mat3 uWorldTransformMatrix;
          uniform mat3 uTransformMatrix;

          varying vec2 vUV;
          varying vec4 vColor;

          void main() {
              mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
              gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
              vUV = aUV;
              vColor = aColor;
          }
        `,
        fragment: `
          varying vec2 vUV;
          varying vec4 vColor;
          uniform sampler2D uTexture;

          void main() {
              gl_FragColor = texture2D(uTexture, vUV) * vColor;
          }
        `,
      },
      resources: {
        uTexture: texture.source, // V8 requires the source
      },
    });

    this.mesh = new PIXI.Mesh({
      geometry,
      shader,
    });

    this.addChild(this.mesh);
  }

  setHexColor(q: number, r: number, color: number) {
    if (!this.mesh || !this.colorBuffer) return;

    const index = this.hexIndexMap.get(`${q},${r}`);
    if (index === undefined) return;

    const red = ((color >> 16) & 0xff) / 255;
    const green = ((color >> 8) & 0xff) / 255;
    const blue = (color & 0xff) / 255;

    let ptr = index * 16;
    for (let i = 0; i < 4; i++) {
      this.colorBuffer[ptr++] = red;
      this.colorBuffer[ptr++] = green;
      this.colorBuffer[ptr++] = blue;
      this.colorBuffer[ptr++] = 1;
    }

    // In V8, we access buffer via the attribute name
    this.mesh.geometry.getAttribute("aColor").buffer.update();
  }

  clear() {
    if (this.mesh) {
      this.mesh.destroy();
      this.mesh = null;
    }
    this.hexIndexMap.clear();
    this.colorBuffer = null;
  }
}
