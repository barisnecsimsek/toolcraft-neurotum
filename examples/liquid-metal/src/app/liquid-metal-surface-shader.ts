export const liquidMetalPhysicalVertexPars = /* glsl */ `
  varying vec3 vLiquidObjectNormal;
  varying vec3 vLiquidObjectPosition;
  varying vec3 vLiquidWorldPosition;
`;

export const liquidMetalPhysicalVertexApply = /* glsl */ `
  vLiquidObjectNormal = normalize(objectNormal);
  vLiquidObjectPosition = transformed;
  vLiquidWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

export const liquidMetalPhysicalEnvironmentPars = /* glsl */ `
  uniform sampler2D u_environmentMap;
  uniform float u_environmentDirect;
  uniform float u_environmentIntensity;
  uniform float u_environmentRotation;
`;

export const liquidMetalPhysicalFragmentPars = /* glsl */ `
  uniform vec4 u_colorBack;
  uniform vec4 u_colorTint;
  uniform float u_softness;
  uniform float u_repetition;
  uniform float u_shiftRed;
  uniform float u_shiftBlue;
  uniform float u_distortion;
  uniform float u_contour;
  uniform float u_angle;
  uniform float u_loopProgress;
  uniform float u_speed;
  uniform float u_scale;
  uniform float u_rotation;
  uniform float u_fit;
  uniform vec2 u_offset;
  uniform sampler2D u_scratchMap;
  uniform mat3 u_scratchUvTransform;
  uniform float u_scratchDepth;
  uniform float u_scratchEnabled;
  uniform float u_scratchInvert;
  uniform float u_scratchScale;
  ${liquidMetalPhysicalEnvironmentPars}

  varying vec3 vLiquidObjectNormal;
  varying vec3 vLiquidObjectPosition;
  varying vec3 vLiquidWorldPosition;

  #define LIQUID_PI 3.14159265358979323846

  vec2 rotate(vec2 uv, float angle) {
    return mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * uv;
  }

  vec3 permute(vec3 x) {
    return mod(((x * 34.0) + 1.0) * x, 289.0);
  }

  float snoise(vec2 value) {
    const vec4 constants = vec4(
      0.211324865405187,
      0.366025403784439,
      -0.577350269189626,
      0.024390243902439
    );
    vec2 cell = floor(value + dot(value, constants.yy));
    vec2 local = value - cell + dot(cell, constants.xx);
    vec2 corner = local.x > local.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 offsets = local.xyxy + constants.xxzz;

    offsets.xy -= corner;
    cell = mod(cell, 289.0);
    vec3 permutation = permute(
      permute(cell.y + vec3(0.0, corner.y, 1.0))
        + cell.x
        + vec3(0.0, corner.x, 1.0)
    );
    vec3 weight = max(
      0.5 - vec3(
        dot(local, local),
        dot(offsets.xy, offsets.xy),
        dot(offsets.zw, offsets.zw)
      ),
      0.0
    );

    weight *= weight;
    weight *= weight;
    vec3 gradientX = 2.0 * fract(permutation * constants.www) - 1.0;
    vec3 gradientH = abs(gradientX) - 0.5;
    vec3 gradientOffset = floor(gradientX + 0.5);
    vec3 gradient = gradientX - gradientOffset;

    weight *= 1.79284291400159
      - 0.85373472095314
        * (gradient * gradient + gradientH * gradientH);
    vec3 contribution;
    contribution.x = gradient.x * local.x + gradientH.x * local.y;
    contribution.yz = gradient.yz * offsets.xz + gradientH.yz * offsets.yw;
    return 130.0 * dot(weight, contribution);
  }

  float getForwardLoopPhase(float progress, float speed) {
    if (speed <= 0.0001) {
      return 0.0;
    }

    float wrappedProgress = fract(progress);
    float pace = clamp((speed - 1.0) * 0.28, -0.28, 0.84);
    return fract(
      wrappedProgress
        + pace * sin(2.0 * LIQUID_PI * wrappedProgress)
          / (2.0 * LIQUID_PI)
    );
  }

  float getLoopingSnoise(
    vec2 position,
    vec2 forwardTravel,
    float phase
  ) {
    float blend = phase * phase * (3.0 - 2.0 * phase);
    float currentCycle = snoise(position + forwardTravel * phase);
    float previousCycle = snoise(
      position + forwardTravel * (phase - 1.0)
    );
    return mix(currentCycle, previousCycle, blend);
  }

  float getColorChanges(
    float color1,
    float color2,
    float stripePosition,
    vec3 widths,
    float blur,
    float bump,
    float tint
  ) {
    float channel = mix(
      color2,
      color1,
      smoothstep(0.0, 2.0 * blur, stripePosition)
    );
    float border = widths[0];
    channel = mix(
      channel,
      color2,
      smoothstep(border, border + 2.0 * blur, stripePosition)
    );
    border = widths[0] + 0.4 * (1.0 - bump) * widths[1];
    channel = mix(
      channel,
      color1,
      smoothstep(border, border + 2.0 * blur, stripePosition)
    );
    border = widths[0] + 0.5 * (1.0 - bump) * widths[1];
    channel = mix(
      channel,
      color2,
      smoothstep(border, border + 2.0 * blur, stripePosition)
    );
    border = widths[0] + widths[1];
    channel = mix(
      channel,
      color1,
      smoothstep(border, border + 2.0 * blur, stripePosition)
    );
    float gradientPosition = (
      stripePosition - widths[0] - widths[1]
    ) / widths[2];
    float gradient = mix(
      color1,
      color2,
      smoothstep(0.0, 1.0, gradientPosition)
    );
    channel = mix(
      channel,
      gradient,
      smoothstep(border, border + 0.5 * blur, stripePosition)
    );
    channel = mix(
      channel,
      1.0 - min(1.0, (1.0 - channel) / max(tint, 0.0001)),
      u_colorTint.a
    );
    return channel;
  }

  vec3 getRippledWorldNormal(
    vec3 position,
    vec3 normal,
    float phase
  ) {
    vec3 noisePosition = position * 1.18;
    const float firstFramePhase = 0.84;
    vec2 travelX = vec2(0.13, -0.09);
    vec2 travelY = vec2(-0.08, 0.11);
    vec2 travelZ = vec2(0.10, 0.07);
    vec3 ripple = vec3(
      getLoopingSnoise(
        noisePosition.yz + travelX * firstFramePhase,
        travelX,
        phase
      ),
      getLoopingSnoise(
        noisePosition.zx + travelY * firstFramePhase,
        travelY,
        phase
      ),
      getLoopingSnoise(
        noisePosition.xy + travelZ * firstFramePhase,
        travelZ,
        phase
      )
    );
    vec3 tangentRipple = ripple - normal * dot(ripple, normal);
    float rippleStrength = 0.16
      + 0.22 * u_distortion
      + 0.08 * u_contour;
    return normalize(normal + tangentRipple * rippleStrength);
  }

  float sampleScratchHeight(vec2 uv) {
    vec2 transformedUv = (
      u_scratchUvTransform * vec3(uv, 1.0)
    ).xy;
    return texture2D(u_scratchMap, transformedUv).r;
  }

  float getTriplanarScratchHeight(
    vec3 objectPosition,
    vec3 objectNormal
  ) {
    vec3 weights = pow(abs(objectNormal), vec3(4.0));
    weights /= max(weights.x + weights.y + weights.z, 0.0001);
    vec3 scaledPosition = objectPosition * u_scratchScale;
    vec3 samples = vec3(
      sampleScratchHeight(scaledPosition.yz),
      sampleScratchHeight(scaledPosition.zx),
      sampleScratchHeight(scaledPosition.xy)
    );
    return dot(samples, weights);
  }

  vec3 perturbScratchNormalArb(
    vec3 surfacePosition,
    vec3 surfaceNormal,
    vec2 heightDerivatives,
    float faceDirectionValue
  ) {
    vec3 sigmaX = normalize(dFdx(surfacePosition));
    vec3 sigmaY = normalize(dFdy(surfacePosition));
    vec3 r1 = cross(sigmaY, surfaceNormal);
    vec3 r2 = cross(surfaceNormal, sigmaX);
    float determinant = dot(sigmaX, r1) * faceDirectionValue;
    vec3 gradient = sign(determinant) * (
      heightDerivatives.x * r1 + heightDerivatives.y * r2
    );
    return normalize(abs(determinant) * surfaceNormal - gradient);
  }

  vec2 getLiquidMetalMatcapUv(vec3 viewPosition, vec3 viewNormal) {
    vec3 viewDirection = normalize(viewPosition);
    vec3 matcapX = normalize(
      vec3(viewDirection.z, 0.0, -viewDirection.x)
    );
    vec3 matcapY = cross(viewDirection, matcapX);
    return vec2(
      dot(matcapX, viewNormal),
      dot(matcapY, viewNormal)
    ) * 0.495 + 0.5;
  }

  vec2 getLiquidMetalSurfaceUv(
    vec3 viewPosition,
    vec3 viewNormal,
    vec3 reflectedViewDirection,
    float fresnel
  ) {
    vec2 uv = getLiquidMetalMatcapUv(viewPosition, viewNormal);
    uv += reflectedViewDirection.xy * (0.025 + 0.045 * fresnel);
    float fitScale = u_fit > 1.5 ? 0.82 : 1.0;
    uv = (uv - 0.5) / max(0.05, u_scale * fitScale) + 0.5;
    uv = rotate(uv - 0.5, -u_rotation * LIQUID_PI / 180.0) + 0.5;
    uv += u_offset;
    return uv;
  }

