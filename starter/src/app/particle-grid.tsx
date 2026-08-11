"use client";

import * as React from "react";

import {
  shouldIncludeToolcraftPreviewBackground,
  type ToolcraftImageAsset,
  type ToolcraftProductExportRenderer,
  type ToolcraftState,
} from "@/toolcraft/runtime";
import {
  useToolcraft,
  useToolcraftMediaPresentationUrls,
} from "@/toolcraft/runtime/react";

const sourceTarget = "source.image";

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const particleGridFragmentShaderSource = `#version 300 es
precision highp float;
precision highp int;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uSource;
uniform vec2 uSourceSize;
uniform vec2 uOutputSize;
uniform vec2 uGridDims;
uniform float uMaxColumnWidth;
uniform float uColumnGap;
uniform float uParticleWidth;
uniform float uMinWidth;
uniform float uKillBelowWidth;
uniform vec4 uBackgroundColor;
uniform int uColorMode;
uniform vec4 uTintColor;
uniform float uSoftness;
uniform int uGroupMode;
uniform vec4 uGroupColor1;
uniform vec4 uGroupColor2;
uniform vec4 uGroupColor3;
uniform vec4 uGroupColor4;
uniform float uDotChance;
uniform vec4 uDotPatternBackground;
uniform float uDotDensity;
uniform float uDotSize;
uniform int uRotationQuarterTurns;
uniform vec2 uFlip;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainSeed;

vec2 coverUv(vec2 outputUv) {
  vec2 orientedSize =
    (uRotationQuarterTurns == 1 || uRotationQuarterTurns == 3)
      ? uSourceSize.yx
      : uSourceSize;
  float outputAspect = uOutputSize.x / max(uOutputSize.y, 1.0);
  float sourceAspect = orientedSize.x / max(orientedSize.y, 1.0);
  vec2 uv = outputUv;

  if (sourceAspect > outputAspect) {
    uv.x = (uv.x - 0.5) * (outputAspect / sourceAspect) + 0.5;
  } else {
    uv.y = (uv.y - 0.5) * (sourceAspect / outputAspect) + 0.5;
  }

  if (uFlip.x > 0.5) {
    uv.x = 1.0 - uv.x;
  }

  if (uFlip.y > 0.5) {
    uv.y = 1.0 - uv.y;
  }

  if (uRotationQuarterTurns == 1) {
    return vec2(uv.y, 1.0 - uv.x);
  }

  if (uRotationQuarterTurns == 2) {
    return vec2(1.0 - uv.x, 1.0 - uv.y);
  }

  if (uRotationQuarterTurns == 3) {
    return vec2(1.0 - uv.y, uv.x);
  }

  return uv;
}

vec4 sampleInput(vec2 outputUv) {
  return texture(uSource, clamp(coverUv(outputUv), vec2(0.0), vec2(1.0)));
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.x, p.y, p.x) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float rgbToHue(vec3 rgb) {
  float maxC = max(max(rgb.r, rgb.g), rgb.b);
  float minC = min(min(rgb.r, rgb.g), rgb.b);
  float delta = maxC - minC;
  if (delta < 0.001) {
    return 0.0;
  }

  float h;
  if (maxC == rgb.r) {
    h = mod((rgb.g - rgb.b) / delta, 6.0);
  } else if (maxC == rgb.g) {
    h = (rgb.b - rgb.r) / delta + 2.0;
  } else {
    h = (rgb.r - rgb.g) / delta + 4.0;
  }

  h /= 6.0;
  return h < 0.0 ? h + 1.0 : h;
}

float rgbSaturation(vec3 rgb) {
  float maxC = max(max(rgb.r, rgb.g), rgb.b);
  float minC = min(min(rgb.r, rgb.g), rgb.b);
  return maxC < 0.001 ? 0.0 : (maxC - minC) / maxC;
}

float grainNoise(vec2 effectUv) {
  vec2 grainCoord = floor(effectUv * uOutputSize / max(uGrainScale, 0.25));
  return hash21(grainCoord + vec2(uGrainSeed * 19.19, uGrainSeed * 73.73)) - 0.5;
}

float applyGrainToLuminance(float luminance, vec2 effectUv) {
  return clamp(luminance + grainNoise(effectUv) * uGrainAmount, 0.0, 1.0);
}

float buildParticleMask(
  vec2 effectUv,
  vec2 cellCoord,
  vec2 gridDims,
  float luminance
) {
  float availableWidth = max(1.0 - uColumnGap, 0.001);
  float maximumWidth = min(uMaxColumnWidth, availableWidth);
  float rawWidth = luminance * uParticleWidth;
  if (rawWidth < uKillBelowWidth) {
    return 0.0;
  }
  float barWidth = clamp(max(rawWidth, uMinWidth), 0.0, maximumWidth);
  float cellCenterX = (cellCoord.x + 0.5) / gridDims.x;
  float centeredX = (effectUv.x - cellCenterX) * gridDims.x;
  float halfBarWidth = barWidth * 0.5;
  float halfPixelInCell = 0.5 * gridDims.x / max(uOutputSize.x, 1.0);
  float edgeWidth = max(uSoftness * 0.5, halfPixelInCell);
  return 1.0 - smoothstep(
    halfBarWidth - edgeWidth,
    halfBarWidth + edgeWidth,
    abs(centeredX)
  );
}

int classifyColorGroup(vec3 sampledColor, float luminance) {
  int groupIndex = int(clamp(floor(luminance * 4.0), 0.0, 3.0));
  if (uGroupMode == 2) {
    float saturation = rgbSaturation(sampledColor);
    if (saturation >= 0.15) {
      float hue = rgbToHue(sampledColor);
      if (hue < 0.08 || hue >= 0.83) {
        groupIndex = 0;
      } else if (hue < 0.2) {
        groupIndex = 1;
      } else if (hue < 0.5) {
        groupIndex = 2;
      } else {
        groupIndex = 3;
      }
    }
  }
  return groupIndex;
}

vec4 mapParticleColor(vec4 sampled, float luminance) {
  int groupIndex = classifyColorGroup(sampled.rgb, luminance);
  if (uGroupMode == 0) {
    return uColorMode == 0 ? sampled : uTintColor * sampled.a;
  }
  if (groupIndex == 0) {
    return uGroupColor1;
  }
  if (groupIndex == 1) {
    return uGroupColor2;
  }
  if (groupIndex == 2) {
    return uGroupColor3;
  }
  return uGroupColor4;
}

vec4 applyCellPattern(
  vec4 particleColor,
  vec2 cellCoord,
  vec2 localPos,
  float luminance
) {
  float cellRand = hash21(cellCoord + vec2(17.3, 41.7));
  if (luminance < 0.5 || cellRand >= uDotChance) {
    return particleColor;
  }

  vec2 dotGridPos = fract(localPos * uDotDensity);
  float distanceToCenter = length(dotGridPos - vec2(0.5));
  float dotRadius = uDotSize * 0.5;
  float dotMask = 1.0 - smoothstep(
    dotRadius - 0.03,
    dotRadius + 0.03,
    distanceToCenter
  );
  return mix(uDotPatternBackground, particleColor, dotMask);
}

vec4 applyGrain(vec4 color, vec2 effectUv) {
  vec3 texturedColor = clamp(
    color.rgb + grainNoise(effectUv) * uGrainAmount,
    0.0,
    1.0
  );
  return vec4(texturedColor, color.a);
}

vec4 composeParticle(vec4 particleColor, float mask) {
  vec4 composed = mix(uBackgroundColor, particleColor, mask);
  return vec4(
    composed.rgb,
    mix(uBackgroundColor.a, particleColor.a, mask)
  );
}

void main() {
  vec2 gridDims = max(uGridDims, vec2(1.0));
  vec2 effectUv = vUv;
  vec2 cellCoord = floor(effectUv * gridDims);
  vec2 centerUv = (cellCoord + vec2(0.5)) / gridDims;
  vec2 localPos = fract(effectUv * gridDims);
  vec4 sampled = sampleInput(centerUv);
  float sourceLuminance = dot(sampled.rgb, vec3(0.299, 0.587, 0.114));
  float luminance = applyGrainToLuminance(sourceLuminance, effectUv);
  float mask = buildParticleMask(effectUv, cellCoord, gridDims, luminance);
  vec4 particleColor = mapParticleColor(sampled, luminance);
  particleColor = applyCellPattern(particleColor, cellCoord, localPos, luminance);
  particleColor = applyGrain(particleColor, effectUv);
  outColor = composeParticle(particleColor, mask);
}
`;

