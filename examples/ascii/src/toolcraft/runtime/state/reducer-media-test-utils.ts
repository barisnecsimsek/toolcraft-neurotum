import { toolcraftReducer } from "./reducer";
import type { ToolcraftCommand, ToolcraftState } from "./types";

type MediaImportCommand = Extract<ToolcraftCommand, { type: "media.import" }>;
type MediaImportAsset = MediaImportCommand["asset"];
type MediaImportOptions = Pick<MediaImportCommand, "replaceExisting">;

export const imageMediaAsset = (
  overrides: Partial<MediaImportAsset> = {},
): MediaImportAsset => ({
  dataUrl: "data:image/png;base64,test",
  fileName: "source.png",
  mimeType: "image/png",
  position: { x: 0, y: 0 },
  size: { height: 768, unit: "px", width: 1024 },
  ...overrides,
});

export const fileMediaAsset = (
  overrides: Partial<MediaImportAsset> = {},
): MediaImportAsset => ({
  assetKind: "file",
  dataUrl: "data:text/plain;base64,aGVsbG8=",
  fileName: "notes.txt",
  mimeType: "text/plain",
  position: { x: 0, y: 0 },
  ...overrides,
});

export function importImageMedia(
  state: ToolcraftState,
  overrides: Partial<MediaImportAsset> = {},
  options: MediaImportOptions = {},
) {
  return toolcraftReducer(state, {
    asset: imageMediaAsset(overrides),
    type: "media.import",
    ...options,
  });
}
