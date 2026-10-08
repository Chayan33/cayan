export type Vec2 = [number, number];
export type Panel =
  | "menu"
  | "none"
  | "inventory"
  | "map"
  | "journal"
  | "phone"
  | "settings"
  | "character"
  | "pause"
  | "lobby"
  | "dialogue"
  | "shop"
  | "home"
  | "rehab"
  | "achievements";
export type Category =
  "Yasal iş" | "Riskli iş" | "Hikâye" | "Birlikte" | "Yan görev";
export type Action =
  | "talk"
  | "pickup"
  | "deliver"
  | "inspect"
  | "repair"
  | "clean"
  | "wait"
  | "pay"
  | "deposit"
  | "signal";
export interface Objective {
  place: string;
  action: Action;
  text: string;
  amount?: number;
  duration?: number;
}
export interface Quest {
  id: string;
  title: string;
  story: string;
  giver: string;
  category: Category;
  level: number;
  reward: number;
  xp: number;
  risk: number;
  minutes?: number;
  requires: string[];
  stages: Objective[];
  repeatable: boolean;
  failure: string;
}
export interface Character {
  name: string;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes: string;
  style: number;
  accessory: boolean;
  face: number;
}
export interface Settings {
  quality: "low" | "medium" | "high";
  volume: number;
  sensitivity: number;
  reducedMotion: boolean;
  weather: "auto" | "clear" | "rain";
  keys: Record<string, string>;
}
export interface Furniture {
  id: string;
  x: number;
  z: number;
  rotation: number;
  owner?: string;
}
export interface SharedHouse {
  owner: string;
  locked: boolean;
  guests: string[];
  decorators: string[];
  furniture: Furniture[];
  storage: Record<string, number>;
  resting: string[];
}
export interface PawnTicket {
  id: string;
  item: string;
  advance: number;
  redemption: number;
  dueDay: number;
}
export interface Loan {
  id: string;
  from: string;
  to: string;
  amount: number;
  repaid: number;
  dueDay: number;
  status: "offered" | "active" | "paid" | "declined";
}
export interface Save {
  version: 1;
  character: Character;
  cash: number;
  bank: number;
  debt: number;
  health: number;
  energy: number;
  hunger: number;
  craving: number;
  tolerance: number;
  stress: number;
  xp: number;
  reputation: number;
  crimeLevel: number;
  suspicion: number;
  day: number;
  time: number;
  inventory: Record<string, number>;
  completed: string[];
  active: {
    id: string;
    stage: number;
    startedAt: number;
    elapsed: number;
  } | null;
  pos: Vec2;
  carrying: string | null;
  dropped: Vec2 | null;
  furniture: Furniture[];
  pawnTickets: PawnTicket[];
  relationships: Record<string, number>;
  achievements: string[];
  ownedHome: boolean;
  homeLocked: boolean;
  log: { text: string; amount: number; day: number }[];
}
export interface Place {
  id: string;
  name: string;
  npc: string;
  role: string;
  pos: Vec2;
  district: string;
  color: string;
  dialogue: string;
  kind: "work" | "home" | "shop" | "clinic" | "police" | "point";
}
export interface Peer {
  id: string;
  name: string;
  pos: Vec2;
  rotation: number;
  character: Character;
  cash?: number;
  carrying?: boolean;
  inside?: boolean;
}
export interface NetworkState {
  status: "offline" | "connecting" | "online";
  room: string;
  id: string;
  peers: Peer[];
  error: string;
  sharedCash: number;
  sharedQuest: string | null;
  sharedStage: number;
  recoverToken: string | null;
  house: SharedHouse | null;
  loans: Loan[];
}
