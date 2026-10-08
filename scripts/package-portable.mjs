import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve("dist-portable");
let html = await readFile(resolve(root, "index.html"), "utf8");
for (const match of [
  ...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g),
]) {
  const code = await readFile(
    resolve(root, match[1].replace(/^\//, "")),
    "utf8",
  );
  html = html.replace(
    match[0],
    () =>
      `<script type="module">${code.replace(/<\/script/gi, "<\\/script")}</script>`,
  );
}
for (const match of [
  ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g),
]) {
  const css = await readFile(
    resolve(root, match[1].replace(/^\//, "")),
    "utf8",
  );
  html = html.replace(match[0], () => `<style>${css}</style>`);
}
const icon = await readFile("public/favicon.svg");
html = html.replace(
  'href="/favicon.svg"',
  `href="data:image/svg+xml;base64,${icon.toString("base64")}"`,
);
await writeFile("artifacts/SON-DOZ-oyna.html", html);
console.log(
  `Tek dosyalık oyun hazır: artifacts/SON-DOZ-oyna.html (${Math.round(Buffer.byteLength(html) / 1024)} KB)`,
);