type ParticleGridRenderSettings = {
  backgroundColor: string;
  colorMode: number;
  columnGap: number;
  columns: number;
  dotChance: number;
  dotDensity: number;
  dotPatternBackground: string;
  dotSize: number;
  grainAmount: number;
  grainScale: number;
  grainSeed: number;
  groupColor1: string;
  groupColor2: string;
  groupColor3: string;
  groupColor4: string;
  groupMode: number;
  includeBackground: boolean;
  killBelowWidth: number;
  maxColumnWidth: number;
  minWidth: number;
  outputHeight: number;
  outputWidth: number;
  particleWidth: number;
  rows: number;
  softness: number;
  sourceAsset: ToolcraftImageAsset;
  tintColor: string;
};

type ParticleGridUniforms = {
  backgroundColor: WebGLUniformLocation;
  colorMode: WebGLUniformLocation;
  columnGap: WebGLUniformLocation;
  dotChance: WebGLUniformLocation;
  dotDensity: WebGLUniformLocation;
  dotPatternBackground: WebGLUniformLocation;
  dotSize: WebGLUniformLocation;
  flip: WebGLUniformLocation;
  gridDims: WebGLUniformLocation;
  groupColor1: WebGLUniformLocation;
  groupColor2: WebGLUniformLocation;
  groupColor3: WebGLUniformLocation;
  groupColor4: WebGLUniformLocation;
  groupMode: WebGLUniformLocation;
  grainAmount: WebGLUniformLocation;
  grainScale: WebGLUniformLocation;
  grainSeed: WebGLUniformLocation;
  killBelowWidth: WebGLUniformLocation;
  maxColumnWidth: WebGLUniformLocation;
  minWidth: WebGLUniformLocation;
  outputSize: WebGLUniformLocation;
  particleWidth: WebGLUniformLocation;
  rotationQuarterTurns: WebGLUniformLocation;
  softness: WebGLUniformLocation;
  source: WebGLUniformLocation;
  sourceSize: WebGLUniformLocation;
  tintColor: WebGLUniformLocation;
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Unable to allocate a Particle Grid shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "Unknown shader compilation error.";
    gl.deleteShader(shader);
    throw new Error(log);
  }

  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    particleGridFragmentShaderSource,
  );
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Unable to allocate the Particle Grid shader program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "Unknown shader link error.";
    gl.deleteProgram(program);
    throw new Error(log);
  }

  return program;
}

