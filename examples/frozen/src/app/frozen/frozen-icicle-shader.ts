export const frozenIcicleVertexPrelude = /* glsl */ `
  #ifdef USE_INSTANCING
    attribute vec3 frozenIcicleRootDirection;
    attribute float frozenIcicleBend;

    vec2 frozenIcicleHorizontalDirection(vec3 rootDirection) {
      vec2 horizontal = rootDirection.xz;
      float magnitude = length(horizontal);
      return magnitude > 0.00001 ? horizontal / magnitude : vec2(0.0);
    }

    float frozenIcicleProgress(float localY) {
      return clamp(-localY / 0.72, 0.0, 1.0);
    }

    float frozenIcicleCurveWeight(float bend) {
      return clamp(bend, 0.0, 1.0) * 0.72;
    }

    vec3 frozenIcicleTangent(float progress, vec3 rootDirection, float bend) {
      vec2 horizontal = frozenIcicleHorizontalDirection(rootDirection);
      float curveWeight = frozenIcicleCurveWeight(bend);
      vec2 horizontalDerivative =
        horizontal * 0.15 * bend * (1.0 - progress);
      float verticalDerivative = -0.72 * (
        (1.0 - curveWeight) + 2.0 * curveWeight * progress
      );
      return normalize(vec3(
        horizontalDerivative.x,
        verticalDerivative,
        horizontalDerivative.y
      ));
    }

    vec3 frozenAlignDownToTangent(vec3 value, vec3 tangent) {
      vec3 down = vec3(0.0, -1.0, 0.0);
      float cosine = clamp(dot(down, tangent), -1.0, 1.0);
      vec3 axis = cross(down, tangent);
      float sine = length(axis);
      if (sine < 0.00001) return value;
      axis /= sine;
      return value * cosine +
        cross(axis, value) * sine +
        axis * dot(axis, value) * (1.0 - cosine);
    }

    vec3 frozenDeformIcicle(vec3 sourcePosition) {
      float progress = frozenIcicleProgress(sourcePosition.y);
      vec2 horizontal = frozenIcicleHorizontalDirection(
        frozenIcicleRootDirection
      );
      float curveWeight = frozenIcicleCurveWeight(frozenIcicleBend);
      float outward = 0.075 * frozenIcicleBend *
        (2.0 * progress - progress * progress);
      sourcePosition.xz += horizontal * outward;
      sourcePosition.y = -0.72 * mix(
        progress,
        progress * progress,
        curveWeight
      );
      return sourcePosition;
    }
  #endif
`;
