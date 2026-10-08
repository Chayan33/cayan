import * as THREE from "three";
import { createActor } from "./avatar";
import { Atmosphere } from "./atmosphere";

import { useGame, nearestPlace } from "./store";
import { places, placeById } from "./world";
import { questById } from "./quests";
import { audio } from "./audio";
import type { Character, Vec2 } from "./types";
const TAU = Math.PI * 2;
const palette = {
  cream: "#d7c9ac",
  peach: "#ce9b7f",
  sage: "#8c9c8b",
  blue: "#789391",
  rust: "#a96449",
  road: "#475252",
  paving: "#a5a69b",
  roof: "#98573d",
};
type Collider = { x: number; z: number; w: number; d: number };
type Actor = {
  group: THREE.Group;
  arms: THREE.Group[];
  legs: THREE.Group[];
  body: THREE.Group;
  head: THREE.Group;
  carry: THREE.Mesh;
  walk: number;
};
export class GameEngine {
  renderer: THREE.WebGLRenderer;
  atmosphere: Atmosphere;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, 1, 0.1, 380);
  clock = new THREE.Clock();
  sun = new THREE.DirectionalLight("#ffce8d", 3.2);
  hemi = new THREE.HemisphereLight("#c5d6d3", "#3e4c43", 2.5);
  sky: THREE.Mesh;
  water: THREE.Mesh;
  player: Actor;
  npcs: {
    actor: Actor;
    origin: Vec2;
    phase: number;
    patrol: boolean;
    police: boolean;
  }[] = [];
  peers = new Map<string, Actor>();
  lastRender = 0;
  colliders: Collider[] = [];
  staticBatches = new Map<
    string,
    {
      geometry: THREE.BufferGeometry;
      material: THREE.MeshStandardMaterial;
      matrices: THREE.Matrix4[];
    }
  >();
  materials = new Map<string, THREE.MeshStandardMaterial>();
  boxGeo = new THREE.BoxGeometry(1, 1, 1);
  cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
  sphereGeo = new THREE.IcosahedronGeometry(1, 1);
  coneGeo = new THREE.ConeGeometry(1, 1, 7);
  matrix = new THREE.Matrix4();
  dummy = new THREE.Object3D();
  basis = new THREE.Matrix4();
  keys = new Set<string>();
  yaw = Math.PI / 2;
  pitch = 0.35;
  distance = 7.5;
  vertical = 0;
  velocityY = 0;
  frame = 0;
  disposed = false;
  drag = false;
  lastStep = 0;
  lastTick = 0;
  lastState = 0;
  time = 0;
  charJSON = "";
  playing = false;
  nearMarker: THREE.Group;
  goalMarker: THREE.Group;
  dropBox: THREE.Mesh;
  doors: { pivot: THREE.Group; x: number; z: number; open: number }[] = [];
  lamps: THREE.Mesh[] = [];
  cars: { group: THREE.Group; speed: number; axis: "x" | "z"; lane: number }[] =
    [];
  birds: THREE.Group[] = [];
  furniture = new THREE.Group();
  furnitureJSON = "";
  interior = new THREE.Group();
  interiorActive = false;
  furnitureGhost: THREE.Group | null = null;
  rotation = 0;
  raycaster = new THREE.Raycaster();
  camOccluders: THREE.Mesh[] = [];
  constructor(public container: HTMLDivElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Karayaka gerçek zamanlı 3D oyun dünyası",
    );
    this.renderer.domElement.setAttribute("tabindex", "0");
    this.scene.background = new THREE.Color("#a8bdbe");
    this.scene.fog = new THREE.FogExp2("#acbbaf", 0.0048);
    this.scene.add(this.hemi);
    this.sun.position.set(-65, 75, -65);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -90;
    this.sun.shadow.camera.right = 90;
    this.sun.shadow.camera.top = 90;
    this.sun.shadow.camera.bottom = -90;
    this.sun.shadow.camera.far = 220;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.055;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    const skyGeo = new THREE.SphereGeometry(290, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color("#658d9d") },
        bottom: { value: new THREE.Color("#ead0a1") },
      },
      vertexShader:
        "varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader:
        "uniform vec3 top;uniform vec3 bottom;varying vec3 vPos;void main(){float h=clamp(normalize(vPos).y*1.5,0.,1.);gl_FragColor=vec4(mix(bottom,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.sky);
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(550, 160, 32, 12),
      new THREE.MeshStandardMaterial({
        color: "#609c9d",
        metalness: 0.48,
        roughness: 0.27,
        transparent: true,
        opacity: 0.96,
      }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(0, -0.24, -169);
    this.scene.add(this.water);
    this.buildWorld();
    this.addAtmosphere();
    this.flush();
    this.player = this.makeActor(useGame.getState().save.character);
    this.player.group.position.set(-8, 0, 18);
    this.scene.add(this.player.group);
    this.charJSON = JSON.stringify(useGame.getState().save.character);
    this.goalMarker = this.makeMarker("#f9c07d");
    this.nearMarker = this.makeMarker("#d2ebe1");
    this.scene.add(this.goalMarker, this.nearMarker);
    this.dropBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.65, 0.7),
      this.mat("#ad8656"),
    );
    this.dropBox.castShadow = true;
    this.scene.add(this.dropBox);
    this.scene.add(this.furniture);
    this.buildInterior();
    for (const [i, p] of places.entries()) {
      const c = {
        ...useGame.getState().save.character,
        shirt: p.color,
        pants: i % 2 ? "#39464e" : "#5b5950",
        hair: i % 3 ? "#332a25" : "#a6a393",
        skin: ["#c38e65", "#ba825e", "#dfad88"][i % 3],
        style: i % 3,
      };
      const actor = this.makeActor(c);
      actor.group.position.set(
        p.pos[0] + (p.pos[0] > 0 ? 1 : -1),
        0,
        p.pos[1] - 1,
      );
      actor.group.rotation.y = p.pos[0] > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(actor.group);
      this.npcs.push({
        actor,
        origin: [actor.group.position.x, actor.group.position.z],
        phase: i * 1.7,
        patrol: false,
        police: false,
      });
    }
    for (let i = 0; i < 12; i++) {
      const police = i < 2;
      const actor = this.makeActor({
        ...useGame.getState().save.character,
        shirt: police
          ? "#273c57"
          : ["#cc9c74", "#718e84", "#b7b6a5", "#776779"][i % 4],
        pants: "#384545",
        style: i % 3,
      });
      const origin: Vec2 = [i % 2 ? 6 : -6, (i - 6) * 12];
      actor.group.position.set(
        ...([origin[0], 0, origin[1]] as [number, number, number]),
      );
      this.scene.add(actor.group);
      this.npcs.push({ actor, origin, phase: i * 2, patrol: true, police });
    }
    this.atmosphere = new Atmosphere(this.renderer, this.scene, this.camera);
    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clearKeys);
    this.renderer.domElement.addEventListener(
      "pointerdown",
      this.onPointerDown,
    );
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.addEventListener("contextmenu", this.contextMenu);
    this.renderer.domElement.addEventListener("wheel", this.onWheel, {
      passive: true,
    });
    this.applyQuality();
    this.animate();
  }
  mat(color: string, emissive = false) {
    const key = color + emissive;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.86,
          flatShading: true,
          ...(emissive ? { emissive: color, emissiveIntensity: 0.45 } : {}),
        }),
      );
    return this.materials.get(key)!;
  }
  primitive(
    geo: THREE.BufferGeometry,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    rx = 0,
    ry = 0,
    rz = 0,
    emissive = false,
  ) {
    this.dummy.position.set(x, y, z);
    this.dummy.rotation.set(rx, ry, rz);
    this.dummy.scale.set(w, h, d);
    this.dummy.updateMatrix();
    const matrix = this.basis.clone().multiply(this.dummy.matrix);
    const mat = this.mat(color, emissive);
    const key = geo.uuid + mat.uuid;
    if (!this.staticBatches.has(key))
      this.staticBatches.set(key, {
        geometry: geo,
        material: mat,
        matrices: [],
      });
    this.staticBatches.get(key)!.matrices.push(matrix);
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    c: string,
    ry = 0,
    rz = 0,
    em = false,
  ) {
    this.primitive(this.boxGeo, x, y, z, w, h, d, c, 0, ry, rz, em);
  }
  cyl(
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    c: string,
    rz = 0,
  ) {
    this.primitive(this.cylinderGeo, x, y, z, r, h, r, c, 0, 0, rz);
  }
  orb(x: number, y: number, z: number, r: number, c: string) {
    this.primitive(this.sphereGeo, x, y, z, r, r, r, c);
  }
  flush() {
    for (const {
      geometry,
      material,
      matrices,
    } of this.staticBatches.values()) {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.scene.add(mesh);
    }
    this.staticBatches.clear();
  }
  sign(
    text: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    bg = "#244547",
    fg = "#e8ddbb",
    rotation = 0,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 192;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 768, 192);
    ctx.strokeStyle = fg;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 748, 172);
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = 'bold 64px "Barlow Condensed", sans-serif';
    ctx.fillStyle = fg;
    ctx.fillText(text, 384, 100, 710);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.85,
        emissive: fg,
        emissiveMap: tex,
        emissiveIntensity: 0.07,
      }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    mesh.updateMatrix();
    mesh.applyMatrix4(this.basis);
    this.scene.add(mesh);
  }
  building(
    cx: number,
    cz: number,
    w: number,
    d: number,
    height: number,
    color: string,
    name?: string,
  ) {
    this.basis.makeRotationY(cx > 0 ? -Math.PI / 2 : Math.PI / 2);
    this.basis.setPosition(cx, 0, cz);
    this.box(0, height / 2, 0, w, height, d, color);
    this.box(0, 0.3, 0, w + 0.3, 0.6, d + 0.3, "#787f73");
    this.box(0, 3.5, d / 2 + 0.16, w + 0.4, 0.3, 0.5, "#ddd0b3");
    this.box(0, height + 0.2, 0, w + 0.8, 0.35, d + 0.8, "#bcac8e");
    this.box(
      0,
      height + 0.7,
      -d / 4,
      w + 1,
      0.16,
      d * 0.57,
      palette.roof,
      0,
      0,
    );
    this.box(0, height + 0.7, d / 4, w + 1, 0.16, d * 0.57, "#aa674a");
    this.box(w * 0.3, height + 1.15, 0, 1, 2, 1, "#bbaa8e");
    this.cyl(-w * 0.28, height + 0.8, -2, 0.6, 1.4, "#a7b9ae");
    for (let f = 0; f < Math.floor((height - 3) / 3); f++) {
      const y = 5 + f * 3;
      for (let j = 0; j < 3; j++) {
        const x = (j - 1) * w * 0.3;
        this.box(x, y, d / 2 + 0.07, 2.1, 2.15, 0.15, "#d5c9a8");
        this.box(
          x,
          y,
          d / 2 + 0.17,
          1.6,
          1.8,
          0.15,
          j === 1 && f === 1 ? "#d8b47b" : "#3f6465",
          0,
          0,
          j === 1 && f === 1,
        );
        this.box(x, y, d / 2 + 0.3, 0.06, 1.8, 0.07, "#aeac91");
        this.box(x - 1.26, y, d / 2 + 0.14, 0.4, 2, 0.15, "#5b7971");
        this.box(x + 1.26, y, d / 2 + 0.14, 0.4, 2, 0.15, "#5b7971");
        if ((j + f) % 2 === 0) {
          this.box(x, y - 1.1, d / 2 + 0.7, 2.8, 0.17, 1.5, "#d5c5a8");
          this.box(x, y - 0.65, d / 2 + 1.35, 2.8, 0.08, 0.07, "#455d56");
          for (let k = -3; k <= 3; k++)
            this.box(
              x + k * 0.4,
              y - 0.9,
              d / 2 + 1.35,
              0.04,
              0.55,
              0.04,
              "#455d56",
            );
          this.box(x - 0.7, y - 0.85, d / 2 + 1, 0.65, 0.35, 0.4, "#a9684b");
          this.orb(x - 0.7, y - 0.52, d / 2 + 1, 0.37, "#668063");
          this.orb(x - 0.48, y - 0.4, d / 2 + 1, 0.18, "#b16d69");
        }
        if (j === 2 && f === 0) {
          this.box(x + 1.5, y - 0.5, d / 2 + 0.35, 0.8, 0.65, 0.55, "#d9d6c4");
          this.cyl(
            x + 1.5,
            y - 0.5,
            d / 2 + 0.65,
            0.2,
            0.1,
            "#8e9d92",
            Math.PI / 2,
          );
        }
      }
    }
    // Ground floor: warm shop windows, striped awning and a real opening door.
    this.box(
      -w * 0.27,
      1.8,
      d / 2 + 0.1,
      w * 0.34,
      2.6,
      0.14,
      "#264a4c",
      0,
      0,
      true,
    );
    this.box(w * 0.28, 1.8, d / 2 + 0.1, w * 0.31, 2.6, 0.14, "#365d5d");
    this.box(0, 1.45, d / 2 + 0.12, 1.65, 2.8, 0.18, "#29413f");
    this.box(0, 3.06, d / 2 + 0.24, 1.9, 0.12, 0.2, "#b2a98f");
    this.box(-0.87, 1.5, d / 2 + 0.23, 0.12, 3, 0.25, "#b2a98f");
    this.box(0.87, 1.5, d / 2 + 0.23, 0.12, 3, 0.25, "#b2a98f");
    const pos = new THREE.Vector3(-0.8, 0, d / 2 + 0.32).applyMatrix4(
      this.basis,
    );
    const pivot = new THREE.Group();
    pivot.position.copy(pos);
    pivot.rotation.y = cx > 0 ? -Math.PI / 2 : Math.PI / 2;
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2.7, 0.1),
      this.mat("#416f68"),
    );
    door.position.set(0.75, 1.37, 0);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 1.65, 0.12),
      this.mat("#88a6a0"),
    );
    glass.position.set(0.75, 1.8, 0);
    pivot.add(door, glass);
    this.scene.add(pivot);
    this.doors.push({ pivot, x: pos.x, z: pos.z, open: pivot.rotation.y });
    if (name) {
      this.sign(
        name,
        0,
        3.85,
        d / 2 + 0.29,
        w * 0.91,
        1.05,
        name === "YILDIZ BAKKAL" ? "#395958" : "#695747",
      );
      for (let k = 0; k < 12; k++)
        this.box(
          (k - 5.5) * (w / 12),
          3.07,
          d / 2 + 1,
          w / 12,
          0.15,
          2,
          k % 2 ? "#d4bc93" : "#b56947",
          0,
          -0.04,
        );
      this.box(0, 2.88, d / 2 + 1.95, w, 0.35, 0.12, "#b76945");
      this.sign(
        "AÇIK",
        -w * 0.3,
        2,
        d / 2 + 0.23,
        1.4,
        0.5,
        "#214847",
        "#f5c383",
      );
      for (let j = 0; j < 4; j++) {
        this.box(
          -w * 0.36 + j * 0.65,
          0.65,
          d / 2 + 1.3,
          0.6,
          0.65,
          0.8,
          "#867050",
        );
        for (let k = 0; k < 4; k++)
          this.orb(
            -w * 0.36 + j * 0.65 + (k % 2) * 0.22 - 0.1,
            1 + (k > 1 ? 0.1 : 0),
            d / 2 + 1.15 + Math.floor(k / 2) * 0.2,
            0.14,
            j % 2 ? "#b88739" : "#af5640",
          );
      }
    }
    this.sign(
      String(Math.abs(Math.round(cx + cz))),
      w * 0.44,
      2.1,
      d / 2 + 0.2,
      0.5,
      0.45,
      "#ded6be",
      "#4b6060",
    );
    this.basis.identity();
    const bw = d,
      bd = w;
    this.colliders.push({ x: cx, z: cz, w: bw, d: bd });
    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(bw, height, bd),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitbox.position.set(cx, height / 2, cz);
    this.camOccluders.push(hitbox);
    this.scene.add(hitbox);
  }
  tree(x: number, z: number, scale = 1, palm = false) {
    this.cyl(x, 2.2 * scale, z, 0.2 * scale, 4.4 * scale, "#80725a");
    if (palm) {
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        this.box(
          x + Math.sin(a) * 1.35 * scale,
          4.2 * scale,
          z + Math.cos(a) * 1.35 * scale,
          0.6 * scale,
          0.16 * scale,
          3.5 * scale,
          "#668b74",
          a,
          0.1,
        );
      }
      this.orb(x, 4.4 * scale, z, 0.45 * scale, "#78987a");
    } else {
      this.orb(x, 4.2 * scale, z, 1.65 * scale, "#799779");
      this.orb(
        x - 0.8 * scale,
        3.7 * scale,
        z + 0.5 * scale,
        1.3 * scale,
        "#647f69",
      );
      this.orb(
        x + 0.65 * scale,
        4.7 * scale,
        z + 0.2 * scale,
        1.1 * scale,
        "#94a280",
      );
    }
    this.colliders.push({ x, z, w: 0.55 * scale, d: 0.55 * scale });
  }
  lamp(x: number, z: number) {
    this.cyl(x, 2.8, z, 0.075, 5.6, "#465957");
    this.box(x, 5.6, z, 0.1, 0.1, 1, "#465957");
    this.box(x, 5.52, z + 0.45, 0.4, 0.12, 0.65, "#edc796", 0, 0, true);
    this.cyl(x, 0.15, z, 0.2, 0.3, "#455653");
  }
  bench(x: number, z: number, rotation = 0) {
    this.basis.makeRotationY(rotation);
    this.basis.setPosition(x, 0, z);
    for (let i = 0; i < 4; i++)
      this.box(0, 0.55, i * 0.17 - 0.2, 2.1, 0.1, 0.12, "#9c8461");
    for (let i = 0; i < 3; i++)
      this.box(0, 0.8 + i * 0.15, -0.36, 2.1, 0.12, 0.07, "#9c8461");
    for (const side of [-0.8, 0.8]) {
      this.box(side, 0.3, 0, 0.1, 0.6, 0.45, "#3b5553");
      this.box(side, 0.8, -0.4, 0.08, 0.7, 0.08, "#3b5553");
    }
    this.basis.identity();
    this.colliders.push({ x, z, w: 2, d: 1 });
  }
  car(x: number, z: number, color: string, rotation = 0, moving = false) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.7, 3.8),
      this.mat(color),
    );
    body.position.y = 0.7;
    g.add(body);
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.68, 1.9),
      this.mat(color),
    );
    top.position.set(0, 1.37, -0.05);
    g.add(top);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.48, 1.5),
      this.mat("#44676c"),
    );
    glass.position.set(0, 1.45, -0.05);
    g.add(glass);
    for (const side of [-0.93, 0.93])
      for (const zz of [-1.18, 1.18]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.37, 0.37, 0.24, 10),
          this.mat("#283332"),
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side, 0.43, zz);
        g.add(wheel);
      }
    for (const side of [-0.65, 0.65]) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.19, 0.1),
        this.mat("#eed6a4", true),
      );
      light.position.set(side, 0.83, 1.94);
      g.add(light);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
    this.scene.add(g);
    if (moving) this.cars.push({ group: g, speed: 3, axis: "z", lane: x });
    else
      this.colliders.push({ x, z, w: rotation ? 4 : 2, d: rotation ? 2 : 4 });
  }
  wire(a: THREE.Vector3, b: THREE.Vector3) {
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= 1.5;
    const c = new THREE.QuadraticBezierCurve3(a, mid, b);
    this.scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(c.getPoints(18)),
        new THREE.LineBasicMaterial({ color: "#3c5350" }),
      ),
    );
  }
  buildWorld() {
    this.box(0, -0.45, 0, 215, 0.7, 180, "#799087");
    this.box(0, -0.1, 0, 191, 0.25, 179, palette.paving);
    for (const x of [-48, 0, 48]) {
      this.box(x, 0.025, -1, 15, 0.06, 174, palette.road);
      for (let z = -84; z < 85; z += 7) {
        this.box(x, 0.065, z, 0.12, 0.025, 2.2, "#b5b09a");
        for (const side of [-1, 1])
          this.box(x + side * 7.9, 0.12, z, 1, 0.24, 7, "#bdb9a6");
      }
    }
    for (const z of [-48, 0, 48]) {
      this.box(0, 0.027, z, 184, 0.06, 14, palette.road);
      for (let x = -90; x < 92; x += 7) {
        if (Math.abs(x) % 48 > 10)
          this.box(x, 0.066, z, 2.2, 0.025, 0.12, "#b5b09a");
      }
    }
    for (const x of [-48, 0, 48])
      for (const z of [-48, 0, 48]) {
        for (let i = 0; i < 7; i++) {
          this.box(
            x - 5.1 + i * 1.65,
            0.07,
            z + 5.3,
            0.8,
            0.04,
            2.7,
            "#bebdad",
          );
          this.box(x + 5.4, 0.07, z - 5 + i * 1.65, 2.7, 0.04, 0.8, "#bebdad");
        }
      }
    const specs: [number, number, number, number, number, string, string?][] = [
      [-24, 20, 21, 22, 12, palette.cream, "3 · ÇINAR APARTMANI"],
      [24, -13, 23, 22, 11, palette.sage, "YILDIZ BAKKAL"],
      [24, 22, 21, 22, 14, palette.peach, "İKİNCİ ŞANS"],
      [-24, -17, 24, 22, 15, palette.peach, "KARAYAKA ECZANESİ"],
      [-24, -66, 20, 22, 8, "#d6c5a3", "KIYI KAHVESİ"],
      [24, -66, 19, 22, 12, palette.blue, "KIYI PANSİYON"],
      [24, 66, 20, 22, 11, "#a6b2a5", "KARAYAKA KARAKOLU"],
      [-24, 66, 20, 22, 9, "#bbc1a9", "YAŞAM MERKEZİ"],
      [73, -62, 20, 24, 8, "#a7a690", "RIHTIM DEPOSU"],
      [73, -26, 22, 24, 7, "#9eaaa0", "KAYA OTO"],
      [73, 22, 22, 24, 13, "#8f9b8c", "ESKİ PASAJ"],
      [-73, -26, 23, 24, 18, "#babfa9", "DEFNE APARTMANI"],
      [-73, 24, 23, 24, 9, "#b7ac93", "YENİ YAPI"],
      [-73, -65, 19, 22, 12, "#d1b79a"],
      [73, 65, 21, 24, 15, "#bf997e"],
      [-73, 66, 22, 24, 14, "#91a397"],
    ];
    specs.forEach((s) => this.building(...s));
    // Backdrop blocks preserve the connected city silhouette.
    for (let i = 0; i < 14; i++) {
      const x = -105 + (i % 2 ? 210 : 0),
        z = -75 + Math.floor(i / 2) * 25;
      this.building(
        x,
        z,
        19,
        17,
        10 + (i % 4) * 4,
        ["#b8b4a1", "#8c9d90", "#b79b83"][i % 3],
      );
    }
    for (let z = -75; z < 85; z += 20) {
      this.lamp(8.6, z);
      this.lamp(-8.6, z + 9);
      if (z % 40 !== 5) this.tree(-9.2, z, 0.7);
      this.lamp(56.5, z + 3);
      this.lamp(-56.5, z + 3);
    }
    for (let x = -85; x < 90; x += 14) {
      this.tree(x, -83, 1.1, true);
      if (x % 28 !== -1) this.bench(x + 3, -81, Math.PI);
    }
    for (const [x, z] of [
      [-40, 17],
      [40, 15],
      [-40, -23],
      [40, -25],
      [-39, 65],
      [39, 62],
      [-84, 4],
      [84, 2],
    ])
      this.tree(x, z, 1.1);
    this.bench(-9, 10, Math.PI / 2);
    this.bench(10, 31, -Math.PI / 2);
    this.bench(-8, -37, Math.PI / 2);
    // Coastal promenade, sea wall, piers and small boats.
    this.box(0, 0.12, -84.5, 188, 0.22, 9, "#b6b59e");
    this.box(0, 0.65, -89, 189, 0.3, 0.45, "#dbd0b7");
    for (let x = -94; x <= 94; x += 4)
      this.box(x, 0.38, -89, 0.3, 0.85, 0.6, "#a8b2a0");
    this.box(49, 0.15, -99, 7, 0.35, 22, "#887f66");
    for (let j = 0; j < 22; j++)
      this.box(49, 0.35, -89 - j, 7, 0.1, 0.07, "#c3b797");
    for (const x of [45.5, 52.5])
      for (let z = -90; z > -111; z -= 5)
        this.cyl(x, 0.4, z, 0.18, 2, "#5f7771");
    for (const [i, x] of [-30, 25, 75].entries()) {
      this.box(x, -0.08, -102 - i * 11, 3, 0.7, 8, "#d3c9ac", 0.25);
      this.box(x, 0.35, -102 - i * 11, 2.5, 0.35, 5, "#456b71", 0.25);
      this.cyl(x, 3.3, -102 - i * 11, 0.06, 6.4, "#a2a69a");
    }
    for (let i = 0; i < 18; i++) {
      this.primitive(
        this.sphereGeo,
        -180 + i * 22,
        -7,
        -215 - (i % 3) * 15,
        38,
        14 + (i % 4) * 6,
        27,
        ["#8caaa3", "#96b1a4", "#9eb5a5"][i % 3],
      );
    }
    // Bins, bollards, road signage, utility wires and a café terrace.
    for (let z = -70; z < 75; z += 28) {
      this.box(9.5, 0.58, z, 0.8, 1.1, 0.8, "#486e61");
      this.box(9.5, 1.16, z, 0.9, 0.12, 0.9, "#34594f");
      this.cyl(-8.9, 0.4, z + 5, 0.1, 0.8, "#56655b");
    }
    for (const z of [-32, 28, 68]) {
      this.cyl(-10, 4, z, 0.1, 8, "#726f59");
      this.cyl(10, 4, z, 0.1, 8, "#726f59");
      this.wire(new THREE.Vector3(-22, 10, z), new THREE.Vector3(22, 9, z + 2));
      this.wire(
        new THREE.Vector3(-10, 7.8, z),
        new THREE.Vector3(-10, 7.8, z - 42),
      );
      this.sign("ÇINAR SOKAK", -10, 3, z + 0.11, 2.8, 0.6, "#43666a");
    }
    for (let i = 0; i < 4; i++) {
      const x = -13 - (i % 2) * 4,
        z = -59 - Math.floor(i / 2) * 7;
      this.cyl(x, 0.65, z, 0.75, 0.12, "#a28d66");
      this.cyl(x, 0.35, z, 0.07, 0.65, "#52605b");
      this.cyl(x, 2.2, z, 0.035, 3.7, "#87755b");
      this.primitive(
        this.coneGeo,
        x,
        3.25,
        z,
        1.8,
        0.6,
        1.8,
        i % 2 ? "#b47651" : "#d3b881",
      );
      for (const zz of [-1.2, 1.2]) this.bench(x, z + zz, zz < 0 ? 0 : Math.PI);
    }
    // Fountain / square with warm brass detail.
    this.cyl(0, 0.25, -30, 2.6, 0.5, "#b3b09a");
    this.cyl(0, 0.51, -30, 2.2, 0.1, "#749a93");
    this.cyl(0, 1.5, -30, 0.35, 2, "#b3ae91");
    this.cyl(0, 2.5, -30, 1, 0.2, "#c2b591");
    this.colliders.push({ x: 0, z: -30, w: 5, d: 5 });
    this.car(-4, 8, "#e2d0ab");
    this.car(4, -26, "#92a8a0", Math.PI);
    this.car(-52, 28, "#b4785f");
    this.car(53, -11, "#b6aa89", Math.PI);
    this.car(3, 65, "#c0bfac", Math.PI, true);
    this.car(-3, -73, "#967b67", 0, true);
    // Laundry lines and small courtyard details.
    this.wire(new THREE.Vector3(-14, 8, 20), new THREE.Vector3(-14, 8, 34));
    for (let i = 0; i < 5; i++)
      this.box(
        -14,
        7.4,
        22 + i * 2.2,
        0.04,
        1.2,
        0.8,
        ["#d0c2a5", "#738d92", "#b8755f"][i % 3],
      );
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.5, 0, 0),
        new THREE.Vector3(0, 0.12, 0),
        new THREE.Vector3(0.5, 0, 0),
      ]);
      g.add(
        new THREE.Line(geo, new THREE.LineBasicMaterial({ color: "#415b59" })),
      );
      g.position.set(i * 8 - 30, 21 + (i % 3), -70);
      this.scene.add(g);
      this.birds.push(g);
    }
    // Street cat.
    this.box(-9, 0.26, -65, 0.24, 0.32, 0.65, "#c4966d");
    this.orb(-9, 0.52, -64.68, 0.18, "#c4966d");
    for (const x of [-9.09, -8.91])
      for (const z of [-65.22, -64.78])
        this.box(x, 0.12, z, 0.06, 0.24, 0.06, "#a27d5e");
  }
  addAtmosphere() {
    // Cloth flags, local notices and warm fittings give the street its own history.
    for (const z of [-6, -37]) {
      this.wire(new THREE.Vector3(-13, 8.4, z), new THREE.Vector3(13, 8.4, z));
      for (let i = 0; i < 13; i++) {
        const x = -11 + i * 1.8,
          y = 8.4 - 1.45 * (1 - Math.pow(x / 13, 2));
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [-0.32, 0, 0, 0.32, 0, 0, 0, -0.7, 0],
            3,
          ),
        );
        geometry.computeVertexNormals();
        const flag = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: ["#ce9862", "#d0ba86", "#708e82", "#a76c51"][i % 4],
            side: THREE.DoubleSide,
            roughness: 1,
          }),
        );
        flag.position.set(x, y, z);
        flag.rotation.y = ((i % 3) - 1) * 0.2;
        this.scene.add(flag);
      }
    }
    for (const [x, z] of [
      [-7, 23],
      [7, -5],
      [-7, -16],
      [8, 42],
      [54, -38],
    ]) {
      const puddle = new THREE.Mesh(
        new THREE.CircleGeometry(0.9, 16),
        new THREE.MeshStandardMaterial({
          color: "#769090",
          roughness: 0.14,
          metalness: 0.58,
          transparent: true,
          opacity: 0.45,
        }),
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.scale.set(1.8, 0.7, 1);
      puddle.position.set(x, 0.07, z);
      this.scene.add(puddle);
    }
    this.sign(
      "İŞ VAR. UMUT VAR.",
      -12.97,
      2.35,
      29,
      2.8,
      1.2,
      "#c1b694",
      "#435f59",
      Math.PI / 2,
    );
    this.sign(
      "YARIN DA BURADAYIZ.",
      12.98,
      2.4,
      28,
      2.6,
      1,
      "#375b5a",
      "#d9c394",
      -Math.PI / 2,
    );
    for (const [x, z] of [
      [-23, 20],
      [24, -13],
      [-25, -17],
      [25, 22],
    ]) {
      const height =
        x < 0 && z < 0 ? 15 : z > 0 && x > 0 ? 14 : x < 0 ? 12 : 11;
      this.box(x, height + 1.1, z + 3, 3.3, 0.2, 1.8, "#355763", 0, 0.13);
      this.cyl(x + 2, height + 1.5, z + 3, 0.45, 2.8, "#a9b7ac", Math.PI / 2);
      this.cyl(x - 3, height + 1.7, z - 3, 0.025, 3, "#727f74");
      this.box(x - 3, height + 2.8, z - 3, 1.7, 0.04, 0.04, "#727f74");
      this.box(x - 3, height + 2.4, z - 3, 1.1, 0.04, 0.04, "#727f74");
    }
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const ctx = glowCanvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,225,158,.9)");
    gradient.addColorStop(0.18, "rgba(255,203,118,.3)");
    gradient.addColorStop(1, "rgba(255,180,98,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const glowMaterial = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(glowCanvas),
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    for (const z of [-75, -55, -35, -15, 5, 25, 45, 65]) {
      const sprite = new THREE.Sprite(glowMaterial);
      sprite.position.set(8.6, 5.5, z + 0.45);
      sprite.scale.set(1.4, 1.4, 1.4);
      this.scene.add(sprite);
    }
  }
  makeActor(c: Character): Actor {
    return createActor(c, (color) => this.mat(color));
  }
  animateActor(a: Actor, speed: number, dt: number, carrying = false) {
    a.walk += dt * (speed > 5 ? 12 : 8);
    a.legs[0].rotation.x = Math.sin(a.walk) * Math.min(speed * 0.12, 0.75);
    a.legs[1].rotation.x = -a.legs[0].rotation.x;
    a.arms[0].rotation.x = carrying ? -1.05 : -a.legs[0].rotation.x * 0.8;
    a.arms[1].rotation.x = carrying ? -1.05 : a.legs[0].rotation.x * 0.8;
    a.body.position.y =
      speed > 0.1
        ? Math.abs(Math.sin(a.walk * 2)) * 0.035
        : Math.sin(this.time * 1.5) * 0.008;
    a.carry.visible = carrying;
  }
  makeMarker(color: string) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.62, 32),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
    );
    diamond.position.y = 2.8;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 2.1, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 }),
    );
    beam.position.y = 1.2;
    g.add(ring, diamond, beam);
    return g;
  }
  buildInterior() {
    const add = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      c: string,
    ) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mat(c));
      m.position.set(x, y, z);
      m.receiveShadow = true;
      m.castShadow = true;
      this.interior.add(m);
    };
    add(0, -0.1, 0, 9, 0.2, 9, "#9c8667");
    add(0, 1.8, -4.5, 9, 3.6, 0.2, "#c9c2a7");
    add(-4.5, 1.8, 0, 0.2, 3.6, 9, "#a0b0a1");
    add(4.5, 1.8, 0, 0.2, 3.6, 9, "#b1baa7");
    add(-2, 0.45, -2, 2, 0.8, 3, "#76664e");
    add(-2, 0.92, -2, 1.9, 0.2, 2.9, "#a9b6a1");
    add(-2, 1.1, -3, 1.5, 0.18, 0.7, "#e1d9c0");
    add(2, 0.65, -3, 1.7, 1.3, 1, "#6d7872");
    add(2, 1.32, -3, 1.8, 0.08, 1.1, "#c7ba99");
    add(1.2, 1, -0.5, 2, 0.12, 1.2, "#9c7a54");
    for (const x of [0.4, 2])
      for (const z of [-1, 0]) add(x, 0.5, z, 0.08, 1, 0.08, "#6b715f");
    add(0, 0.012, 0, 3.8, 0.025, 4.8, "#8b6761");
    add(0, 0.023, 0, 3.4, 0.01, 4.4, "#ae8a78");
    add(-4.35, 2.15, -1, 0.06, 1.9, 1.8, "#82a6a4");
    this.interior.position.set(0, 0, 125);
    this.scene.add(this.interior);
    this.interior.visible = false;
  }
  blocked(x: number, z: number) {
    if (this.interiorActive)
      return (
        x < -4 ||
        x > 4 ||
        z < 121 ||
        z > 129 ||
        (x < -1 && z < 124.5) ||
        (
          useGame.getState().network.house?.furniture ||
          useGame.getState().save.furniture
        ).some((f) => Math.abs(x - f.x) < 0.6 && Math.abs(z - 125 - f.z) < 0.6)
      );
    return this.blockedOutside(x, z);
  }
  blockedOutside(x: number, z: number) {
    if (x < -93 || x > 93 || z < -87 || z > 87) return true;
    return this.colliders.some(
      (c) =>
        Math.abs(x - c.x) < c.w / 2 + 0.32 &&
        Math.abs(z - c.z) < c.d / 2 + 0.32,
    );
  }
  resize = () => {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.atmosphere?.resize();
  };
  applyQuality() {
    const q = useGame.getState().settings.quality;
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        q === "high" ? 1.75 : q === "medium" ? 1.2 : 1,
      ),
    );
    this.renderer.shadowMap.enabled = q !== "low";
    this.sun.shadow.mapSize.set(
      q === "high" ? 2048 : 1024,
      q === "high" ? 2048 : 1024,
    );
    this.renderer.shadowMap.needsUpdate = true;
    this.atmosphere?.setQuality(q);
  }
  clearKeys = () => this.keys.clear();
  onKeyDown = (e: KeyboardEvent) => {
    const state = useGame.getState();
    if ((e.target as HTMLElement)?.matches("input,textarea,select")) return;
    const k = state.settings.keys;
    if (["Tab", "Space", "Escape", ...Object.values(k)].includes(e.code))
      e.preventDefault();
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === "Escape") {
      if (state.mechanic) {
        useGame.setState({ mechanic: null });
        return;
      }
      if (state.decorating) {
        useGame.setState({ decorating: null });
        return;
      }
      if (state.panel === "none") state.setPanel("pause");
      else if (state.playing) state.setPanel("none");
      else state.setPanel("menu");
      return;
    }
    if (!state.playing) return;
    const panels: { [key: string]: "inventory" | "map" | "journal" | "phone" } =
      {
        [k.inventory]: "inventory",
        [k.map]: "map",
        [k.journal]: "journal",
        [k.phone]: "phone",
      };
    if (panels[e.code])
      state.setPanel(state.panel === panels[e.code] ? "none" : panels[e.code]);
    if (state.panel !== "none" || state.mechanic) return;
    if (e.code === k.interact) {
      if (this.interiorActive) {
        if (state.decorating) {
          state.placeFurniture(
            this.player.group.position.x + Math.sin(this.yaw) * 1.4,
            this.player.group.position.z - 125 + Math.cos(this.yaw) * 1.4,
            this.rotation,
          );
          return;
        }
        if (this.player.group.position.z > 127) {
          state.exitHome();
          audio.play("door");
          return;
        }
        state.setPanel("home");
        return;
      }
      state.interact();
    }
    if (e.code === k.drop) state.drop();
    if (e.code === "KeyR") this.rotation += Math.PI / 4;
    if (e.code === k.jump && this.vertical === 0 && state.save.energy > 4)
      this.velocityY = 5.2;
  };
  onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  contextMenu = (e: Event) => e.preventDefault();
  onPointerDown = (e: PointerEvent) => {
    if (useGame.getState().panel !== "none" || useGame.getState().mechanic)
      return;
    audio.init();
    if (e.button === 2) {
      this.drag = true;
    } else if (e.button === 0 && !document.pointerLockElement) {
      this.renderer.domElement.requestPointerLock?.();
    }
  };
  onPointerUp = () => {
    this.drag = false;
  };
  onPointerMove = (e: PointerEvent) => {
    const s = useGame.getState();
    if (s.panel !== "none" || s.mechanic) return;
    if (this.drag || document.pointerLockElement === this.renderer.domElement) {
      this.yaw -= e.movementX * 0.003 * s.settings.sensitivity;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch + e.movementY * 0.002 * s.settings.sensitivity,
        0.03,
        1.1,
      );
    }
  };
  onWheel = (e: WheelEvent) => {
    if (useGame.getState().panel === "none")
      this.distance = THREE.MathUtils.clamp(
        this.distance + e.deltaY * 0.004,
        3.5,
        12,
      );
  };
  updateFurniture() {
    const s = useGame.getState();
    const furnishings = s.network.house?.furniture || s.save.furniture;
    const json = JSON.stringify(furnishings);
    if (json !== this.furnitureJSON) {
      this.furniture.clear();
      this.furnitureJSON = json;
      for (const item of furnishings) {
        const g = this.furnitureMesh(item.id);
        g.position.set(item.x, 0, item.z + 125);
        g.rotation.y = item.rotation;
        this.furniture.add(g);
      }
    }
    this.furniture.visible = this.interiorActive;
    if (s.decorating && !this.furnitureGhost) {
      this.furnitureGhost = this.furnitureMesh(s.decorating, true);
      this.scene.add(this.furnitureGhost);
    }
    if (!s.decorating && this.furnitureGhost) {
      this.scene.remove(this.furnitureGhost);
      this.furnitureGhost = null;
    }
    if (this.furnitureGhost) {
      this.furnitureGhost.position
        .copy(this.player.group.position)
        .add(
          new THREE.Vector3(
            Math.sin(this.yaw) * 1.4,
            0,
            Math.cos(this.yaw) * 1.4,
          ),
        );
      this.furnitureGhost.rotation.y = this.rotation;
    }
  }
  furnitureMesh(id: string, ghost = false) {
    const g = new THREE.Group();
    const add = (
      geo: THREE.BufferGeometry,
      x: number,
      y: number,
      z: number,
      c: string,
    ) => {
      const m = new THREE.Mesh(
        geo,
        ghost
          ? new THREE.MeshStandardMaterial({
              color: "#c0dfa6",
              transparent: true,
              opacity: 0.5,
            })
          : this.mat(c),
      );
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
    };
    if (id === "chair") {
      add(new THREE.BoxGeometry(0.7, 0.12, 0.7), 0, 0.5, 0, "#a7855b");
      add(new THREE.BoxGeometry(0.7, 0.6, 0.1), 0, 0.85, -0.3, "#a7855b");
      for (const x of [-0.26, 0.26])
        for (const z of [-0.26, 0.26])
          add(new THREE.BoxGeometry(0.07, 0.5, 0.07), x, 0.25, z, "#75684f");
    } else if (id === "plant") {
      add(new THREE.CylinderGeometry(0.3, 0.22, 0.5, 8), 0, 0.25, 0, "#b47751");
      add(new THREE.IcosahedronGeometry(0.6, 0), 0, 0.95, 0, "#668665");
    } else {
      add(
        new THREE.CylinderGeometry(0.3, 0.3, 0.07, 10),
        0,
        0.04,
        0,
        "#5e6861",
      );
      add(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), 0, 0.9, 0, "#9a8966");
      add(new THREE.ConeGeometry(0.5, 0.6, 12, 1, true), 0, 1.8, 0, "#e0c69c");
    }
    return g;
  }
  animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    const elapsed = Math.min(this.clock.getDelta(), 0.25);
    const state = useGame.getState();
    const dt =
      state.playing &&
      state.panel === "pause" &&
      state.network.status !== "online"
        ? 0
        : elapsed;
    this.time += dt;
    const newPlaying = state.playing && state.panel !== "menu";
    if (newPlaying !== this.playing) {
      this.playing = newPlaying;
      if (this.playing) {
        this.player.group.position.set(state.save.pos[0], 0, state.save.pos[1]);
        this.camera.position
          .copy(this.player.group.position)
          .add(new THREE.Vector3(7, 5, 5));
        this.yaw = 0;
      }
    }
    if (this.interiorActive !== state.interior) {
      this.interiorActive = state.interior;
      this.interior.visible = state.interior;
      if (state.interior) this.player.group.position.set(0, 0, 128);
      else this.player.group.position.set(-8, 0, 18);
      this.camera.position
        .copy(this.player.group.position)
        .add(new THREE.Vector3(0, 3, 5));
      this.vertical = 0;
    }
    const ch = JSON.stringify(state.save.character);
    if (ch !== this.charJSON) {
      const old = this.player;
      this.player = this.makeActor(state.save.character);
      this.player.group.position.copy(old.group.position);
      this.player.group.rotation.copy(old.group.rotation);
      this.scene.remove(old.group);
      old.group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      this.scene.add(this.player.group);
      this.charJSON = ch;
    }
    this.player.group.visible = this.playing;
    let running = false;
    if (this.playing) {
      let speed = 0;
      if (state.panel === "none" && !state.mechanic) {
        const k = state.settings.keys;
        let x = Number(this.keys.has(k.right)) - Number(this.keys.has(k.left)),
          z = Number(this.keys.has(k.forward)) - Number(this.keys.has(k.back));
        const len = Math.hypot(x, z);
        if (len) {
          x /= len;
          z /= len;
          running =
            this.keys.has(k.run) &&
            state.save.energy > 3 &&
            !state.save.carrying;
          speed =
            (running ? 7 : 3.6) *
            (state.save.craving > 80 ? 0.8 : 1) *
            (state.save.carrying ? 0.8 : 1);
          const vx =
              (Math.cos(this.yaw) * x - Math.sin(this.yaw) * z) * speed * dt,
            vz =
              (-Math.sin(this.yaw) * x - Math.cos(this.yaw) * z) * speed * dt;
          const pos = this.player.group.position;
          // Short collision steps preserve movement speed on slow frames without
          // allowing the player to tunnel through narrow obstacles.
          const steps = Math.max(1, Math.ceil(Math.hypot(vx, vz) / 0.18));
          for (let i = 0; i < steps; i++) {
            if (!this.blocked(pos.x + vx / steps, pos.z)) pos.x += vx / steps;
            if (!this.blocked(pos.x, pos.z + vz / steps)) pos.z += vz / steps;
          }
          const target = Math.atan2(vx, vz);
          this.player.group.rotation.y +=
            Math.atan2(
              Math.sin(target - this.player.group.rotation.y),
              Math.cos(target - this.player.group.rotation.y),
            ) * Math.min(1, dt * 13);
          if (this.time - this.lastStep > (running ? 0.26 : 0.43)) {
            audio.play("step");
            this.lastStep = this.time;
          }
        }
        const verticalSteps = Math.max(1, Math.ceil(dt / (1 / 60)));
        for (let i = 0; i < verticalSteps; i++) {
          this.velocityY -= (14 * dt) / verticalSteps;
          this.vertical = Math.max(
            0,
            this.vertical + (this.velocityY * dt) / verticalSteps,
          );
          if (this.vertical === 0) this.velocityY = 0;
        }
        this.player.group.position.y = this.vertical;
      }
      this.animateActor(this.player, speed, dt, !!state.save.carrying);
      if (this.time - this.lastState > 0.1) {
        if (!this.interiorActive) {
          const pp: Vec2 = [
            this.player.group.position.x,
            this.player.group.position.z,
          ];
          if (
            Math.hypot(state.save.pos[0] - pp[0], state.save.pos[1] - pp[1]) >
            15
          )
            this.player.group.position.set(
              state.save.pos[0],
              this.vertical,
              state.save.pos[1],
            );
          else state.move(pp, this.player.group.rotation.y);
          const dropped = state.save.dropped;
          const nearby =
            dropped && Math.hypot(pp[0] - dropped[0], pp[1] - dropped[1]) < 2
              ? "dropped"
              : nearestPlace(pp);
          if (nearby !== state.nearby) useGame.setState({ nearby });
        } else
          useGame.setState({
            nearby: null,
            indoorPos: [
              this.player.group.position.x,
              this.player.group.position.z - 125,
            ],
            facing: this.player.group.rotation.y,
          });
        this.lastState = this.time;
      }
      if (this.time - this.lastTick > 0.5) {
        state.tick(this.time - this.lastTick, running);
        this.lastTick = this.time;
      }
      const focus = this.player.group.position
        .clone()
        .add(new THREE.Vector3(0, 1.35, 0));
      let cameraDistance = this.interiorActive
        ? Math.min(this.distance, 4)
        : this.distance;
      const offset = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch),
      );
      this.raycaster.set(focus, offset);
      this.raycaster.far = cameraDistance;
      const hits = this.raycaster.intersectObjects(this.camOccluders, false);
      if (hits.length) cameraDistance = Math.max(1.1, hits[0].distance - 0.3);
      const desired = focus.clone().addScaledVector(offset, cameraDistance);
      desired.y = Math.max(desired.y, 0.55);
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 9));
      this.camera.lookAt(focus);
      this.camera.fov = THREE.MathUtils.lerp(
        this.camera.fov,
        running ? 56 : 48,
        dt * 3,
      );
      this.camera.updateProjectionMatrix();
    } else {
      this.lastTick = this.time;
      const motion = state.settings.reducedMotion
        ? 0
        : Math.sin(this.time * 0.035);
      this.camera.position.set(
        3.5 + motion * 0.8,
        6.7 + Math.sin(this.time * 0.05) * 0.12,
        34 + motion,
      );
      this.camera.lookAt(0, 4.3, -39);
      this.camera.fov = 48;
      this.camera.updateProjectionMatrix();
    }
    const q = state.save.active ? questById[state.save.active.id] : null;
    const obj = state.save.active ? q?.stages[state.save.active.stage] : null;
    const goal = obj
      ? placeById[obj.place]
      : !state.save.completed.length
        ? placeById.market
        : null;
    this.goalMarker.visible = this.playing && !this.interiorActive && !!goal;
    if (goal) {
      this.goalMarker.position.set(goal.pos[0], 0, goal.pos[1]);
      this.goalMarker.children[1].rotation.y = this.time;
      this.goalMarker.children[1].position.y =
        3 + Math.sin(this.time * 2) * 0.18;
    }
    this.nearMarker.visible =
      this.playing &&
      !this.interiorActive &&
      !!state.nearby &&
      state.nearby !== "dropped";
    if (this.nearMarker.visible) {
      const p = placeById[state.nearby!];
      this.nearMarker.position.set(p.pos[0], 0, p.pos[1]);
    }
    this.dropBox.visible = !!state.save.dropped;
    if (state.save.dropped)
      this.dropBox.position.set(
        state.save.dropped[0],
        0.34,
        state.save.dropped[1],
      );
    const hour = this.playing ? state.save.time : 17.3;
    const night = hour < 6 || hour > 20;
    const raining =
      state.settings.weather === "rain" ||
      ((state.settings.weather || "auto") === "auto" &&
        state.save.day % 3 === 0 &&
        hour > 12 &&
        hour < 20);
    this.sun.intensity = night ? 0.3 : raining ? 1.6 : 3.1;
    this.hemi.intensity = night ? 1.3 : 3.3;
    this.renderer.toneMappingExposure = night ? 1.05 : 1.08;
    this.sun.position.set(
      -65,
      Math.max(36, Math.sin(((hour - 6) / 12) * Math.PI) * 85),
      -65,
    );
    (this.sky.material as THREE.ShaderMaterial).uniforms.top.value.set(
      night ? "#182e43" : "#7296a1",
    );
    (this.sky.material as THREE.ShaderMaterial).uniforms.bottom.value.set(
      night ? "#516e73" : "#e7cba0",
    );
    (this.scene.fog as THREE.FogExp2).color.set(night ? "#314c53" : "#acbbaf");
    for (const n of this.npcs) {
      const p = n.actor.group.position;
      let speed = 0;
      if (n.patrol) {
        const old = p.clone();
        const target =
          n.police &&
          state.save.suspicion > 55 &&
          this.playing &&
          !this.interiorActive
            ? this.player.group.position
            : new THREE.Vector3(
                n.origin[0] + Math.sin(this.time * 0.08 + n.phase) * 1.4,
                0,
                n.origin[1] + Math.sin(this.time * 0.06 + n.phase) * 9,
              );
        const direction = target.clone().sub(p);
        const len = direction.length();
        if (len > 0.3) {
          direction.normalize();
          speed = n.police && state.save.suspicion > 55 ? 3.2 : 1;
          const nx = p.x + direction.x * dt * speed,
            nz = p.z + direction.z * dt * speed;
          if (!this.blockedOutside(nx, p.z)) p.x = nx;
          if (!this.blockedOutside(p.x, nz)) p.z = nz;
          n.actor.group.rotation.y = Math.atan2(p.x - old.x, p.z - old.z);
        }
        if (n.police && this.playing && !this.interiorActive) {
          const dist = p.distanceTo(this.player.group.position);
          if (dist < 2 && state.save.suspicion >= 65) state.capture();
          if (
            state.network.status === "offline" &&
            this.time - this.lastState < dt
          ) {
            const suspicion = state.save.suspicion;
            let change = dist < 12 && q?.risk ? 1.5 : -0.25;
            const mask = state.save.inventory.mask > 0;
            if (mask && change > 0) change *= 0.5;
            useGame.setState((s) => ({
              save: {
                ...s.save,
                suspicion: THREE.MathUtils.clamp(
                  suspicion + change * 0.1,
                  0,
                  100,
                ),
              },
            }));
          }
        }
      } else {
        n.actor.head.rotation.y = Math.sin(this.time * 0.5 + n.phase) * 0.18;
      }
      this.animateActor(n.actor, speed, dt);
    }
    for (const d of this.doors) {
      const near =
        this.player.group.position.distanceTo(new THREE.Vector3(d.x, 0, d.z)) <
          4 && this.playing;
      d.pivot.rotation.y = THREE.MathUtils.lerp(
        d.pivot.rotation.y,
        d.open + (near ? -1.2 : 0),
        dt * 4,
      );
    }
    for (const c of this.cars) {
      c.group.position.z += (c.group.rotation.y === 0 ? 1 : -1) * c.speed * dt;
      if (c.group.position.z > 85) c.group.position.z = -85;
      if (c.group.position.z < -85) c.group.position.z = 85;
    }
    for (const [i, b] of this.birds.entries()) {
      b.position.x = Math.sin(this.time * 0.045 + i) * 55;
      b.position.z = -77 + Math.cos(this.time * 0.06 + i) * 15;
      b.rotation.y = this.time * 0.025 + i;
      b.rotation.z = Math.sin(this.time * 2 + i) * 0.08;
    }
    this.water.position.y = -0.25 + Math.sin(this.time * 0.7) * 0.025;
    for (const peer of state.network.peers) {
      const existing = this.peers.get(peer.id);
      const appearance = JSON.stringify(peer.character);
      if (existing && existing.group.userData.appearance !== appearance) {
        this.scene.remove(existing.group);
        existing.group.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        });
        this.peers.delete(peer.id);
      }
      if (!this.peers.has(peer.id)) {
        const actor = this.makeActor(peer.character);
        actor.group.userData.appearance = appearance;
        actor.group.position.set(peer.pos[0], 0, peer.pos[1]);
        this.peers.set(peer.id, actor);
        this.scene.add(actor.group);
      }
      const actor = this.peers.get(peer.id)!;
      actor.group.visible = !!peer.inside === this.interiorActive;
      const target = new THREE.Vector3(peer.pos[0], 0, peer.pos[1]);
      const speed = actor.group.position.distanceTo(target) > 0.1 ? 3 : 0;
      actor.group.position.lerp(target, Math.min(1, dt * 12));
      actor.group.rotation.y = peer.rotation;
      this.animateActor(actor, speed, dt, !!peer.carrying);
    }
    for (const [id, actor] of this.peers)
      if (!state.network.peers.some((p) => p.id === id)) {
        this.scene.remove(actor.group);
        actor.group.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        });
        this.peers.delete(id);
      }
    this.updateFurniture();
    this.atmosphere.update(
      dt,
      night,
      raining,
      this.playing ? this.player.group.position : new THREE.Vector3(0, 0, 5),
      this.interiorActive,
    );
    audio.weather(raining && !this.interiorActive);
    // Keep the scene alive behind panels while giving their interactions priority.
    const now = performance.now();
    const overlay = !!state.mechanic || !["none", "menu"].includes(state.panel);
    if (!overlay || now - this.lastRender > 250) {
      this.atmosphere.render();
      this.lastRender = now;
    }
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clearKeys);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointermove", this.onPointerMove);
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.dispose();
      }
    });
    this.atmosphere.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
