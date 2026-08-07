export function createRadianceHdr(
  width = 16,
  height = 8,
): Buffer {
  if (width < 8 || width > 0x7fff || height < 1) {
    throw new Error("Radiance HDR fixture requires width 8..32767 and positive height.");
  }

  const header = Buffer.from(
    `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`,
    "ascii",
  );
  const chunks: Buffer[] = [header];
  const channelValues = [210, 82, 28, 129];

  for (let row = 0; row < height; row += 1) {
    chunks.push(Buffer.from([2, 2, width >> 8, width & 0xff]));

    for (const value of channelValues) {
      let remaining = width;

      while (remaining > 0) {
        const runLength = Math.min(127, remaining);

        chunks.push(Buffer.from([128 + runLength, value]));
        remaining -= runLength;
      }
    }
  }

  return Buffer.concat(chunks);
}
