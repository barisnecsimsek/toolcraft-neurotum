import * as THREE from "three";

import {
  disposeFrozenEnvironment,
  loadFrozenEnvironment,
  type FrozenEnvironmentResource,
} from "./frozen-environment";
import {
  createFrozenEffectResources,
  disposeFrozenEffectResources,
  updateFrozenEffectResources,
  type FrozenEffectResources,
} from "./frozen-instances";
import type { FrozenPreparedModel } from "./frozen-model";
import {
  FrozenMeltField,
  getFrozenMeltBrushRadius,
} from "./frozen-melt-field";
import {
  createFrozenMeltProjection,
  findFrozenMeltProjectionCandidates,
  type FrozenMeltProjection,
} from "./frozen-melt-projection";
import { getFrozenPreviewSize } from "./frozen-preview-size";
import type { FrozenPreparedScratch } from "./frozen-texture";
import type { FrozenSceneSettings } from "./frozen-values";

type FrozenSceneRendererOptions = Readonly<{
  onEnvironmentReady?: () => void;
}>;

type FrozenTile = Readonly<{
  fullHeight: number;
  fullWidth: number;
  height: number;
  width: number;
  x: number;
  y: number;
}>;

export type FrozenMeltContact = Readonly<{
  cursorRadius: number;
  point: THREE.Vector3;
  x: number;
  y: number;
}>;

export class FrozenSceneRenderer {
  readonly canvas: HTMLCanvasElement;

