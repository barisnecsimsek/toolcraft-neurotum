/*
 * Adapted from samasante/liquid-glass (MIT License, Copyright (c) 2026 Sam Asante).
 * The algorithm is the same rounded-rect SDF displacement map: R/G encode X/Y
 * displacement around neutral 0.5 and B encodes the specular mask.
 */

export type LiquidGlassLensMapShape = {
  bend: number;
  bendWidth: number;
  borderRadius: number;
  clipToShape: boolean;
  curvature: number;
  depth: number;
  glow: number;
  glowFalloff: number;
  glowSpread: number;
  lensHalfHeight: number;
  lensHalfWidth: number;
  sheen: number;
  sheenAngle: number;
  sheenFalloff: number;
  sheenWidth: number;
  softEdge: boolean;
  splay: number;
};

export type LiquidGlassLensMapGenerator = {
  dispose(): void;
  generate(shape: LiquidGlassLensMapShape): HTMLCanvasElement;
};

export const liquidGlassDispersionSpread = 0.22;

const erfK = Math.sqrt(Math.PI);
const erf = (x: number): number => Math.tanh(erfK * x);

type DomeConstants = {
  Rx: number;
  Ry: number;
  scaleX: number;
  scaleY: number;
};

function domeGradientMean(radius: number, halfExtent: number): number {
  return halfExtent > 0
    ? (radius - Math.sqrt(radius * radius - halfExtent * halfExtent)) /
        halfExtent
    : 0;
}

function computeDomeConstants(
  capDepth: number,
  halfW: number,
  halfH: number,
): DomeConstants {
  const cap = Math.max(0.01, Math.min(capDepth, Math.min(halfW, halfH) - 1));
  const rx = (halfW * halfW + cap * cap) / (2 * cap);
  const ry = (halfH * halfH + cap * cap) / (2 * cap);
  const meanX = domeGradientMean(rx, halfW);
  const meanY = domeGradientMean(ry, halfH);

  return {
    Rx: rx,
    Ry: ry,
    scaleX: meanX > 0 ? 0.5 / meanX : 1,
    scaleY: meanY > 0 ? 0.5 / meanY : 1,
  };
}

function domeGradient(distance: number, radius: number, scale: number): number {
  const inside = Math.min(distance, radius * (1 - 1e-3));

  return (inside / Math.sqrt(radius * radius - inside * inside)) * scale;
}

const encodeAxis = (signed: number): number => ((0.5 + signed) * 255 + 0.5) | 0;
const encodeSpec = (spec: number): number => (127 * spec + 128 + 0.5) | 0;

