// Crteži iz ručno pisanih matura lekcija u PNG, da se mogu pogledati bez preglednika (i autor lekcije, i provjera).
//
//   node scripts/lab/crtez.mjs <task_id> [<task_id> …]      → lab-out/matura/crtezi/<task_id>-<mjesto>.png
//   node scripts/lab/crtez.mjs --spec '<json graf_funkcije>' → lab-out/matura/crtezi/spec.png
//
// Iscrta komponentu GrafFunkcije na poslužitelju (Svelte SSR kroz Vite) u svijetloj temi i pretvori SVG u PNG
// (rsvg-convert). Crta sve: zadatak.graf, korake graf_funkcije, izraz.graf i podzadatak.graf.
import { readFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createServer } from "vite";

const BOJE = {
  "--primary": "#5b5bd6", "--warn": "#d97706", "--success": "#059669", "--danger": "#dc2626", "--text": "#18181b",
  "--text-dim": "#52525b", "--text-faint": "#a1a1a8", "--border": "#e5e5ea", "--bg-elev": "#ffffff",
  "--font-sans": "Helvetica, Arial, sans-serif", "--gf-c1": "#5b5bd6", "--gf-c2": "#d97706", "--gf-c3": "#059669",
};
const izlaz = join(process.cwd(), "lab-out/matura/crtezi");
await mkdir(izlaz, { recursive: true });

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
const { render } = await vite.ssrLoadModule("svelte/server");
const { default: GrafFunkcije } = await vite.ssrLoadModule("/src/lib/lesson/komponente/GrafFunkcije.svelte");
const izvor = await readFile(join(process.cwd(), "src/lib/lesson/komponente/GrafFunkcije.svelte"), "utf8");
let css = /<style>([\s\S]*?)<\/style>/.exec(izvor)[1];
css = css.replace(/color-mix\([^;]*\)/g, "rgba(91,91,214,0.12)").replace(/var\((--[a-z0-9-]+)\)/g, (m, v) => BOJE[v] ?? "#888");

function png(spec, ime) {
  const { body } = render(GrafFunkcije, { props: { spec: { tekst: "", ...spec, nacin: spec.nacin ?? "prikaz" }, bezTeksta: true } });
  const svg = /<svg[\s\S]*?<\/svg>/.exec(body)?.[0];
  if (!svg) return console.log(`  ${ime}: nema crteža`);
  const [, w, h] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  const sam = svg
    .replace("<svg", `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${h * 2}"`)
    .replace(/(<svg[^>]*>)/, `$1<style>${css}</style><rect width="100%" height="100%" fill="#fff"/>`)
    .replace(/<!--[\s\S]*?-->/g, "");
  const put = join(izlaz, `${ime}.png`);
  execFileSync("rsvg-convert", ["-o", put], { input: sam });
  console.log(`  ${put}`);
}

const argumenti = process.argv.slice(2);
try {
  if (argumenti[0] === "--spec") png(JSON.parse(argumenti[1]), "spec");
  else {
    for (const id of argumenti) {
      const l = JSON.parse(await readFile(join(process.cwd(), "lab-out/matura/lekcije", `${id}.json`), "utf8"));
      console.log(`#${id}`);
      if (l.zadatak?.graf) png(l.zadatak.graf, `${id}-zadatak`);
      for (const p of l.podzadaci ?? []) {
        if (p.graf) png(p.graf, `${id}-${p.id}-objasnjenje`);
        for (const [dio, koraci] of Object.entries({ pitanje: [p.pitanje], pomoc: p.pomoc ?? [], blizanac: [p.blizanac].flat() })) {
          koraci.forEach((k, i) => {
            if (!k) return;
            if (k.tip === "graf_funkcije") png(k, `${id}-${p.id}-${dio}${i}`);
            if (k.graf) png(k.graf, `${id}-${p.id}-${dio}${i}-graf`);
          });
        }
      }
    }
  }
} finally {
  await vite.close();
}
