import { liquidGlassDispersionSpread } from "./liquid-glass-displacement";

export type LiquidGlassLensDescriptor = {
  blur: number;
  brightness: number;
  buttonImageBlendMode: number;
  buttonImageEnabled: number;
  cornerRadius: number;
  dispersion: number;
  fisheye: number;
  murkiness: number;
  opacity: number;
  originX: number;
  originY: number;
  scaleX: number;
  scaleY: number;
  shadowBlurPx: number;
  shadowBlue: number;
  shadowEnabled: number;
  shadowGreen: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowOpacity: number;
  shadowRed: number;
  sizeX: number;
  sizeY: number;
  sourceSaturation: number;
  specular: number;
  textBlendMode: number;
  textEnabled: number;
  textOffsetX: number;
  textOffsetY: number;
  textureBlendMode: number;
  textureEnabled: number;
  textureOpacity: number;
};

export type LiquidGlassWebGLRendererOptions = {
  preserveDrawingBuffer?: boolean;
};

export type LiquidGlassWebGLRenderOptions = {
  buttonImage?: TexImageSource | null;
  buttonImageDirty?: boolean;
  buttonImageHeight?: number;
  buttonImageWidth?: number;
  sourceDirty?: boolean;
  text?: TexImageSource | null;
  textDirty?: boolean;
  textHeight?: number;
  textWidth?: number;
  texture?: TexImageSource | null;
  textureDirty?: boolean;
  textureHeight?: number;
  textureWidth?: number;
};

type WebGLRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

const vertexShaderSource = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const blitFragmentSource = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform float u_source_saturation;

vec3 applySourceSaturation(vec3 color) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(luma), color, max(0.0, u_source_saturation));
}

void main() {
  vec4 color = texture(u_src, v_uv);
  o = vec4(applySourceSaturation(color.rgb), color.a);
}`;

const blurFragmentSource = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform vec2 u_step;
void main() {
  vec4 c = texture(u_src, v_uv) * 0.1857;
  c += (texture(u_src, v_uv + u_step) + texture(u_src, v_uv - u_step)) * 0.1671;
  c += (texture(u_src, v_uv + 2.0 * u_step) + texture(u_src, v_uv - 2.0 * u_step)) * 0.1227;
  c += (texture(u_src, v_uv + 3.0 * u_step) + texture(u_src, v_uv - 3.0 * u_step)) * 0.0768;
  c += (texture(u_src, v_uv + 4.0 * u_step) + texture(u_src, v_uv - 4.0 * u_step)) * 0.0414;
  o = c;
}`;

const lensFragmentSource = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform sampler2D u_blur;
uniform sampler2D u_disp;
uniform vec2 u_origin;
uniform vec2 u_size;
uniform vec2 u_scale;
uniform vec2 u_lenspx;
uniform float u_radiuspx;
uniform float u_dispersion;
uniform float u_sheen;
uniform float u_frost;
uniform float u_opacity;
uniform float u_brightness;
uniform float u_fisheye;
uniform float u_murkiness;
uniform float u_source_saturation;
uniform sampler2D u_texture;
uniform float u_texture_blend;
uniform float u_texture_enabled;
uniform float u_texture_opacity;
uniform sampler2D u_button_image;
uniform float u_button_image_blend;
uniform float u_button_image_enabled;
uniform sampler2D u_text;
uniform float u_text_blend;
uniform float u_text_enabled;
uniform vec2 u_text_offset;
uniform vec4 u_shadow_color;
uniform float u_shadow_enabled;
uniform vec2 u_shadow_offset;
uniform float u_shadow_blurpx;

float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

vec3 applySourceSaturation(vec3 color) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(luma), color, max(0.0, u_source_saturation));
}

vec4 sampleSource(vec2 p) {
  vec4 color = texture(u_src, p);
  return vec4(applySourceSaturation(color.rgb), color.a);
}

vec4 sampleBlur(vec2 p) {
  vec4 color = texture(u_blur, p);
  return vec4(applySourceSaturation(color.rgb), color.a);
}

vec4 frosted(vec2 p, float mixAmt) {
  vec4 raw = sampleSource(p);
  return mixAmt > 0.0 ? mix(raw, sampleBlur(p), mixAmt) : raw;
}

