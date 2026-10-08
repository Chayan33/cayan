import { create } from "zustand";
import { furniturePlacementError } from "./housing";
import type {
  Save,
  Panel,
  Settings,
  Character,
  NetworkState,
  Vec2,
} from "./types";
import {
  initialSave,
  validateSave,
  startQuest,
  objectiveAction,
  buyItem,
  useItem,
  tickSave,
} from "./model";
import { questById } from "./quests";
import { audio } from "./audio";
import { items, placeById } from "./world";
const SAVE_KEY = "sondoz.save.v1";
function stored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
const defaults: Settings = {
  quality: "high",
  volume: 0.35,
  sensitivity: 1,
  reducedMotion: false,
  weather: "auto",
  keys: {
    forward: "KeyW",
    back: "KeyS",
    left: "KeyA",
    right: "KeyD",
    run: "ShiftLeft",
    jump: "Space",
    interact: "KeyE",
    inventory: "Tab",
    map: "KeyM",
    journal: "KeyJ",
    phone: "KeyP",
    drop: "KeyG",
  },
};
export type Mechanic = {
  place: string;
  action: string;
  title: string;
  duration: number;
  progress: number;
} | null;
interface State {
  save: Save;
  facing: number;
  hasSave: boolean;
  playing: boolean;
  panel: Panel;
  selectedPlace: string | null;
  nearby: string | null;
  toast: { text: string; type: string; key: number } | null;
  settings: Settings;
  network: NetworkState;
  mechanic: Mechanic;
  interior: boolean;
  indoorPos: Vec2;
  enterHome: () => void;
  exitHome: () => void;
  decorating: string | null;
  waypoint: Vec2 | null;
  renderError: string | null;
  notify: (text: string, type?: string) => void;
  setPanel: (p: Panel) => void;
  newGame: () => void;
  loadGame: () => void;
  persist: () => void;
  updateCharacter: (c: Partial<Character>) => void;
  updateSettings: (s: Partial<Settings>) => void;
  acceptQuest: (id: string) => void;
  abandonQuest: () => void;
  interact: () => void;
  completeObjective: (place: string, passed?: boolean) => void;
  buy: (id: string) => void;
  use: (id: string) => void;
  sell: (id: string) => void;
  tick: (dt: number, running: boolean) => void;
  move: (pos: Vec2, facing?: number) => void;
  drop: () => void;
  capture: () => void;
  homeAction: (action: string, amount?: number) => void;
  rehab: () => void;
  placeFurniture: (x: number, z: number, rotation: number) => void;
}
export let networkCommand: ((action: string, data: unknown) => void) | null =
  null;
