import { frozenSourceTriangleLimit } from "../src/app/frozen/frozen-model";

const stlCache = new Map<number, Buffer>();

export function getFrozenSourceTriangleCount(appliedValue: string): number {
  if (appliedValue === "small-stl") return 12;
  if (appliedValue === "maximum-stl") return frozenSourceTriangleLimit;
  throw new Error(`Unknown Frozen source fixture ${appliedValue}.`);
}

export function createFrozenStlBuffer(triangleCount: number): Buffer {
  const cached = stlCache.get(triangleCount);
  if (cached) return cached;
  const cellCount = Math.ceil(triangleCount / 2);
  const columns = Math.ceil(Math.sqrt(cellCount));
  const rows = Math.ceil(cellCount / columns);
  const cellWidth = 2 / columns;
  const cellHeight = 2 / rows;
  const buffer = Buffer.allocUnsafe(84 + triangleCount * 50);
  buffer.fill(0, 0, 80);
  buffer.writeUInt32LE(triangleCount, 80);
  for (let index = 0; index < triangleCount; index += 1) {
    const cellIndex = Math.floor(index / 2);
    const column = cellIndex % columns;
    const row = Math.floor(cellIndex / columns);
    const x0 = -1 + column * cellWidth;
    const y0 = -1 + row * cellHeight;
    const x1 = x0 + cellWidth;
    const y1 = y0 + cellHeight;
    const z00 = Math.sin(column * 0.31 + row * 0.23) * 0.08;
    const z10 = Math.sin((column + 1) * 0.31 + row * 0.23) * 0.08;
    const z01 = Math.sin(column * 0.31 + (row + 1) * 0.23) * 0.08;
    const z11 = Math.sin((column + 1) * 0.31 + (row + 1) * 0.23) * 0.08;
    const vertices = index % 2 === 0
      ? [[x0, y0, z00], [x1, y0, z10], [x1, y1, z11]]
      : [[x0, y0, z00], [x1, y1, z11], [x0, y1, z01]];
    let offset = 84 + index * 50;
    buffer.writeFloatLE(0, offset);
    buffer.writeFloatLE(0, offset + 4);
    buffer.writeFloatLE(1, offset + 8);
    offset += 12;
    for (const vertex of vertices) {
      buffer.writeFloatLE(vertex[0], offset);
      buffer.writeFloatLE(vertex[1], offset + 4);
      buffer.writeFloatLE(vertex[2], offset + 8);
      offset += 12;
    }
    buffer.writeUInt16LE(0, offset);
  }
  stlCache.set(triangleCount, buffer);
  return buffer;
}