`;

export const liquidMetalPhysicalFragmentApply = /* glsl */ `
    const float firstFramePhase = 0.84;
    float phase = getForwardLoopPhase(u_loopProgress, u_speed);
    float time = phase + firstFramePhase;
    vec3 worldNormal = inverseTransformDirection(normal, viewMatrix);
    vec3 viewDirection = normalize(vViewPosition);
    vec3 rippledWorldNormal = getRippledWorldNormal(
      vLiquidWorldPosition,
      worldNormal,
      phase
    );
    vec3 rippledViewNormal = normalize(
      (viewMatrix * vec4(rippledWorldNormal, 0.0)).xyz
    );

    if (u_scratchEnabled > 0.5 && u_scratchDepth > 0.0001) {
      float scratchHeight = getTriplanarScratchHeight(
        vLiquidObjectPosition,
        normalize(vLiquidObjectNormal)
      );
      scratchHeight = mix(
        scratchHeight,
        1.0 - scratchHeight,
        u_scratchInvert
      );
      vec2 scratchDerivatives = u_scratchDepth * vec2(
        dFdx(scratchHeight),
        dFdy(scratchHeight)
      );
      rippledViewNormal = perturbScratchNormalArb(
        -vViewPosition,
        rippledViewNormal,
        scratchDerivatives,
        faceDirection
      );
    }

    normal = rippledViewNormal;
    vec3 reflectedViewDirection = reflect(-viewDirection, rippledViewNormal);
    float fresnelBase = 1.0
      - max(dot(rippledViewNormal, viewDirection), 0.0);
    float fresnel = fresnelBase * fresnelBase * fresnelBase;
    vec2 uv = getLiquidMetalSurfaceUv(
      vViewPosition,
      rippledViewNormal,
      reflectedViewDirection,
      fresnel
    );

    float cycleWidth = 2.0 * u_repetition;
    float edge = fresnel * fresnel;

    vec2 rotatedUv = uv - vec2(0.5);
    float angle = (-u_angle + 70.0) * LIQUID_PI / 180.0;
    float cosAngle = cos(angle);
    float sinAngle = sin(angle);
    rotatedUv = vec2(
      rotatedUv.x * cosAngle - rotatedUv.y * sinAngle,
      rotatedUv.x * sinAngle + rotatedUv.y * cosAngle
    ) + vec2(0.5);

    float diagonalBottomLeft = rotatedUv.x - rotatedUv.y;
    float diagonalTopLeft = rotatedUv.x + rotatedUv.y;
    vec3 color1 = vec3(0.98, 0.98, 1.0);
    vec3 color2 = vec3(
      0.1,
      0.1,
      0.1 + 0.1 * smoothstep(0.7, 1.3, diagonalTopLeft)
    );
    vec2 gradientUv = uv - 0.5;
    float distanceFromCenter = length(
      gradientUv + vec2(0.0, 0.2 * diagonalBottomLeft)
    );
    gradientUv = rotate(
      gradientUv,
      (0.25 - 0.2 * diagonalBottomLeft) * LIQUID_PI
    );
    float direction = gradientUv.x;
    float bump = pow(1.8 * distanceFromCenter, 1.2);
    bump = 1.0 - bump;
    bump *= pow(max(uv.y, 0.0001), 0.3);

    float thinStrip1Ratio = 0.12 / cycleWidth * (1.0 - 0.4 * bump);
    float thinStrip2Ratio = 0.07 / cycleWidth * (1.0 + 0.4 * bump);
    float wideStripRatio = 1.0 - thinStrip1Ratio - thinStrip2Ratio;
    float thinStrip1Width = cycleWidth * thinStrip1Ratio;
    float thinStrip2Width = cycleWidth * thinStrip2Ratio;
    float noise = getLoopingSnoise(
      uv - vec2(firstFramePhase),
      vec2(-1.0),
      phase
    );

    edge += (1.0 - edge) * u_distortion * noise;
    direction += diagonalBottomLeft;
    direction -= 2.0
      * noise
      * diagonalBottomLeft
      * (smoothstep(0.0, 1.0, edge)
        * (1.0 - smoothstep(0.0, 1.0, edge)));
    direction *= mix(
      1.0,
      1.0 - edge,
      smoothstep(0.5, 1.0, u_contour)
    );
    direction -= 1.7 * edge * smoothstep(0.5, 1.0, u_contour);
    direction += 0.2
      * pow(u_contour, 4.0)
      * (1.0 - smoothstep(0.0, 1.0, edge));
    bump *= clamp(pow(max(uv.y, 0.0001), 0.1), 0.3, 1.0);
    direction *= 0.1 + (1.1 - edge) * bump;
    direction *= 0.4 + 0.6 * (1.0 - smoothstep(0.5, 1.0, edge));
    direction += 0.18
      * (smoothstep(0.1, 0.2, uv.y)
        * (1.0 - smoothstep(0.2, 0.4, uv.y)));
    direction += 0.03
      * (smoothstep(0.1, 0.2, 1.0 - uv.y)
        * (1.0 - smoothstep(0.2, 0.4, 1.0 - uv.y)));
    direction *= 0.5 + 0.5 * pow(uv.y, 2.0);
    direction *= cycleWidth;
    direction -= time;

    float colorDispersion = clamp(1.0 - bump, 0.0, 1.0);
    float dispersionRed = colorDispersion;
    dispersionRed += 0.03 * bump * noise;
    dispersionRed += 5.0
      * (smoothstep(-0.1, 0.2, uv.y)
        * (1.0 - smoothstep(0.1, 0.5, uv.y)))
      * (smoothstep(0.4, 0.6, bump)
        * (1.0 - smoothstep(0.4, 1.0, bump)));
    dispersionRed -= diagonalBottomLeft;

    float dispersionBlue = 1.3 * colorDispersion;
    dispersionBlue += (smoothstep(0.0, 0.4, uv.y)
      * (1.0 - smoothstep(0.1, 0.8, uv.y)))
      * (smoothstep(0.4, 0.6, bump)
        * (1.0 - smoothstep(0.4, 0.8, bump)));
    dispersionBlue -= 0.2 * edge;
    dispersionRed *= u_shiftRed / 20.0;
    dispersionBlue *= u_shiftBlue / 20.0;

    float blur = u_softness / 15.0;
    vec3 widths = vec3(
      thinStrip1Width,
      thinStrip2Width,
      wideStripRatio
    );
    widths[1] -= 0.02 * smoothstep(0.0, 1.0, edge + bump);
    float stripeRed = fract(direction + dispersionRed);
    float stripeGreen = fract(direction);
    float stripeBlue = fract(direction - dispersionBlue);
    float red = getColorChanges(
      color1.r,
      color2.r,
      stripeRed,
      widths,
      blur + fwidth(stripeRed),
      bump,
      u_colorTint.r
    );
    float green = getColorChanges(
      color1.g,
      color2.g,
      stripeGreen,
      widths,
      blur + fwidth(stripeGreen),
      bump,
      u_colorTint.g
    );
    float blue = getColorChanges(
      color1.b,
      color2.b,
      stripeBlue,
      widths,
      blur + fwidth(stripeBlue),
      bump,
      u_colorTint.b
    );
    vec3 color = vec3(red, green, blue);
    float backMix = clamp(0.24 * fresnel * u_colorBack.a, 0.0, 0.3);
    color = mix(color, u_colorBack.rgb, backMix);

    float liquidLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 conductorBase = vec3(0.62, 0.66, 0.72);
    diffuseColor.rgb = mix(conductorBase, color, 0.72);
    metalnessFactor = 1.0;
    roughnessFactor = clamp(
      0.075 + 0.08 * (1.0 - liquidLuma) + 0.035 * abs(noise),
      0.07,
      0.18
    );
