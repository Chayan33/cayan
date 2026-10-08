import test from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io, type Socket } from "socket.io-client";
import type { Save, Vec2 } from "../src/game/types";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function event<T>(s: Socket, name: string, timeout = 7000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      s.off(name, handler);
      reject(new Error(`Timed out: ${name}`));
    }, timeout);
    const handler = (value: T) => {
      clearTimeout(timer);
      resolve(value);
    };
    s.once(name, handler);
  });
}
test(
  "Real server: shared quest, anti-duplication, proximity, transfers, room limits and reconnect persistence",
  { timeout: 100000 },
  async () => {
    const data = mkdtempSync(join(tmpdir(), "sondoz-test-"));
    let process: ChildProcess | undefined;
    const clients: Socket[] = [];
    const boot = async () => {
      process = spawn("node", ["--import", "tsx", "server/index.ts"], {
        cwd: globalThis.process.cwd(),
        env: { ...globalThis.process.env, PORT: "3102", SONDOZ_DATA_DIR: data },
        stdio: "pipe",
      });
      let err = "";
      process.stderr!.on("data", (d) => (err += String(d)));
      for (let i = 0; i < 80; i++) {
        try {
          const r = await fetch("http://127.0.0.1:3102/api/health");
          if (r.ok) return;
        } catch {}
        await delay(100);
      }
      throw new Error(err || "Server did not start");
    };
    const connect = async () => {
      const s = io("http://127.0.0.1:3102", {
        transports: ["websocket"],
        reconnection: false,
      });
      clients.push(s);
      await event(s, "connect");
      return s;
    };
    let saves = new Map<Socket, Save>();
    const views = new Map<Socket, any>();
    const track = (s: Socket) =>
      s.on("snapshot", (d: { save: Save }) => {
        saves.set(s, d.save);
        views.set(s, d);
      });
    const command = async (s: Socket, action: string, data: unknown = {}) => {
      s.emit("command", { action, data });
      await delay(220);
    };
    const move = async (s: Socket, to: Vec2) => {
      let from = saves.get(s)!.pos;
      const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const steps = Math.ceil(distance / 0.72);
      for (let i = 1; i <= steps; i++) {
        await delay(100);
        s.emit("move", {
          pos: [
            from[0] + ((to[0] - from[0]) * i) / steps,
            from[1] + ((to[1] - from[1]) * i) / steps,
          ],
          rotation: 0,
        });
      }
      await delay(150);
      assert.ok(
        Math.hypot(saves.get(s)!.pos[0] - to[0], saves.get(s)!.pos[1] - to[1]) <
          1,
      );
    };
    try {
      await boot();
      const a = await connect();
      track(a);
      const joinedA = event<{
        code: string;
        token: string;
        id: string;
        save: Save;
      }>(a, "joined");
      a.emit("create", { character: { name: "Deniz" }, cash: 99999 });
      const ar = await joinedA;
      assert.equal(ar.save.cash, 85);
      const b = await connect();
      track(b);
      const joinedB = event<{ token: string; id: string }>(b, "joined");
      b.emit("join", { code: ar.code, character: { name: "Baran" } });
      const br = await joinedB;
      await delay(150);
      // The server rejects remotely performed transactions and fabricated balances.
      const before = saves.get(a)!.cash;
      await command(a, "buy", { id: "water", cash: 9999 });
      assert.equal(saves.get(a)!.cash, before);
      await command(a, "transfer", { to: br.id, amount: -100 });
      assert.equal(saves.get(a)!.cash, before);
      await command(a, "transfer", { to: br.id, amount: 25 });
      assert.equal(saves.get(a)!.cash, 60);
      assert.equal(saves.get(b)!.cash, 110);
      // Both clients travel within server-validated speed limits.
      await Promise.all([move(a, [59, -53]), move(b, [12, -22])]);
      await command(a, "quest-start", { id: "coop-1" });
      assert.equal(saves.get(a)!.active?.id, "coop-1");
      assert.equal(saves.get(b)!.active?.id, "coop-1");
      await command(a, "quest-step", { place: "warehouse" });
      assert.equal(saves.get(a)!.carrying, "coop-1");
      assert.equal(saves.get(b)!.active?.stage, 1);
      // An immediate completion without spending the mechanic duration is rejected.
      await command(b, "quest-step", { place: "stock", passed: true });
      assert.equal(saves.get(b)!.active?.stage, 1);
      await command(b, "mechanic-begin", { place: "stock" });
      await delay(3100);
      await command(b, "quest-step", { place: "stock", passed: true });
      assert.equal(saves.get(a)!.active?.stage, 2);
      await move(a, [12, -22]);
      a.emit("command", { action: "quest-step", data: { place: "stock" } });
      b.emit("command", { action: "quest-step", data: { place: "stock" } });
      await delay(300);
      assert.equal(saves.get(a)!.cash, 380);
      assert.equal(saves.get(b)!.cash, 430);
      assert.equal(saves.get(a)!.active, null);
      assert.equal(saves.get(b)!.active, null);
      await command(a, "quest-step", { place: "stock" });
      assert.equal(saves.get(a)!.cash, 380);
      await command(a, "give-item", { to: br.id, id: "water" });
      assert.equal(saves.get(a)!.inventory.water, 1);
      assert.equal(saves.get(b)!.inventory.water, 3);
      await command(b, "shared-deposit", { amount: 30 });
      assert.equal(saves.get(b)!.cash, 400);
      // Offers require acceptance; repayment conserves cash and cannot be replayed.
      await command(a, "loan-offer", { to: br.id, amount: 50 });
      const loan = views.get(b).loans[0];
      assert.equal(saves.get(a)!.cash, 380);
      await command(b, "loan-accept", { id: loan.id });
      assert.equal(saves.get(a)!.cash, 330);
      assert.equal(saves.get(b)!.cash, 450);
      await command(b, "loan-accept", { id: loan.id });
      assert.equal(saves.get(b)!.cash, 450);
      await command(b, "loan-repay", { id: loan.id, amount: 25 });
      await command(b, "loan-repay", { id: loan.id, amount: 25 });
      assert.equal(saves.get(a)!.cash, 380);
      assert.equal(saves.get(b)!.cash, 400);
      assert.equal(views.get(b).loans[0].status, "paid");
      // A real item is pledged and redeemed; duplicate redemption fails.
      await Promise.all([move(a, [11, 21]), move(b, [11, 21])]);
      await command(b, "buy", { id: "chair" });
      assert.equal(saves.get(b)!.inventory.chair, 1);
      await command(b, "pawn", { id: "chair" });
      const ticket = saves.get(b)!.pawnTickets[0];
      assert.equal(saves.get(b)!.inventory.chair, 0);
      await command(b, "redeem", { id: ticket.id });
      assert.equal(saves.get(b)!.inventory.chair, 1);
      const afterPawn = saves.get(b)!.cash;
      await command(b, "redeem", { id: ticket.id });
      assert.equal(saves.get(b)!.cash, afterPawn);
      // One physical shared home: server-controlled invitations, decoration and atomic storage.
      await Promise.all([move(a, [-11, 18]), move(b, [-11, 18])]);
      await command(a, "home", { action: "lock" });
      await command(b, "home-enter");
      assert.equal(views.get(b).inside, false);
      await command(a, "home-permission", { to: br.id, role: "visit" });
      await command(b, "home-enter");
      assert.equal(views.get(b).inside, true);
      await command(a, "home-enter");
      assert.equal(views.get(a).peers[0].inside, true);
      await command(b, "furniture", { id: "chair", x: 2, z: 1, rotation: 0 });
      assert.equal(views.get(b).house.furniture.length, 0);
      await command(a, "home-permission", { to: br.id, role: "decorate" });
      await command(b, "furniture", { id: "chair", x: 2, z: 1, rotation: 0 });
      assert.equal(views.get(a).house.furniture.length, 1);
      assert.equal(saves.get(b)!.inventory.chair, 0);
      await command(a, "furniture-remove", { index: 0 });
      assert.equal(saves.get(b)!.inventory.chair, 1);
      assert.equal(saves.get(a)!.inventory.chair || 0, 0);
      await command(a, "home-store", { id: "water" });
      assert.equal(views.get(b).house.storage.water, 1);
      a.emit("command", { action: "home-take", data: { id: "water" } });
      b.emit("command", { action: "home-take", data: { id: "water" } });
      await delay(300);
      assert.equal(views.get(a).house.storage.water, 0);
      assert.equal(
        saves.get(a)!.inventory.water + saves.get(b)!.inventory.water,
        4,
      );
      const persistedWater = saves.get(a)!.inventory.water;
      // A single player cannot skip the shared clock; everyone must be home and ready.
      const eveningDay = saves.get(a)!.day;
      await command(a, "home", { action: "sleep" });
      assert.equal(saves.get(a)!.day, eveningDay);
      assert.equal(views.get(b).house.resting.length, 1);
      await command(b, "home", { action: "sleep" });
      assert.equal(saves.get(a)!.day, eveningDay + 1);
      assert.equal(saves.get(b)!.day, eveningDay + 1);
      assert.equal(saves.get(a)!.time, saves.get(b)!.time);
      assert.ok(saves.get(a)!.time >= 7 && saves.get(a)!.time < 7.1);
      assert.ok(saves.get(b)!.energy > 99);
      assert.equal(views.get(a).house.resting.length, 0);
      // The opaque resume credential returns the same character after a real server restart.
      a.disconnect();
      b.disconnect();
      await delay(250);
      process!.kill("SIGTERM");
      await new Promise((resolve) => process!.once("exit", resolve));
      await boot();
      const resumed = await connect();
      track(resumed);
      const resumeEvent = event<{ id: string; save: Save }>(resumed, "joined");
      resumed.emit("join", { code: ar.code, token: ar.token });
      const rr = await resumeEvent;
      assert.equal(rr.id, ar.id);
      assert.equal(rr.save.cash, 380);
      assert.ok(rr.save.completed.includes("coop-1"));
      assert.equal(rr.save.inventory.water, persistedWater);
      assert.equal(rr.save.day, eveningDay + 1);
      const second = await connect();
      const bj = event(second, "joined");
      second.emit("join", { code: ar.code, token: br.token });
      await bj;
      for (let i = 0; i < 2; i++) {
        const c = await connect();
        const j = event(c, "joined");
        c.emit("join", { code: ar.code, character: { name: `Konuk${i}` } });
        await j;
      }
      const fifth = await connect();
      const rejected = event<string>(fifth, "room-error");
      fifth.emit("join", { code: ar.code });
      assert.match(await rejected, /dolu/);
    } finally {
      clients.forEach((s) => s.disconnect());
      if (process?.exitCode === null) {
        process.kill("SIGTERM");
        await new Promise((resolve) => process!.once("exit", resolve));
      }
      rmSync(data, { recursive: true, force: true });
    }
  },
);
