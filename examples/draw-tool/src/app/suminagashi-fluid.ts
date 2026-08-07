export type SuminagashiFluidSettings = {
  autoFlow: boolean;
  backgroundHex: string;
  brushFlow: number;
  brushLoad: number;
  brushSettle: number;
  brushSize: number;
  brushTaper: number;
  brushWetness: number;
  includeBackground: boolean;
  paletteHex: string;
  paperTextureEnabled: boolean;
  paperTextureFiber: number;
  paperTextureGrain: number;
  paperTextureMottle: number;
  paperTextureScale: number;
};

export type SuminagashiFluidSize = {
  cssHeight: number;
  cssWidth: number;
  renderScale: number;
};

const fluidConfig = {
  activeDisplayMs: 24,
  activeWetPreviewMs: 64,
  clearFadeMs: 180,
  curl: 14,
  dryingBaseMs: 320,
  dryingTaperMaxMs: 720,
  dryingWetnessMs: 520,
  dyeDissipation: 0.07,
  dyeResolution: 1280,
  pointerSegmentsPerFrame: 6,
  pressureIterationsPerFrame: 7,
  pressureIterations: 28,
  simResolution: 256,
  splatForce: 5200,
  splatRadius: 0.0026,
  velocityDissipation: 0.16,
};

type Rgb = {
  b: number;
  g: number;
  r: number;
};

type Vec2 = {
  x: number;
  y: number;
};

type CanvasRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type PointerSegment = {
  colorHex: string;
  down: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

type RenderTarget = {
  framebuffer: WebGLFramebuffer;
  height: number;
  texture: WebGLTexture;
  width: number;
};

type RenderTargetFormat = "byte" | "float";

type DoubleFramebuffer = {
  read: RenderTarget;
  swap: () => void;
  texel: Vec2;
  write: RenderTarget;
};

type FluidProgram = {
  attribPosition: number;
  locations: Map<string, WebGLUniformLocation | null>;
  program: WebGLProgram;
};

type UniformValue = number | Vec2 | Rgb | WebGLTexture | null;

type SuminagashiPrograms = {
  advect: FluidProgram;
  clear: FluidProgram;
  curl: FluidProgram;
  display: FluidProgram;
  divergence: FluidProgram;
  gradientSubtract: FluidProgram;
  present: FluidProgram;
  pressure: FluidProgram;
  splat: FluidProgram;
  splatLine: FluidProgram;
  vorticity: FluidProgram;
};

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentPrefix = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
`;

const fragmentSources = {
  advect: `${fragmentPrefix}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uDt;
uniform float uDissipation;

void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;
  vec4 result = texture(uSource, coord);
  fragColor = result / (1.0 + uDissipation * uDt);
}
`,
  clear: `${fragmentPrefix}
uniform sampler2D uTexture;
uniform float uValue;

void main() {
  fragColor = uValue * texture(uTexture, vUv);
}
`,
  curl: `${fragmentPrefix}
uniform sampler2D uVelocity;
uniform vec2 uTexel;

void main() {
  float left = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
  float right = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
  float bottom = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
  fragColor = vec4(0.5 * (right - left - top + bottom), 0.0, 0.0, 1.0);
}
`,
  display: `${fragmentPrefix}
uniform sampler2D uDye;
uniform vec3 uPaper;
uniform float uIncludeBackground;
uniform float uTextureEnabled;
uniform float uTextureFiber;
uniform float uTextureGrain;
uniform float uTextureMottle;
uniform float uTextureScale;

