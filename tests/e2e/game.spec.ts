import { test, expect, type Page } from "@playwright/test";
import { places } from "../../src/game/world";
declare global {
  interface Window {
    __SONDOZ: {
      store: typeof import("../../src/game/store").useGame;
      engine: import("../../src/game/engine").GameEngine;
    };
  }
}
async function ready(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("sondoz.settings", JSON.stringify({ quality: "low" })),
  );
  await page.goto("/");
  await page.waitForFunction(
    () => !!window.__SONDOZ?.engine?.renderer?.info?.render?.calls,
  );
}
async function state(page: Page) {
  return page.evaluate(() => window.__SONDOZ.store.getState().save);
}
// Use actual keyboard movement in the open street; time is polled instead of
// assuming any frame rate on software WebGL runners.
async function walk(
  page: Page,
  key: string,
  axis: 0 | 1,
  target: number,
  direction: 1 | -1,
) {
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(
      ({ axis, target, direction }) =>
        direction * window.__SONDOZ.store.getState().save.pos[axis] >=
        direction * target,
      { axis, target, direction },
      { timeout: 35000 },
    );
  } finally {
    await page.keyboard.up(key);
  }
}
async function position(page: Page, x: number, z: number) {
  await page.evaluate(
    ({ x, z }) => {
      const { store, engine } = window.__SONDOZ;
      engine.player.group.position.set(x, 0, z);
      store.getState().move([x, z]);
    },
    { x, z },
  );
  await page.waitForFunction(
    ({ x, z }) =>
      Math.hypot(
        window.__SONDOZ.engine.player.group.position.x - x,
        window.__SONDOZ.engine.player.group.position.z - z,
      ) < 0.3,
    { x, z },
  );
}
test("First gameplay acceptance: move, camera, collision, NPC, parcel, reward and restored save", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await expect(page.getByRole("button", { name: /Yeni oyun/ })).toBeVisible();
  await page.screenshot({ path: "artifacts/menu.png" });
  await page.getByRole("button", { name: /Yeni oyun/ }).click();
  await page.waitForFunction(() => window.__SONDOZ.store.getState().playing);
  await page.evaluate(() =>
    window.__SONDOZ.store.getState().updateSettings({ quality: "low" }),
  );
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.evaluate(() => {
    window.__SONDOZ.engine.yaw = 0;
  });
  const start = (await state(page)).pos;
  await walk(page, "d", 0, 5, 1);
  await expect
    .poll(async () => (await state(page)).pos[0])
    .toBeGreaterThan(start[0] + 6);
  // Space creates a positive vertical displacement with subsequent grounded landing.
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => window.__SONDOZ.engine.vertical))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.__SONDOZ.engine.vertical))
    .toBe(0);
  // The player may not pass through the building wall.
  await walk(page, "d", 0, 12.5, 1);
  await page.keyboard.down("d");
  await page.waitForTimeout(700);
  await page.keyboard.up("d");
  expect((await state(page)).pos[0]).toBeLessThan(12.8);
  await walk(page, "a", 0, 5, -1);
  await walk(page, "w", 1, -10, -1);
  await walk(page, "d", 0, 10, 1);
  await page.keyboard.press("e");
  await expect(
    page.getByRole("heading", { name: "Nihat Abi", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /İlk Mesai/ }).click();
  await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).active?.stage).toBe(1);
  await walk(page, "w", 1, -22, -1);
  await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).carrying).toBe("legal-1");
  await page.keyboard.press("g");
  await expect.poll(async () => (await state(page)).carrying).toBeNull();
  await expect.poll(async () => (await state(page)).dropped).not.toBeNull();
  await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).carrying).toBe("legal-1");
  await walk(page, "s", 1, -5, 1);
  await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).active?.stage).toBe(3);
  await walk(page, "w", 1, -10, -1);
  await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).cash).toBe(225);
  expect((await state(page)).completed).toContain("legal-1");
  await page.screenshot({ path: "artifacts/first-job.png" });
  await page.reload();
  await page.waitForFunction(() => !!window.__SONDOZ?.engine);
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  expect((await state(page)).cash).toBe(225);
  expect((await state(page)).completed).toContain("legal-1");
  expect(errors).toEqual([]);
});
test("Panels: functional phone, shop purchase, use item, recovery and interior furnishing", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: /Yeni oyun/ }).click();
  await page.keyboard.press("j");
  await expect(
    page.getByRole("heading", { name: "Görev günlüğü" }),
  ).toBeVisible();
  await expect(page.locator(".quest-row")).toHaveCount(80);
  await page.screenshot({ path: "artifacts/journal.png" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("p");
  await expect(page.locator(".phone-device")).toBeVisible();
  await page.getByRole("button", { name: "Notlar", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Kişisel notların" })
    .fill("Önce kira, sonra yeni bir sandalye.");
  expect(
    await page.evaluate(() => localStorage.getItem("sondoz.notes")),
  ).toContain("kira");
  await page.getByRole("button", { name: "Telefon ana ekranı" }).click();
  await page.screenshot({ path: "artifacts/phone.png" });
  await page.keyboard.press("Escape");
  await position(page, 11, -10);
  await page.keyboard.press("e");
  await page.getByRole("button", { name: /Dükkâna göz at/ }).click();
  await page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "İçme suyu" }) })
    .getByRole("button")
    .click();
  expect((await state(page)).cash).toBe(73);
  expect((await state(page)).inventory.water).toBe(3);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("heading", { name: "Ceplerindeki hayat" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kullan", exact: true }).click();
  expect((await state(page)).inventory.water).toBe(2);
  await page.keyboard.press("Escape");
  await position(page, -11, 50);
  await page.keyboard.press("e");
  await page.getByRole("button", { name: /Destek görüşmesine katıl/ }).click();
  await page.getByRole("button", { name: /Görüşmeye katıl · 60/ }).click();
  expect((await state(page)).cash).toBe(13);
  expect((await state(page)).tolerance).toBe(0);
  await page.keyboard.press("Escape");
  await position(page, -11, 18);
  await page.keyboard.press("e");
  await page.getByRole("button", { name: /Evine gir/ }).click();
  await page.waitForFunction(() => window.__SONDOZ.store.getState().interior);
  await expect
    .poll(() =>
      page.evaluate(() => window.__SONDOZ.engine.player.group.position.z),
    )
    .toBeGreaterThan(120);
  // Fixture provides an already purchased chair to exercise the placement flow.
  await page.evaluate(() => {
    const s = window.__SONDOZ.store.getState();
    window.__SONDOZ.engine.player.group.position.set(2, 0, 125.5);
    window.__SONDOZ.store.setState({
      save: { ...s.save, inventory: { ...s.save.inventory, chair: 1 } },
      decorating: "chair",
    });
  });
  await page.keyboard.press("r");
  await page.keyboard.press("e");
  expect((await state(page)).furniture).toHaveLength(1);
  expect((await state(page)).inventory.chair).toBe(0);
});
test("Mouse camera, graphics controls, remapping and narrow layout do not break rendering", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Ayarlar", exact: true })
    .first()
    .click();
  await page
    .getByRole("combobox", { name: "Grafik kalitesi" })
    .selectOption("low");
  await page
    .getByRole("combobox", { name: "Hava durumu" })
    .selectOption("rain");
  await expect
    .poll(() =>
      page.evaluate(() => window.__SONDOZ.engine.atmosphere.rain.visible),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() => window.__SONDOZ.engine.renderer.shadowMap.enabled),
    )
    .toBe(false);
  await page.getByRole("button", { name: "Kontroller", exact: true }).click();
  await page.getByRole("button", { name: "Telefon P", exact: true }).click();
  await page.keyboard.press("o");
  expect(
    await page.evaluate(
      () => window.__SONDOZ.store.getState().settings.keys.phone,
    ),
  ).toBe("KeyO");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Yeni oyun/ }).click();
  await page.mouse.move(700, 400);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(840, 420, { steps: 6 });
  await page.mouse.up({ button: "right" });
  expect(
    await page.evaluate(() => Math.abs(window.__SONDOZ.engine.yaw)),
  ).toBeGreaterThan(0.1);
  await page.keyboard.press("o");
  await expect(page.locator(".phone-device")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/mobile-phone.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});