`;

export const liquidMetalPhysicalEnvironmentApply = /* glsl */ `
    if (u_environmentDirect > 0.5) {
      vec3 directEnvironmentWorldNormal = inverseTransformDirection(
        geometryNormal,
        viewMatrix
      );
      vec3 directEnvironmentWorldView = inverseTransformDirection(
        geometryViewDir,
        viewMatrix
      );
      vec3 directEnvironmentDirection = reflect(
        -directEnvironmentWorldView,
        directEnvironmentWorldNormal
      );
      float environmentCos = cos(u_environmentRotation);
      float environmentSin = sin(u_environmentRotation);
      directEnvironmentDirection = normalize(vec3(
        environmentCos * directEnvironmentDirection.x
          + environmentSin * directEnvironmentDirection.z,
        directEnvironmentDirection.y,
        -environmentSin * directEnvironmentDirection.x
          + environmentCos * directEnvironmentDirection.z
      ));
      vec2 directEnvironmentUv = equirectUv(directEnvironmentDirection);
      float directEnvironmentBlur = max(material.roughness, 0.015) * 0.035;
      vec2 directEnvironmentOffsetX = vec2(directEnvironmentBlur, 0.0);
      vec2 directEnvironmentOffsetY = vec2(0.0, directEnvironmentBlur * 0.5);
      vec3 directEnvironmentRadiance = texture2D(
        u_environmentMap,
        directEnvironmentUv
      ).rgb;
      directEnvironmentRadiance += texture2D(
        u_environmentMap,
        vec2(fract(directEnvironmentUv.x + directEnvironmentOffsetX.x), directEnvironmentUv.y)
      ).rgb;
      directEnvironmentRadiance += texture2D(
        u_environmentMap,
        vec2(fract(directEnvironmentUv.x - directEnvironmentOffsetX.x), directEnvironmentUv.y)
      ).rgb;
      directEnvironmentRadiance += texture2D(
        u_environmentMap,
        vec2(directEnvironmentUv.x, clamp(directEnvironmentUv.y + directEnvironmentOffsetY.y, 0.0, 1.0))
      ).rgb;
      directEnvironmentRadiance += texture2D(
        u_environmentMap,
        vec2(directEnvironmentUv.x, clamp(directEnvironmentUv.y - directEnvironmentOffsetY.y, 0.0, 1.0))
      ).rgb;
      directEnvironmentRadiance *= 0.2 * u_environmentIntensity;
      radiance = directEnvironmentRadiance;
      iblIrradiance = directEnvironmentRadiance * 0.32;
    }
`;
