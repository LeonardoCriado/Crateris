// Falla si el manifest lista un archivo ausente en web/data/.
import { readFileSync, existsSync } from "fs";

const m = JSON.parse(readFileSync("web/data/manifest.json", "utf8"));
let ok = true;
for (const d of m.datasets) {
  const p = "web/" + d.file;
  if (!existsSync(p)) { console.error("falta:", d.id, "->", p); ok = false; }
}
if (!ok) process.exit(1);
console.log(`manifest OK: ${m.datasets.length} datasets`);
