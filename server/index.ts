import express from "express";
import {
  newSharedHouse,
  mayEnter,
  mayDecorate,
  furniturePlacementError,
} from "../src/game/housing";
import { pawnItem, redeemPawn } from "../src/game/economy";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { Server } from "socket.io";
import { randomBytes } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
} from "node:fs";
import {
  initialSave,
  startQuest,
  objectiveAction,
  buyItem,
  useItem,
  tickSave,
} from "../src/game/model";
import { questById } from "../src/game/quests";
import { items, placeById } from "../src/game/world";
import type {
  Save,
  Character,
  Vec2,
  SharedHouse,
  Loan,
} from "../src/game/types";
const app = express();
const http = createServer(app);
const io = new Server(http, { maxHttpBufferSize: 8192 });
type Member = {
  id: string;
  token: string;
  save: Save;
  socket: string | null;
  rotation: number;
  lastMove: number;
  lastCommand: number;
  lastTheft: number;
  mechanic: { place: string; time: number } | null;
  inside: boolean;
  indoorPos: Vec2;
};
type Room = {
  code: string;
  members: Member[];
  sharedCash: number;
  quest: string | null;
  stage: number;
  carrier: string | null;
  lastActor: string | null;
  house: SharedHouse;
  loans: Loan[];
  day: number;
  time: number;
};
const dataDir = process.env.SONDOZ_DATA_DIR || ".data";
mkdirSync(dataDir, { recursive: true });
let rooms: Record<string, Room> = {};
try {
  if (existsSync(`${dataDir}/rooms.json`)) {
    rooms = JSON.parse(readFileSync(`${dataDir}/rooms.json`, "utf8"));
    for (const room of Object.values(rooms)) {
      room.house ??= newSharedHouse(room.members[0]?.id);
      room.loans ??= [];
      room.day ??= room.members[0]?.save.day || 1;
      room.time ??= room.members[0]?.save.time || 17.3;
      room.house.resting = [];
      for (const m of room.members) {
        m.socket = null;
        m.lastMove = Date.now();
        m.mechanic = null;
        m.inside = false;
        m.indoorPos = [0, 3];
        m.save.pawnTickets ??= [];
      }
    }
  }
} catch {
  throw new Error(
    "Kayıt dosyası okunamadı. Veri kaybını önlemek için sunucu durduruldu.",
  );
}
const persist = () => {
  writeFileSync(`${dataDir}/rooms.tmp`, JSON.stringify(rooms));
  renameSync(`${dataDir}/rooms.tmp`, `${dataDir}/rooms.json`);
};
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, game: "SON DOZ", maxPlayers: 4 }),
);
// A built release serves both the game and multiplayer from one HTTP origin.
if (existsSync(resolve("dist/index.html")))
  app.use(express.static(resolve("dist")));
const near = (m: Member, place: string) => {
  if (m.inside) return place === "home";
  const p = placeById[place];
  return (
    p && Math.hypot(m.save.pos[0] - p.pos[0], m.save.pos[1] - p.pos[1]) <= 4.5
  );
};
const memberDistance = (a: Member, b: Member) =>
  a.inside !== b.inside
    ? Infinity
    : Math.hypot(
        (a.inside ? a.indoorPos : a.save.pos)[0] -
          (b.inside ? b.indoorPos : b.save.pos)[0],
        (a.inside ? a.indoorPos : a.save.pos)[1] -
          (b.inside ? b.indoorPos : b.save.pos)[1],
      );
