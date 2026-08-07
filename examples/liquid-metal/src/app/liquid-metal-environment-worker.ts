import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

type EnvironmentDecodeRequest = {
  buffer: ArrayBuffer;
  extension: "exr" | "hdr";
  maxWidth: number;
};

type EnvironmentDecodeSuccess = {
  data: ArrayBuffer;
  height: number;
  ok: true;
  width: number;
};

type EnvironmentDecodeFailure = {
  message: string;
  ok: false;
};

function downsampleHalfFloatRgba(
  data: Uint16Array,
  width: number,
  height: number,
  maxWidth: number,
): { data: Uint16Array; height: number; width: number } {
  if (width <= maxWidth) {
    return { data, height, width };
  }

  const targetWidth = Math.max(8, maxWidth);
  const targetHeight = Math.max(4, Math.round((height / width) * targetWidth));
  const output = new Uint16Array(targetWidth * targetHeight * 4);

  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const sourceY = Math.min(
      height - 1,
      Math.floor((targetY / targetHeight) * height),
    );

    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const sourceX = Math.min(
        width - 1,
        Math.floor((targetX / targetWidth) * width),
      );
      const sourceOffset = (sourceY * width + sourceX) * 4;
      const targetOffset = (targetY * targetWidth + targetX) * 4;

      output[targetOffset] = data[sourceOffset] ?? 0;
      output[targetOffset + 1] = data[sourceOffset + 1] ?? 0;
      output[targetOffset + 2] = data[sourceOffset + 2] ?? 0;
      output[targetOffset + 3] = data[sourceOffset + 3] ?? 0;
    }
  }

  return { data: output, height: targetHeight, width: targetWidth };
}

self.addEventListener(
  "message",
  (event: MessageEvent<EnvironmentDecodeRequest>) => {
    try {
      const loader =
        event.data.extension === "hdr"
          ? new HDRLoader().setDataType(THREE.HalfFloatType)
          : new EXRLoader()
              .setDataType(THREE.HalfFloatType)
              .setOutputFormat(THREE.RGBAFormat);
      const decoded = loader.parse(event.data.buffer);
      const data = decoded.data;
      const width = decoded.width;
      const height = decoded.height;

      if (
        !(data instanceof Uint16Array) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        !width ||
        !height
      ) {
        throw new Error("The HDRI decoder did not return half-float RGBA pixels.");
      }

      const result = downsampleHalfFloatRgba(
        data,
        width,
        height,
        event.data.maxWidth,
      );
      const response: EnvironmentDecodeSuccess = {
        data: result.data.buffer as ArrayBuffer,
        height: result.height,
        ok: true,
        width: result.width,
      };

      self.postMessage(response, { transfer: [response.data] });
    } catch (error) {
      const response: EnvironmentDecodeFailure = {
        message:
          error instanceof Error ? error.message : "Could not decode HDRI.",
        ok: false,
      };

      self.postMessage(response);
    }
  },
);