test("Two browser sessions join the same live room; leaving preserves the solo save", async ({
  browser,
}) => {
  test.setTimeout(180000);
  const a = await browser.newContext({ viewport: { width: 900, height: 650 } });
  const b = await browser.newContext({ viewport: { width: 900, height: 650 } });
  const p = await a.newPage(),
    q = await b.newPage();
  try {
    await ready(p);
    await p.getByRole("button", { name: /Yeni oyun/ }).click();
    await p.evaluate(() => window.__SONDOZ.store.getState().persist());
    const before = await p.evaluate(() =>
      localStorage.getItem("sondoz.save.v1"),
    );
    await p.evaluate(() => window.__SONDOZ.store.getState().setPanel("lobby"));
    await p.getByRole("button", { name: "Yeni oda oluştur" }).click();
    await p.waitForFunction(
      () => window.__SONDOZ.store.getState().network.status === "online",
    );
    const code = await p.evaluate(
      () => window.__SONDOZ.store.getState().network.room,
    );
    await ready(q);
    await q.getByRole("button", { name: /Arkadaşlarla oyna/ }).click();
    await q.getByPlaceholder("Örn. A7C29F").fill(code);
    await q.getByRole("button", { name: "Odaya katıl", exact: true }).click();
    await q.waitForFunction(
      () => window.__SONDOZ.store.getState().network.status === "online",
    );
    await p.waitForFunction(
      () => window.__SONDOZ.store.getState().network.peers.length === 1,
    );
    await expect(p.locator(".online-indicator")).toContainText("2 / 4");
    await p.screenshot({ path: "artifacts/lobby.png" });
    await p
      .getByRole("button", { name: "Borç teklif et", exact: true })
      .click();
    await q.evaluate(() => window.__SONDOZ.store.getState().setPanel("phone"));
    await q.getByRole("button", { name: "Hesaplar", exact: true }).click();
    await q.getByRole("button", { name: "Kabul et", exact: true }).click();
    await expect.poll(async () => (await state(q)).cash).toBe(110);
    await expect.poll(async () => (await state(p)).cash).toBe(60);
    await q.getByRole("button", { name: "Tamamını öde", exact: true }).click();
    await expect.poll(async () => (await state(p)).cash).toBe(85);
    // Both start beside the actual home door. Entry is acknowledged by the server.
    await p.evaluate(() => window.__SONDOZ.store.getState().enterHome());
    await q.evaluate(() => window.__SONDOZ.store.getState().enterHome());
    await p.waitForFunction(() => window.__SONDOZ.store.getState().interior);
    await q.waitForFunction(() => window.__SONDOZ.store.getState().interior);
    await p.waitForFunction(() =>
      [...window.__SONDOZ.engine.peers.values()].some(
        (a) => a.group.visible && a.group.position.z > 125,
      ),
    );
    await q.waitForFunction(
      () =>
        window.__SONDOZ.engine.interiorActive &&
        window.__SONDOZ.engine.player.group.position.z > 127.5,
    );
    await q.keyboard.down("w");
    try {
      await q.waitForFunction(
        () => window.__SONDOZ.engine.player.group.position.z < 127,
      );
    } finally {
      await q.keyboard.up("w");
    }
    await p.waitForFunction(
      () => window.__SONDOZ.store.getState().network.peers[0]?.pos[1] < 127.3,
    );
    await p.evaluate(() => window.__SONDOZ.store.getState().setPanel("home"));
    await q.evaluate(() => window.__SONDOZ.store.getState().setPanel("home"));
    const firstDay = (await state(p)).day;
    await p.getByRole("button", { name: /Birlikte dinlen/ }).click();
    expect((await state(p)).day).toBe(firstDay);
    await q.getByRole("button", { name: /Birlikte dinlen/ }).click();
    await expect.poll(async () => (await state(p)).day).toBe(firstDay + 1);
    await expect.poll(async () => (await state(q)).day).toBe(firstDay + 1);
    await p.screenshot({ path: "artifacts/shared-home.png" });
    await p.evaluate(() => window.__SONDOZ.store.getState().persist());
    expect(await p.evaluate(() => localStorage.getItem("sondoz.save.v1"))).toBe(
      before,
    );
    await p.evaluate(() => window.__SONDOZ.store.getState().setPanel("lobby"));
    await p.getByRole("button", { name: "Odadan ayrıl", exact: true }).click();
    expect((await state(p)).cash).toBe(85);
    await expect(p.getByRole("button", { name: /Yeni oyun/ })).toBeVisible();
  } finally {
    await a.close();
    await b.close();
  }
});
test("All mission destinations are physically reachable through the 3D city", async ({
  page,
}) => {
  await ready(page);
  const unreachable = await page.evaluate((places) => {
    const e = window.__SONDOZ.engine;
    const seen = new Set<string>(),
      queue: [[number, number]] = [[-8, 18]];
    seen.add("-8,18");
    for (let head = 0; head < queue.length; head++) {
      const [x, z] = queue[head];
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          nz = z + dz,
          key = `${nx},${nz}`;
        if (!seen.has(key) && !e.blocked(nx, nz)) {
          seen.add(key);
          queue.push([nx, nz]);
        }
      }
    }
    return places
      .filter(
        (p) =>
          !queue.some(([x, z]) => Math.hypot(x - p.pos[0], z - p.pos[1]) < 2.5),
      )
      .map((p) => p.name);
  }, places);
  expect(unreachable).toEqual([]);
});

