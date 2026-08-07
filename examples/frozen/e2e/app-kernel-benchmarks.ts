import type { ToolcraftKernelBenchmarkHarnessRegistry } from "./kernel-benchmark-contract";

import {
  frozenCrystalSampleLimit,
  frozenIcicleSampleLimit,
} from "../src/app/frozen/frozen-model";

const frozenKernelBenchmarks = {
  "preview-render": {
    webgl: {
      iterations: 2,
      async run({ page, workload }) {
        return page.evaluate(({ currentWorkload, crystalLimit, icicleLimit }) => {
          const sourceTriangles = Math.trunc(currentWorkload["source-triangles"] ?? 0);
          const crystalCoverage = currentWorkload["surface-crystal-coverage"] ?? 0;
          const icicleCoverage = currentWorkload["icicle-coverage"] ?? 0;
          const crystals = Math.round(
            crystalLimit * crystalCoverage / 100,
          );
          const icicles = Math.round(
            icicleLimit * icicleCoverage / 100,
          );
          const renderScale = currentWorkload["preview-render-scale"] ?? 1;
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(256 * renderScale);
          canvas.height = Math.round(144 * renderScale);
          const gl = canvas.getContext("webgl2", {
            alpha: true,
            antialias: false,
            preserveDrawingBuffer: true,
          });
          if (!gl) throw new Error("WebGL 2 benchmark context is unavailable.");

          const compile = (type: number, source: string) => {
            const shader = gl.createShader(type);
            if (!shader) throw new Error("Unable to allocate benchmark shader.");
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
              throw new Error(gl.getShaderInfoLog(shader) ?? "Benchmark shader failed.");
            }
            return shader;
          };
          const program = gl.createProgram();
          if (!program) throw new Error("Unable to allocate benchmark program.");
          gl.attachShader(
            program,
            compile(
              gl.VERTEX_SHADER,
              `#version 300 es
              precision highp float;
              layout(location = 0) in vec2 position;
              void main() { gl_Position = vec4(position, 0.0, 1.0); }`,
            ),
          );
          gl.attachShader(
            program,
            compile(
              gl.FRAGMENT_SHADER,
              `#version 300 es
              precision highp float;
              out vec4 color;
              void main() { color = vec4(0.56, 0.86, 1.0, 1.0); }`,
            ),
          );
          gl.linkProgram(program);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(program) ?? "Benchmark program failed.");
          }
          gl.useProgram(program);

          const vertices = new Float32Array(sourceTriangles * 6);
          for (let index = 0; index < sourceTriangles; index += 1) {
            const offset = index * 6;
            const x = (((index * 73) % canvas.width) / canvas.width) * 2 - 1;
            const y = (((index * 151) % canvas.height) / canvas.height) * 2 - 1;
            const dx = 2 / canvas.width;
            const dy = 2 / canvas.height;
            vertices[offset] = x;
            vertices[offset + 1] = y;
            vertices[offset + 2] = x + dx;
            vertices[offset + 3] = y + dy * 2;
            vertices[offset + 4] = x + dx * 2;
            vertices[offset + 5] = y;
          }
          const buffer = gl.createBuffer();
          if (!buffer) throw new Error("Unable to allocate benchmark buffer.");
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
          gl.enableVertexAttribArray(0);
          gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLES, 0, sourceTriangles * 3);

          const detailVertices = new Float32Array([
            -0.002, -0.003, 0, 0.004, 0.002, -0.003,
          ]);
          gl.bufferData(gl.ARRAY_BUFFER, detailVertices, gl.STATIC_DRAW);
          gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, crystals);
          gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, icicles);
          const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(
            0,
            0,
            canvas.width,
            canvas.height,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          );

          gl.deleteBuffer(buffer);
          gl.deleteProgram(program);
          return JSON.stringify({
            crystals,
            field: "top-to-bottom-retained-ice",
            icicles,
            renderScale,
            sourceTriangles,
          });
        }, {
          crystalLimit: frozenCrystalSampleLimit,
          currentWorkload: workload,
          icicleLimit: frozenIcicleSampleLimit,
        });
      },
    },
  },
} satisfies ToolcraftKernelBenchmarkHarnessRegistry;

export const appKernelBenchmarks = {
  "camera-render": {
    webgl: frozenKernelBenchmarks["preview-render"].webgl,
  },
  ...frozenKernelBenchmarks,
} satisfies ToolcraftKernelBenchmarkHarnessRegistry;