const connected = (r: Room) => r.members.filter((m) => m.socket);
function snapshot(r: Room) {
  for (const m of connected(r))
    io.to(m.socket!).emit("snapshot", {
      save: m.save,
      peers: connected(r)
        .filter((p) => p.id !== m.id)
        .map((p) => ({
          id: p.id,
          name: p.save.character.name,
          pos: p.inside ? [p.indoorPos[0], p.indoorPos[1] + 125] : p.save.pos,
          inside: p.inside,
          rotation: p.rotation,
          character: p.save.character,
          carrying: !!p.save.carrying,
        })),
      sharedCash: r.sharedCash,
      quest: r.quest,
      stage: r.stage,
      inside: m.inside,
      house: r.house,
      loans: r.loans.filter((l) => l.from === m.id || l.to === m.id),
    });
}
function notice(socket: string, text: string, type = "info") {
  io.to(socket).emit("notice", { text, type });
}
function safeCharacter(input: Partial<Character> | null): Character {
  const c = { ...initialSave().character };
  if (!input) return c;
  if (typeof input.name === "string")
    c.name = input.name.trim().slice(0, 20) || "Deniz";
  for (const key of ["skin", "hair", "shirt", "pants", "shoes"] as const)
    if (typeof input[key] === "string" && /^#[0-9a-f]{6}$/i.test(input[key]!))
      c[key] = input[key]!;
  if ([0, 1, 2].includes(input.style || 0)) c.style = input.style || 0;
  c.accessory = !!input.accessory;
  c.face = [0, 1, 2].includes(input.face || 0) ? input.face || 0 : 0;
  return c;
}
io.on("connection", (socket) => {
  let room: Room | null = null;
  let member: Member | null = null;
  const join = (
    data: { code?: string; character?: Character; token?: string },
    create: boolean,
  ) => {
    if (member) return;
    const code = create
      ? randomBytes(3).toString("hex").toUpperCase()
      : String(data?.code || "").toUpperCase();
    if (create) {
      if (Object.keys(rooms).length > 1000)
        return socket.emit("room-error", "Oda kapasitesi dolu.");
      rooms[code] = {
        code,
        members: [],
        sharedCash: 0,
        quest: null,
        stage: 0,
        carrier: null,
        lastActor: null,
        house: newSharedHouse(),
        loans: [],
        day: 1,
        time: 17.3,
      };
    }
    const r = rooms[code];
    if (!r)
      return socket.emit(
        "room-error",
        "Bu kodla bir oda bulunamadı. Kodu kontrol et.",
      );
    let m = r.members.find(
      (m) => typeof data.token === "string" && m.token === data.token,
    );
    if (m?.socket)
      return socket.emit(
        "room-error",
        "Bu karakter odada başka bir sekmede açık.",
      );
    if (!m) {
      if (r.members.length >= 4)
        return socket.emit(
          "room-error",
          "Bu oda dolu. En fazla dört oyuncu katılabilir.",
        );
      m = {
        id: randomBytes(8).toString("hex"),
        token: randomBytes(24).toString("hex"),
        save: initialSave(safeCharacter(data.character || null)),
        socket: null,
        rotation: 0,
        lastMove: Date.now(),
        lastCommand: 0,
        lastTheft: 0,
        mechanic: null,
        inside: false,
        indoorPos: [0, 3],
      };
      r.members.push(m);
      if (!r.house.owner) r.house.owner = m.id;
    }
    m.save.day = r.day;
    m.save.time = r.time;
    m.socket = socket.id;
    m.lastMove = Date.now();
    room = r;
    member = m;
    socket.join(code);
    socket.emit("joined", { code, token: m.token, id: m.id, save: m.save });
    persist();
    snapshot(r);
  };
  socket.on("create", (data) => join(data || {}, true));
  socket.on("join", (data) => join(data || {}, false));
  socket.on(
    "move",
    (data: { pos: Vec2; rotation: number; insidePos?: Vec2 }) => {
      if (
        !room ||
        !member ||
        !Array.isArray(data?.pos) ||
        data.pos.length !== 2 ||
        !data.pos.every(Number.isFinite)
      )
        return;
      const now = Date.now(),
        dt = Math.min(2, (now - member.lastMove) / 1000);
      if (now - member.lastMove < 45) return;
      member.lastMove = now;
      if (member.inside) {
        const p = data.insidePos;
        if (
          !Array.isArray(p) ||
          p.length !== 2 ||
          !p.every(Number.isFinite) ||
          p.some((n) => Math.abs(n) > 4) ||
          Math.hypot(p[0] - member.indoorPos[0], p[1] - member.indoorPos[1]) >
            9 * dt + 1
        )
          return;
        member.indoorPos = [...p];
        member.rotation = Number.isFinite(data.rotation) ? data.rotation : 0;
        return;
      }
      const d = Math.hypot(
        data.pos[0] - member.save.pos[0],
        data.pos[1] - member.save.pos[1],
      );
      if (
        Math.abs(data.pos[0]) > 94 ||
        Math.abs(data.pos[1]) > 89 ||
        d > 9 * dt + 1
      )
        return;
      member.save.pos = [data.pos[0], data.pos[1]];
      member.rotation = Number.isFinite(data.rotation) ? data.rotation : 0;
    },
  );
  socket.on("command", (payload) => {
    if (!member || !room || !payload || typeof payload.action !== "string")
      return;
    const now = Date.now();
    if (now - member.lastCommand < 100) return;
    member.lastCommand = now;
    const m = member,
      r = room,
      s = m.save,
      d = payload.data || {};
    const error = (text: string) => notice(socket.id, text, "error");
    let changed = true;
    switch (payload.action) {
      case "character":
        m.save.character = safeCharacter({ ...s.character, ...d });
        break;
      case "quest-start": {
        const q = questById[d.id];
        if (!q) return error("İş bulunamadı.");
        if (!near(m, q.stages[0].place))
          return error("İşi başlatmak için ilk görev noktasına yaklaş.");
        const result = startQuest(s, d.id, connected(r).length);
        if (result.error) return error(result.error);
        if (q.category === "Birlikte") {
          if (r.quest) return error("Odada zaten ortak bir görev var.");
          if (connected(r).some((p) => p.save.active))
            return error("Ekipteki herkes önce aktif işini bitirmeli.");
          r.quest = q.id;
          r.stage = 0;
          r.carrier = null;
          r.lastActor = null;
          for (const peer of connected(r))
            peer.save.active = { ...result.save.active! };
        } else m.save = result.save;
        notice(socket.id, `${q.title} başladı.`);
        break;
      }
      case "quest-abandon": {
        if (s.active?.id === r.quest) {
          for (const p of r.members) {
            p.save.active = null;
            p.save.carrying = null;
            p.save.dropped = null;
          }
          r.quest = null;
          r.carrier = null;
        } else {
          s.active = null;
          s.carrying = null;
          s.dropped = null;
        }
        break;
      }
      case "mechanic-begin": {
        const a = s.active,
          o = a ? questById[a.id]?.stages[a.stage] : null;
        if (!o || o.place !== d.place || !near(m, d.place))
          return error("Görev noktasına yaklaş.");
        m.mechanic = { place: d.place, time: now };
        break;
      }
      case "quest-step": {
        const a = s.active;
        if (!a) return error("Aktif iş yok.");
        const q = questById[a.id],
          o = q.stages[a.stage];
        const coop = q.category === "Birlikte";
        const timed = ["repair", "clean", "wait", "inspect", "signal"].includes(
          o.action,
        );
        if (
          timed &&
          (!m.mechanic ||
            m.mechanic.place !== o.place ||
            now - m.mechanic.time <
              (o.action === "repair" ? 600 : (o.duration || 3) * 1000))
        )
          return error("Etkileşimi belirtilen süre boyunca tamamla.");
        if (coop && o.action === "signal" && r.lastActor === m.id)
          return error("Bu onayı diğer oyuncu vermeli.");
        if (coop && o.action === "deliver" && r.carrier !== m.id)
          return error("Koliyi taşıyan oyuncu teslim etmeli.");
        const result = objectiveAction(s, d.place, connected(r).length, timed);
        if (result.error) return error(result.error);
        m.save = result.save;
        m.mechanic = null;
        if (coop) {
          r.lastActor = m.id;
          if (o.action === "pickup") r.carrier = m.id;
          if (o.action === "deliver") r.carrier = null;
          if (result.completed) {
            for (const p of r.members.filter((p) => p.id !== m.id)) {
              p.save.cash += q.reward;
              p.save.xp += q.xp;
              p.save.completed = [...new Set([...p.save.completed, q.id])];
              p.save.active = null;
              p.save.carrying = null;
            }
            r.quest = null;
            r.stage = 0;
          } else {
            r.stage = result.save.active!.stage;
            for (const p of r.members.filter((p) => p.id !== m.id))
              p.save.active = { ...result.save.active! };
          }
        }
        if (result.completed)
          io.to(coop ? r.code : socket.id).emit("notice", {
            text: `${q.title} tamamlandı · +${q.reward} ₺`,
            type: "success",
          });
        break;
      }
      case "buy": {
        if (!["market", "cafe", "pawn", "alley"].some((p) => near(m, p)))
          return error("Alışveriş için dükkâna yaklaş.");
        const result = buyItem(s, d.id);
        if (result.error) return error(result.error);
        m.save = result.save;
        notice(socket.id, "Eşya envanterine eklendi.", "success");
        break;
      }
      case "use": {
        const result = useItem(s, d.id);
        if (result.error) return error(result.error);
        m.save = result.save;
        break;
      }
      case "sell": {
        if (!near(m, "pawn"))
          return error("Satış için İkinci Şans dükkânına yaklaş.");
        if (!s.inventory[d.id] || !items[d.id])
          return error("Bu eşya sende yok.");
        s.inventory[d.id]--;
        s.cash += Math.floor(items[d.id].price * 0.55);
        break;
      }
      case "drop":
        if (s.carrying) {
          s.dropped = [...s.pos];
          s.carrying = null;
        }
        break;
      case "pickup-dropped":
        if (
          s.dropped &&
          Math.hypot(s.dropped[0] - s.pos[0], s.dropped[1] - s.pos[1]) < 3
        ) {
          s.carrying = s.active?.id || null;
          s.dropped = null;
        }
        break;
      case "transfer": {
        const other = r.members.find((p) => p.id === d.to);
        const amount = Number(d.amount);
        if (
          !other ||
          other === m ||
          !other.socket ||
          !Number.isInteger(amount) ||
          amount < 1 ||
          amount > 5000 ||
          s.cash < amount
        )
          return error("Geçersiz miktar veya yetersiz bakiye.");
        if (memberDistance(m, other) > 4)
          return error("Para vermek için arkadaşına yaklaş.");
        s.cash -= amount;
        other.save.cash += amount;
        notice(
          other.socket,
          `${s.character.name} sana ${amount} ₺ verdi.`,
          "success",
        );
        break;
      }
      case "give-item": {
        const other = r.members.find((p) => p.id === d.to);
        if (!other?.socket || !items[d.id] || !s.inventory[d.id])
          return error("Eşya aktarılamadı.");
        if (memberDistance(m, other) > 4)
          return error("Eşya vermek için arkadaşına yaklaş.");
        s.inventory[d.id]--;
        other.save.inventory[d.id] = (other.save.inventory[d.id] || 0) + 1;
        notice(
          other.socket,
          `${s.character.name} sana ${items[d.id].name} verdi.`,
        );
        break;
      }
      case "steal": {
        const other = r.members.find((p) => p.id === d.to);
        if (!other?.socket || other === m) return error("Oyuncu bulunamadı.");
        if (now - m.lastTheft < 60000)
          return error("Yeniden denemeden önce bir dakika bekle.");
        if (memberDistance(m, other) > 2) return error("Hedef oyuncu uzakta.");
        m.lastTheft = now;
        s.suspicion = Math.min(100, s.suspicion + 40);
        const amount = Math.min(other.save.cash, 25);
        other.save.cash -= amount;
        s.cash += amount;
        notice(
          other.socket,
          `${s.character.name} ${amount} ₺ paranı aldı. Polis şüphesi arttı.`,
          "error",
        );
        break;
      }
      case "shared-deposit": {
        const amount = Number(d.amount);
        if (
          !Number.isInteger(amount) ||
          amount < 1 ||
          amount > 5000 ||
          s.cash < amount
        )
          return error("Geçersiz katkı miktarı.");
        s.cash -= amount;
        r.sharedCash += amount;
        break;
      }
      case "shared-withdraw": {
        if (r.members[0].id !== m.id)
          return error("Ortak kasadan yalnız oda kurucusu çekebilir.");
        const amount = Number(d.amount);
        if (!Number.isInteger(amount) || amount < 1 || amount > r.sharedCash)
          return error("Ortak kasada yeterli para yok.");
        r.sharedCash -= amount;
        s.cash += amount;
        break;
      }
      case "home": {
        if (!near(m, "home")) return error("Önce eve dön.");
        const amount = Number(d.amount || 100);
        if (!Number.isInteger(amount) || amount < 1 || amount > 5000)
          return error("Geçersiz tutar.");
        if (d.action === "deposit") {
          if (s.cash < amount) return error("Yetersiz nakit.");
          s.cash -= amount;
          s.bank += amount;
        } else if (d.action === "withdraw") {
          if (s.bank < amount) return error("Yetersiz kasa bakiyesi.");
          s.bank -= amount;
          s.cash += amount;
        } else if (d.action === "sleep") {
          if (!m.inside) return error("Dinlenmek için evin içine gir.");
          if (s.active)
            return error("Dinlenmeden önce aktif işini bitir veya bırak.");
          if (r.house.resting.includes(m.id))
            r.house.resting = r.house.resting.filter((id) => id !== m.id);
          else r.house.resting.push(m.id);
          if (
            connected(r).every(
              (p) =>
                p.inside && r.house.resting.includes(p.id) && !p.save.active,
            )
          ) {
            r.day++;
            r.time = 7;
            r.house.resting = [];
            for (const peer of connected(r)) {
              peer.save.energy = 100;
              peer.save.health = Math.min(100, peer.save.health + 25);
              peer.save.stress = Math.max(0, peer.save.stress - 25);
              peer.save.hunger = Math.max(10, peer.save.hunger - 12);
              peer.save.day = r.day;
              peer.save.time = 7;
            }
            io.to(r.code).emit("notice", {
              text: "Herkes dinlendi. Karayaka’da yeni bir sabah.",
              type: "success",
            });
          } else
            notice(
              socket.id,
              "Dinlenme tercihin kaydedildi. Herkes evde hazır olduğunda sabah olacak.",
            );
        } else if (d.action === "lock") {
          if (r.house.owner !== m.id)
            return error("Kapı kilidini yalnız ev sahibi yönetebilir.");
          r.house.locked = !r.house.locked;
          s.homeLocked = r.house.locked;
        } else if (d.action === "rent") {
          if (s.cash < 100) return error("100 ₺ gerekiyor.");
          s.cash -= 100;
          s.debt = Math.max(0, s.debt - 100);
        } else if (d.action === "buyhome") {
          if (s.cash < 4000 || s.ownedHome)
            return error("Ev için 4.000 ₺ gerekiyor.");
          s.cash -= 4000;
          s.ownedHome = true;
          s.debt = 0;
        }
        break;
      }
      case "home-enter": {
        if (!near(m, "home"))
          return error("Önce Çınar Apartmanı’nın kapısına gel.");
        if (!mayEnter(r.house, m.id))
          return error("Kapı kilitli. Ev sahibinden davet iste.");
        m.inside = true;
        m.indoorPos = [0, 3];
        socket.emit("home-transition", true);
        break;
      }
      case "home-exit": {
        m.inside = false;
        r.house.resting = r.house.resting.filter((id) => id !== m.id);
        socket.emit("home-transition", false);
        break;
      }
      case "home-permission": {
        if (r.house.owner !== m.id)
          return error("Davetleri yalnız ev sahibi yönetebilir.");
        const peer = r.members.find((p) => p.id === d.to);
        if (!peer || peer.id === m.id) return error("Oyuncu bulunamadı.");
        const list =
          d.role === "decorate" ? r.house.decorators : r.house.guests;
        if (list.includes(peer.id)) list.splice(list.indexOf(peer.id), 1);
        else list.push(peer.id);
        if (peer.socket)
          notice(
            peer.socket,
            `${s.character.name} ev erişim yetkini güncelledi.`,
          );
        break;
      }
      case "home-store":
      case "home-take": {
        if (!m.inside || !mayEnter(r.house, m.id))
          return error("Ortak depolama için evin içinde olmalısın.");
        if (!items[d.id]) return error("Eşya bulunamadı.");
        if (payload.action === "home-store") {
          if (!s.inventory[d.id]) return error("Bu eşya sende yok.");
          s.inventory[d.id]--;
          r.house.storage[d.id] = (r.house.storage[d.id] || 0) + 1;
        } else {
          if (!r.house.storage[d.id]) return error("Eşya zaten alınmış.");
          r.house.storage[d.id]--;
          s.inventory[d.id] = (s.inventory[d.id] || 0) + 1;
        }
        break;
      }
      case "furniture": {
        if (!m.inside || !mayDecorate(r.house, m.id))
          return error(
            "Evin içinde olmalı ve düzenleme yetkisine sahip olmalısın.",
          );
        if (
          !["chair", "lamp", "plant"].includes(d.id) ||
          !s.inventory[d.id] ||
          !Number.isFinite(d.rotation)
        )
          return error("Geçersiz yerleştirme.");
        const problem = furniturePlacementError(r.house.furniture, d.x, d.z);
        if (problem) return error(problem);
        s.inventory[d.id]--;
        r.house.furniture.push({
          id: d.id,
          x: d.x,
          z: d.z,
          rotation: d.rotation,
          owner: m.id,
        });
        break;
      }
      case "furniture-remove": {
        if (
          !m.inside ||
          !mayDecorate(r.house, m.id) ||
          !Number.isInteger(d.index) ||
          !r.house.furniture[d.index]
        )
          return error("Eşya bulunamadı veya düzenleme yetkin yok.");
        const item = r.house.furniture[d.index];
        const owner =
          r.members.find((p) => p.id === item.owner) || r.members[0];
        r.house.furniture.splice(d.index, 1);
        owner.save.inventory[item.id] =
          (owner.save.inventory[item.id] || 0) + 1;
        if (owner.socket)
          notice(owner.socket, `${items[item.id].name} çantana geri kondu.`);
        break;
      }
      case "pawn":
      case "redeem": {
        if (!near(m, "pawn"))
          return error("Rehin işlemi için İkinci Şans’a gel.");
        const result =
          payload.action === "pawn"
            ? pawnItem(s, d.id, randomBytes(8).toString("hex"))
            : redeemPawn(s, d.id);
        if (result.error) return error(result.error);
        m.save = result.save;
        notice(socket.id, "Rehin kaydı güncellendi.", "success");
        break;
      }
      case "loan-offer": {
        const other = r.members.find((p) => p.id === d.to);
        const amount = Number(d.amount);
        if (
          !other?.socket ||
          other === m ||
          !Number.isInteger(amount) ||
          amount < 1 ||
          amount > 5000 ||
          s.cash < amount
        )
          return error(
            "Borç teklifi için geçerli alıcı, miktar ve nakit gerekir.",
          );
        if (
          r.loans.some(
            (l) =>
              l.from === m.id && l.to === other.id && l.status === "offered",
          )
        )
          return error("Bu oyuncuya bekleyen bir teklifin var.");
        r.loans.push({
          id: randomBytes(8).toString("hex"),
          from: m.id,
          to: other.id,
          amount,
          repaid: 0,
          dueDay: s.day + 3,
          status: "offered",
        });
        notice(
          other.socket,
          `${s.character.name} sana ${amount} ₺ faizsiz borç teklif etti. Telefonda hesaplarını aç.`,
        );
        break;
      }
      case "loan-accept": {
        const loan = r.loans.find((l) => l.id === d.id);
        if (!loan || loan.to !== m.id || loan.status !== "offered")
          return error("Bu teklif artık geçerli değil.");
        const lender = r.members.find((p) => p.id === loan.from)!;
        if (lender.save.cash < loan.amount)
          return error("Borç verenin bakiyesi artık yeterli değil.");
        lender.save.cash -= loan.amount;
        s.cash += loan.amount;
        loan.status = "active";
        loan.dueDay = s.day + 3;
        s.log.unshift({
          text: "Arkadaşından alınan borç",
          amount: loan.amount,
          day: s.day,
        });
        break;
      }
      case "loan-decline": {
        const loan = r.loans.find((l) => l.id === d.id);
        if (
          !loan ||
          ![loan.from, loan.to].includes(m.id) ||
          loan.status !== "offered"
        )
          return error("Teklif bulunamadı.");
        loan.status = "declined";
        break;
      }
      case "loan-repay": {
        const loan = r.loans.find((l) => l.id === d.id);
        const amount = Number(d.amount);
        if (
          !loan ||
          loan.to !== m.id ||
          loan.status !== "active" ||
          !Number.isInteger(amount) ||
          amount < 1 ||
          amount > loan.amount - loan.repaid ||
          s.cash < amount
        )
          return error("Ödeme miktarını ve bakiyeni kontrol et.");
        const lender = r.members.find((p) => p.id === loan.from)!;
        s.cash -= amount;
        lender.save.cash += amount;
        loan.repaid += amount;
        if (loan.repaid === loan.amount) loan.status = "paid";
        s.log.unshift({
          text: "Arkadaşına borç ödemesi",
          amount: -amount,
          day: s.day,
        });
        break;
      }
      case "rehab":
        if (!near(m, "clinic") || s.cash < 60)
          return error("Merkezde bulunmalı ve 60 ₺ taşımalısın.");
        s.cash -= 60;
        s.craving = Math.max(0, s.craving - 45);
        s.tolerance = Math.max(0, s.tolerance - 20);
        s.stress = Math.max(0, s.stress - 30);
        break;
      default:
        changed = false;
    }
    if (changed) {
      persist();
      snapshot(r);
    }
  });
  socket.on("disconnect", () => {
    if (member && room) {
      member.socket = null;
      member.mechanic = null;
      room.house.resting = room.house.resting.filter((id) => id !== member!.id);
      persist();
      snapshot(room);
    }
  });
});
setInterval(() => {
  for (const r of Object.values(rooms)) {
    if (!connected(r).length) continue;
    r.time += 0.1 / 90;
    if (r.time >= 24) {
      r.time -= 24;
      r.day++;
    }
    for (const m of connected(r)) {
      m.save = { ...tickSave(m.save, 0.1), day: r.day, time: r.time };
      if (m.save.suspicion > 0) {
        const nearPolice =
          Math.hypot(m.save.pos[0] - 11, m.save.pos[1] - 50) < 10;
        m.save.suspicion = Math.max(
          0,
          m.save.suspicion + (nearPolice ? 0.15 : -0.04),
        );
        if (m.save.suspicion >= 100) {
          m.save.cash = Math.max(0, m.save.cash - 180);
          m.save.suspicion = 0;
          m.save.crimeLevel = 0;
          m.save.active = null;
          m.save.carrying = null;
          m.save.pos = [8, 47];
          notice(
            m.socket!,
            "Yakalandın. 180 ₺ tutarına kadar ceza kesildi.",
            "error",
          );
        }
      }
    }
    snapshot(r);
  }
}, 100);
setInterval(persist, 15000).unref();
const port = Number(process.env.PORT || 3001);
http.listen(port, "0.0.0.0", () =>
  console.log(`SON DOZ oda sunucusu ${port} portunda hazır.`),
);
process.on("SIGTERM", () => {
  persist();
  http.close(() => process.exit(0));
});