export function createLiquidGlassLensMapGenerator(
  size: number,
): LiquidGlassLensMapGenerator {
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let image: ImageData | null = null;
  let domeLut: Float32Array | null = null;
  let lutDome = -Infinity;
  let lutHalfW = -Infinity;
  let lutHalfH = -Infinity;
  let lutLength = 0;
  let lutDirty = true;
  let dome: DomeConstants | null = null;

  return {
    dispose() {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      canvas = null;
      context = null;
      image = null;
      domeLut = null;
      lutDome = -Infinity;
      lutHalfW = -Infinity;
      lutHalfH = -Infinity;
      lutLength = 0;
      lutDirty = true;
      dome = null;
    },
    generate(shape) {
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        context = canvas.getContext("2d", { willReadFrequently: true });

        if (!context) {
          throw new Error("Liquid glass displacement map requires Canvas 2D.");
        }

        image = context.createImageData(size, size);
      }

      const data = image!.data;
      const half = size >> 1;
      const halfW = Math.max(1, shape.lensHalfWidth);
      const halfH = Math.max(1, shape.lensHalfHeight);
      const radius = Math.min(shape.borderRadius, Math.min(halfW, halfH));
      const minHalf = Math.min(halfW, halfH);
      const depthPx = Math.min(shape.depth * minHalf, minHalf - 1);
      const innerHalfW = Math.max(0, halfW - depthPx);
      const innerHalfH = Math.max(0, halfH - depthPx);
      const innerRadius = Math.max(
        0,
        Math.min(shape.borderRadius, Math.min(innerHalfW, innerHalfH)),
      );
      const falloff = depthPx > 0 ? Math.SQRT1_2 / depthPx : 1e6;
      const hasSpecular = shape.glow > 0 || shape.sheen > 0;
      const angle = (shape.sheenAngle * Math.PI) / 180;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const edgeInv = shape.sheenWidth > 0 ? 1 / shape.sheenWidth : 0;
      const glowReachInv =
        1 / Math.max(2, shape.glowSpread * Math.min(halfW, halfH));
      const stepX = (2 * halfW) / size;
      const stepY = (2 * halfH) / size;
      const invW = 1 / halfW;
      const invH = 1 / halfH;
      const hasDome = shape.curvature > 0;
      const domeCap = shape.curvature * Math.min(halfW, halfH);
      const hasSplay = shape.splay > 0;
      const hasEdgeRefract = shape.bend > 0;
      const erInv = 1 / Math.max(2, shape.bendWidth * Math.min(halfW, halfH));

      const cornerDistance = (ox: number, oy: number): number =>
        ox > 0 || oy > 0 ? Math.sqrt(ox * ox + oy * oy) : 0;

      if (hasDome) {
        if (
          !dome ||
          Math.abs(domeCap - lutDome) > 0.5 ||
          Math.abs(halfW - lutHalfW) > 1 ||
          Math.abs(halfH - lutHalfH) > 1
        ) {
          dome = computeDomeConstants(domeCap, halfW, halfH);
          lutDome = domeCap;
          lutHalfW = halfW;
          lutHalfH = halfH;
          lutDirty = true;
        }

        if (lutLength !== half) {
          domeLut = new Float32Array(half);
          lutLength = half;
          lutDirty = true;
        }

        if (lutDirty) {
          const lut = domeLut!;
          const d = dome!;
          const r2 = d.Rx * d.Rx;
          const rMax = d.Rx * (1 - 1e-3);

          for (let col = 0; col < half; col += 1) {
            const px = -((col + 0.5) * stepX - halfW);
            const clamped = px < rMax ? px : rMax;
            lut[col] =
              (clamped / Math.sqrt(r2 - clamped * clamped)) * d.scaleX;
          }

          lutDirty = false;
        }
      }

      const lut = hasDome ? domeLut : null;
      const splayHalf = 0.5 * Math.min(halfW, halfH);
      const splayInv = splayHalf > 0 ? 1 / splayHalf : 0;
      const sheenNorm = Math.SQRT1_2;

      for (let row = 0; row < half; row += 1) {
        const mirrorRow = size - 1 - row;
        const py = -((row + 0.5) * stepY - halfH);
        const edgeY = py - halfH + radius;
        const innerEdgeY = shape.softEdge ? py - innerHalfH + innerRadius : 0;
        const dirYBase =
          hasDome && lut
            ? domeGradient(py, dome!.Ry, dome!.scaleY)
            : py * invH > 1
              ? 1
              : py * invH;
        const normY = py * invH > 1 ? 1 : py * invH;
        const splayY = hasSplay ? Math.max(0, 1 - (halfH - py) * splayInv) : 0;
        const rowBase = row * size;
        const mirrorRowBase = mirrorRow * size;

        for (let col = 0; col < half; col += 1) {
          const mirrorCol = size - 1 - col;
          const px = -((col + 0.5) * stepX - halfW);
          const edgeX = px - halfW + radius;
          const sdf =
            cornerDistance(edgeX > 0 ? edgeX : 0, edgeY > 0 ? edgeY : 0) +
            (edgeX > edgeY ? (edgeX > 0 ? 0 : edgeX) : edgeY > 0 ? 0 : edgeY) -
            radius;
          const i00 = (rowBase + col) * 4;
          const i01 = (rowBase + mirrorCol) * 4;
          const i10 = (mirrorRowBase + col) * 4;
          const i11 = (mirrorRowBase + mirrorCol) * 4;

          if (shape.clipToShape && sdf >= 0) {
            for (const idx of [i00, i01, i10, i11]) {
              data[idx] = 128;
              data[idx + 1] = 128;
              data[idx + 2] = 128;
              data[idx + 3] = 255;
            }
            continue;
          }

          let dirX = lut ? lut[col] : px * invW > 1 ? 1 : px * invW;
          let dirY = dirYBase;

          if (hasSplay) {
            const yAtt = splayY * shape.splay;
            const xAtt = Math.max(0, 1 - (halfW - px) * splayInv) * shape.splay;

            if (yAtt > 0.001 || xAtt > 0.001) {
              const prevX = dirX;
              const prevY = dirY;
              dirX = prevX * (1 - yAtt);
              dirY = prevY * (1 - xAtt);
              const prevLen = Math.sqrt(prevX * prevX + prevY * prevY);
              const nextLen = Math.sqrt(dirX * dirX + dirY * dirY);

              if (nextLen > 0.001) {
                const restore = prevLen / nextLen;
                dirX *= restore;
                dirY *= restore;
              }
            }
          }

          let edgeOpacity = 1;

          if (shape.softEdge) {
            const ix = px - innerHalfW + innerRadius;
            const innerSdf =
              cornerDistance(ix > 0 ? ix : 0, innerEdgeY > 0 ? innerEdgeY : 0) +
              (ix > innerEdgeY
                ? ix > 0
                  ? 0
                  : ix
                : innerEdgeY > 0
                  ? 0
                  : innerEdgeY) -
              innerRadius;
            edgeOpacity = 0.5 * (1 + erf(innerSdf * falloff));
          }

          let dx = 0.5 * dirX * edgeOpacity;
          let dy = 0.5 * dirY * edgeOpacity;

          if (hasEdgeRefract) {
            const s = sdf < 0 ? Math.max(0, 1 + sdf * erInv) : 0;

            if (s > 0) {
              const len = Math.sqrt(dirX * dirX + dirY * dirY);

              if (len > 1e-4) {
                const m = 6.75 * s * s * (1 - s);
                const a = (0.5 * shape.bend * m * edgeOpacity) / len;
                dx += dirX * a;
                dy += dirY * a;
              }
            }
          }

          let specMain = 0;
          let specCross = 0;

          if (hasSpecular) {
            const normX = px * invW > 1 ? 1 : px * invW;
            const axisMain = Math.min(
              1,
              Math.abs(normX * cosA + normY * sinA) * sheenNorm,
            );
            const axisCross = Math.min(
              1,
              Math.abs(normX * cosA - normY * sinA) * sheenNorm,
            );

            if (shape.sheen > 0) {
              const band = sdf < 0 ? Math.max(0, 1 + sdf * edgeInv) : 0;
              const b = shape.sheen * Math.pow(band, shape.sheenFalloff);
              specMain += b * (0.16 + 0.84 * Math.pow(axisMain, 1.6));
              specCross += b * (0.16 + 0.84 * Math.pow(axisCross, 1.6));
            }

            if (shape.glow > 0) {
              const reach = sdf < 0 ? Math.min(1, -sdf * glowReachInv) : 1;
              const t = 1 - reach;
              const g =
                shape.glow *
                Math.pow(t * t * (3 - 2 * t), shape.glowFalloff) *
                edgeOpacity;
              specMain += g * (0.6 + 0.4 * axisMain);
              specCross += g * (0.6 + 0.4 * axisCross);
            }

            specMain = Math.max(-1, Math.min(1, specMain));
            specCross = Math.max(-1, Math.min(1, specCross));
          }

          const rPos = encodeAxis(dx);
          const rNeg = encodeAxis(-dx);
          const gPos = encodeAxis(dy);
          const gNeg = encodeAxis(-dy);
          const bMain = encodeSpec(specMain);
          const bCross = encodeSpec(specCross);

          data[i00] = rPos;
          data[i00 + 1] = gPos;
          data[i00 + 2] = bMain;
          data[i00 + 3] = 255;
          data[i01] = rNeg;
          data[i01 + 1] = gPos;
          data[i01 + 2] = bCross;
          data[i01 + 3] = 255;
          data[i10] = rPos;
          data[i10 + 1] = gNeg;
          data[i10 + 2] = bCross;
          data[i10 + 3] = 255;
          data[i11] = rNeg;
          data[i11 + 1] = gNeg;
          data[i11 + 2] = bMain;
          data[i11 + 3] = 255;
        }
      }

      context!.putImageData(image!, 0, 0);
      return canvas;
    },
  };
}
