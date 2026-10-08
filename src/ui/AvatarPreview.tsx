import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createActor } from "../game/avatar";
import type { Character } from "../game/types";
export function AvatarPreview({ character }: { character: Character }) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef(character);
  latest.current = character;
  useEffect(() => {
    const el = ref.current!;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Döndürülebilen gerçek 3D karakter önizlemesi",
    );
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 1.35, 4.6);
    camera.lookAt(0, 1, 0);
    scene.add(new THREE.HemisphereLight("#d9e2da", "#4a5c51", 2.5));
    const key = new THREE.DirectionalLight("#ffe1b2", 4);
    key.position.set(-3, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#93bfc8", 2.8);
    rim.position.set(3, 2, -2);
    scene.add(rim);
    const mats = new Map<string, THREE.MeshStandardMaterial>();
    const material = (color: string) => {
      if (!mats.has(color))
        mats.set(
          color,
          new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
        );
      return mats.get(color)!;
    };
    let actor = createActor(latest.current, material),
      json = JSON.stringify(latest.current);
    actor.group.rotation.y = 0.35;
    scene.add(actor.group);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.81, 0.045, 48),
      material("#46605a"),
    );
    disc.position.y = -0.01;
    scene.add(disc);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.89, 0.008, 6, 64),
      material("#ac9e75"),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.01;
    scene.add(ring);
    const disposeActor = () =>
      actor.group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    let down = false,
      last = 0,
      yaw = 0.35,
      frame = 0;
    const pd = (e: PointerEvent) => {
      down = true;
      last = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const pm = (e: PointerEvent) => {
      if (down) {
        yaw += (e.clientX - last) * 0.012;
        last = e.clientX;
      }
    };
    const pu = () => (down = false);
    el.addEventListener("pointerdown", pd);
    el.addEventListener("pointermove", pm);
    el.addEventListener("pointerup", pu);
    const resize = new ResizeObserver(() => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    const animate = (t: number) => {
      frame = requestAnimationFrame(animate);
      if (json !== JSON.stringify(latest.current)) {
        json = JSON.stringify(latest.current);
        scene.remove(actor.group);
        disposeActor();
        actor = createActor(latest.current, material);
        scene.add(actor.group);
      }
      actor.group.rotation.y = yaw;
      actor.body.position.y = Math.sin(t * 0.0015) * 0.008;
      actor.head.rotation.y = Math.sin(t * 0.0005) * 0.055;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      el.removeEventListener("pointerdown", pd);
      el.removeEventListener("pointermove", pm);
      el.removeEventListener("pointerup", pu);
      disposeActor();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          if (!Array.isArray(o.material)) o.material.dispose();
        }
      });
      mats.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return <div className="avatar-preview-canvas" ref={ref} />;
}