vec3 blendOverlay(vec3 base, vec3 blend) {
  return mix(
    2.0 * base * blend,
    1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
    step(vec3(0.5), base)
  );
}

vec3 blendSoftLight(vec3 base, vec3 blend) {
  return clamp((1.0 - 2.0 * blend) * base * base + 2.0 * blend * base, 0.0, 1.0);
}

vec3 blendTexture(vec3 base, vec3 blend, float mode) {
  if (mode < 0.5) {
    return blend;
  }
  if (mode < 1.5) {
    return base * blend;
  }
  if (mode < 2.5) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
  }
  if (mode < 3.5) {
    return blendOverlay(base, blend);
  }
  return blendSoftLight(base, blend);
}

void main() {
  vec2 lensUV = (v_uv - u_origin) / u_size;
  vec2 p = (lensUV - 0.5) * u_lenspx;
  float sdf = sdRoundRect(p, u_lenspx * 0.5, min(u_radiuspx, min(u_lenspx.x, u_lenspx.y) * 0.5));
  float coverage = (1.0 - smoothstep(-1.0, 1.0, sdf)) * u_opacity;
  vec4 backdrop = sampleSource(v_uv);
  vec4 compositeBackdrop = backdrop;

  if (u_shadow_enabled > 0.5 && u_shadow_color.a > 0.0) {
    vec2 shadowUV = (v_uv - u_origin - u_shadow_offset) / u_size;
    vec2 shadowP = (shadowUV - 0.5) * u_lenspx;
    float shadowSdf = sdRoundRect(shadowP, u_lenspx * 0.5, min(u_radiuspx, min(u_lenspx.x, u_lenspx.y) * 0.5));
    float shadowBlur = max(1.0, u_shadow_blurpx);
    float shadowAlpha = (1.0 - smoothstep(-shadowBlur * 0.45, shadowBlur, shadowSdf)) * u_shadow_color.a;
    compositeBackdrop = vec4(
      mix(backdrop.rgb, u_shadow_color.rgb, clamp(shadowAlpha, 0.0, 1.0)),
      max(backdrop.a, shadowAlpha)
    );
  }

  if (coverage <= 0.0) {
    o = compositeBackdrop;
    return;
  }

  vec4 d = texture(u_disp, clamp(lensUV, vec2(0.0), vec2(1.0)));
  vec2 disp = (d.rg - 0.5) * u_scale;
  vec2 centered = lensUV - 0.5;
  float radial = 1.0 - clamp(length(centered) * 2.0, 0.0, 1.0);
  disp += centered * radial * radial * u_fisheye * 0.045;
  disp *= 1.0 + u_fisheye * radial * 0.4;

  vec2 uvR = v_uv + disp * (1.0 + u_dispersion * ${liquidGlassDispersionSpread.toFixed(4)});
  vec2 uvG = v_uv + disp * (1.0 + u_dispersion * ${(liquidGlassDispersionSpread * 0.5).toFixed(4)});
  vec2 uvB = v_uv + disp;
  vec4 r = frosted(uvR, u_frost);
  vec4 g = frosted(uvG, u_frost);
  vec4 b = frosted(uvB, u_frost);
  vec3 lensCol = vec3(r.r, g.g, b.b);
  float lensAlpha = max(max(r.a, g.a), b.a);

  lensCol += u_sheen * max(0.0, d.b - 0.5);
  if (u_brightness > 0.0) {
    lensCol = mix(lensCol, vec3(1.0), clamp(u_brightness, 0.0, 1.0));
  } else if (u_brightness < 0.0) {
    lensCol = mix(lensCol, vec3(0.0), clamp(-u_brightness, 0.0, 1.0));
  }
  lensCol = mix(lensCol, vec3(0.92, 0.96, 1.0), clamp(u_murkiness, 0.0, 1.0));

  if (u_texture_enabled > 0.5 && u_texture_opacity > 0.0) {
    vec4 textureColor = texture(u_texture, clamp(lensUV, vec2(0.0), vec2(1.0)));
    float textureAlpha = clamp(textureColor.a * u_texture_opacity, 0.0, 1.0);
    vec3 baseColor = clamp(lensCol, 0.0, 1.0);
    vec3 blendedTexture = blendTexture(baseColor, clamp(textureColor.rgb, 0.0, 1.0), u_texture_blend);
    lensCol = mix(lensCol, blendedTexture, textureAlpha);
  }

  if (u_button_image_enabled > 0.5) {
    vec4 buttonImageColor = texture(u_button_image, clamp(lensUV, vec2(0.0), vec2(1.0)));
    float buttonImageAlpha = clamp(buttonImageColor.a, 0.0, 1.0);
    vec3 baseColor = clamp(lensCol, 0.0, 1.0);
    vec3 blendedButtonImage = blendTexture(baseColor, clamp(buttonImageColor.rgb, 0.0, 1.0), u_button_image_blend);
    lensCol = mix(lensCol, blendedButtonImage, buttonImageAlpha);
    lensAlpha = max(lensAlpha, buttonImageAlpha);
  }

  if (u_text_enabled > 0.5) {
    vec2 textUV = lensUV - u_text_offset * 0.5;
    vec4 textColor = vec4(0.0);
    if (textUV.x >= 0.0 && textUV.x <= 1.0 && textUV.y >= 0.0 && textUV.y <= 1.0) {
      textColor = texture(u_text, textUV);
    }
    float textAlpha = clamp(textColor.a, 0.0, 1.0);
    vec3 baseColor = clamp(lensCol, 0.0, 1.0);
    vec3 blendedText = blendTexture(baseColor, clamp(textColor.rgb, 0.0, 1.0), u_text_blend);
    lensCol = mix(lensCol, blendedText, textAlpha);
  }

  o = vec4(
    mix(compositeBackdrop.rgb, lensCol, coverage),
    mix(compositeBackdrop.a, max(lensAlpha, 1.0), coverage)
  );
}`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
  label: string,
): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Could not create liquid glass shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    const version = gl.getParameter(gl.VERSION);
    const shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
    gl.deleteShader(shader);
    throw new Error(
      [
        `Liquid glass ${label} shader compile failed: ${log || "unknown error"}`,
        `contextLost=${gl.isContextLost()}`,
        `version=${String(version)}`,
        `shading=${String(shadingLanguageVersion)}`,
        `source=${source.slice(0, 160)}`,
      ].join(" | "),
    );
  }

  return shader;
}

function linkProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Could not create liquid glass WebGL program.");
  }

  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource, "vertex");
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, "fragment");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, "a_pos");
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Liquid glass WebGL link failed: ${log ?? "unknown error"}`);
  }

  return program;
}