export const bindNetworkCommand = (fn: typeof networkCommand) => {
  networkCommand = fn;
};
export const useGame = create<State>((set, get) => ({
  save: initialSave(),
  facing: 0,
  hasSave: !!validateSave(stored(SAVE_KEY, null)),
  playing: false,
  panel: "menu",
  selectedPlace: null,
  nearby: null,
  toast: null,
  settings: { ...defaults, ...stored("sondoz.settings", defaults) },
  network: {
    status: "offline",
    room: "",
    id: "",
    peers: [],
    error: "",
    sharedCash: 0,
    sharedQuest: null,
    sharedStage: 0,
    recoverToken: stored("sondoz.room-token", null),
    house: null,
    loans: [],
  },
  mechanic: null,
  interior: false,
  indoorPos: [0, 3],
  enterHome: () => {
    if (networkCommand) {
      networkCommand("home-enter", {});
      return;
    }
    set({ interior: true, indoorPos: [0, 3], panel: "none" });
    audio.play("door");
  },
  exitHome: () => {
    if (networkCommand) {
      networkCommand("home-exit", {});
      return;
    }
    set({ interior: false, decorating: null });
    audio.play("door");
  },
  decorating: null,
  waypoint: null,
  renderError: null,
  notify: (text, type = "info") => {
    set({ toast: { text, type, key: Date.now() } });
    audio.play(
      type === "error"
        ? "error"
        : type === "success"
          ? "success"
          : "notification",
    );
  },
  setPanel: (panel) => {
    audio.init();
    audio.play();
    if (document.pointerLockElement) document.exitPointerLock();
    set({ panel, mechanic: null });
  },
  newGame: () => {
    audio.init();
    set({
      save: initialSave(get().save.character),
      playing: true,
      panel: "none",
      interior: false,
    });
    get().persist();
    get().notify(
      "Karayaka’ya hoş geldin. Nihat Abi seni Yıldız Bakkal’da bekliyor.",
    );
  },
  loadGame: () => {
    audio.init();
    const save = validateSave(stored(SAVE_KEY, null));
    if (save) {
      set({ save, playing: true, panel: "none", interior: false });
      get().notify("Kaldığın yerden. Karayaka seni unutmadı.");
    } else
      get().notify(
        "Kayıt okunamadı. Yeni bir hikâye başlatabilirsin.",
        "error",
      );
  },
  persist: () => {
    if (get().network.room) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(get().save));
      set({ hasSave: true });
    } catch {
      get().notify("Tarayıcı depolaması dolu; kayıt saklanamadı.", "error");
    }
  },
  updateCharacter: (c) => {
    if (networkCommand) {
      networkCommand("character", c);
      return;
    }
    set({
      save: { ...get().save, character: { ...get().save.character, ...c } },
    });
    if (get().playing) get().persist();
  },
  updateSettings: (s) => {
    const settings = { ...get().settings, ...s };
    set({ settings });
    localStorage.setItem("sondoz.settings", JSON.stringify(settings));
    audio.setVolume(settings.volume);
  },
  acceptQuest: (id) => {
    if (networkCommand) {
      networkCommand("quest-start", { id });
      return;
    }
    const r = startQuest(get().save, id, get().network.peers.length + 1);
    if (r.error) return get().notify(r.error, "error");
    set({ save: r.save, panel: "none" });
    get().notify(`${questById[id].title} · İş başladı`);
    get().persist();
  },
  abandonQuest: () => {
    if (networkCommand) {
      networkCommand("quest-abandon", {});
      return;
    }
    set({
      save: { ...get().save, active: null, carrying: null, dropped: null },
    });
    get().persist();
    get().notify("İş bırakıldı. Daha sonra yeniden başlayabilirsin.");
  },
  interact: () => {
    const { save } = get();
    const nearby =
      save.dropped &&
      Math.hypot(save.pos[0] - save.dropped[0], save.pos[1] - save.dropped[1]) <
        2
        ? "dropped"
        : nearestPlace(save.pos);
    if (get().mechanic || get().panel !== "none") return;
    if (nearby === "dropped") {
      if (networkCommand) {
        networkCommand("pickup-dropped", {});
        return;
      }
      set({
        save: { ...save, carrying: save.active?.id || null, dropped: null },
      });
      return;
    }
    if (!nearby) return;
    const q = save.active ? questById[save.active.id] : null;
    const o = save.active ? q?.stages[save.active.stage] : null;
    if (o?.place === nearby) {
      if (["repair", "clean", "wait", "inspect", "signal"].includes(o.action)) {
        if (document.pointerLockElement) document.exitPointerLock();
        set({
          mechanic: {
            place: nearby,
            action: o.action,
            title: o.text,
            duration: o.duration || 3,
            progress: 0,
          },
        });
      } else get().completeObjective(nearby);
      return;
    }
    set({ selectedPlace: nearby, panel: "dialogue" });
    if (document.pointerLockElement) document.exitPointerLock();
  },
  completeObjective: (place, passed = false) => {
    if (networkCommand) {
      networkCommand("quest-step", { place, passed });
      set({ mechanic: null });
      return;
    }
    const prev = get().save;
    const r = objectiveAction(
      prev,
      place,
      get().network.peers.length + 1,
      passed,
    );
    set({ mechanic: null });
    if (r.error) return get().notify(r.error, "error");
    set({ save: r.save });
    if (r.completed) {
      const q = questById[prev.active!.id];
      get().notify(
        `İŞ TAMAMLANDI · ${q.title} · +${q.reward} ₺ · +${q.xp} deneyim`,
        "success",
      );
    } else {
      audio.play("click");
      get().notify(
        questById[r.save.active!.id].stages[r.save.active!.stage].text,
      );
    }
    get().persist();
  },
  buy: (id) => {
    if (networkCommand) {
      networkCommand("buy", { id });
      return;
    }
    const r = buyItem(get().save, id);
    if (r.error) return get().notify(r.error, "error");
    set({ save: r.save });
    get().notify(`${items[id].name} envanterine eklendi.`, "success");
    get().persist();
  },
  use: (id) => {
    if (networkCommand) {
      networkCommand("use", { id });
      return;
    }
    const r = useItem(get().save, id);
    if (r.error) return get().notify(r.error, "error");
    set({ save: r.save });
    get().notify(`${items[id].name} kullanıldı.`);
    get().persist();
  },
  sell: (id) => {
    if (networkCommand) {
      networkCommand("sell", { id });
      return;
    }
    const s = get().save;
    if (!s.inventory[id]) return;
    const price = Math.floor(items[id].price * 0.55);
    set({
      save: {
        ...s,
        cash: s.cash + price,
        inventory: { ...s.inventory, [id]: s.inventory[id] - 1 },
        log: [
          { text: `${items[id].name} satışı`, amount: price, day: s.day },
          ...s.log,
        ].slice(0, 50),
      },
    });
    get().notify(`Eşya satıldı. +${price} ₺`, "success");
    get().persist();
  },
  tick: (dt, running) => {
    if (!get().playing || get().panel === "pause" || get().panel === "menu")
      return;
    if (networkCommand) return;
    const prev = get().save;
    const save = tickSave(prev, dt, running);
    set({ save });
    if (prev.active && !save.active)
      get().notify(
        "Görevin süresi doldu. Günlükten yeniden başlayabilirsin.",
        "error",
      );
  },
  move: (pos, facing) =>
    set({ save: { ...get().save, pos }, facing: facing ?? get().facing }),
  drop: () => {
    const s = get().save;
    if (!s.carrying) return;
    if (networkCommand) {
      networkCommand("drop", {});
      return;
    }
    set({ save: { ...s, carrying: null, dropped: [...s.pos] } });
    get().notify("Koli yere bırakıldı. Yaklaşıp E ile geri al.");
  },
  capture: () => {
    if (networkCommand) return;
    const s = get().save;
    if (s.suspicion < 65) return;
    const fine = Math.min(s.cash, 180);
    set({
      save: {
        ...s,
        cash: s.cash - fine,
        suspicion: 0,
        crimeLevel: 0,
        active: null,
        carrying: null,
        dropped: null,
        pos: [8, 47],
        log: [
          { text: "İdari ceza", amount: -fine, day: s.day },
          ...s.log,
        ].slice(0, 50),
      },
      panel: "none",
      mechanic: null,
    });
    get().notify(
      `Yakalandın. ${fine} ₺ ceza kesildi; riskli işin iptal edildi. Destek merkezinden yeniden başlayabilirsin.`,
      "error",
    );
    get().persist();
  },
  homeAction: (action, amount = 100) => {
    if (networkCommand) {
      networkCommand("home", { action, amount });
      return;
    }
    let s = get().save;
    if (action === "sleep") {
      s = {
        ...s,
        energy: 100,
        health: Math.min(100, s.health + 25),
        stress: Math.max(0, s.stress - 25),
        hunger: Math.max(10, s.hunger - 12),
        craving: Math.min(100, s.craving + 5),
        time: 7,
        day: s.day + 1,
      };
      get().notify("Yeni bir gün. Enerjin doldu.", "success");
    }
    if (action === "deposit") {
      if (s.cash < amount) return get().notify("Yeterli nakdin yok.", "error");
      s = { ...s, cash: s.cash - amount, bank: s.bank + amount };
    }
    if (action === "withdraw") {
      if (s.bank < amount)
        return get().notify("Kasanda bu kadar para yok.", "error");
      s = { ...s, cash: s.cash + amount, bank: s.bank - amount };
    }
    if (action === "rent") {
      if (s.cash < 100)
        return get().notify("Kira taksiti için 100 ₺ gerekiyor.", "error");
      s = { ...s, cash: s.cash - 100, debt: Math.max(0, s.debt - 100) };
    }
    if (action === "buyhome") {
      if (s.cash < 4000)
        return get().notify("Evin satış bedeli 4.000 ₺.", "error");
      s = { ...s, cash: s.cash - 4000, ownedHome: true, debt: 0 };
    }
    if (action === "lock") s = { ...s, homeLocked: !s.homeLocked };
    set({ save: s });
    get().persist();
    audio.play("door");
  },
  rehab: () => {
    if (networkCommand) {
      networkCommand("rehab", {});
      return;
    }
    const s = get().save;
    if (s.cash < 60)
      return get().notify(
        "Destek seansı 60 ₺. İlk işin bu masrafı karşılar.",
        "error",
      );
    set({
      save: {
        ...s,
        cash: s.cash - 60,
        craving: Math.max(0, s.craving - 45),
        tolerance: Math.max(0, s.tolerance - 20),
        stress: Math.max(0, s.stress - 30),
        health: Math.min(100, s.health + 15),
      },
    });
    get().notify(
      "Destek görüşmesi tamamlandı. İhtiyaç ve tolerans azaldı.",
      "success",
    );
    get().persist();
  },
  placeFurniture: (x, z, rotation) => {
    const id = get().decorating,
      s = get().save;
    if (!id || !s.inventory[id]) return;
    const placementError = furniturePlacementError(
      get().network.house?.furniture || s.furniture,
      x,
      z,
    );
    if (placementError) {
      get().notify(placementError, "error");
      return;
    }
    if (networkCommand) {
      networkCommand("furniture", { id, x, z, rotation });
      set({ decorating: null });
      return;
    }
    set({
      save: {
        ...s,
        inventory: { ...s.inventory, [id]: s.inventory[id] - 1 },
        furniture: [...s.furniture, { id, x, z, rotation }],
      },
      decorating: null,
    });
    get().persist();
    get().notify(
      "Eşya yerleştirildi. Ev düzenleme ekranından geri alabilirsin.",
      "success",
    );
  },
}));
// Save continuously and on tab close; saves are versioned and validated on load.
setInterval(() => {
  if (
    useGame.getState().playing &&
    useGame.getState().network.status !== "online"
  )
    useGame.getState().persist();
}, 15000);
window.addEventListener("beforeunload", () => {
  if (
    useGame.getState().playing &&
    useGame.getState().network.status !== "online"
  )
    useGame.getState().persist();
});
export function nearestPlace(pos: Vec2) {
  return (
    Object.values(placeById)
      .filter((p) => Math.hypot(pos[0] - p.pos[0], pos[1] - p.pos[1]) < 3.5)
      .sort(
        (a, b) =>
          Math.hypot(pos[0] - a.pos[0], pos[1] - a.pos[1]) -
          Math.hypot(pos[0] - b.pos[0], pos[1] - b.pos[1]),
      )[0]?.id || null
  );
}
