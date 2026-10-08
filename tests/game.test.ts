import { pawnItem, redeemPawn } from "../src/game/economy";
import {
  newSharedHouse,
  mayEnter,
  mayDecorate,
  furniturePlacementError,
} from "../src/game/housing";
import test from "node:test";
import assert from "node:assert/strict";
import { quests, questById, available, levelFromXP } from "../src/game/quests";
import {
  initialSave,
  objectiveAction,
  startQuest,
  buyItem,
  useItem,
  tickSave,
  validateSave,
} from "../src/game/model";
import { placeById } from "../src/game/world";
import type { Save } from "../src/game/types";

test("80 authored quests have correct category counts, unique names and valid dependencies", () => {
  assert.equal(quests.length, 80);
  assert.equal(new Set(quests.map((q) => q.title)).size, 80);
  for (const [category, count] of [
    ["Yasal iş", 20],
    ["Riskli iş", 20],
    ["Hikâye", 15],
    ["Birlikte", 15],
    ["Yan görev", 10],
  ] as const)
    assert.equal(quests.filter((q) => q.category === category).length, count);
  for (const q of quests) {
    assert.ok(q.stages.length >= 3);
    for (const o of q.stages)
      assert.ok(placeById[o.place], `${q.id}: ${o.place}`);
    for (const r of q.requires) assert.ok(questById[r]);
  }
});
for (const category of [
  "Yasal iş",
  "Riskli iş",
  "Hikâye",
  "Birlikte",
  "Yan görev",
])
  test(`Every ${category} route can be played to completion with physical item and objective state`, () => {
    let s: Save = { ...initialSave(), cash: 1000, xp: 0 };
    if (category === "Riskli iş") {
      s.completed = ["legal-1"];
      s.xp = 160;
    }
    for (const q of quests.filter((q) => q.category === category)) {
      // The experience awarded by preceding jobs must actually unlock the next one.
      assert.ok(
        available(q, s.completed, s.xp, 4),
        `${q.id} blocked at XP ${s.xp}, level ${levelFromXP(s.xp)}`,
      );
      const start = startQuest(s, q.id, 4);
      assert.equal(start.error, undefined);
      s = start.save;
      const cash = s.cash;
      for (const o of q.stages) {
        s = { ...s, pos: [...placeById[o.place].pos] };
        const r = objectiveAction(s, o.place, 4, true);
        assert.equal(r.error, undefined, `${q.title}: ${o.text}`);
        s = r.save;
      }
      assert.equal(s.active, null);
      assert.ok(s.completed.includes(q.id));
      assert.equal(s.carrying, null);
      assert.equal(
        s.cash,
        cash +
          q.reward -
          q.stages.reduce(
            (a, o) =>
              a + (["pay", "deposit"].includes(o.action) ? o.amount || 0 : 0),
            0,
          ),
      );
    }
  });
