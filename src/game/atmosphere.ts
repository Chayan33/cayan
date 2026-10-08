import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
export class Atmosphere {
  composer: EffectComposer | null = null;
  quality = "high";
  rain: THREE.LineSegments;
  positions: Float32Array;
  lights: THREE.PointLight[] = [];
  rainAmount = 0;
  constructor(
    public renderer: THREE.WebGLRenderer,
    public scene: THREE.Scene,
    public camera: THREE.PerspectiveCamera,
  ) {
    this.positions = new Float32Array(520 * 6);
    for (let i = 0; i < this.positions.length; i += 6) {
      const x = Math.random() * 65 - 32.5,
        y = Math.random() * 25,
        z = Math.random() * 65 - 32.5;
      this.positions.set([x, y, z, x + 0.06, y - 0.65, z + 0.06], i);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.rain = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color: "#c2d9d8",
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    );
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);
    for (let i = 0; i < 4; i++) {
      const light = new THREE.PointLight(
        i % 2 ? "#ffd1a3" : "#f3c385",
        0,
        19,
        2,
      );
      scene.add(light);
      this.lights.push(light);
    }
  }
  setQuality(q: string) {
    this.quality = q;
    this.composer?.passes.forEach((p) => p.dispose());
    this.composer?.dispose();
    this.composer = null;
    if (q === "high") {
      const size = this.renderer.getSize(new THREE.Vector2());
      const composer = new EffectComposer(this.renderer);
      composer.addPass(new RenderPass(this.scene, this.camera));
      const ao = new SSAOPass(this.scene, this.camera, size.x, size.y, 8);
      ao.kernelRadius = 6;
      ao.minDistance = 0.005;
      ao.maxDistance = 0.045;
      composer.addPass(ao);
      composer.addPass(new UnrealBloomPass(size, 0.19, 0.32, 0.95));
      composer.addPass(new OutputPass());
      this.composer = composer;
      this.resize();
    }
  }
  resize() {
    if (this.composer) {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(size.x, size.y);
    }
  }
  update(
    dt: number,
    night: boolean,
    raining: boolean,
    focus: THREE.Vector3,
    inside: boolean,
  ) {
    this.rainAmount = THREE.MathUtils.lerp(
      this.rainAmount,
      raining && !inside ? 1 : 0,
      Math.min(1, dt * 2),
    );
    this.rain.visible = this.rainAmount > 0.01;
    (this.rain.material as THREE.LineBasicMaterial).opacity =
      this.rainAmount * 0.31;
    if (this.rain.visible) {
      this.rain.position.set(focus.x, 0, focus.z);
      for (let i = 0; i < this.positions.length; i += 6) {
        this.positions[i + 1] -= dt * 18;
        this.positions[i + 4] -= dt * 18;
        if (this.positions[i + 1] < 0) {
          this.positions[i + 1] += 25;
          this.positions[i + 4] += 25;
        }
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    const street = Math.max(-48, Math.min(48, Math.round(focus.x / 48) * 48)),
      block = Math.round(focus.z / 20) * 20;
    this.lights.forEach((light, i) => {
      light.position.set(
        street + (i % 2 ? 8.6 : -8.6),
        5.35,
        block + (i < 2 ? 0 : 20) + 0.4,
      );
      light.intensity = inside ? 0 : night ? 30 : raining ? 6 : 0;
    });
  }
  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.composer?.passes.forEach((p) => p.dispose());
    this.composer?.dispose();
    this.rain.geometry.dispose();
    (this.rain.material as THREE.Material).dispose();
  }
}