function getUniform(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);

  if (!location) {
    throw new Error(`Missing Particle Grid shader uniform: ${name}`);
  }

  return location;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue)
    ? Math.min(max, Math.max(min, numericValue))
    : fallback;
}

function getHexColor(state: ToolcraftState, target: string, fallback: string): string {
  const value = state.values[target];

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "hex" in value &&
    typeof value.hex === "string"
  ) {
    return value.hex;
  }

  return fallback;
}

function parseHexColor(value: string, alpha = 1): [number, number, number, number] {
  const normalized = /^#[0-9a-f]{6}$/i.test(value) ? value.slice(1) : "000000";
  return [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
    alpha,
  ];
}

function getSourceAsset(state: ToolcraftState): ToolcraftImageAsset | undefined {
  return state.mediaAssets.find(
    (asset): asset is ToolcraftImageAsset =>
      asset.assetKind === "image" &&
      (asset.sourceTarget === sourceTarget || asset.sourceTarget === undefined),
  );
}

function loadSourceImage(
  asset: ToolcraftImageAsset,
  sourceUrl: string,
): Promise<HTMLImageElement> {
  const cacheKey = asset.resourceRef;
  const cached = imageCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to decode ${asset.fileName}.`));
    image.src = sourceUrl;
  });

  imageCache.set(cacheKey, promise);
  return promise;
}

function getRenderSettings(
  state: ToolcraftState,
  sourceAsset: ToolcraftImageAsset,
  outputWidth: number,
  outputHeight: number,
  includeBackground = shouldIncludeToolcraftPreviewBackground({ state }),
): ParticleGridRenderSettings {
  return {
    backgroundColor: getHexColor(state, "appearance.background", "#000000"),
    colorMode: state.values["particle.colorMode"] === "tint" ? 1 : 0,
    columnGap: clampNumber(state.values["particle.columnGap"], 0.05, 0, 0.5),
    columns: Math.round(clampNumber(state.values["particle.columns"], 80, 10, 200)),
    dotChance: clampNumber(state.values["particle.dotChance"], 0.02, 0, 1),
    dotDensity: clampNumber(state.values["particle.dotDensity"], 3, 1, 8),
    dotPatternBackground: getHexColor(
      state,
      "particle.dotPatternBackground",
      "#E6E6E6",
    ),
    dotSize: clampNumber(state.values["particle.dotSize"], 0.5, 0.1, 0.9),
    grainAmount: clampNumber(state.values["particle.grainAmount"], 0, 0, 0.5),
    grainScale: clampNumber(state.values["particle.grainScale"], 1, 0.25, 8),
    grainSeed: Math.round(clampNumber(state.values["particle.grainSeed"], 1, 1, 100)),
    groupColor1: getHexColor(state, "particle.groupColor1", "#E63326"),
    groupColor2: getHexColor(state, "particle.groupColor2", "#F2991A"),
    groupColor3: getHexColor(state, "particle.groupColor3", "#33B34D"),
    groupColor4: getHexColor(state, "particle.groupColor4", "#334CCC"),
    groupMode:
      state.values["particle.groupMode"] === "color"
        ? 2
        : state.values["particle.groupMode"] === "brightness"
          ? 1
          : 0,
    includeBackground,
    killBelowWidth: clampNumber(
      state.values["particle.killBelowWidth"],
      0,
      0,
      1,
    ),
    maxColumnWidth: clampNumber(state.values["particle.maxColumnWidth"], 0.9, 0.1, 1),
    minWidth: clampNumber(state.values["particle.minWidth"], 0, 0, 0.5),
    outputHeight,
    outputWidth,
    particleWidth: clampNumber(state.values["particle.width"], 1, 0.1, 3),
    rows: Math.round(clampNumber(state.values["particle.rows"], 30, 5, 150)),
    softness: clampNumber(state.values["particle.softness"], 0.02, 0, 0.5),
    sourceAsset,
    tintColor: getHexColor(state, "particle.tintColor", "#FFFFFF"),
  };
}

export class ParticleGridWebGlRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly positionBuffer: WebGLBuffer;
  private readonly program: WebGLProgram;
  private readonly sourceTexture: WebGLTexture;
  private readonly uniforms: ParticleGridUniforms;
  private readonly vertexArray: WebGLVertexArrayObject;
  private sourceKey: string | null = null;
  private sourceSize = { height: 1, width: 1 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    { preserveDrawingBuffer = true }: { preserveDrawingBuffer?: boolean } = {},
  ) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      desynchronized: true,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
      preserveDrawingBuffer,
    });

    if (!gl) {
      throw new Error("Particle Grid Effect requires WebGL2.");
    }

    this.gl = gl;
    this.program = createProgram(gl);
    const vertexArray = gl.createVertexArray();
    const positionBuffer = gl.createBuffer();
    const sourceTexture = gl.createTexture();

    if (!vertexArray || !positionBuffer || !sourceTexture) {
      throw new Error("Unable to allocate Particle Grid renderer GPU resources.");
    }

    this.vertexArray = vertexArray;
    this.positionBuffer = positionBuffer;
    this.sourceTexture = sourceTexture;

    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const positionLocation = gl.getAttribLocation(this.program, "aPosition");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = {
      backgroundColor: getUniform(gl, this.program, "uBackgroundColor"),
      colorMode: getUniform(gl, this.program, "uColorMode"),
      columnGap: getUniform(gl, this.program, "uColumnGap"),
      dotChance: getUniform(gl, this.program, "uDotChance"),
      dotDensity: getUniform(gl, this.program, "uDotDensity"),
      dotPatternBackground: getUniform(gl, this.program, "uDotPatternBackground"),
      dotSize: getUniform(gl, this.program, "uDotSize"),
      flip: getUniform(gl, this.program, "uFlip"),
      gridDims: getUniform(gl, this.program, "uGridDims"),
      groupColor1: getUniform(gl, this.program, "uGroupColor1"),
      groupColor2: getUniform(gl, this.program, "uGroupColor2"),
      groupColor3: getUniform(gl, this.program, "uGroupColor3"),
      groupColor4: getUniform(gl, this.program, "uGroupColor4"),
      groupMode: getUniform(gl, this.program, "uGroupMode"),
      grainAmount: getUniform(gl, this.program, "uGrainAmount"),
      grainScale: getUniform(gl, this.program, "uGrainScale"),
      grainSeed: getUniform(gl, this.program, "uGrainSeed"),
      killBelowWidth: getUniform(gl, this.program, "uKillBelowWidth"),
      maxColumnWidth: getUniform(gl, this.program, "uMaxColumnWidth"),
      minWidth: getUniform(gl, this.program, "uMinWidth"),
      outputSize: getUniform(gl, this.program, "uOutputSize"),
      particleWidth: getUniform(gl, this.program, "uParticleWidth"),
      rotationQuarterTurns: getUniform(gl, this.program, "uRotationQuarterTurns"),
      softness: getUniform(gl, this.program, "uSoftness"),
      source: getUniform(gl, this.program, "uSource"),
      sourceSize: getUniform(gl, this.program, "uSourceSize"),
      tintColor: getUniform(gl, this.program, "uTintColor"),
    };

    gl.useProgram(this.program);
    gl.uniform1i(this.uniforms.source, 0);
  }

  clear(width: number, height: number): void {
    this.resize(width, height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  dispose(): void {
    const { gl } = this;
    gl.deleteTexture(this.sourceTexture);
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteVertexArray(this.vertexArray);
    gl.deleteProgram(this.program);
  }

  setSource(image: HTMLImageElement, sourceKey: string): void {
    if (this.sourceKey === sourceKey) {
      return;
    }

    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    this.sourceKey = sourceKey;
    this.sourceSize = {
      height: Math.max(1, image.naturalHeight),
      width: Math.max(1, image.naturalWidth),
    };
  }

  render(settings: ParticleGridRenderSettings): void {
    const { gl, uniforms } = this;
    const rotationDeg = settings.sourceAsset.transform?.rotationDeg ?? 0;
    const quarterTurns = Math.round(rotationDeg / 90) % 4;
    const setColor = (uniform: WebGLUniformLocation, value: string, alpha = 1) => {
      gl.uniform4fv(uniform, parseHexColor(value, alpha));
    };

    this.resize(settings.outputWidth, settings.outputHeight);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vertexArray);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform2f(uniforms.sourceSize, this.sourceSize.width, this.sourceSize.height);
    gl.uniform2f(uniforms.outputSize, settings.outputWidth, settings.outputHeight);
    gl.uniform2f(uniforms.gridDims, settings.columns, settings.rows);
    gl.uniform1f(uniforms.maxColumnWidth, settings.maxColumnWidth);
    gl.uniform1f(uniforms.columnGap, settings.columnGap);
    gl.uniform1f(uniforms.particleWidth, settings.particleWidth);
    gl.uniform1f(uniforms.killBelowWidth, settings.killBelowWidth);
    gl.uniform1f(uniforms.minWidth, settings.minWidth);
    setColor(uniforms.backgroundColor, settings.backgroundColor, settings.includeBackground ? 1 : 0);
    gl.uniform1i(uniforms.colorMode, settings.colorMode);
    setColor(uniforms.tintColor, settings.tintColor);
    gl.uniform1f(uniforms.softness, settings.softness);
    gl.uniform1i(uniforms.groupMode, settings.groupMode);
    setColor(uniforms.groupColor1, settings.groupColor1);
    setColor(uniforms.groupColor2, settings.groupColor2);
    setColor(uniforms.groupColor3, settings.groupColor3);
    setColor(uniforms.groupColor4, settings.groupColor4);
    gl.uniform1f(uniforms.grainAmount, settings.grainAmount);
    gl.uniform1f(uniforms.grainScale, settings.grainScale);
    gl.uniform1f(uniforms.grainSeed, settings.grainSeed);
    gl.uniform1f(uniforms.dotChance, settings.dotChance);
    setColor(uniforms.dotPatternBackground, settings.dotPatternBackground);
    gl.uniform1f(uniforms.dotDensity, settings.dotDensity);
    gl.uniform1f(uniforms.dotSize, settings.dotSize);
    gl.uniform1i(uniforms.rotationQuarterTurns, quarterTurns);
    gl.uniform2f(
      uniforms.flip,
      settings.sourceAsset.transform?.flipHorizontal ? 1 : 0,
      settings.sourceAsset.transform?.flipVertical ? 1 : 0,
    );
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private resize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
      this.canvas.width = nextWidth;
      this.canvas.height = nextHeight;
    }
    this.gl.viewport(0, 0, nextWidth, nextHeight);
  }
}

export function ParticleGridCanvas(): React.JSX.Element {
  const { state } = useToolcraft();
  const presentationUrls = useToolcraftMediaPresentationUrls(state.mediaAssets);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rendererRef = React.useRef<ParticleGridWebGlRenderer | null>(null);
  const [decodedSource, setDecodedSource] = React.useState<{
    image: HTMLImageElement;
    sourceKey: string;
  } | null>(null);
  const sourceAsset = getSourceAsset(state);
  const sourceKey = sourceAsset
    ? `${sourceAsset.id}:${sourceAsset.resourceRef}`
    : null;
  const sourceUrl = sourceAsset ? presentationUrls.get(sourceAsset.id) : undefined;
  const renderScale = clampNumber(state.values["canvas.renderScale"], 1, 1, 2);
  const outputWidth = Math.max(1, Math.round(state.canvas.size.width * renderScale));
  const outputHeight = Math.max(1, Math.round(state.canvas.size.height * renderScale));
  const settings = sourceAsset
    ? getRenderSettings(state, sourceAsset, outputWidth, outputHeight)
    : null;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const renderer = new ParticleGridWebGlRenderer(canvas);
    rendererRef.current = renderer;
    renderer.clear(outputWidth, outputHeight);

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    if (!sourceAsset || !sourceKey || !sourceUrl) {
      setDecodedSource(null);
      rendererRef.current?.clear(outputWidth, outputHeight);
      return () => {
        cancelled = true;
      };
    }

    void loadSourceImage(sourceAsset, sourceUrl).then((image) => {
      if (!cancelled) {
        setDecodedSource({ image, sourceKey });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sourceAsset?.id, sourceAsset?.resourceRef, sourceKey, sourceUrl]);

  React.useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !sourceAsset || !settings || decodedSource?.sourceKey !== sourceKey) {
      renderer?.clear(outputWidth, outputHeight);
      return undefined;
    }

    renderer.setSource(decodedSource.image, sourceKey);
    renderer.render(settings);
    return undefined;
  }, [
    decodedSource,
    outputHeight,
    outputWidth,
    renderScale,
    settings?.backgroundColor,
    settings?.colorMode,
    settings?.columnGap,
    settings?.columns,
    settings?.dotChance,
    settings?.dotDensity,
    settings?.dotPatternBackground,
    settings?.dotSize,
    settings?.groupColor1,
    settings?.groupColor2,
    settings?.groupColor3,
    settings?.groupColor4,
    settings?.groupMode,
    settings?.grainAmount,
    settings?.grainScale,
    settings?.grainSeed,
    settings?.includeBackground,
    settings?.killBelowWidth,
    settings?.maxColumnWidth,
    settings?.minWidth,
    settings?.particleWidth,
    settings?.rows,
    settings?.softness,
    settings?.tintColor,
    sourceAsset?.id,
    sourceAsset?.resourceRef,
    sourceAsset?.transform?.flipHorizontal,
    sourceAsset?.transform?.flipVertical,
    sourceAsset?.transform?.rotationDeg,
  ]);

  return (
    <canvas
      aria-label="Particle grid output"
      className="block h-full w-full"
      data-source-ready={decodedSource && sourceAsset ? "true" : "false"}
      data-toolcraft-product-output="particle-grid"
      ref={canvasRef}
    />
  );
}

export const particleGridExportRenderer: ToolcraftProductExportRenderer = {
  baseFileName: "particle-grid-effect",
  async renderFrame({ context, frame, pixelRatio, state }) {
    const sourceAsset = getSourceAsset(state);
    const sourceImagePromise = sourceAsset
      ? imageCache.get(sourceAsset.resourceRef)
      : undefined;

    if (!sourceAsset || !sourceImagePromise) {
      throw new Error("Upload and load a source image before exporting.");
    }

    const sourceImage = await sourceImagePromise;
    const pixelWidth = Math.max(1, Math.round(frame.width * pixelRatio));
    const pixelHeight = Math.max(1, Math.round(frame.height * pixelRatio));
    const shaderCanvas = document.createElement("canvas");
    const renderer = new ParticleGridWebGlRenderer(shaderCanvas, {
      preserveDrawingBuffer: true,
    });

    try {
      renderer.setSource(
        sourceImage,
        `${sourceAsset.id}:${sourceAsset.resourceRef}`,
      );
      renderer.render(
        getRenderSettings(state, sourceAsset, pixelWidth, pixelHeight, false),
      );
      context.drawImage(
        shaderCanvas,
        frame.x,
        frame.y,
        frame.width,
        frame.height,
      );
    } finally {
      renderer.dispose();
    }
  },
};
