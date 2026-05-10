import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const storage = JSON.parse(fs.readFileSync("data/pokemon-storage-summary.json", "utf8"));
const cobblemonTextures =
  "C:/Users/Anthony/AppData/Local/Temp/cobblemon-sparse/common/src/main/resources/assets/cobblemon/textures/pokemon";
const outputDir = "assets/pokemon";

const normalize = (value = "") => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const species = new Set();
for (const player of storage.players) {
  for (const mon of [...player.party, ...player.pc]) {
    species.add(mon.species);
  }
}

const dexBySpecies = new Map();
for (const dirent of fs.readdirSync(cobblemonTextures, { withFileTypes: true })) {
  if (!dirent.isDirectory()) continue;
  const match = dirent.name.match(/^(\d{4})_(.+)$/);
  if (!match) continue;
  dexBySpecies.set(normalize(match[2]), Number(match[1]));
}

const download = (url, file) =>
  new Promise((resolve) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          resolve(false);
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          fs.writeFileSync(file, Buffer.concat(chunks));
          resolve(true);
        });
      })
      .on("error", () => resolve(false));
  });

fs.mkdirSync(outputDir, { recursive: true });

const manifest = {};
let downloaded = 0;
let skipped = 0;

for (const name of [...species].sort()) {
  const dex = dexBySpecies.get(normalize(name));
  if (!dex) {
    skipped += 1;
    continue;
  }

  const fileName = `${normalize(name)}.png`;
  const file = path.join(outputDir, fileName);
  const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
  const ok = fs.existsSync(file) || (await download(url, file));

  if (ok) {
    manifest[name] = `assets/pokemon/${fileName}`;
    downloaded += 1;
  } else {
    skipped += 1;
  }
}

fs.writeFileSync(path.join(outputDir, "icon-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${downloaded} Pokemon icons. Skipped ${skipped}.`);
