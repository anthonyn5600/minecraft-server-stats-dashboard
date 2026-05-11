import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const storagePath = "data/pokemon-storage-summary.json";
const cachePath = "data/species-type-cache.json";
const cobblemonTextures =
  "C:/Users/Anthony/AppData/Local/Temp/cobblemon-sparse/common/src/main/resources/assets/cobblemon/textures/pokemon";

const normalize = (value = "") => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const requestJson = (url) =>
  new Promise((resolve) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          resolve(null);
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null));
  });

const buildDexMap = () => {
  const dexBySpecies = new Map();
  if (!fs.existsSync(cobblemonTextures)) return dexBySpecies;

  for (const dirent of fs.readdirSync(cobblemonTextures, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const match = dirent.name.match(/^(\d{4})_(.+)$/);
    if (!match) continue;
    dexBySpecies.set(normalize(match[2]), Number(match[1]));
  }

  return dexBySpecies;
};

const buildPokemonIndex = async () => {
  const payload = await requestJson("https://pokeapi.co/api/v2/pokemon?limit=2000");
  const pokemonBySpecies = new Map();

  for (const entry of payload?.results || []) {
    pokemonBySpecies.set(normalize(entry.name), entry.name);
  }

  return pokemonBySpecies;
};

const defaultVarietyName = async (species) => {
  const payload = await requestJson(`https://pokeapi.co/api/v2/pokemon-species/${normalize(species)}`);
  const variety = payload?.varieties?.find((entry) => entry.is_default) || payload?.varieties?.[0];
  return variety?.pokemon?.name || null;
};

const storage = JSON.parse(fs.readFileSync(storagePath, "utf8"));
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : {};
const dexBySpecies = buildDexMap();
const pokemonBySpecies = await buildPokemonIndex();
const speciesNames = new Set();

for (const player of storage.players) {
  for (const mon of [...player.party, ...player.pc]) {
    speciesNames.add(mon.species);
  }
}

let fetched = 0;
let unresolved = 0;

for (const species of [...speciesNames].sort()) {
  if (cache[species]?.types?.length) continue;

  const dex = dexBySpecies.get(normalize(species));
  const pokemonId = dex || pokemonBySpecies.get(normalize(species)) || (await defaultVarietyName(species));
  if (!pokemonId) {
    cache[species] = { dex: null, types: [], source: "unresolved" };
    unresolved += 1;
    continue;
  }

  const payload = await requestJson(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
  const types = payload?.types
    ?.sort((a, b) => a.slot - b.slot)
    .map((entry) => entry.type?.name)
    .filter(Boolean);

  if (types?.length) {
    cache[species] = { dex: payload.id || dex || null, types, source: "pokeapi" };
    fetched += 1;
  } else {
    cache[species] = { dex, types: [], source: "unresolved" };
    unresolved += 1;
  }
}

const typeSort = (entries) => entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

for (const player of storage.players) {
  const typeCounts = {};
  const teraFallbackCounts = {};
  const unresolvedSpecies = new Set();

  const enrich = (mon) => {
    const speciesInfo = cache[mon.species];
    const fallbackType = mon.teraType && mon.teraType !== "unknown" ? mon.teraType : "unknown";
    const types = speciesInfo?.types?.length ? speciesInfo.types : [fallbackType];
    const typeSource = speciesInfo?.types?.length ? "species" : fallbackType === "unknown" ? "unknown" : "tera-fallback";

    for (const type of types) {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    if (typeSource !== "species") {
      unresolvedSpecies.add(mon.species);
      teraFallbackCounts[fallbackType] = (teraFallbackCounts[fallbackType] || 0) + 1;
    }

    return { ...mon, speciesTypes: types, typeSource };
  };

  player.party = player.party.map(enrich);
  player.pc = player.pc.map(enrich);
  player.typeCounts = Object.fromEntries(typeSort(Object.entries(typeCounts)));
  player.topTypes = typeSort(Object.entries(typeCounts))
    .slice(0, 4)
    .map(([type, count]) => ({ type, count }));
  player.typeSummary = {
    typeEntries: Object.values(typeCounts).reduce((sum, count) => sum + count, 0),
    uniqueTypes: Object.keys(typeCounts).length,
    fallbackPokemon: unresolvedSpecies.size,
    unresolvedSpecies: [...unresolvedSpecies].sort(),
    teraFallbackCounts: Object.fromEntries(typeSort(Object.entries(teraFallbackCounts))),
  };
}

storage.typeMetadata = {
  generatedAt: new Date().toISOString(),
  source: "Species folders mapped to PokeAPI Pokemon type data; teraType fallback for unresolved species.",
  cachePath: path.normalize(cachePath),
};

fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
fs.writeFileSync(storagePath, `${JSON.stringify(storage, null, 2)}\n`);

console.log(`Type cache ready. Fetched ${fetched}; unresolved this run ${unresolved}.`);
console.table(
  storage.players.map((player) => ({
    player: player.name,
    pokemon: player.counts.total,
    typeEntries: player.typeSummary.typeEntries,
    topTypes: player.topTypes.map((entry) => `${entry.type}:${entry.count}`).join(", "),
    fallback: player.typeSummary.fallbackPokemon,
  })),
);