export class LiquidGlassWebGLRenderer {
  private blitProgram: WebGLProgram;
  private buttonImageHeight = 0;
  private buttonImageTexture: WebGLTexture;
  private buttonImageWidth = 0;
  private blurFramebuffers: [WebGLFramebuffer, WebGLFramebuffer];
  private blurHeight = 0;
  private blurProgram: WebGLProgram;
  private blurTextures: [WebGLTexture, WebGLTexture];
  private blurUniforms: Record<string, WebGLUniformLocation | null>;
  private blurWidth = 0;
  private disposed = false;
  private displacementTexture: WebGLTexture;
  private gl: WebGL2RenderingContext;
  private lensProgram: WebGLProgram;
  private lensUniforms: Record<string, WebGLUniformLocation | null>;
  private quadBuffer: WebGLBuffer;
  private sourceHeight = 0;
  private sourceTexture: WebGLTexture;
  private sourceWidth = 0;
  private textHeight = 0;
  private textTexture: WebGLTexture;
  private textWidth = 0;
  private textureHeight = 0;
  private textureTexture: WebGLTexture;
  private textureWidth = 0;
  private blitSourceUniform: WebGLUniformLocation | null;
  private blitSourceSaturationUniform: WebGLUniformLocation | null;
  private hasBlurTexture = false;
  private lastBlurPx = Number.NaN;
  private lastFrameHeight = 0;
  private lastFrameWidth = 0;
  private lastLensRect: WebGLRect | null = null;
  private lastSourceSaturation = Number.NaN;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: LiquidGlassWebGLRendererOptions = {},
  ) {
    const gl =
      canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
      }) ?? canvas.getContext("webgl2");

    if (!gl) {
      throw new Error("WebGL2 is unavailable for liquid glass rendering.");
    }

    this.gl = gl;
    this.blitProgram = linkProgram(gl, vertexShaderSource, blitFragmentSource);
    this.blurProgram = linkProgram(gl, vertexShaderSource, blurFragmentSource);
    this.lensProgram = linkProgram(gl, vertexShaderSource, lensFragmentSource);

    const quadBuffer = gl.createBuffer();

    if (!quadBuffer) {
      throw new Error("Could not create liquid glass quad buffer.");
    }

    this.quadBuffer = quadBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    this.sourceTexture = this.createTexture();
    this.buttonImageTexture = this.createTexture();
    this.textTexture = this.createTexture();
    this.textureTexture = this.createTexture();
    this.displacementTexture = this.createTexture();
    this.blurTextures = [this.createTexture(), this.createTexture()];

    const firstFramebuffer = gl.createFramebuffer();
    const secondFramebuffer = gl.createFramebuffer();

    if (!firstFramebuffer || !secondFramebuffer) {
      throw new Error("Could not create liquid glass blur framebuffers.");
    }

    this.blurFramebuffers = [firstFramebuffer, secondFramebuffer];
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    this.blitSourceUniform = gl.getUniformLocation(this.blitProgram, "u_src");
    this.blitSourceSaturationUniform = gl.getUniformLocation(
      this.blitProgram,
      "u_source_saturation",
    );
    this.blurUniforms = {
      source: gl.getUniformLocation(this.blurProgram, "u_src"),
      step: gl.getUniformLocation(this.blurProgram, "u_step"),
    };
    this.lensUniforms = {
      blur: gl.getUniformLocation(this.lensProgram, "u_blur"),
      brightness: gl.getUniformLocation(this.lensProgram, "u_brightness"),
      buttonImage: gl.getUniformLocation(this.lensProgram, "u_button_image"),
      buttonImageBlend: gl.getUniformLocation(this.lensProgram, "u_button_image_blend"),
      buttonImageEnabled: gl.getUniformLocation(this.lensProgram, "u_button_image_enabled"),
      dispersion: gl.getUniformLocation(this.lensProgram, "u_dispersion"),
      displacement: gl.getUniformLocation(this.lensProgram, "u_disp"),
      fisheye: gl.getUniformLocation(this.lensProgram, "u_fisheye"),
      frost: gl.getUniformLocation(this.lensProgram, "u_frost"),
      lensPx: gl.getUniformLocation(this.lensProgram, "u_lenspx"),
      murkiness: gl.getUniformLocation(this.lensProgram, "u_murkiness"),
      opacity: gl.getUniformLocation(this.lensProgram, "u_opacity"),
      origin: gl.getUniformLocation(this.lensProgram, "u_origin"),
      radiusPx: gl.getUniformLocation(this.lensProgram, "u_radiuspx"),
      scale: gl.getUniformLocation(this.lensProgram, "u_scale"),
      shadowBlurPx: gl.getUniformLocation(this.lensProgram, "u_shadow_blurpx"),
      shadowColor: gl.getUniformLocation(this.lensProgram, "u_shadow_color"),
      shadowEnabled: gl.getUniformLocation(this.lensProgram, "u_shadow_enabled"),
      shadowOffset: gl.getUniformLocation(this.lensProgram, "u_shadow_offset"),
      size: gl.getUniformLocation(this.lensProgram, "u_size"),
      source: gl.getUniformLocation(this.lensProgram, "u_src"),
      sourceSaturation: gl.getUniformLocation(this.lensProgram, "u_source_saturation"),
      specular: gl.getUniformLocation(this.lensProgram, "u_sheen"),
      text: gl.getUniformLocation(this.lensProgram, "u_text"),
      textBlend: gl.getUniformLocation(this.lensProgram, "u_text_blend"),
      textEnabled: gl.getUniformLocation(this.lensProgram, "u_text_enabled"),
      textOffset: gl.getUniformLocation(this.lensProgram, "u_text_offset"),
      texture: gl.getUniformLocation(this.lensProgram, "u_texture"),
      textureBlend: gl.getUniformLocation(this.lensProgram, "u_texture_blend"),
      textureEnabled: gl.getUniformLocation(this.lensProgram, "u_texture_enabled"),
      textureOpacity: gl.getUniformLocation(this.lensProgram, "u_texture_opacity"),
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    const { gl } = this;
    gl.deleteProgram(this.blitProgram);
    gl.deleteProgram(this.blurProgram);
    gl.deleteProgram(this.lensProgram);
    gl.deleteTexture(this.buttonImageTexture);
    gl.deleteTexture(this.sourceTexture);
    gl.deleteTexture(this.textTexture);
    gl.deleteTexture(this.textureTexture);
    gl.deleteTexture(this.displacementTexture);
    gl.deleteTexture(this.blurTextures[0]);
    gl.deleteTexture(this.blurTextures[1]);
    gl.deleteFramebuffer(this.blurFramebuffers[0]);
    gl.deleteFramebuffer(this.blurFramebuffers[1]);
    gl.deleteBuffer(this.quadBuffer);
  }

  resize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));

    if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
      this.canvas.width = nextWidth;
      this.canvas.height = nextHeight;
    }
  }

  render(
    source: TexImageSource,
    sourceWidth: number,
    sourceHeight: number,
    lens: LiquidGlassLensDescriptor,
    options: LiquidGlassWebGLRenderOptions = {},
  ): void {
    if (this.disposed || sourceWidth <= 0 || sourceHeight <= 0) {
      return;
    }

    const { gl } = this;
    const sourceChanged = this.uploadSource(
      source,
      sourceWidth,
      sourceHeight,
      options.sourceDirty ?? true,
    );
    this.uploadTexture(
      options.texture ?? null,
      options.textureWidth ?? 1,
      options.textureHeight ?? 1,
      options.textureDirty ?? true,
    );
    this.uploadButtonImage(
      options.buttonImage ?? null,
      options.buttonImageWidth ?? 1,
      options.buttonImageHeight ?? 1,
      options.buttonImageDirty ?? true,
    );
    this.uploadText(
      options.text ?? null,
      options.textWidth ?? 1,
      options.textHeight ?? 1,
      options.textDirty ?? true,
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);

    if (
      lens.blur > 0 &&
      (sourceChanged || !this.hasBlurTexture || this.lastBlurPx !== lens.blur)
    ) {
      this.renderFrost(lens.blur);
      this.hasBlurTexture = true;
      this.lastBlurPx = lens.blur;
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    const currentLensRect = this.getLensScissorRect(width, height, lens);
    const fullRedraw =
      sourceChanged ||
      width !== this.lastFrameWidth ||
      height !== this.lastFrameHeight ||
      this.lastSourceSaturation !== lens.sourceSaturation ||
      !this.lastLensRect;
    const restoreRect = fullRedraw
      ? { x: 0, y: 0, width, height }
      : this.unionRects(this.lastLensRect, currentLensRect);
    gl.viewport(0, 0, width, height);

    gl.useProgram(this.blitProgram);
    if (restoreRect) {
      this.applyScissorRect(restoreRect);
    } else {
      gl.disable(gl.SCISSOR_TEST);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform1i(this.blitSourceUniform, 0);
    gl.uniform1f(this.blitSourceSaturationUniform, lens.sourceSaturation);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.useProgram(this.lensProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform1i(this.lensUniforms.source, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.displacementTexture);
    gl.uniform1i(this.lensUniforms.displacement, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.blurTextures[1]);
    gl.uniform1i(this.lensUniforms.blur, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.textureTexture);
    gl.uniform1i(this.lensUniforms.texture, 3);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.buttonImageTexture);
    gl.uniform1i(this.lensUniforms.buttonImage, 4);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.textTexture);
    gl.uniform1i(this.lensUniforms.text, 5);

    gl.uniform2f(this.lensUniforms.origin, lens.originX, lens.originY);
    gl.uniform2f(this.lensUniforms.size, lens.sizeX, lens.sizeY);
    gl.uniform2f(this.lensUniforms.scale, lens.scaleX, lens.scaleY);
    gl.uniform2f(this.lensUniforms.lensPx, lens.sizeX * width, lens.sizeY * height);
    gl.uniform1f(this.lensUniforms.radiusPx, lens.cornerRadius * width);
    gl.uniform1f(this.lensUniforms.dispersion, lens.dispersion);
    gl.uniform1f(this.lensUniforms.specular, lens.specular);
    gl.uniform1f(this.lensUniforms.frost, lens.blur > 0 ? Math.min(1, lens.blur / 8) : 0);
    gl.uniform1f(this.lensUniforms.opacity, lens.opacity);
    gl.uniform1f(this.lensUniforms.brightness, lens.brightness);
    gl.uniform1f(this.lensUniforms.fisheye, lens.fisheye);
    gl.uniform1f(this.lensUniforms.murkiness, lens.murkiness);
    gl.uniform1f(this.lensUniforms.sourceSaturation, lens.sourceSaturation);
    gl.uniform4f(
      this.lensUniforms.shadowColor,
      lens.shadowRed,
      lens.shadowGreen,
      lens.shadowBlue,
      lens.shadowOpacity,
    );
    gl.uniform1f(this.lensUniforms.shadowEnabled, lens.shadowEnabled);
    gl.uniform2f(this.lensUniforms.shadowOffset, lens.shadowOffsetX, lens.shadowOffsetY);
    gl.uniform1f(this.lensUniforms.shadowBlurPx, lens.shadowBlurPx);
    gl.uniform1f(this.lensUniforms.textureBlend, lens.textureBlendMode);
    gl.uniform1f(this.lensUniforms.textureEnabled, lens.textureEnabled);
    gl.uniform1f(this.lensUniforms.textureOpacity, lens.textureOpacity);
    gl.uniform1f(this.lensUniforms.buttonImageBlend, lens.buttonImageBlendMode);
    gl.uniform1f(this.lensUniforms.buttonImageEnabled, lens.buttonImageEnabled);
    gl.uniform1f(this.lensUniforms.textBlend, lens.textBlendMode);
    gl.uniform1f(this.lensUniforms.textEnabled, lens.textEnabled);
    gl.uniform2f(this.lensUniforms.textOffset, lens.textOffsetX, lens.textOffsetY);
    if (currentLensRect) {
      this.applyScissorRect(currentLensRect);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.disable(gl.SCISSOR_TEST);
    this.lastFrameWidth = width;
    this.lastFrameHeight = height;
    this.lastLensRect = currentLensRect;
    this.lastSourceSaturation = lens.sourceSaturation;
  }

  setDisplacementMap(source: TexImageSource): void {
    if (this.disposed) {
      return;
    }

    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.displacementTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  private createTexture(): WebGLTexture {
    const texture = this.gl.createTexture();

    if (!texture) {
      throw new Error("Could not create liquid glass texture.");
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    return texture;
  }

  private ensureBlurTargets(width: number, height: number): void {
    if (width === this.blurWidth && height === this.blurHeight) {
      return;
    }

    const { gl } = this;

    for (let index = 0; index < 2; index += 1) {
      gl.bindTexture(gl.TEXTURE_2D, this.blurTextures[index]);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurFramebuffers[index]);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.blurTextures[index],
        0,
      );
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.blurWidth = width;
    this.blurHeight = height;
  }

  private renderFrost(blurPx: number): void {
    const { gl } = this;
    this.ensureBlurTargets(this.sourceWidth, this.sourceHeight);
    gl.useProgram(this.blurProgram);
    gl.viewport(0, 0, this.sourceWidth, this.sourceHeight);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this.blurUniforms.source, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurFramebuffers[0]);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform2f(this.blurUniforms.step, blurPx / this.sourceWidth, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurFramebuffers[1]);
    gl.bindTexture(gl.TEXTURE_2D, this.blurTextures[0]);
    gl.uniform2f(this.blurUniforms.step, 0, blurPx / this.sourceHeight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private getLensScissorRect(
    width: number,
    height: number,
    lens: LiquidGlassLensDescriptor,
  ): WebGLRect | null {
    const shadowPadding =
      lens.shadowEnabled > 0
        ? lens.shadowBlurPx +
          Math.max(
            Math.abs(lens.shadowOffsetX) * width,
            Math.abs(lens.shadowOffsetY) * height,
          ) +
          4
        : 0;
    const padding = Math.ceil(
      Math.max(
        2,
        Math.abs(lens.scaleX) * width,
        Math.abs(lens.scaleY) * height,
        shadowPadding,
      ),
    );
    const left = Math.floor(lens.originX * width) - padding;
    const bottom = Math.floor(lens.originY * height) - padding;
    const right = Math.ceil((lens.originX + lens.sizeX) * width) + padding;
    const top = Math.ceil((lens.originY + lens.sizeY) * height) + padding;
    const x = Math.max(0, left);
    const y = Math.max(0, bottom);
    const scissorWidth = Math.min(width, right) - x;
    const scissorHeight = Math.min(height, top) - y;

    if (scissorWidth <= 0 || scissorHeight <= 0) {
      return null;
    }

    return {
      height: scissorHeight,
      width: scissorWidth,
      x,
      y,
    };
  }

  private applyScissorRect(rect: WebGLRect): void {
    const { gl } = this;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(rect.x, rect.y, rect.width, rect.height);
  }

  private unionRects(first: WebGLRect | null, second: WebGLRect | null): WebGLRect | null {
    if (!first) {
      return second;
    }

    if (!second) {
      return first;
    }

    const x = Math.min(first.x, second.x);
    const y = Math.min(first.y, second.y);
    const right = Math.max(first.x + first.width, second.x + second.width);
    const top = Math.max(first.y + first.height, second.y + second.height);

    return {
      height: top - y,
      width: right - x,
      x,
      y,
    };
  }

  private uploadSource(
    source: TexImageSource,
    width: number,
    height: number,
    sourceDirty: boolean,
  ): boolean {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);

    if (width !== this.sourceWidth || height !== this.sourceHeight) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      this.sourceWidth = width;
      this.sourceHeight = height;
      this.hasBlurTexture = false;
      return true;
    }

    if (!sourceDirty) {
      return false;
    }

    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    this.hasBlurTexture = false;
    return true;
  }

  private uploadTexture(
    texture: TexImageSource | null,
    width: number,
    height: number,
    textureDirty: boolean,
  ): void {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.textureTexture);

    if (!texture) {
      if (this.textureWidth !== 1 || this.textureHeight !== 1 || textureDirty) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array([0, 0, 0, 0]),
        );
        this.textureWidth = 1;
        this.textureHeight = 1;
      }
      return;
    }

    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));

    if (nextWidth !== this.textureWidth || nextHeight !== this.textureHeight) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
      this.textureWidth = nextWidth;
      this.textureHeight = nextHeight;
      return;
    }

    if (!textureDirty) {
      return;
    }

    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, texture);
  }

  private uploadButtonImage(
    buttonImage: TexImageSource | null,
    width: number,
    height: number,
    buttonImageDirty: boolean,
  ): void {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.buttonImageTexture);

    if (!buttonImage) {
      if (
        this.buttonImageWidth !== 1 ||
        this.buttonImageHeight !== 1 ||
        buttonImageDirty
      ) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array([0, 0, 0, 0]),
        );
        this.buttonImageWidth = 1;
        this.buttonImageHeight = 1;
      }
      return;
    }

    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));

    if (nextWidth !== this.buttonImageWidth || nextHeight !== this.buttonImageHeight) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buttonImage);
      this.buttonImageWidth = nextWidth;
      this.buttonImageHeight = nextHeight;
      return;
    }

    if (!buttonImageDirty) {
      return;
    }

    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, buttonImage);
  }

  private uploadText(
    text: TexImageSource | null,
    width: number,
    height: number,
    textDirty: boolean,
  ): void {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.textTexture);

    if (!text) {
      if (this.textWidth !== 1 || this.textHeight !== 1 || textDirty) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array([0, 0, 0, 0]),
        );
        this.textWidth = 1;
        this.textHeight = 1;
      }
      return;
    }

    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));

    if (nextWidth !== this.textWidth || nextHeight !== this.textHeight) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, text);
      this.textWidth = nextWidth;
      this.textHeight = nextHeight;
      return;
    }

    if (!textDirty) {
      return;
    }

    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, text);
  }
}