test("Repair requires three actual timed inputs and observation requires holding the interaction", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: /Yeni oyun/ }).click();
  await position(page, 59, -32);
  await page.evaluate(() => {
    const s = window.__SONDOZ.store.getState();
    window.__SONDOZ.store.setState({
      save: { ...s.save, xp: 500, completed: ["legal-5"] },
    });
    window.__SONDOZ.store.getState().acceptQuest("legal-6");
  });
  await page.keyboard.press("e");
  expect((await state(page)).active?.stage).toBe(1);
  await page.keyboard.press("e");
  await expect(page.locator(".timing-track")).toBeVisible();
  // Read the visible indicator and click the actual control in the browser.
  // Software WebGL may take longer than the green window for a CDP round trip.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const begun = performance.now();
        let lastHit = 0;
        const timer = setInterval(() => {
          const needle = document.querySelector(
            ".timing-track i",
          ) as HTMLElement | null;
          if (!needle) {
            clearInterval(timer);
            resolve();
            return;
          }
          if (performance.now() - begun > 25000) {
            clearInterval(timer);
            reject(new Error("Repair never completed"));
            return;
          }
          const value = parseFloat(needle.style.left);
          if (value >= 43 && value <= 53 && performance.now() - lastHit > 700) {
            lastHit = performance.now();
            (
              document.querySelector(
                ".mechanic-panel .primary",
              ) as HTMLButtonElement
            ).click();
          }
        }, 25);
      }),
  );
  await expect.poll(async () => (await state(page)).active?.stage).toBe(2);
  await page.evaluate(() => {
    const s = window.__SONDOZ.store.getState();
    window.__SONDOZ.store.setState({
      save: {
        ...s.save,
        active: { id: "legal-6", stage: 3, startedAt: Date.now(), elapsed: 0 },
      },
    });
  });
  await page.keyboard.press("e");
  await expect(page.locator(".work-progress")).toBeVisible();
  await page.keyboard.down("e");
  try {
    await expect
      .poll(async () => (await state(page)).completed.includes("legal-6"))
      .toBe(true);
  } finally {
    await page.keyboard.up("e");
  }
  expect((await state(page)).cash).toBe(495);
});