  private readonly camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.05, 100);
  private disposed = false;
  private effect: FrozenEffectResources | null = null;
  private environment: FrozenEnvironmentResource | null = null;
  private environmentStatus: "error" | "loading" | "ready" = "loading";
  private readonly meltField = new FrozenMeltField();
  private meltProjection: FrozenMeltProjection | null = null;
  private meltProjectionKey = "";
  private meltRevision = 0;
  private model: FrozenPreparedModel | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly retiredEffects: FrozenEffectResources[] = [];
  private readonly scene = new THREE.Scene();
  private scratch: FrozenPreparedScratch | null = null;

  constructor(canvas: HTMLCanvasElement, options: FrozenSceneRendererOptions = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.transmissionResolutionScale = 1;
    this.canvas.dataset.materialMode = "pbr-transmission";
    this.canvas.dataset.transmissionResolutionScale = "1";
    this.scene.add(new THREE.HemisphereLight(0xdff5ff, 0x07131d, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(-3.5, 5, 4.2);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x87d8ff, 1.15);
    rim.position.set(4, 1, -4);
    this.scene.add(rim);
    this.canvas.dataset.hdriStatus = "loading";
    void loadFrozenEnvironment(this.renderer).then(
      (environment) => {
        if (this.disposed) {
          disposeFrozenEnvironment(environment);
          return;
        }
        this.environment = environment;
        this.environmentStatus = "ready";
        this.scene.environment = environment.texture;
        this.canvas.dataset.hdriStatus = "ready";
        options.onEnvironmentReady?.();
      },
      (error: unknown) => {
        this.environmentStatus = "error";
        this.canvas.dataset.hdriStatus = "error";
        console.error("Frozen HDR environment failed to load.", error);
      },
    );
  }

  setModel(model: FrozenPreparedModel | null): void {
    if (this.model === model) return;
    if (this.model) this.scene.remove(this.model.object);
    if (this.effect) {
      this.scene.remove(this.effect.shellGroup, this.effect.crystals, this.effect.icicles);
      this.retiredEffects.push(this.effect);
    }
    this.model = model;
    this.meltProjection = null;
    this.meltProjectionKey = "";
    this.effect = null;
    if (this.meltField.clear()) this.meltRevision += 1;
    if (!model) return;
    this.scene.add(model.object);
    this.effect = createFrozenEffectResources(model);
    this.scene.add(this.effect.shellGroup, this.effect.crystals, this.effect.icicles);
  }

  setScratch(scratch: FrozenPreparedScratch | null): void {
    this.scratch = scratch;
    this.canvas.dataset.scratchStatus = scratch ? "ready" : "procedural";
  }

  render(settings: FrozenSceneSettings, width: number, height: number): boolean {
    return this.renderFrame(settings, width, height);
  }

  renderTile(
    settings: FrozenSceneSettings,
    fullWidth: number,
    fullHeight: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): boolean {
    return this.renderFrame(settings, width, height, {
      fullHeight,
      fullWidth,
      height,
      width,
      x,
      y,
    });
  }

  private renderFrame(
    settings: FrozenSceneSettings,
    width: number,
    height: number,
    viewOffset?: FrozenTile,
  ): boolean {
    const safeWidth = Math.max(1, Math.round(width));
    const safeHeight = Math.max(1, Math.round(height));
    this.canvas.dataset.renderHeight = String(safeHeight);
    this.canvas.dataset.renderScale = String(settings.viewport.renderScale);
    this.canvas.dataset.renderWidth = String(safeWidth);
    if (!this.model || !this.effect) return false;
    this.renderer.setSize(safeWidth, safeHeight, false);
    this.renderer.setClearColor(
      new THREE.Color(settings.background.color),
      settings.background.include ? 1 : 0,
    );
    this.renderer.toneMappingExposure = settings.lighting.exposure;
    this.scene.environmentIntensity = settings.lighting.environmentIntensity;
    this.scene.environmentRotation.set(0, settings.lighting.environmentRotation, 0);
    this.camera.clearViewOffset();
    this.camera.aspect = viewOffset
      ? viewOffset.fullWidth / viewOffset.fullHeight
      : safeWidth / safeHeight;
    this.camera.position.fromArray(settings.viewport.orientation.position);
    this.camera.up.fromArray(settings.viewport.orientation.up).normalize();
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    if (viewOffset) {
      this.camera.setViewOffset(
        viewOffset.fullWidth,
        viewOffset.fullHeight,
        viewOffset.x,
        viewOffset.y,
        viewOffset.width,
        viewOffset.height,
      );
    }
    this.camera.updateMatrixWorld(true);
    updateFrozenEffectResources(
      this.effect,
      this.model,
      settings,
      this.scratch,
      this.meltField.texture,
    );
    this.renderer.render(this.scene, this.camera);
    this.camera.clearViewOffset();
    this.canvas.dataset.crystalCount = String(this.effect.crystals.count);
    this.canvas.dataset.icicleCount = String(this.effect.icicles.count);
    this.canvas.dataset.icicleHangingCount = String(
      this.effect.icicles.userData.frozenIcicleHangingCount ?? 0,
    );
    this.canvas.dataset.icicleHorizontalCount = String(
      this.effect.icicles.userData.frozenIcicleHorizontalCount ?? 0,
    );
    this.canvas.dataset.icicleWallCount = String(
      this.effect.icicles.userData.frozenIcicleWallCount ?? 0,
    );
    this.canvas.dataset.physicalTransmission = String(
      settings.surface.transmission,
    );
    this.canvas.dataset.meltMaximum = this.meltField.getMaximum().toFixed(4);
    this.canvas.dataset.meltRevision = String(this.meltRevision);
    this.releaseRetiredEffects();
    return true;
  }

  renderPreview(
    settings: FrozenSceneSettings,
    backingScale = settings.viewport.renderScale,
  ): boolean {
    const displayBounds = this.canvas.getBoundingClientRect();
    const size = getFrozenPreviewSize({
      cssHeight: displayBounds.height,
      cssWidth: displayBounds.width,
      maximumTextureSize: this.renderer.capabilities.maxTextureSize,
      outputHeight: settings.viewport.height,
      outputWidth: settings.viewport.width,
      renderScale: backingScale,
    });
    return this.render(settings, size.width, size.height);
  }

  hitTest(clientX: number, clientY: number): boolean {
    return this.getMeltIntersection(clientX, clientY) !== null;
  }

  getMeltContact(
    clientX: number,
    clientY: number,
    settings: FrozenSceneSettings,
  ): FrozenMeltContact | null {
    const bounds = this.canvas.getBoundingClientRect();
    const pointer = this.getMeltPointer(clientX, clientY, bounds);
    if (!pointer) return null;
    let intersection = this.getMeltIntersectionAtPointer(pointer);
    const localScaleX = this.canvas.clientWidth / Math.max(bounds.width, 1);
    const localScaleY = this.canvas.clientHeight / Math.max(bounds.height, 1);
    const radius = getFrozenMeltBrushRadius(settings.melt);
    let point = intersection?.point.clone() ?? null;
    let projectedRadius = intersection
      ? this.getProjectedMeltRadius(intersection.point, radius, bounds.width)
      : null;
    if (!intersection || !point || projectedRadius === null) {
      const projection = this.getMeltProjection();
      if (!projection) return null;
      for (const candidate of findFrozenMeltProjectionCandidates(
        projection,
        pointer,
        bounds.width,
        bounds.height,
      )) {
        const candidateIntersection = this.getMeltIntersectionAtPointer(
          new THREE.Vector2(candidate.x, candidate.y),
        );
        if (!candidateIntersection) continue;
        const candidateRadius = this.getProjectedMeltRadius(
          candidateIntersection.point,
          radius,
          bounds.width,
        );
        if (candidate.distancePixels > candidateRadius) continue;
        const surfaceDepth = candidateIntersection.point.clone().project(this.camera).z;
        point = new THREE.Vector3(pointer.x, pointer.y, surfaceDepth).unproject(
          this.camera,
        );
        intersection = candidateIntersection;
        projectedRadius = candidateRadius;
        break;
      }
    }
    if (!intersection || !point || projectedRadius === null) return null;
    return {
      cursorRadius: THREE.MathUtils.clamp(
        projectedRadius * localScaleX,
        8 * localScaleX,
        Math.max(
          8 * localScaleX,
          Math.min(this.canvas.clientWidth, this.canvas.clientHeight) * 0.42,
        ),
      ),
      point,
      x: (clientX - bounds.left) * localScaleX,
      y: (clientY - bounds.top) * localScaleY,
    };
  }

  depositMelt(
    contact: FrozenMeltContact,
    settings: FrozenSceneSettings,
    previousPoint: THREE.Vector3 | null = null,
  ): boolean {
    const changed = previousPoint
      ? this.meltField.depositSegment(previousPoint, contact.point, settings.melt)
      : this.meltField.deposit(contact.point, settings.melt);
    if (changed) this.meltRevision += 1;
    return changed;
  }

  stepMelt(settings: FrozenSceneSettings, deltaSeconds: number): boolean {
    const changed = this.meltField.step(deltaSeconds, settings.melt.refreeze);
    if (changed) this.meltRevision += 1;
    return changed;
  }

  clearMelt(): boolean {
    const changed = this.meltField.clear();
    if (changed) this.meltRevision += 1;
    return changed;
  }

  hasActiveMelt(): boolean {
    return this.meltField.getMaximum() > 1 / 255;
  }

  getMeltRevision(): number {
    return this.meltRevision;
  }

  hasModel(): boolean {
    return this.model !== null;
  }

  getEnvironmentStatus(): "error" | "loading" | "ready" {
    return this.environmentStatus;
  }

  dispose(): void {
    this.disposed = true;
    this.setModel(null);
    this.releaseRetiredEffects();
    if (this.environment) disposeFrozenEnvironment(this.environment);
    this.environment = null;
    this.meltField.dispose();
    this.renderer.dispose();
  }

  private getMeltIntersection(
    clientX: number,
    clientY: number,
  ): THREE.Intersection | null {
    const bounds = this.canvas.getBoundingClientRect();
    const pointer = this.getMeltPointer(clientX, clientY, bounds);
    return pointer ? this.getMeltIntersectionAtPointer(pointer) : null;
  }

  private getMeltPointer(
    clientX: number,
    clientY: number,
    bounds: DOMRect,
  ): THREE.Vector2 | null {
    if (
      !this.model ||
      bounds.width <= 0 ||
      bounds.height <= 0 ||
      clientX < bounds.left ||
      clientX > bounds.right ||
      clientY < bounds.top ||
      clientY > bounds.bottom
    ) {
      return null;
    }
    return new THREE.Vector2(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    );
  }

  private getMeltIntersectionAtPointer(
    pointer: THREE.Vector2,
  ): THREE.Intersection | null {
    if (!this.model) return null;
    this.raycaster.setFromCamera(pointer, this.camera);
    return this.raycaster.intersectObject(this.model.object, true)[0] ?? null;
  }

  private getMeltProjection(): FrozenMeltProjection | null {
    if (!this.model) return null;
    const matrixValues = [
      ...this.camera.projectionMatrix.elements,
      ...this.camera.matrixWorldInverse.elements,
    ];
    const key = `${this.model.sourceId}:${matrixValues
      .map((value) => value.toFixed(6))
      .join(",")}`;
    if (!this.meltProjection || key !== this.meltProjectionKey) {
      this.meltProjection = createFrozenMeltProjection(
        this.model.object,
        this.camera,
      );
      this.meltProjectionKey = key;
    }
    return this.meltProjection;
  }

  private getProjectedMeltRadius(
    point: THREE.Vector3,
    radius: number,
    viewportWidth: number,
  ): number {
    const cameraRight = new THREE.Vector3()
      .setFromMatrixColumn(this.camera.matrixWorld, 0)
      .normalize();
    const centerNdc = point.clone().project(this.camera);
    const edgeNdc = point
      .clone()
      .addScaledVector(cameraRight, radius)
      .project(this.camera);
    return Math.abs(edgeNdc.x - centerNdc.x) * viewportWidth * 0.5;
  }

  private releaseRetiredEffects(): void {
    this.retiredEffects.splice(0).forEach(disposeFrozenEffectResources);
  }
}
