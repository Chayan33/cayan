import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Character } from "./types";
export type Actor = {
  group: THREE.Group;
  arms: THREE.Group[];
  legs: THREE.Group[];
  body: THREE.Group;
  head: THREE.Group;
  carry: THREE.Mesh;
  walk: number;
};
export function createActor(
  c: Character,
  materialFor: (color: string) => THREE.MeshStandardMaterial,
): Actor {
  const group = new THREE.Group(),
    body = new THREE.Group(),
    head = new THREE.Group(),
    arms: THREE.Group[] = [],
    legs: THREE.Group[] = [];
  const mesh = (w: number, h: number, d: number, color: string) => {
    const m = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * 0.16),
      materialFor(color),
    );
    m.castShadow = true;
    return m;
  };
  const torso = mesh(0.55, 0.65, 0.32, c.shirt);
  torso.position.y = 1.1;
  body.add(torso);
  const collar = mesh(0.23, 0.06, 0.35, "#dbd1ba");
  collar.position.y = 1.45;
  body.add(collar);
  head.position.y = 1.67;
  const skull = mesh(0.34, 0.4, 0.32, c.skin);
  head.add(skull);
  const hair = mesh(0.36, c.style === 1 ? 0.2 : 0.13, 0.34, c.hair);
  hair.position.y = c.style === 1 ? 0.18 : 0.2;
  head.add(hair);
  const back = mesh(0.36, 0.29, 0.12, c.hair);
  back.position.set(0, 0.1, -0.14);
  head.add(back);
  if (c.style === 2) {
    const cap = mesh(0.4, 0.16, 0.43, c.shirt);
    cap.position.set(0, 0.25, 0.02);
    head.add(cap);
  }
  for (const x of [-0.09, 0.09]) {
    const eye = mesh(0.035, 0.03, 0.015, "#332d29");
    eye.position.set(x, 0.04, 0.164);
    head.add(eye);
  }
  const nose = mesh(0.065, 0.075, 0.075, c.skin);
  nose.position.set(0, -0.02, 0.19);
  head.add(nose);
  if (c.accessory) {
    const glasses = mesh(0.32, 0.06, 0.035, "#303f40");
    glasses.position.set(0, 0.04, 0.19);
    head.add(glasses);
  }
  head.scale.set(
    c.face === 1 ? 1.08 : c.face === 2 ? 0.92 : 1,
    c.face === 1 ? 0.93 : c.face === 2 ? 1.08 : 1,
    1,
  );
  const mouth = mesh(0.11, 0.018, 0.02, "#87553f");
  mouth.position.set(0, -0.105, 0.168);
  head.add(mouth);
  for (const x of [-0.182, 0.182]) {
    const ear = mesh(0.045, 0.09, 0.1, c.skin);
    ear.position.set(x, -0.015, 0);
    head.add(ear);
  }
  body.add(head);
  for (const x of [-0.34, 0.34]) {
    const arm = new THREE.Group();
    arm.position.set(x, 1.35, 0);
    const sleeve = mesh(0.18, 0.33, 0.22, c.shirt);
    sleeve.position.y = -0.12;
    const skin = mesh(0.14, 0.28, 0.16, c.skin);
    skin.position.y = -0.4;
    arm.add(sleeve, skin);
    body.add(arm);
    arms.push(arm);
  }
  for (const x of [-0.15, 0.15]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.79, 0);
    const pants = mesh(0.23, 0.67, 0.25, c.pants);
    pants.position.y = -0.3;
    const shoe = mesh(0.25, 0.14, 0.38, c.shoes);
    shoe.position.set(0, -0.69, 0.06);
    leg.add(pants, shoe);
    body.add(leg);
    legs.push(leg);
  }
  group.add(body);
  const carry = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.5, 0.54),
    materialFor("#b18c5d"),
  );
  carry.position.set(0, 1.03, 0.5);
  carry.visible = false;
  group.add(carry);
  const actorMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
  });
  for (const part of [body, head, ...arms, ...legs]) {
    const meshes = part.children.filter(
      (o): o is THREE.Mesh => o instanceof THREE.Mesh,
    );
    const geometries = meshes.map((m) => {
      m.updateMatrix();
      const geo = m.geometry.clone().applyMatrix4(m.matrix);
      const color = (m.material as THREE.MeshStandardMaterial).color;
      const colors = new Float32Array(geo.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
      }
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return geo;
    });
    if (geometries.length) {
      const merged = new THREE.Mesh(mergeGeometries(geometries), actorMaterial);
      merged.castShadow = true;
      meshes.forEach((m) => {
        part.remove(m);
        m.geometry.dispose();
      });
      geometries.forEach((g) => g.dispose());
      part.add(merged);
    }
  }
  return { group, body, head, arms, legs, carry, walk: 0 };
}