test("Character customization renders a real avatar and pawn tickets return the original item", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await page.getByRole("button", { name: "Karakter", exact: true }).click();
  await expect(page.locator(".avatar-preview-canvas canvas")).toBeVisible();
  await page.getByLabel("KARAKTER ADI", { exact: true }).fill("Deniz");
  await page.getByRole("button", { name: "İnce", exact: true }).click();
  await page.getByRole("button", { name: "Dalgalı", exact: true }).click();
  await page
    .getByRole("button", { name: "Güneş gözlüğü", exact: true })
    .click();
  expect((await state(page)).character).toMatchObject({
    name: "Deniz",
    face: 2,
    style: 1,
    accessory: true,
  });
  await page
    .getByRole("button", { name: "Bu benim hikâyem", exact: true })
    .click();
  await page.getByRole("button", { name: /Yeni oyun/ }).click();
  expect((await state(page)).character.name).toBe("Deniz");
  // A purchased furniture fixture isolates the pawn UI from quest income tested above.
  await position(page, 11, 21);
  await page.evaluate(() => {
    const { store } = window.__SONDOZ,
      s = store.getState();
    store.setState({
      save: { ...s.save, inventory: { ...s.save.inventory, chair: 1 } },
      selectedPlace: "pawn",
      panel: "shop",
    });
  });
  await page
    .getByRole("button", { name: "Rehin defteri", exact: true })
    .click();
  await page.locator(".pawn-offers button").click();
  expect((await state(page)).inventory.chair).toBe(0);
  expect((await state(page)).pawnTickets).toHaveLength(1);
  const ticket = (await state(page)).pawnTickets[0];
  await page.screenshot({ path: "artifacts/pawn-shop.png" });
  await page.getByRole("button", { name: /Geri al/ }).click();
  expect((await state(page)).inventory.chair).toBe(1);
  expect((await state(page)).pawnTickets).toHaveLength(0);
  expect((await state(page)).cash).toBe(
    85 + ticket.advance - ticket.redemption,
  );
  expect(errors).toEqual([]);
});
