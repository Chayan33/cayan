import type { Furniture, SharedHouse } from "./types";
export function newSharedHouse(owner = ""): SharedHouse {
  return {
    owner,
    locked: false,
    guests: [],
    decorators: [],
    furniture: [],
    storage: {},
    resting: [],
  };
}
export function mayEnter(house: SharedHouse, id: string) {
  return !house.locked || house.owner === id || house.guests.includes(id);
}
export function mayDecorate(house: SharedHouse, id: string) {
  return house.owner === id || house.decorators.includes(id);
}
export function furniturePlacementError(
  furniture: Furniture[],
  x: number,
  z: number,
) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    Math.abs(x) > 3.7 ||
    Math.abs(z) > 3.7
  )
    return "Eşyayı odanın içinde bir yere koy.";
  if (x < -0.6 && z < 0.2) return "Yatağın önünü açık bırak.";
  if (Math.abs(x) < 1 && z > 2.5) return "Kapının önüne eşya koyamazsın.";
  if (furniture.some((f) => Math.hypot(f.x - x, f.z - z) < 0.9))
    return "Eşyalar arasında biraz yer bırak.";
  return null;
}
