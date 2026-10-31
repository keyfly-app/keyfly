// Fails if the Hungarian and English message files don't have exactly the same keys.
import { readFileSync } from "node:fs";
const load = (l) => JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf8"));
const keys = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
const hu = new Set(keys(load("hu")));
const en = new Set(keys(load("en")));
const missingEn = [...hu].filter((k) => !en.has(k));
const missingHu = [...en].filter((k) => !hu.has(k));
if (missingEn.length || missingHu.length) {
  console.error("Message keys out of sync.", { missingEn, missingHu });
  process.exit(1);
}
console.log(`messages ok: ${hu.size} keys in hu and en`);