float hash(vec2 point) {
  vec3 p = fract(vec3(point.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 blend = local * local * (3.0 - 2.0 * local);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
}

float fbm(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int index = 0; index < 4; index += 1) {
    value += amplitude * noise(point);
    point *= 2.03;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec3 absorption = texture(uDye, vUv).rgb;
  vec3 paper = uPaper;

  if (uTextureEnabled > 0.5) {
    float scale = max(0.35, uTextureScale / 100.0);
    float grain = (fbm(vUv * (95.0 / scale)) - 0.5) * 0.12 * uTextureGrain;
    float fiber = (noise(vec2(vUv.x * (42.0 / scale), vUv.y * (260.0 / scale))) - 0.5) *
      0.08 * uTextureFiber;
    float crossFiber = (noise(vec2(vUv.y * (36.0 / scale), vUv.x * (180.0 / scale))) - 0.5) *
      0.035 * uTextureFiber;
    float mottle = (fbm(vUv * (7.0 / scale)) - 0.5) * 0.18 * uTextureMottle;
    float textureValue = clamp(1.0 + grain + fiber + crossFiber + mottle, 0.72, 1.24);
    paper = clamp(uPaper * textureValue, 0.0, 1.0);
  }

  vec3 paperInk = paper * exp(-absorption);
  float inkAlpha = clamp(max(max(absorption.r, absorption.g), absorption.b) * 1.8, 0.0, 1.0);

  if (uIncludeBackground > 0.5) {
    fragColor = vec4(clamp(paperInk, 0.0, 1.0), 1.0);
    return;
  }

  fragColor = vec4(clamp(paperInk, 0.0, 1.0), inkAlpha);
}
`,
  present: `${fragmentPrefix}
uniform sampler2D uTexture;

void main() {
  fragColor = texture(uTexture, vUv);
}
`,
  divergence: `${fragmentPrefix}
uniform sampler2D uVelocity;
uniform vec2 uTexel;

void main() {
  float left = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  float top = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  vec2 center = texture(uVelocity, vUv).xy;

  if (vUv.x - uTexel.x < 0.0) left = -center.x;
  if (vUv.x + uTexel.x > 1.0) right = -center.x;
  if (vUv.y - uTexel.y < 0.0) bottom = -center.y;
  if (vUv.y + uTexel.y > 1.0) top = -center.y;

  fragColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
}
`,
  gradientSubtract: `${fragmentPrefix}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexel;

void main() {
  float left = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  vec2 velocity = texture(uVelocity, vUv).xy - vec2(right - left, top - bottom);
  fragColor = vec4(velocity, 0.0, 1.0);
}
`,
  pressure: `${fragmentPrefix}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexel;

void main() {
  float left = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float divergence = texture(uDivergence, vUv).x;
  fragColor = vec4((left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0);
}
`,
  splat: `${fragmentPrefix}
uniform sampler2D uTarget;
uniform float uAspect;
uniform float uRadius;
uniform vec2 uPoint;
uniform vec3 uColor;

void main() {
  vec2 point = vUv - uPoint;
  point.x *= uAspect;
  vec3 splat = exp(-dot(point, point) / uRadius) * uColor;
  fragColor = vec4(texture(uTarget, vUv).rgb + splat, 1.0);
}
`,
  splatLine: `${fragmentPrefix}
uniform sampler2D uTarget;
uniform float uAspect;
uniform float uRadius;
uniform vec2 uPointA;
uniform vec2 uPointB;
uniform vec3 uColor;

void main() {
  vec2 point = vUv;
  vec2 a = uPointA;
  vec2 b = uPointB;
  point.x *= uAspect;
  a.x *= uAspect;
  b.x *= uAspect;
  vec2 ab = b - a;
  float h = clamp(dot(point - a, ab) / max(dot(ab, ab), 0.000001), 0.0, 1.0);
  vec2 closest = a + ab * h;
  vec2 delta = point - closest;
  vec3 splat = exp(-dot(delta, delta) / uRadius) * uColor;
  fragColor = vec4(texture(uTarget, vUv).rgb + splat, 1.0);
}
`,
  vorticity: `${fragmentPrefix}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexel;
uniform float uCurlStrength;
uniform float uDt;

void main() {
  float left = texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float center = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(top) - abs(bottom), abs(right) - abs(left));
  force /= length(force) + 0.0001;
  force *= uCurlStrength * center;
  force.y *= -1.0;
  vec2 velocity = texture(uVelocity, vUv).xy + force * uDt;
  fragColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);
}
`,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): Rgb {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#1a1a1f";
  const value = Number.parseInt(normalized.slice(1), 16);

  return {
    b: (value & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    r: ((value >> 16) & 255) / 255,
  };
}

function inkAbsorption(hex: string, strength: number): Rgb {
  const color = hexToRgb(hex);
  const floor = 0.012;

  return {
    b: -Math.log(Math.max(color.b, floor)) * strength,
    g: -Math.log(Math.max(color.g, floor)) * strength,
    r: -Math.log(Math.max(color.r, floor)) * strength,
  };
}

function canCoalescePointerSegments(first: PointerSegment, second: PointerSegment): boolean {
  return first.down === second.down && first.colorHex === second.colorHex;
}

function coalescePointerSegments(
  segments: PointerSegment[],
  maxSegments: number,
): PointerSegment[] {
  if (segments.length <= maxSegments) {
    return segments;
  }

  const coalesced: PointerSegment[] = [];
  const groupSize = Math.ceil(segments.length / maxSegments);
  let index = 0;

  while (index < segments.length) {
    const first = segments[index]!;
    let end = Math.min(segments.length, index + groupSize);

    for (let scan = index + 1; scan < end; scan += 1) {
      if (!canCoalescePointerSegments(first, segments[scan]!)) {
        end = scan;
        break;
      }
    }

    const last = segments[end - 1]!;
    coalesced.push({
      colorHex: first.colorHex,
      down: first.down,
      fromX: first.fromX,
      fromY: first.fromY,
      toX: last.toX,
      toY: last.toY,
    });

    index = end;
  }

  return coalesced;
}

function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Unable to create WebGL shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? "unknown shader error";
    gl.deleteShader(shader);
    throw new Error(info);
  }

  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  fragmentSource: string,
): FluidProgram {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Unable to create WebGL program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? "unknown program error";
    gl.deleteProgram(program);
    throw new Error(info);
  }

  return {
    attribPosition: gl.getAttribLocation(program, "aPosition"),
    locations: new Map(),
    program,
  };
}

function getUniformLocation(
  gl: WebGL2RenderingContext,
  program: FluidProgram,
  name: string,
): WebGLUniformLocation | null {
  if (!program.locations.has(name)) {
    program.locations.set(name, gl.getUniformLocation(program.program, name));
  }

  return program.locations.get(name) ?? null;
}

function createTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  format: RenderTargetFormat,
): WebGLTexture {
  const texture = gl.createTexture();

  if (!texture) {
    throw new Error("Unable to create WebGL texture.");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    format === "float" ? gl.RGBA16F : gl.RGBA8,
    width,
    height,
    0,
    gl.RGBA,
    format === "float" ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
    null,
  );
  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}

function createRenderTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  format: RenderTargetFormat = "float",
): RenderTarget {
  const texture = createTexture(gl, width, height, format);
  const framebuffer = gl.createFramebuffer();

  if (!framebuffer) {
    throw new Error("Unable to create WebGL framebuffer.");
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );

  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error("WebGL floating-point framebuffer is incomplete.");
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { framebuffer, height, texture, width };
}

function deleteRenderTarget(
  gl: WebGL2RenderingContext,
  target: RenderTarget | null,
): void {
  if (!target) {
    return;
  }

  gl.deleteFramebuffer(target.framebuffer);
  gl.deleteTexture(target.texture);
}

function createDoubleFramebuffer(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): DoubleFramebuffer {
  const fbo = {
    read: createRenderTarget(gl, width, height),
    texel: { x: 1 / width, y: 1 / height },
    write: createRenderTarget(gl, width, height),
    swap() {
      const nextRead = fbo.write;
      fbo.write = fbo.read;
      fbo.read = nextRead;
    },
  };

  return fbo;
}

function deleteDoubleFramebuffer(
  gl: WebGL2RenderingContext,
  target: DoubleFramebuffer | null,
): void {
  if (!target) {
    return;
  }

  deleteRenderTarget(gl, target.read);
  deleteRenderTarget(gl, target.write);
}

function getSimulationSizes(width: number, height: number): {
  dyeHeight: number;
  dyeWidth: number;
  simHeight: number;
  simWidth: number;
} {
  const aspect = width / Math.max(1, height);
  const dye = Math.min(fluidConfig.dyeResolution, Math.max(width, height));

  if (aspect >= 1) {
    return {
      dyeHeight: Math.max(1, Math.round(dye / aspect)),
      dyeWidth: Math.max(1, Math.round(dye)),
      simHeight: fluidConfig.simResolution,
      simWidth: Math.max(1, Math.round(fluidConfig.simResolution * aspect)),
    };
  }

  return {
    dyeHeight: Math.max(1, Math.round(dye)),
    dyeWidth: Math.max(1, Math.round(dye * aspect)),
    simHeight: Math.max(1, Math.round(fluidConfig.simResolution / aspect)),
    simWidth: fluidConfig.simResolution,
  };
}

export class SuminagashiFluidEngine {
  private activeInk = false;
  private animationFrameId = 0;
  private canvasHeight = 1;
  private canvasWidth = 1;
  private clearFadeOpacity = 0;
  private clearFadeStartedAt = 0;
  private readonly gl: WebGL2RenderingContext;
  private readonly programs: SuminagashiPrograms;
  private readonly quadBuffer: WebGLBuffer;
  private velocity: DoubleFramebuffer | null = null;
  private dye: DoubleFramebuffer | null = null;
  private pressure: DoubleFramebuffer | null = null;
  private curl: RenderTarget | null = null;
  private divergence: RenderTarget | null = null;
  private display: RenderTarget | null = null;
  private lastDisplayRender = 0;
  private lastFrameTime = 0;
  private lastInteraction = 0;
  private lastWetPreview = 0;
  private lastTaperDampingAt = 0;
  private dryingTaperDurationMs = 0;
  private dryingTaperStartsAt = 0;
  private dryingUntil = 0;
  private nextDrop = 1200;
  private nextStir = 2600;
  private pendingPressureDt = 0;
  private pendingPressureIterations = 0;
  private reducedMotion = false;
  private dropTimers: number[] = [];
  private settings: SuminagashiFluidSettings = {
    autoFlow: false,
    backgroundHex: "#efeae0",
    brushFlow: 100,
    brushLoad: 100,
    brushSettle: 100,
    brushSize: 28,
    brushTaper: 100,
    brushWetness: 70,
    includeBackground: true,
    paletteHex: "#1a1a1f",
    paperTextureEnabled: false,
    paperTextureFiber: 45,
    paperTextureGrain: 35,
    paperTextureMottle: 30,
    paperTextureScale: 100,
  };
  private viewportInteractionUntil = 0;
  private washing = 0;
  private readonly pointer = {
    colorHex: "#1a1a1f",
    down: false,
    moved: false,
    px: 0,
    py: 0,
    queuedX: 0,
    queuedY: 0,
    rect: null as CanvasRect | null,
    segments: [] as PointerSegment[],
    x: 0,
    y: 0,
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      desynchronized: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
      stencil: false,
    });

    if (!gl) {
      throw new Error("Suminagashi requires WebGL 2.");
    }

    gl.getExtension("EXT_color_buffer_float");
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

    this.gl = gl;
    this.programs = {
      advect: createProgram(gl, fragmentSources.advect),
      clear: createProgram(gl, fragmentSources.clear),
      curl: createProgram(gl, fragmentSources.curl),
      display: createProgram(gl, fragmentSources.display),
      divergence: createProgram(gl, fragmentSources.divergence),
      gradientSubtract: createProgram(gl, fragmentSources.gradientSubtract),
      present: createProgram(gl, fragmentSources.present),
      pressure: createProgram(gl, fragmentSources.pressure),
      splat: createProgram(gl, fragmentSources.splat),
      splatLine: createProgram(gl, fragmentSources.splatLine),
      vorticity: createProgram(gl, fragmentSources.vorticity),
    };

    const quadBuffer = gl.createBuffer();

    if (!quadBuffer) {
      throw new Error("Unable to create WebGL quad buffer.");
    }

    this.quadBuffer = quadBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.dropTimers.forEach((timer) => window.clearTimeout(timer));
    this.dropTimers = [];
    deleteDoubleFramebuffer(this.gl, this.velocity);
    deleteDoubleFramebuffer(this.gl, this.dye);
    deleteDoubleFramebuffer(this.gl, this.pressure);
    deleteRenderTarget(this.gl, this.curl);
    deleteRenderTarget(this.gl, this.divergence);
    deleteRenderTarget(this.gl, this.display);
    this.gl.deleteBuffer(this.quadBuffer);
    Object.values(this.programs).forEach(({ program }) => this.gl.deleteProgram(program));
  }

  markViewportInteraction(now = performance.now()): void {
    this.viewportInteractionUntil = Math.max(this.viewportInteractionUntil, now + 640);
  }

  pointerCancel(): void {
    this.pointer.down = false;
    this.pointer.moved = false;
    this.pointer.rect = null;
    this.pointer.segments = [];
  }

  pointerDown(clientX: number, clientY: number): void {
    this.pointer.rect = this.measureCanvasRect();
    const point = this.clientToUv(clientX, clientY);
    this.pointer.down = true;
    this.pointer.moved = false;
    this.pointer.x = point.x;
    this.pointer.y = point.y;
    this.pointer.px = point.x;
    this.pointer.py = point.y;
    this.pointer.queuedX = point.x;
    this.pointer.queuedY = point.y;
    this.pointer.colorHex = this.currentInkColor(true);
    this.pointer.segments = [];
    this.dropInk(point.x, point.y, this.pointer.colorHex, 0.6 + Math.random() * 0.3, {
      flowMultiplier: this.brushFlowMultiplier(),
      loadMultiplier: this.brushLoadMultiplier(),
      radiusMultiplier: this.brushRadiusMultiplier(1),
    });
    this.pendingPressureDt = 0;
    this.pendingPressureIterations = 0;
    this.lastTaperDampingAt = 0;
    this.lastInteraction = performance.now();
    this.lastDisplayRender = this.lastInteraction - fluidConfig.activeDisplayMs;
    this.lastWetPreview = this.lastInteraction - fluidConfig.activeWetPreviewMs;
  }

  pointerMove(clientX: number, clientY: number): void {
    if (!this.pointer.down) {
      this.pointer.moved = false;
      return;
    }

    const point = this.clientToUv(clientX, clientY);
    const distanceFromQueuedPoint = Math.hypot(
      point.x - this.pointer.queuedX,
      point.y - this.pointer.queuedY,
    );

    this.pointer.px = this.pointer.x;
    this.pointer.py = this.pointer.y;
    this.pointer.x = point.x;
    this.pointer.y = point.y;
    this.pointer.moved = true;

    if (distanceFromQueuedPoint >= this.pointerSegmentDistanceThreshold()) {
      this.queuePointerSegment(point.x, point.y);
    }

    this.lastInteraction = performance.now();
  }

  pointerUp(): void {
    if (this.pointer.down) {
      const releasedAt = performance.now();
      this.queuePointerSegment(this.pointer.x, this.pointer.y, true);

      if (this.activeInk) {
        this.extendDrying(releasedAt);
      }
    }

    this.pointer.down = false;
    this.pointer.moved = false;
    this.pointer.rect = null;
  }

  renderDisplay(settings = this.settings): void {
    this.settings = settings;

    if (!this.dye || !this.display) {
      return;
    }

    const background = hexToRgb(settings.backgroundHex);
    this.blit(this.programs.display, this.display, {
      uDye: this.dye.read.texture,
      uIncludeBackground: settings.includeBackground ? 1 : 0,
      uPaper: background,
      uTextureEnabled: settings.paperTextureEnabled ? 1 : 0,
      uTextureFiber: clamp(settings.paperTextureFiber, 0, 100) / 100,
      uTextureGrain: clamp(settings.paperTextureGrain, 0, 100) / 100,
      uTextureMottle: clamp(settings.paperTextureMottle, 0, 100) / 100,
      uTextureScale: clamp(settings.paperTextureScale, 50, 220),
    });
    this.presentDisplay();
    this.lastDisplayRender = performance.now();
  }

  resize(size: SuminagashiFluidSize): void {
    const nextWidth = Math.max(1, Math.round(size.cssWidth * size.renderScale));
    const nextHeight = Math.max(1, Math.round(size.cssHeight * size.renderScale));

    if (
      this.canvas.width === nextWidth &&
      this.canvas.height === nextHeight &&
      this.velocity &&
      this.dye &&
      this.pressure &&
      this.curl &&
      this.divergence
    ) {
      return;
    }

    this.canvas.width = nextWidth;
    this.canvas.height = nextHeight;
    this.canvasWidth = nextWidth;
    this.canvasHeight = nextHeight;
    this.activeInk = false;
    this.pendingPressureDt = 0;
    this.pendingPressureIterations = 0;
    this.resetDryingSchedule();

    deleteDoubleFramebuffer(this.gl, this.velocity);
    deleteDoubleFramebuffer(this.gl, this.dye);
    deleteDoubleFramebuffer(this.gl, this.pressure);
    deleteRenderTarget(this.gl, this.curl);
    deleteRenderTarget(this.gl, this.divergence);
    deleteRenderTarget(this.gl, this.display);

    const sizes = getSimulationSizes(nextWidth, nextHeight);

    this.velocity = createDoubleFramebuffer(this.gl, sizes.simWidth, sizes.simHeight);
    this.dye = createDoubleFramebuffer(this.gl, sizes.dyeWidth, sizes.dyeHeight);
    this.pressure = createDoubleFramebuffer(this.gl, sizes.simWidth, sizes.simHeight);
    this.curl = createRenderTarget(this.gl, sizes.simWidth, sizes.simHeight);
    this.divergence = createRenderTarget(this.gl, sizes.simWidth, sizes.simHeight);
    this.display = createRenderTarget(this.gl, sizes.dyeWidth, sizes.dyeHeight, "byte");
    this.warmPrograms();
    this.renderDisplay();
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion;
  }

  setSettings(settings: SuminagashiFluidSettings): void {
    this.settings = settings;
  }

  start(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame((now) => this.frame(now));
  }

  clearWithFade(): void {
    this.pointer.down = false;
    this.pointer.moved = false;
    this.pointer.rect = null;
    this.pointer.segments = [];
    this.washing = 0;
    this.activeInk = false;
    this.pendingPressureDt = 0;
    this.pendingPressureIterations = 0;
    this.resetDryingSchedule();
    this.clearDoubleFramebuffer(this.velocity);
    this.clearDoubleFramebuffer(this.pressure);
    this.clearFadeOpacity = 1;
    this.clearFadeStartedAt = performance.now();
    this.lastInteraction = this.clearFadeStartedAt;
    this.lastDisplayRender = this.clearFadeStartedAt - fluidConfig.activeDisplayMs;
  }

  private applyPointer(): boolean {
    if (this.pointer.segments.length === 0) {
      this.pointer.moved = false;
      return false;
    }

    const segments = coalescePointerSegments(
      this.pointer.segments.splice(0),
      fluidConfig.pointerSegmentsPerFrame,
    );
    this.pointer.moved = false;
    let applied = false;

    for (const segment of segments) {
      applied = this.applyPointerSegment(segment) || applied;
    }

    return applied;
  }

  private applyPointerSegment(segment: PointerSegment): boolean {
    const dx = segment.toX - segment.fromX;
    const dy = segment.toY - segment.fromY;
    const distance = Math.hypot(dx, dy);

    if (distance < 1e-6) {
      return false;
    }

    const flowMultiplier = this.brushFlowMultiplier();
    const forceX = dx * fluidConfig.splatForce * flowMultiplier;
    const forceY = dy * fluidConfig.splatForce * flowMultiplier;
    const speed = Math.min(distance * 30, 1);
    const dyeStrength = (0.06 + speed * 0.12) * this.brushLoadMultiplier();
    const velocityRadius = this.brushRadiusMultiplier(segment.down ? 2 : 1.4);

    this.splatVelocityLine(
      segment.fromX,
      segment.fromY,
      segment.toX,
      segment.toY,
      forceX,
      forceY,
      velocityRadius,
    );

    if (segment.down) {
      this.activeInk = true;
      this.extendDrying();
      const dyeRadius = this.brushRadiusMultiplier(0.95 + this.brushWetnessRatio() * 0.25);
      this.splatDyeLine(
        segment.fromX,
        segment.fromY,
        segment.toX,
        segment.toY,
        inkAbsorption(segment.colorHex, dyeStrength),
        dyeRadius,
      );
    }

    return true;
  }

  private brushFlowMultiplier(): number {
    return clamp(this.settings.brushFlow, 0, 180) / 100;
  }

  private brushLoadMultiplier(): number {
    return clamp(this.settings.brushLoad, 20, 180) / 100;
  }

  private brushRadiusMultiplier(base: number): number {
    const sizeScale = clamp(this.settings.brushSize, 6, 72) / 28;

    return base * sizeScale * sizeScale;
  }

  private brushWetnessRatio(): number {
    return clamp(this.settings.brushWetness, 0, 100) / 100;
  }

  private brushSettleRatio(): number {
    return clamp(this.settings.brushSettle, 0, 200) / 100;
  }

  private brushTaperRatio(): number {
    return clamp(this.settings.brushTaper, 0, 200) / 100;
  }

  private autoUpdate(now: number, dt: number): boolean {
    if (!this.settings.autoFlow || now < this.viewportInteractionUntil) {
      return false;
    }

    const idle = now - this.lastInteraction > 3000;
    this.nextDrop -= dt * 1000;
    let applied = false;

    if (idle && this.nextDrop <= 0) {
      const x = 0.14 + Math.random() * 0.72;
      const y = 0.16 + Math.random() * 0.68;
      const color = this.settings.paletteHex;
      this.dropInk(x, y, color, 0.8 + Math.random() * 0.7);
      applied = true;

      if (Math.random() < 0.3) {
        const secondColor = this.settings.paletteHex;
        const x2 = clamp(x + (Math.random() - 0.5) * 0.16, 0.08, 0.92);
        const y2 = clamp(y + (Math.random() - 0.5) * 0.16, 0.08, 0.92);
        const timer = window.setTimeout(() => {
          this.dropInk(x2, y2, secondColor, 0.5 + Math.random() * 0.4);
          this.renderDisplay();
        }, 220 + Math.random() * 300);
        this.dropTimers.push(timer);
      }

      this.nextDrop = (this.reducedMotion ? 6500 : 2600) + Math.random() * 2600;
    }

    this.nextStir -= dt * 1000;

    if (!this.reducedMotion && this.nextStir <= 0) {
      const t = now * 0.00012;
      const x = 0.5 + Math.sin(t * 1.7) * 0.3;
      const y = 0.5 + Math.cos(t * 1.1) * 0.3;
      const angle = t * 6 + Math.random() * 1.5;

      this.splatVelocity(x, y, Math.cos(angle) * 130, Math.sin(angle) * 130, 14);
      applied = this.activeInk || applied;
      this.nextStir = 700 + Math.random() * 900;
    }

    return applied;
  }

  private bindProgram(program: FluidProgram): void {
    const gl = this.gl;

    gl.useProgram(program.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(program.attribPosition);
    gl.vertexAttribPointer(program.attribPosition, 2, gl.FLOAT, false, 0, 0);
  }

  private blit(
    program: FluidProgram,
    target: RenderTarget | null,
    uniforms: Record<string, UniformValue> = {},
  ): void {
    const gl = this.gl;
    let textureUnit = 0;

    this.bindProgram(program);

    for (const [name, value] of Object.entries(uniforms)) {
      const location = getUniformLocation(gl, program, name);

      if (!location) {
        continue;
      }

      if (typeof value === "number") {
        gl.uniform1f(location, value);
        continue;
      }

      if (value && typeof value === "object" && !("r" in value) && !("x" in value)) {
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, value as WebGLTexture);
        gl.uniform1i(location, textureUnit);
        textureUnit += 1;
        continue;
      }

      if (value && "r" in value) {
        gl.uniform3f(location, value.r, value.g, value.b);
        continue;
      }

      if (value && "x" in value) {
        gl.uniform2f(location, value.x, value.y);
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
    gl.viewport(
      0,
      0,
      target?.width ?? this.canvasWidth,
      target?.height ?? this.canvasHeight,
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private presentDisplay(): void {
    if (!this.display) {
      return;
    }

    const gl = this.gl;

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.display.framebuffer);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(
      0,
      0,
      this.display.width,
      this.display.height,
      0,
      0,
      this.canvasWidth,
      this.canvasHeight,
      gl.COLOR_BUFFER_BIT,
      gl.LINEAR,
    );
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  }

  private clientToUv(clientX: number, clientY: number): Vec2 {
    const rect = this.pointer.rect ?? this.measureCanvasRect();

    return {
      x: clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1),
      y: clamp(1 - (clientY - rect.top) / Math.max(1, rect.height), 0, 1),
    };
  }

  private measureCanvasRect(): CanvasRect {
    const rect = this.canvas.getBoundingClientRect();

    return {
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    };
  }

  private pointerSegmentDistanceThreshold(): number {
    const rect = this.pointer.rect;
    const longestSide = Math.max(1, rect ? Math.max(rect.width, rect.height) : this.canvasWidth);
    const brushPixels = clamp(this.settings.brushSize, 6, 72);

    return clamp((brushPixels / longestSide) * 0.36, 0.002, 0.02);
  }

  private queuePointerSegment(toX: number, toY: number, force = false): void {
    const fromX = this.pointer.queuedX;
    const fromY = this.pointer.queuedY;

    if (!force && Math.hypot(toX - fromX, toY - fromY) < this.pointerSegmentDistanceThreshold()) {
      return;
    }

    if (Math.hypot(toX - fromX, toY - fromY) < 1e-6) {
      return;
    }

    this.pointer.segments.push({
      colorHex: this.pointer.colorHex,
      down: this.pointer.down,
      fromX,
      fromY,
      toX,
      toY,
    });

    this.pointer.queuedX = toX;
    this.pointer.queuedY = toY;

    if (this.pointer.segments.length > 96) {
      this.pointer.segments.splice(0, this.pointer.segments.length - 96);
    }
  }

  private currentInkColor(_advance: boolean): string {
    return this.settings.paletteHex;
  }

  private warmPrograms(): void {
    if (!this.velocity || !this.dye || !this.pressure || !this.curl || !this.divergence) {
      return;
    }

    const previousActiveInk = this.activeInk;
    const previousWashing = this.washing;
    const zero = { b: 0, g: 0, r: 0 };

    this.washing = 0;
    this.splatDye(0.5, 0.5, zero, 1);
    this.splatVelocity(0.5, 0.5, 0, 0, 1);
    this.splatDyeLine(0.49, 0.5, 0.51, 0.5, zero, 1);
    this.splatVelocityLine(0.49, 0.5, 0.51, 0.5, 0, 0, 1);
    this.step(1 / 60);

    while (this.pendingPressureIterations > 0) {
      this.continuePressureProjection();
    }

    this.pendingPressureDt = 0;
    this.pendingPressureIterations = 0;
    this.activeInk = previousActiveInk;
    this.washing = previousWashing;
  }

  private dropInk(
    x: number,
    y: number,
    colorHex: string,
    strength: number,
    options: {
      flowMultiplier?: number;
      loadMultiplier?: number;
      radiusMultiplier?: number;
    } = {},
  ): void {
    this.activeInk = true;
    this.pendingPressureDt = 0;
    this.pendingPressureIterations = 0;
    this.extendDrying();
    const loadMultiplier = options.loadMultiplier ?? 1;
    const radiusMultiplier = options.radiusMultiplier ?? 1;

    this.splatDye(
      x,
      y,
      inkAbsorption(colorHex, strength * 0.22 * loadMultiplier),
      radiusMultiplier,
    );

    const angle = Math.random() * Math.PI * 2;
    const speed = (60 + Math.random() * 80) * (options.flowMultiplier ?? 1);

    this.splatVelocity(
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      radiusMultiplier * 1.2,
    );
  }

  private frame(now: number): void {
    this.animationFrameId = requestAnimationFrame((nextNow) => this.frame(nextNow));

    let dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    dt = Math.min(dt, 1 / 30);

    if (dt <= 0) {
      return;
    }

    if (this.clearFadeStartedAt > 0) {
      this.stepClearFade(now);
      return;
    }

    if (now < this.viewportInteractionUntil && !this.pointer.down && !this.pointer.moved) {
      return;
    }

    const pointerApplied = this.applyPointer();

    if (this.pointer.down) {
      const wetPreviewDue = now - this.lastWetPreview >= fluidConfig.activeWetPreviewMs;
      const displayDue = now - this.lastDisplayRender >= fluidConfig.activeDisplayMs;

      if (pointerApplied) {
        if (this.activeInk && wetPreviewDue) {
          this.previewWetStep(dt);
          this.lastWetPreview = now;
        }

        if (displayDue || wetPreviewDue) {
          this.renderDisplay();
        }

        return;
      }

      if (this.activeInk && wetPreviewDue) {
        this.previewWetStep(dt);
        this.renderDisplay();
        this.lastWetPreview = now;
      }

      return;
    }

    if (this.pendingPressureIterations > 0) {
      const stepped = this.step(dt);

      if (stepped && this.activeInk && !this.pointer.down && this.washing <= 0) {
        this.applyStopTaperDamping(now);
      }

      if (stepped || pointerApplied) {
        this.renderDisplay();
      }
      return;
    }

    const autoApplied = this.autoUpdate(now, dt);

    if (!this.activeInk && !pointerApplied && !autoApplied && this.washing <= 0) {
      return;
    }

    if (this.activeInk && !autoApplied && this.washing <= 0) {
      if (now >= this.dryingUntil) {
        this.freezeSettledInk();
        return;
      }

      const stepped = this.step(dt);

      if (stepped) {
        this.applyStopTaperDamping(now);
      }

      if (stepped || pointerApplied) {
        this.renderDisplay();
      }
      return;
    }

    this.step(dt);
    this.renderDisplay();
  }

  private previewWetStep(dt: number): void {
    if (!this.velocity || !this.dye) {
      return;
    }

    const wetness = this.brushWetnessRatio();
    const wetDt = Math.min(1 / 30, dt * (0.45 + wetness * 1.8));
    const dyeDissipation = fluidConfig.dyeDissipation * (0.25 + (1 - wetness) * 0.55);

    this.blit(this.programs.advect, this.dye.write, {
      uDissipation: dyeDissipation,
      uDt: wetDt * (1 + wetness * 0.75),
      uSource: this.dye.read.texture,
      uTexel: this.dye.texel,
      uVelocity: this.velocity.read.texture,
    });
    this.dye.swap();
  }

  private fadeDoubleFramebuffer(target: DoubleFramebuffer | null, value: number): void {
    if (!target) {
      return;
    }

    this.blit(this.programs.clear, target.write, {
      uTexture: target.read.texture,
      uValue: value,
    });
    target.swap();
  }

  private clearDoubleFramebuffer(target: DoubleFramebuffer | null): void {
    this.fadeDoubleFramebuffer(target, 0);
  }

  private stepClearFade(now: number): void {
    if (!this.dye) {
      this.clearFadeOpacity = 0;
      this.clearFadeStartedAt = 0;
      return;
    }

    const progress = clamp(
      (now - this.clearFadeStartedAt) / fluidConfig.clearFadeMs,
      0,
      1,
    );

    if (progress >= 1 || this.clearFadeOpacity <= 0.001) {
      this.clearDoubleFramebuffer(this.dye);
      this.clearFadeOpacity = 0;
      this.clearFadeStartedAt = 0;
      this.renderDisplay();
      return;
    }

    const nextOpacity = Math.max(0.001, (1 - progress) * (1 - progress));
    const fadeFactor = clamp(nextOpacity / Math.max(0.001, this.clearFadeOpacity), 0, 1);

    this.fadeDoubleFramebuffer(this.dye, fadeFactor);
    this.clearFadeOpacity = nextOpacity;
    this.renderDisplay();
  }

  private resetDryingSchedule(): void {
    this.dryingTaperDurationMs = 0;
    this.dryingTaperStartsAt = 0;
    this.dryingUntil = 0;
    this.lastTaperDampingAt = 0;
  }

  private extendDrying(now = performance.now()): void {
    const settleDuration =
      (fluidConfig.dryingBaseMs + this.brushWetnessRatio() * fluidConfig.dryingWetnessMs) *
      this.brushSettleRatio();
    const taperDuration = fluidConfig.dryingTaperMaxMs * this.brushTaperRatio();
    const taperStartsAt = now + settleDuration;
    const nextDryingUntil = taperStartsAt + taperDuration;

    if (nextDryingUntil >= this.dryingUntil) {
      this.dryingTaperDurationMs = taperDuration;
      this.dryingTaperStartsAt = taperStartsAt;
      this.dryingUntil = nextDryingUntil;
      this.lastTaperDampingAt = 0;
    }
  }

  private applyStopTaperDamping(now: number): void {
    if (
      !this.velocity ||
      this.dryingTaperDurationMs <= 0 ||
      now < this.dryingTaperStartsAt
    ) {
      return;
    }

    const progress = clamp(
      (now - this.dryingTaperStartsAt) / this.dryingTaperDurationMs,
      0,
      1,
    );
    const eased = progress * progress * (3 - 2 * progress);
    const elapsedMs =
      this.lastTaperDampingAt > 0
        ? now - this.lastTaperDampingAt
        : now - this.dryingTaperStartsAt;
    const elapsedSeconds = clamp(elapsedMs / 1000, 1 / 120, 1 / 12);
    const taperRatio = this.brushTaperRatio();
    const dampingPerSecond = 1.25 + eased * (7.5 + taperRatio * 1.75);
    const damping = clamp(Math.exp(-dampingPerSecond * elapsedSeconds), 0.08, 1);

    this.fadeDoubleFramebuffer(this.velocity, damping);
    this.lastTaperDampingAt = now;
  }

  private freezeSettledInk(): void {
    this.activeInk = false;
    this.pendingPressureDt = 0;
    this.pendingPressureIterations = 0;
    this.resetDryingSchedule();
    this.clearDoubleFramebuffer(this.velocity);
    this.clearDoubleFramebuffer(this.pressure);
  }

  private splatDye(x: number, y: number, absorption: Rgb, radiusMultiplier: number): void {
    if (!this.dye) {
      return;
    }

    this.blit(this.programs.splat, this.dye.write, {
      uAspect: this.canvasWidth / Math.max(1, this.canvasHeight),
      uColor: absorption,
      uPoint: { x, y },
      uRadius: fluidConfig.splatRadius * radiusMultiplier,
      uTarget: this.dye.read.texture,
    });
    this.dye.swap();
  }

  private splatDyeLine(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    absorption: Rgb,
    radiusMultiplier: number,
  ): void {
    if (!this.dye) {
      return;
    }

    this.blit(this.programs.splatLine, this.dye.write, {
      uAspect: this.canvasWidth / Math.max(1, this.canvasHeight),
      uColor: absorption,
      uPointA: { x: fromX, y: fromY },
      uPointB: { x: toX, y: toY },
      uRadius: fluidConfig.splatRadius * radiusMultiplier,
      uTarget: this.dye.read.texture,
    });
    this.dye.swap();
  }

  private splatVelocity(
    x: number,
    y: number,
    forceX: number,
    forceY: number,
    radiusMultiplier: number,
  ): void {
    if (!this.velocity) {
      return;
    }

    this.blit(this.programs.splat, this.velocity.write, {
      uAspect: this.canvasWidth / Math.max(1, this.canvasHeight),
      uColor: { b: 0, g: forceY, r: forceX },
      uPoint: { x, y },
      uRadius: fluidConfig.splatRadius * radiusMultiplier,
      uTarget: this.velocity.read.texture,
    });
    this.velocity.swap();
  }

  private splatVelocityLine(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    forceX: number,
    forceY: number,
    radiusMultiplier: number,
  ): void {
    if (!this.velocity) {
      return;
    }

    this.blit(this.programs.splatLine, this.velocity.write, {
      uAspect: this.canvasWidth / Math.max(1, this.canvasHeight),
      uColor: { b: 0, g: forceY, r: forceX },
      uPointA: { x: fromX, y: fromY },
      uPointB: { x: toX, y: toY },
      uRadius: fluidConfig.splatRadius * radiusMultiplier,
      uTarget: this.velocity.read.texture,
    });
    this.velocity.swap();
  }

  private step(dt: number): boolean {
    if (!this.velocity || !this.dye || !this.pressure || !this.curl || !this.divergence) {
      return false;
    }

    if (this.pendingPressureIterations > 0) {
      return this.continuePressureProjection();
    }

    this.blit(this.programs.curl, this.curl, {
      uTexel: this.velocity.texel,
      uVelocity: this.velocity.read.texture,
    });
    this.blit(this.programs.vorticity, this.velocity.write, {
      uCurl: this.curl.texture,
      uCurlStrength: fluidConfig.curl,
      uDt: dt,
      uTexel: this.velocity.texel,
      uVelocity: this.velocity.read.texture,
    });
    this.velocity.swap();

    this.blit(this.programs.divergence, this.divergence, {
      uTexel: this.velocity.texel,
      uVelocity: this.velocity.read.texture,
    });
    this.blit(this.programs.clear, this.pressure.write, {
      uTexture: this.pressure.read.texture,
      uValue: 0.8,
    });
    this.pressure.swap();

    this.pendingPressureDt = dt;
    this.pendingPressureIterations = fluidConfig.pressureIterations;
    return this.continuePressureProjection();
  }

  private continuePressureProjection(): boolean {
    if (!this.velocity || !this.dye || !this.pressure || !this.divergence) {
      this.pendingPressureDt = 0;
      this.pendingPressureIterations = 0;
      return false;
    }

    const iterations = Math.min(
      fluidConfig.pressureIterationsPerFrame,
      this.pendingPressureIterations,
    );

    for (let index = 0; index < iterations; index += 1) {
      this.blit(this.programs.pressure, this.pressure.write, {
        uDivergence: this.divergence.texture,
        uPressure: this.pressure.read.texture,
        uTexel: this.velocity.texel,
      });
      this.pressure.swap();
    }

    this.pendingPressureIterations -= iterations;
    this.gl.flush();

    if (this.pendingPressureIterations > 0) {
      return false;
    }

    const dt = this.pendingPressureDt;
    this.pendingPressureDt = 0;

    this.blit(this.programs.gradientSubtract, this.velocity.write, {
      uPressure: this.pressure.read.texture,
      uTexel: this.velocity.texel,
      uVelocity: this.velocity.read.texture,
    });
    this.velocity.swap();

    this.blit(this.programs.advect, this.velocity.write, {
      uDissipation: fluidConfig.velocityDissipation,
      uDt: dt,
      uSource: this.velocity.read.texture,
      uTexel: this.velocity.texel,
      uVelocity: this.velocity.read.texture,
    });
    this.velocity.swap();

    this.blit(this.programs.advect, this.dye.write, {
      uDissipation: fluidConfig.dyeDissipation + (this.washing > 0 ? 2.4 : 0),
      uDt: dt,
      uSource: this.dye.read.texture,
      uTexel: this.dye.texel,
      uVelocity: this.velocity.read.texture,
    });
    this.dye.swap();

    if (this.washing > 0) {
      this.washing -= dt;
    }

    return true;
  }
}