test("A task cannot advance from a distance or deliver without the physical parcel", () => {
  let s = startQuest(initialSave(), "legal-1").save;
  assert.match(objectiveAction(s, "market").error!, /yaklaş/);
  s = { ...s, pos: [...placeById.market.pos] };
  s = objectiveAction(s, "market").save;
  s = { ...s, pos: [...placeById.stock.pos] };
  s = objectiveAction(s, "stock").save;
  assert.equal(s.carrying, "legal-1");
  const delivered = objectiveAction(
    { ...s, carrying: null, pos: [...placeById.shelf.pos] },
    "shelf",
  );
  assert.ok(delivered.error);
  const result = objectiveAction(
    { ...s, pos: [...placeById.shelf.pos] },
    "shelf",
  );
  assert.equal(result.save.carrying, null);
  assert.equal(result.save.active?.stage, 3);
});
test("Reward is granted exactly once and a future task cannot be accepted early", () => {
  assert.ok(startQuest(initialSave(), "legal-20").error);
  let s = startQuest(initialSave(), "legal-1").save;
  for (const o of questById["legal-1"].stages)
    s = objectiveAction(
      { ...s, pos: [...placeById[o.place].pos] },
      o.place,
      1,
      true,
    ).save;
  assert.equal(s.cash, 225);
  assert.equal(s.xp, 60);
  const r = objectiveAction(s, "market");
  assert.ok(r.error);
  assert.equal(r.save.cash, 225);
});
test("Purchases, consumption, debt and bank funds conserve the economy", () => {
  let s = buyItem(initialSave(), "food").save;
  assert.equal(s.cash, 50);
  assert.equal(s.inventory.food, 2);
  s = useItem(s, "food").save;
  assert.equal(s.inventory.food, 1);
  assert.equal(s.hunger, 100);
  assert.ok(buyItem(s, "lamp").error);
  assert.ok(buyItem(s, "food", -1).error);
  assert.ok(useItem({ ...s, inventory: {} }, "food").error);
});
test("Timed tasks expire and pause-free progression depletes needs without killing the player", () => {
  let s = { ...initialSave(), completed: ["legal-3"], xp: 400 };
  s = startQuest(s, "legal-4").save;
  assert.ok(s.active);
  const n = tickSave(s, 481);
  assert.equal(n.active, null);
  assert.equal(n.carrying, null);
  assert.ok(n.hunger < s.hunger);
  assert.ok(n.energy >= 0);
  assert.ok(tickSave({ ...s, hunger: 0, health: 10 }, 100).health >= 10);
});
test("Versioned persistence survives serialization and rejects malformed inputs", () => {
  const s = initialSave();
  s.cash = 123;
  s.furniture = [{ id: "chair", x: 1, z: 2, rotation: 0 }];
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(s))), s);
  assert.equal(validateSave({ cash: 99 }), null);
  assert.equal(validateSave({ ...s, cash: -10 }), null);
  assert.equal(validateSave({ ...s, pos: [null, 1] }), null);
});
test("VEX increases tolerance while consuming an owned item, co-op requires peers", () => {
  let s = { ...initialSave(), inventory: { vex: 1 }, craving: 80 };
  const r = useItem(s, "vex");
  assert.equal(r.save.craving, 20);
  assert.equal(r.save.tolerance, 20);
  assert.equal(r.save.inventory.vex, 0);
  assert.ok(startQuest(s, "coop-1", 1).error);
  assert.equal(startQuest(s, "coop-1", 2).error, undefined);
});

test("Tolerance raises the fictional item cost and completed housing story awards its lamp", () => {
  let s = {
    ...initialSave(),
    cash: 1000,
    tolerance: 30,
    inventory: { vex: 0 },
  };
  const purchase = buyItem(s, "vex");
  assert.equal(purchase.save.cash, 830);
  let story: Save = {
    ...initialSave(),
    cash: 1000,
    xp: 3000,
    completed: ["story-7"],
  };
  story = startQuest(story, "story-8").save;
  for (const o of questById["story-8"].stages)
    story = objectiveAction(
      { ...story, pos: [...placeById[o.place].pos] },
      o.place,
      1,
      true,
    ).save;
  assert.equal(story.inventory.lamp, 1);
});

test("Pawning is a time-limited transfer of an existing item, never a duplicate", () => {
  const s = { ...initialSave(), cash: 100, inventory: { chair: 1 } };
  const pawn = pawnItem(s, "chair", "ticket");
  assert.equal(pawn.save.cash, 208);
  assert.equal(pawn.save.inventory.chair, 0);
  assert.ok(pawnItem(pawn.save, "chair", "twice").error);
  const redeemed = redeemPawn(pawn.save, "ticket");
  assert.equal(redeemed.save.cash, 89);
  assert.equal(redeemed.save.inventory.chair, 1);
  assert.ok(redeemPawn(redeemed.save, "ticket").error);
  assert.ok(redeemPawn({ ...pawn.save, day: 5 }, "ticket").error);
});
test("Shared-home permissions and placement preserve access boundaries", () => {
  const h = newSharedHouse("owner");
  h.locked = true;
  assert.equal(mayEnter(h, "guest"), false);
  h.guests.push("guest");
  assert.equal(mayEnter(h, "guest"), true);
  assert.equal(mayDecorate(h, "guest"), false);
  h.decorators.push("guest");
  assert.equal(mayDecorate(h, "guest"), true);
  assert.ok(furniturePlacementError([], 0, 3));
  assert.ok(furniturePlacementError([], -2, -2));
  assert.ok(furniturePlacementError([], 5, 0));
  assert.equal(furniturePlacementError([], 2, 1), null);
  assert.ok(
    furniturePlacementError(
      [{ id: "chair", x: 2, z: 1, rotation: 0 }],
      2.2,
      1.1,
    ),
  );
});
