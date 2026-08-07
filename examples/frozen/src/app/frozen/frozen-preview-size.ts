export type FrozenPreviewSize = Readonly<{
  height: number;
  width: number;
}>;

type FrozenPreviewSizeInput = Readonly<{
  cssHeight: number;
  cssWidth: number;
  maximumTextureSize: number;
  outputHeight: number;
  outputWidth: number;
  renderScale: number;
}>;

function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getFrozenPreviewSize({
  cssHeight,
  cssWidth,
  maximumTextureSize,
  outputHeight,
  outputWidth,
  renderScale,
}: FrozenPreviewSizeInput): FrozenPreviewSize {
  const safeOutputWidth = Math.max(1, Math.round(positive(outputWidth, 1)));
  const safeOutputHeight = Math.max(1, Math.round(positive(outputHeight, 1)));
  const aspect = safeOutputWidth / safeOutputHeight;
  const availableWidth = positive(cssWidth, safeOutputWidth);
  const availableHeight = positive(cssHeight, safeOutputHeight);

  let fittedWidth = availableWidth;
  let fittedHeight = fittedWidth / aspect;
  if (fittedHeight > availableHeight) {
    fittedHeight = availableHeight;
    fittedWidth = fittedHeight * aspect;
  }

  const scale = Math.min(2, Math.max(1, positive(renderScale, 2)));
  let width = Math.max(1, Math.round(fittedWidth * scale));
  let height = Math.max(1, Math.round(fittedHeight * scale));
  const textureLimit = Math.max(1, Math.floor(positive(maximumTextureSize, 16_384)));
  const limitScale = Math.min(1, textureLimit / width, textureLimit / height);
  width = Math.max(1, Math.round(width * limitScale));
  height = Math.max(1, Math.round(height * limitScale));
  return { height, width };
}
