import type { Character, Save } from "./types";
import { items, placeById } from "./world";
import { available, questById } from "./quests";
export const defaultCharacter: Character = {
  name: "Deniz",
  skin: "#c99470",
  hair: "#2b2523",
  shirt: "#d19260",
  pants: "#374c50",
  shoes: "#e0d6be",
  style: 0,
  accessory: false,
  face: 0,
};
export function initialSave(
  character: Character = { ...defaultCharacter },
): Save {
  return {
    version: 1,
    character,
    cash: 85,
    bank: 0,
    debt: 600,
    health: 100,
    energy: 94,
    hunger: 82,
    craving: 18,
    tolerance: 8,
    stress: 12,
    xp: 0,
    reputation: 0,
    crimeLevel: 0,
    suspicion: 0,
    day: 1,
    time: 17.3,
    inventory: { water: 2, food: 1 },
    completed: [],
    active: null,
    pos: [-8, 18],
    carrying: null,
    dropped: null,
    furniture: [],
    pawnTickets: [],
    relationships: {},
    achievements: [],
    ownedHome: false,
    homeLocked: false,
    log: [],
  };
}
export function validateSave(input: unknown): Save | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Save;
  if (
    v.version !== 1 ||
    !v.character ||
    !Array.isArray(v.completed) ||
    !Array.isArray(v.pos) ||
    !v.pos.every(Number.isFinite) ||
    !Number.isFinite(v.cash) ||
    v.cash < 0 ||
    !v.inventory
  )
    return null;
  const s = {
    ...initialSave(),
    ...v,
    character: { ...defaultCharacter, ...v.character },
  };
  if (
    s.active &&
    (!questById[s.active.id] ||
      !Number.isInteger(s.active.stage) ||
      s.active.stage < 0 ||
      s.active.stage >= questById[s.active.id].stages.length)
  )
    s.active = null;
  return s;
}
export function startQuest(
  s: Save,
  id: string,
  players = 1,
): { save: Save; error?: string } {
  const q = questById[id];
  if (!q) return { save: s, error: "Bu iş bulunamadı." };
  if (s.active)
    return { save: s, error: "Önce aktif işini tamamla veya günlükten bırak." };
  if (!available(q, s.completed, s.xp, players))
    return {
      save: s,
      error:
        q.category === "Birlikte" && players < 2
          ? "Bu iş için aynı odada en az iki oyuncu gerekiyor."
          : "Önce gerekli işleri ve seviyeyi tamamla.",
    };
  if (s.completed.includes(id) && !q.repeatable)
    return { save: s, error: "Bu hikâye zaten tamamlandı." };
  return {
    save: {
      ...s,
      active: { id, stage: 0, startedAt: Date.now(), elapsed: 0 },
      carrying: null,
      dropped: null,
    },
  };
}
export function objectiveAction(
  s: Save,
  place: string,
  players = 1,
  mechanicPassed = false,
): { save: Save; error?: string; completed?: boolean } {
  if (!s.active) return { save: s, error: "Aktif bir işin yok." };
  const q = questById[s.active.id],
    o = q?.stages[s.active.stage];
  if (!o || o.place !== place)
    return { save: s, error: "Bu, sıradaki görev noktası değil." };
  const p = placeById[place];
  if (Math.hypot(s.pos[0] - p.pos[0], s.pos[1] - p.pos[1]) > 4.5)
    return { save: s, error: "Etkileşmek için hedefe yaklaş." };
  if (q.category === "Birlikte" && players < 2)
    return {
      save: s,
      error: "Takım arkadaşın bağlandığında devam edebilirsin.",
    };
  if (
    ["repair", "clean", "wait", "inspect", "signal"].includes(o.action) &&
    !mechanicPassed
  )
    return { save: s, error: "Önce etkileşimi tamamla." };
  if (o.action === "pickup" && s.carrying)
    return { save: s, error: "Önce elindeki koliyi teslim et." };
  if (o.action === "deliver" && !s.carrying)
    return {
      save: s,
      error: "Önce görev kolisini al. Bıraktıysan haritadaki konumuna dön.",
    };
  if (["pay", "deposit"].includes(o.action) && s.cash < (o.amount || 0))
    return {
      save: s,
      error: "Nakit yeterli değil. Yasal işlerden para kazanabilirsin.",
    };
  let n = {
    ...s,
    inventory: { ...s.inventory },
    relationships: { ...s.relationships },
  };
  if (o.action === "pickup") {
    n.carrying = q.id;
    n.dropped = null;
  }
  if (o.action === "deliver") {
    n.carrying = null;
    n.dropped = null;
  }
  if (o.action === "pay") {
    n.cash -= o.amount || 0;
    n.debt = Math.max(0, n.debt - (o.amount || 0));
  }
  if (o.action === "deposit") {
    n.cash -= o.amount || 0;
    n.bank += o.amount || 0;
  }
  if (o.action === "talk")
    n.relationships[q.giver] = (n.relationships[q.giver] || 0) + 1;
  n.suspicion = Math.min(100, n.suspicion + (q.risk ? 8 : 0));
  const done = s.active.stage + 1 >= q.stages.length;
  if (done) {
    n.cash += q.reward;
    n.xp += q.xp;
    if (q.id === "story-8" && !s.completed.includes(q.id))
      n.inventory.lamp = (n.inventory.lamp || 0) + 1;
    n.reputation += q.category === "Riskli iş" ? -1 : 2;
    n.crimeLevel += q.risk ? 1 : 0;
    n.completed = [...new Set([...n.completed, q.id])];
    n.active = null;
    n.carrying = null;
    n.log = [{ text: q.title, amount: q.reward, day: n.day }, ...n.log].slice(
      0,
      50,
    );
    n.achievements = [
      ...new Set([
        ...n.achievements,
        "first-job",
        ...(n.completed.length >= 10 ? ["ten-jobs"] : []),
        ...(n.cash >= 1000 ? ["savings"] : []),
      ]),
    ];
  } else n.active = { ...s.active, stage: s.active.stage + 1 };
  return { save: n, completed: done };
}
export function buyItem(
  s: Save,
  id: string,
  quantity = 1,
): { save: Save; error?: string } {
  const item = items[id];
  if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 20)
    return { save: s, error: "Geçersiz alışveriş." };
  const cost =
    (item.price + (id === "vex" ? Math.round(s.tolerance * 2) : 0)) * quantity;
  if (s.cash < cost) return { save: s, error: "Yeterli nakdin yok." };
  return {
    save: {
      ...s,
      cash: s.cash - cost,
      inventory: { ...s.inventory, [id]: (s.inventory[id] || 0) + quantity },
      log: [{ text: item.name, amount: -cost, day: s.day }, ...s.log].slice(
        0,
        50,
      ),
    },
  };
}
export function useItem(s: Save, id: string): { save: Save; error?: string } {
  if (!(s.inventory[id] > 0))
    return { save: s, error: "Bu eşya envanterinde yok." };
  const item = items[id];
  if (!item?.effect)
    return { save: s, error: "Bu eşyayı evinden yerleştirebilirsin." };
  const n = { ...s, inventory: { ...s.inventory, [id]: s.inventory[id] - 1 } };
  if (id === "water") n.energy = Math.min(100, n.energy + 15);
  if (id === "food") n.hunger = Math.min(100, n.hunger + 35);
  if (id === "tea") {
    n.stress = Math.max(0, n.stress - 15);
    n.energy = Math.min(100, n.energy + 10);
  }
  if (id === "medkit") n.health = Math.min(100, n.health + 40);
  if (id === "vex") {
    n.craving = Math.max(0, n.craving - 60);
    n.tolerance = Math.min(100, n.tolerance + 12);
    n.stress = Math.min(100, n.stress + 8);
  }
  return { save: n };
}
export function tickSave(s: Save, dt: number, running = false): Save {
  const time = s.time + dt / 90;
  let n = {
    ...s,
    time: time % 24,
    day: s.day + (time >= 24 ? 1 : 0),
    energy: Math.max(
      0,
      Math.min(100, s.energy + dt * (running ? -0.65 : 0.12)),
    ),
    hunger: Math.max(0, s.hunger - dt * 0.025),
    craving: Math.min(100, s.craving + dt * (0.008 + s.tolerance * 0.0004)),
    stress: Math.max(0, s.stress + dt * (s.craving > 70 ? 0.06 : -0.005)),
    health: Math.max(10, s.health - (s.hunger <= 0 ? dt * 0.05 : 0)),
    active: s.active ? { ...s.active, elapsed: s.active.elapsed + dt } : null,
  };
  if (n.active) {
    const q = questById[n.active.id];
    if (q.minutes && n.active.elapsed > q.minutes * 60)
      n = { ...n, active: null, carrying: null, dropped: null };
  }
  return n;
}
